import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const db = new PrismaClient();

// Generate a unique voter code
async function generateUniqueVoterCode() {
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    // Generate a 6-digit number (100000 to 999999)
    code = Math.floor(Math.random() * 900000 + 100000).toString();
    
    // Check if this code already exists
    const existingVoter = await db.voter.findUnique({
      where: { code }
    });
    
    if (!existingVoter) {
      isUnique = true;
    }
  }
  
  return code;
}

async function quickSeed() {
  try {
    console.log("🚀 Quick seeding for API testing...");

    // Create a test admin if doesn't exist
    const testAdmin = await db.user.upsert({
      where: { email: "testadmin@example.com" },
      update: {},
      create: {
        name: "Test Admin",
        email: "testadmin@example.com",
        password: await bcrypt.hash("TestAdmin@123", 12),
        role: "ADMIN",
        emailVerified: new Date()
      }
    });

    console.log(`✓ Test admin: ${testAdmin.email} / TestAdmin@123`);

    // Create organization
    const testOrg = await db.organization.upsert({
      where: { adminId: testAdmin.id },
      update: {},
      create: {
        adminId: testAdmin.id,
        name: "Test University",
        email: "admin@testuniversity.edu",
        membersCount: 1000,
        status: "APPROVED",
        photoUrl: "/assets/sample/logo.png",
        letterUrl: "/assets/sample/letter.pdf"
      }
    });

    // Create election
    const testElection = await db.election.upsert({
      where: { id: 1 },
      update: {},
      create: {
        orgId: testOrg.id,
        name: "Test Election 2025",
        description: "Sample election for API testing",
        status: "ACTIVE",
        isLive: true,
        allowSurvey: true
      }
    });

    // Create schedule
    await db.electionSched.upsert({
      where: { electionId: testElection.id },
      update: {},
      create: {
        electionId: testElection.id,
        dateStart: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started yesterday
        dateFinish: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Ends in 7 days
      }
    });

    // Create voting scope
    const testScope = await db.votingScope.create({
      data: {
        electionId: testElection.id,
        type: "LEVEL",
        name: "All Students",
        description: "All university students"
      }
    });

    // Create positions
    const positions = [
      { name: "President", description: "Student body president", order: 1 },
      { name: "Vice President", description: "Student body vice president", order: 2 },
      { name: "Secretary", description: "Student council secretary", order: 3 }
    ];

    const createdPositions = [];
    for (const pos of positions) {
      const position = await db.position.create({
        data: {
          ...pos,
          electionId: testElection.id,
          votingScopeId: testScope.id,
          voteLimit: 1,
          numOfWinners: 1
        }
      });
      createdPositions.push(position);
    }

    // Create parties
    const parties = [
      { name: "Progressive Party", color: "#3B82F6", description: "Progressive policies" },
      { name: "Unity Party", color: "#10B981", description: "Unity and collaboration" }
    ];

    const createdParties = [];
    for (const party of parties) {
      const createdParty = await db.party.create({
        data: {
          ...party,
          electionId: testElection.id
        }
      });
      createdParties.push(createdParty);
    }

    // Create voters
    const voters = [];
    for (let i = 1; i <= 20; i++) {
      const voterCode = await generateUniqueVoterCode();
      
      const voter = await db.voter.create({
        data: {
          electionId: testElection.id,
          code: voterCode,
          email: `voter${i}@testuniversity.edu`,
          firstName: `Voter${i}`,
          lastName: "Test",
          contactNum: `+1555000${String(i).padStart(4, '0')}`,
          address: `${i} Test Street`,
          votingScopeId: testScope.id,
          isVerified: true,
          isActive: true,
          hasVoted: i <= 10 // First 10 have voted
        }
      });
      voters.push(voter);
    }

    // Create candidates
    for (let posIndex = 0; posIndex < createdPositions.length; posIndex++) {
      const position = createdPositions[posIndex];
      
      // 2-3 candidates per position
      for (let i = 0; i < 3; i++) {
        const voterIndex = posIndex * 3 + i;
        if (voterIndex < voters.length) {
          const candidate = await db.candidate.create({
            data: {
              electionId: testElection.id,
              voterId: voters[voterIndex].id,
              positionId: position.id,
              partyId: i < 2 ? createdParties[i % 2].id : null,
              bio: `Experienced candidate for ${position.name}. Committed to student success.`,
              imageUrl: `/assets/sample/logo.png`, // Using sample logo as placeholder for candidate image
              isNew: i === 2
            }
          });

          // Add some experiences
          await db.candidateLeadershipExperience.create({
            data: {
              candidateId: candidate.id,
              organization: "Student Council",
              position: "Member",
              dateRange: "2023-2024",
              description: "Active member of student council"
            }
          });
        }
      }
    }

    // Create some votes
    const votedVoters = voters.slice(0, 10);
    for (const voter of votedVoters) {
      for (const position of createdPositions) {
        const candidates = await db.candidate.findMany({
          where: { positionId: position.id }
        });
        
        if (candidates.length > 0) {
          const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
          await db.voteResponse.create({
            data: {
              electionId: testElection.id,
              voterId: voter.id,
              candidateId: randomCandidate.id,
              positionId: position.id,
              voteHash: `quick_${voter.id}_${randomCandidate.id}`,
              timestamp: new Date()
            }
          });
        }
      }
    }

    console.log("✅ Quick seed completed!");
    console.log("🔗 Test data created:");
    console.log(`   Election ID: ${testElection.id}`);
    console.log(`   Positions: ${createdPositions.length}`);
    console.log(`   Candidates: ${createdPositions.length * 3}`);
    console.log(`   Voters: ${voters.length}`);
    console.log(`   Votes: ${votedVoters.length * createdPositions.length}`);

  } catch (error) {
    console.error("❌ Quick seed error:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

quickSeed().catch(console.error);
