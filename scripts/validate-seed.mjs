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
        bio: true,
        isNew: true,
        _count: {
          select: {
            leaderships: true,
            workExps: true,
            educations: true,
            voteResponses: true
          }
        }
      }
    });

    console.log(`\n🏃‍♂️ Candidates (${candidates.length}):`);
    candidates.forEach(candidate => {
      const name = `${candidate.voter.firstName} ${candidate.voter.lastName}`;
      const party = candidate.party ? candidate.party.name : 'Independent';
      const experiences = candidate._count.leaderships + candidate._count.workExps + candidate._count.educations;
      console.log(`   ${name} - ${candidate.position.name} (${party})`);
      console.log(`      New: ${candidate.isNew}, Experiences: ${experiences}, Votes: ${candidate._count.voteResponses}`);
      console.log(`      Bio: ${candidate.bio ? candidate.bio.substring(0, 50) + '...' : 'No bio'}`);
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

    // Check voter statistics
    const voterStats = await db.voter.groupBy({
      by: ['electionId', 'hasVoted'],
      _count: {
        id: true
      },
      where: {
        isDeleted: false
      }
    });

    console.log(`\n👥 Voter Statistics:`);
    const votersByElection = {};
    voterStats.forEach(stat => {
      if (!votersByElection[stat.electionId]) {
        votersByElection[stat.electionId] = { voted: 0, notVoted: 0 };
      }
      if (stat.hasVoted) {
        votersByElection[stat.electionId].voted = stat._count.id;
      } else {
        votersByElection[stat.electionId].notVoted = stat._count.id;
      }
    });

    Object.entries(votersByElection).forEach(([electionId, stats]) => {
      const total = stats.voted + stats.notVoted;
      const percentage = total > 0 ? ((stats.voted / total) * 100).toFixed(1) : 0;
      console.log(`   Election ${electionId}: ${stats.voted}/${total} voted (${percentage}%)`);
    });

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
