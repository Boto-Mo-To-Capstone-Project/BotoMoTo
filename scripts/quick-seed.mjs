import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";

const db = new PrismaClient();

// Secret key for HMAC (use environment variable or generate one)
const VOTE_SECRET = process.env.VOTE_SECRET;

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
        logoObjectKey: "assets/sample/logo.png",
        logoProvider: "local",
        letterObjectKey: "assets/sample/letter.pdf",
        letterProvider: "local"
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
        name: "All Students",
        description: "All university students"
      }
    });

    // Create positions
    const positions = [
      { name: "President", order: 1 },
      { name: "Vice President", order: 2 },
      { name: "Secretary", order: 3 }
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
      { name: "Progressive Party", color: "#3B82F6" },
      { name: "Unity Party", color: "#10B981" }
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
          votingScopeId: testScope.id,
          isVerified: true,
          isActive: true
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
          await db.candidate.create({
            data: {
              electionId: testElection.id,
              voterId: voters[voterIndex].id,
              positionId: position.id,
              partyId: i < 2 ? createdParties[i % 2].id : null,
              imageObjectKey: `assets/sample/logo.png`, 
              imageProvider: "local",
              credentialObjectKey: `assets/sample/credential.pdf`,
              credentialProvider: "local",
            }
          });
        }
      }
    }

    // Create some votes
    const votedVoters = voters.slice(0, 10);
    let electionChainOrder = 1; // Chain order starts from 1 for this election
    let lastVoteHash = '0'; // Genesis hash for this election
    
    for (const voter of votedVoters) {
      for (const position of createdPositions) {
        const candidates = await db.candidate.findMany({
          where: { positionId: position.id }
        });
        
        if (candidates.length > 0) {
          const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
          
          // Generate chain hash data (per election)
          const timestamp = new Date();
          const voteData = `${voter.id}-${randomCandidate.id}-${position.id}-${timestamp.getTime()}-${electionChainOrder}`;
          const chainData = `${voteData}-${lastVoteHash}`;
          const voteHash = crypto.createHash('sha256').update(chainData).digest('hex');
          
          // Generate HMAC signature
          const signature = crypto.createHmac('sha256', VOTE_SECRET)
            .update(chainData)
            .digest('hex');

          await db.voteResponse.create({
            data: {
              electionId: testElection.id,
              voterId: voter.id,
              candidateId: randomCandidate.id,
              positionId: position.id,
              voteHash: voteHash,
              prevHash: lastVoteHash,
              chainOrder: electionChainOrder,
              signature: signature,
              timestamp: timestamp
            }
          });

          // Update for next vote in this election's chain
          lastVoteHash = voteHash;
          electionChainOrder++;
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
