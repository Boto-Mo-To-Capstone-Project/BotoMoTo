import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { ReactElement } from 'react';

// PDF Styles - Matching the dashboard design
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    fontSize: 12,
  },
  header: {
    backgroundColor: '#7f1d1d', // Matching maroon color
    color: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 10,
    opacity: 0.9,
  },
  status: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  statusBadge: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    border: '1px solid #bbf7d0',
  },
  statusText: {
    color: '#16a34a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  kpiSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 8,
  },
  kpiCard: {
    padding: 12,
    borderRadius: 8,
    width: '50%',
    alignItems: 'center',
  },
  kpiCardBlue: {
    backgroundColor: '#dbeafe',
  },
  kpiCardGreen: {
    backgroundColor: '#dcfce7',
  },
  kpiCardPurple: {
    backgroundColor: '#f3e8ff',
  },
  kpiCardOrange: {
    backgroundColor: '#fed7aa',
  },
  kpiTitle: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 6,
    fontWeight: 'bold',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionHeader: {
    backgroundColor: '#7f1d1d',
    color: 'white',
    padding: 10,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    borderRadius: 6,
  },
  positionContainer: {
    marginBottom: 12,
  },
  positionHeader: {
    backgroundColor: '#fed7aa', 
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  positionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  positionScope: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  candidateCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'white',
    marginBottom: 4,
    borderRadius: 4,
    border: '1px solid #e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  winnerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0fdf4', // Light green background for winners
    marginBottom: 4,
    borderRadius: 4,
    border: '1px solid #16a34a', // Green border for winners
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  candidateInfo: {
    flexDirection: 'column',
    flex: 1,
    maxWidth: '70%',
  },
  candidateName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 1,
  },
  candidateParty: {
    fontSize: 9,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  candidateVotes: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    minWidth: 60,
    textAlign: 'right',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 80,
  },
  winnerIcon: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: 'bold',
  },
  winnerVotes: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#16a34a',
    minWidth: 60,
    textAlign: 'right',
  },
  demographicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
    borderRadius: 8,
    border: '1px solid #e2e8f0',
  },
  demographicName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  demographicValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  footer: {
    marginTop: 40,
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

// Interface for election results data
interface ElectionResults {
  overview: {
    totalVoters: number;
    votersWhoVoted: number;
    voterTurnout: number;
    recentVotes: number;
  };
  positions: any[];
  demographics: any[];
  election: {
    id: number;
    name: string;
    instanceName?: string | null;
    status: string;
    organization: string;
    schedule: {
      dateFinish: string;
    };
  };
  timestamp: string;
}

// PDF Document Component
const ElectionResultsPDF = ({ results }: { results: ElectionResults }): ReactElement => (
  <Document>
    <Page size="A4" style={styles.page} wrap>
      {/* Header */}
      <View style={styles.header} fixed>
        <Text style={styles.title}>
          {results.election.name && results.election.instanceName 
            ? `${results.election.name} - ${results.election.instanceName}`
            : results.election.name
          }
        </Text>
        <Text style={styles.subtitle}>{results.election.organization}</Text>
      </View>

      {/* KPI Section */}
      <View style={styles.kpiSection} wrap={false}>
        <View style={[styles.kpiCard, styles.kpiCardBlue]}>
          <Text style={styles.kpiTitle}>Vote Count</Text>
          <Text style={styles.kpiValue}>{results.overview.votersWhoVoted}</Text>
        </View>
        <View style={[styles.kpiCard, styles.kpiCardGreen]}>
          <Text style={styles.kpiTitle}>Registered Voters</Text>
          <Text style={styles.kpiValue}>{results.overview.totalVoters}</Text>
        </View>
        <View style={[styles.kpiCard, styles.kpiCardPurple]}>
          <Text style={styles.kpiTitle}>Voter Turnout</Text>
          <Text style={styles.kpiValue}>{results.overview.voterTurnout}%</Text>
        </View>
      </View>

      {/* Positions */}
      <Text style={styles.sectionHeader}>Votes Per Position (Voter Scope)</Text>
      {results.positions.map((position: any) => (
        // there is a break here before
        <View key={position.id} style={styles.positionContainer} wrap={false}>
          <View style={styles.positionHeader}>
            <Text style={styles.positionTitle}>
              {position.name}
              {position.votingScope && (
                <Text style={styles.positionScope}> • Scope: {position.votingScope.name}</Text>
              )}
            </Text>
          </View>
          {position.candidates.map((candidate: any, index: number) => {
            const isWinner = index < position.numOfWinners;
            return (
              <View key={candidate.id} style={isWinner ? styles.winnerCard : styles.candidateCard}>
                <View style={styles.candidateInfo}>
                  <Text style={styles.candidateName}>{candidate.name}</Text>
                  <Text style={styles.candidateParty}>
                    {candidate.party?.name || 'Independent'}
                  </Text>
                </View>
                {isWinner ? (
                  <View style={styles.winnerBadge}>
                    <Text style={styles.winnerIcon}>WINNER</Text>
                    <Text style={styles.winnerVotes}>{candidate.voteCount} votes</Text>
                  </View>
                ) : (
                  <Text style={styles.candidateVotes}>{candidate.voteCount} votes</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}

      {/* Demographics */}
      <View break>
        <Text style={styles.sectionHeader}>Votes Per Demographic (Voter Scope)</Text>
        {results.demographics.map((demo: any) => (
          <View key={demo.id} style={styles.demographicItem}>
            <Text style={styles.demographicName}>{demo.name}</Text>
            <Text style={styles.demographicValue}>{demo.percentage}%</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <Text style={styles.footer} fixed>
        Generated on {new Date().toLocaleString()} • BotoMo'To Election Results
      </Text>
    </Page>
  </Document>
);

/**
 * Generates a PDF buffer from election results data
 * @param results - The election results data
 * @returns Promise<Buffer> - The PDF as a buffer
 */
export async function generateElectionResultsPDF(results: ElectionResults): Promise<Buffer> {
  try {
    console.log('📊 Generating PDF for election:', 
      results.election.instanceName 
        ? `${results.election.name} - ${results.election.instanceName}`
        : results.election.name
    );
    
    const blob = await pdf(<ElectionResultsPDF results={results} />).toBlob();
    
    // Convert blob to buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('✅ PDF generated successfully, size:', buffer.length, 'bytes');
    return buffer;
    
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
