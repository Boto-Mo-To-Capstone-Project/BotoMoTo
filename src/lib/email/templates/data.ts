/**
 * Template data preparation utilities
 */

import { VotingCodeTemplateProps } from './voting-code';

/**
 * Prepare template data for voting code emails
 */
export function prepareVotingCodeTemplateData(
  voter: {
    id: number;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    email: string;
    code: string;
  },
  election: {
    id: number;
    name: string;
    organization: {
      id: number;
      name: string;
    };
  },
  options: {
    startDate?: string;
    endDate?: string;
    expiryDate?: string;
    instructions?: string;
    votingPortalUrl?: string;
  } = {}
): VotingCodeTemplateProps {
  // Build voter name
  const voterName = [voter.firstName, voter.middleName, voter.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  // Default instructions if not provided
  const defaultInstructions = `
    <ol>
      <li>Visit the voting portal using the button below</li>
      <li>Enter your 6-digit voting code: <strong>${voter.code}</strong></li>
      <li>Follow the on-screen instructions to cast your vote</li>
      <li>Make sure to vote for all available positions</li>
      <li>Submit your ballot when complete</li>
    </ol>
    <p><strong>Important:</strong> You can only vote once. Make sure your selections are correct before submitting.</p>
  `;

  return {
    voterName,
    votingCode: voter.code,
    electionTitle: election.name,
    organizationName: election.organization.name,
    startDate: options.startDate || 'TBD',
    endDate: options.endDate || 'TBD',
    expiryDate: options.expiryDate || options.endDate || 'End of voting period',
    instructions: options.instructions || defaultInstructions,
  };
}

/**
 * Prepare template data for multiple voters
 */
export function prepareBulkVotingCodeTemplateData(
  voters: Array<{
    id: number;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    email: string;
    code: string;
  }>,
  election: {
    id: number;
    name: string;
    organization: {
      id: number;
      name: string;
    };
  },
  options: {
    startDate?: string;
    endDate?: string;
    expiryDate?: string;
    instructions?: string;
    votingPortalUrl?: string;
  } = {}
): Array<{
  voter: typeof voters[0];
  templateData: VotingCodeTemplateProps;
}> {
  return voters.map(voter => ({
    voter,
    templateData: prepareVotingCodeTemplateData(voter, election, options)
  }));
}

/**
 * Generate election schedule text
 */
export function formatElectionSchedule(
  startDate?: Date | string,
  endDate?: Date | string,
  timezone = 'UTC'
): {
  startDate?: string;
  endDate?: string;
  expiryDate?: string;
} {
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const result: ReturnType<typeof formatElectionSchedule> = {};

  if (startDate) {
    result.startDate = formatDate(startDate);
  }

  if (endDate) {
    result.endDate = formatDate(endDate);
    result.expiryDate = formatDate(endDate);
  }

  return result;
}

/**
 * Get default voting instructions
 */
export function getDefaultVotingInstructions(
  votingCode: string,
  votingPortalUrl?: string
): string {
  const portalText = votingPortalUrl 
    ? `<li>Visit the voting portal at: <a href="${votingPortalUrl}">${votingPortalUrl}</a></li>`
    : '<li>Visit the voting portal using the button below</li>';

  return `
    <h3>How to Vote:</h3>
    <ol>
      ${portalText}
      <li>Enter your 6-digit voting code: <strong>${votingCode}</strong></li>
      <li>Follow the on-screen instructions to cast your vote</li>
      <li>Make sure to vote for all available positions</li>
      <li>Review your selections carefully</li>
      <li>Submit your ballot when complete</li>
    </ol>
    
    <h3>Important Notes:</h3>
    <ul>
      <li><strong>You can only vote once</strong> - make sure your selections are correct</li>
      <li><strong>Keep your voting code secure</strong> - do not share it with anyone</li>
      <li><strong>Vote before the deadline</strong> - late votes cannot be accepted</li>
      <li>If you encounter any issues, contact the election administrators immediately</li>
    </ul>
  `;
}
