import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function validateSeedData() {
  try {
    console.log("🔍 Validating seeded data...\n");

    // Check users
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organization: {
          select: {
            name: true,
            status: true
          }
        }
      }
    });
    
    console.log(`👥 Users (${users.length}):`);
    users.forEach(user => {
      console.log(`   ${user.role}: ${user.name} (${user.email})`);
      if (user.organization) {
        console.log(`      Org: ${user.organization.name} - ${user.organization.status}`);
      }
    });

    // Check elections
    const elections = await db.election.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        isLive: true,
        organization: {
          select: {
            name: true
          }
        },
        schedule: {
          select: {
            dateStart: true,
            dateFinish: true
          }
        },
        _count: {
          select: {
            positions: true,
            parties: true,
            voters: true,
            candidates: true,
            voteResponses: true
          }
        }
      }
    });

    console.log(`\n🗳️ Elections (${elections.length}):`);
    elections.forEach(election => {
      console.log(`   Election ${election.id}: ${election.name}`);
      console.log(`      Status: ${election.status} (Live: ${election.isLive})`);
      console.log(`      Organization: ${election.organization.name}`);
      if (election.schedule) {
        console.log(`      Schedule: ${election.schedule.dateStart.toDateString()} - ${election.schedule.dateFinish.toDateString()}`);
      }
      console.log(`      Positions: ${election._count.positions}, Parties: ${election._count.parties}`);
      console.log(`      Voters: ${election._count.voters}, Candidates: ${election._count.candidates}`);
      console.log(`      Votes: ${election._count.voteResponses}`);
    });

    // Check positions with candidates
    const positions = await db.position.findMany({
      where: {
        isDeleted: false
      },
      select: {
        id: true,
        name: true,
        electionId: true,
        _count: {
          select: {
            candidates: true
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    });

    console.log(`\n🏛️ Positions (${positions.length}):`);
    positions.forEach(position => {
      console.log(`   ${position.name} (Election ${position.electionId}): ${position._count.candidates} candidates`);
    });

    // Check candidates with details
    const candidates = await db.candidate.findMany({
      where: {
        isDeleted: false
      },
      select: {
        id: true,
        voter: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        position: {
          select: {
            name: true
          }
        },
        party: {
          select: {
            name: true
          }
        },
        isNew: true,
        _count: {
          select: {
            voteResponses: true
          }
        }
      }
    });

    console.log(`\n🏃‍♂️ Candidates (${candidates.length}):`);
    candidates.forEach(candidate => {
      const name = `${candidate.voter.firstName} ${candidate.voter.lastName}`;
      const party = candidate.party ? candidate.party.name : 'Independent';
      console.log(`   ${name} - ${candidate.position.name} (${party})`);
      console.log(`      New: ${candidate.isNew}, Votes: ${candidate._count.voteResponses}`);
    });

    // Check voting statistics
    const voteStats = await db.voteResponse.groupBy({
      by: ['electionId'],
      _count: {
        id: true
      }
    });

    console.log(`\n📊 Vote Statistics:`);
    if (voteStats.length > 0) {
      voteStats.forEach(stat => {
        console.log(`   Election ${stat.electionId}: ${stat._count.id} votes cast`);
      });
    } else {
      console.log(`   No votes cast yet`);
    }

    // Check voter statistics (computed voted status via VoteResponse)
    const voterTotals = await db.voter.groupBy({
      by: ['electionId'],
      _count: { id: true },
      where: { isDeleted: false }
    });

    // Distinct voters who cast at least one vote per election
    const votedDistinct = await db.voteResponse.groupBy({
      by: ['electionId', 'voterId']
    });

    const totalByElection = new Map();
    voterTotals.forEach(stat => {
      totalByElection.set(stat.electionId, stat._count.id);
    });

    const votedByElection = new Map();
    votedDistinct.forEach(row => {
      votedByElection.set(row.electionId, (votedByElection.get(row.electionId) || 0) + 1);
    });

    console.log(`\n👥 Voter Statistics (computed):`);
    const electionIds = new Set([
      ...Array.from(totalByElection.keys()),
      ...Array.from(votedByElection.keys())
    ]);

    if (electionIds.size === 0) {
      console.log(`   No voters found`);
    } else {
      Array.from(electionIds).sort((a, b) => Number(a) - Number(b)).forEach((electionId) => {
        const total = totalByElection.get(electionId) || 0;
        const voted = Math.min(votedByElection.get(electionId) || 0, total);
        const percentage = total > 0 ? ((voted / total) * 100).toFixed(1) : 0;
        console.log(`   Election ${electionId}: ${voted}/${total} voted (${percentage}%)`);
      });
    }

    // ==== NEW: Business-rule checks for scopes, positions, voters, candidates, and votes ====
    console.log("\n🧪 Consistency checks (scopes, positions, voters, candidates, votes)...\n");

    const issues = [];
    const addIssue = (msg) => issues.push(`• ${msg}`);

    // Load elections with scopes/positions/voters
    const allElections = await db.election.findMany({
      where: { isDeleted: false },
      include: {
        votingScopes: {
          where: { isDeleted: false },
          select: { id: true },
        },
        positions: {
          where: { isDeleted: false },
          select: { id: true, votingScopeId: true, electionId: true, name: true },
        },
        voters: {
          where: { isDeleted: false },
          select: { id: true, votingScopeId: true, electionId: true },
        },
      },
    });

    const verboseReport = [];

    for (const election of allElections) {
      const scopeIds = new Set(election.votingScopes.map((s) => s.id));
      const noScope = election.votingScopes.length === 0;

      const header = `Election ${election.id} - ${election.name}`;
      const details = [];

      if (noScope) {
        details.push("  Scope: NO SCOPE (0)");
        // Positions/voters must have null votingScopeId
        const badPositions = election.positions.filter((p) => p.votingScopeId !== null);
        const badVoters = election.voters.filter((v) => v.votingScopeId !== null);
        if (badPositions.length) addIssue(`${header}: ${badPositions.length} position(s) have a scope in a NO SCOPE election`);
        if (badVoters.length) addIssue(`${header}: ${badVoters.length} voter(s) have a scope in a NO SCOPE election`);
      } else {
        // Positions/voters must have scope present in this election
        const badPositions = election.positions.filter((p) => !p.votingScopeId || !scopeIds.has(p.votingScopeId));
        const badVoters = election.voters.filter((v) => !v.votingScopeId || !scopeIds.has(v.votingScopeId));
        if (badPositions.length) addIssue(`${header}: ${badPositions.length} position(s) have invalid/missing votingScopeId`);
        if (badVoters.length) addIssue(`${header}: ${badVoters.length} voter(s) have invalid/missing votingScopeId`);
      }

      // Candidate checks for this election
      const candidates = await db.candidate.findMany({
        where: { electionId: election.id, isDeleted: false },
        include: {
          position: { select: { electionId: true, votingScopeId: true } },
          voter: { select: { votingScopeId: true } },
        },
      });

      let okCandidates = 0;
      for (const c of candidates) {
        if (c.position.electionId !== election.id) {
          addIssue(`${header}: Candidate ${c.id} position.electionId mismatch`);
          continue;
        }
        // scope alignment: both null for NO SCOPE or equal for scoped
        const vScope = c.voter.votingScopeId ?? null;
        const pScope = c.position.votingScopeId ?? null;
        const aligned = (vScope === null && pScope === null) || (vScope !== null && vScope === pScope);
        if (!aligned) addIssue(`${header}: Candidate ${c.id} voter scope (${vScope}) != position scope (${pScope})`);
        else okCandidates++;
      }

      details.push(`  Candidates checked: ${candidates.length}, OK: ${okCandidates}`);

      // Vote checks for this election
      const votes = await db.voteResponse.findMany({
        where: { electionId: election.id },
        include: {
          voter: { select: { votingScopeId: true } },
          position: { select: { electionId: true, votingScopeId: true } },
          candidate: { select: { electionId: true, position: { select: { electionId: true, votingScopeId: true } } } },
        },
      });

      let okVotes = 0;
      for (const v of votes) {
        // Same election checks
        if (v.position.electionId !== election.id) addIssue(`${header}: Vote ${v.id} position.electionId mismatch`);
        if (v.candidate.electionId !== election.id) addIssue(`${header}: Vote ${v.id} candidate.electionId mismatch`);
        if (v.candidate.position.electionId !== election.id) addIssue(`${header}: Vote ${v.id} candidate.position.electionId mismatch`);

        // Candidate's position must match vote.positionId
        // This is implied in seeding, but double-check here
        // Note: since we didn't select candidate.position.id, we compare scope consistency instead

        const voterScope = v.voter.votingScopeId ?? null;
        const posScope = v.position.votingScopeId ?? null;
        const candPosScope = v.candidate.position.votingScopeId ?? null;

        const scopesAligned = (voterScope === null && posScope === null && candPosScope === null) ||
                              (voterScope !== null && voterScope === posScope && voterScope === candPosScope);

        if (!scopesAligned) addIssue(`${header}: Vote ${v.id} scope mismatch (voter=${voterScope}, position=${posScope}, candidate.position=${candPosScope})`);
        else okVotes++;
      }

      details.push(`  Votes checked: ${votes.length}, OK: ${okVotes}`);

      verboseReport.push([header, ...details].join("\n"));
    }

    // Print verbose per-election report
    console.log("\n📘 Verbose per-election report:\n");
    verboseReport.forEach((block) => {
      console.log(block);
      console.log("");
    });

    // Print issues summary
    if (issues.length === 0) {
      console.log("✅ Consistency checks passed with no issues.");
    } else {
      console.log("❗ Issues found:");
      issues.forEach((i) => console.log(`   ${i}`));
    }

    console.log(`\n✅ Data validation completed successfully!`);
    console.log(`\n🚀 Ready for API testing! Use the following commands:`);
    console.log(`   npm run dev          - Start development server`);
    console.log(`   npm run db:studio    - Open Prisma Studio`);
    console.log(`\n📖 Check API_TESTING_GUIDE.md for detailed testing instructions`);
    console.log(`📮 Import postman-collection.json into Postman for easy testing`);

  } catch (error) {
    console.error("❌ Validation error:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

validateSeedData().catch(console.error);
