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

// Resend organization and admin data
const resendOrganization = {
  name: "Resend Testing Institute",
  email: "org@resend.com",
  membersCount: 2000,
  photoUrl: "/assets/sample/logo.png",
  letterUrl: "/assets/sample/letter.pdf"
};

const resendAdmin = {
  name: "Brian Resend",
  email: "brian@resend.com",
  password: "Admin@777"
};

const resendElection = {
  name: "Resend Testing Election",
  description: "Election for testing email deliverability with Resend",
  allowSurvey: false,
};

// Resend test email domains for different scenarios
const resendTestDomains = [
  "delivered", // For successful delivery testing
  "bounced",   // For bounce testing
  "complained" // For spam testing
];

const parties = [
  { name: "Progressive Students", color: "#3B82F6" },
  { name: "Unity Party", color: "#10B981" },
  { name: "Innovation Alliance", color: "#8B5CF6" },
  { name: "Student Voice", color: "#F59E0B" }
];

// Generate realistic voter data using resend.dev test emails
async function generateResendVoters(electionId, count = 150) {
  const firstNames = [
    "Alex", "Blake", "Casey", "Dana", "Ellis", "Finley", "Gray", "Harper", 
    "Ian", "Jordan", "Kelly", "Logan", "Morgan", "Noel", "Parker", "Quinn",
    "River", "Sage", "Taylor", "Uri", "Vale", "Wren", "Xander", "Yael", "Zara"
  ];
  
  const lastNames = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White"
  ];

  const voters = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    // Use resend.dev test email addresses with incremental user labels
    const testDomain = resendTestDomains[Math.floor(Math.random() * resendTestDomains.length)];
    const email = `${testDomain}+user${i + 1}@resend.dev`;
    
    // Generate unique voter code
    const voterCode = await generateUniqueVoterCode();
    
    voters.push({
      electionId,
      code: voterCode,
      email,
      firstName,
      lastName,
      contactNum: `+1${Math.floor(Math.random() * 900000000) + 100000000}`,
      isVerified: Math.random() > 0.1, // 90% verified
      isActive: Math.random() > 0.05 // 95% active
    });
  }
  
  return voters;
}

async function addResendData() {
  try {
    console.log("🌱 Adding Resend testing data...");

    // Check if resend admin already exists
    const existingAdmin = await db.user.findUnique({
      where: { email: resendAdmin.email }
    });

    if (existingAdmin) {
      console.log("⚠️ Resend admin already exists, skipping...");
      return;
    }

    console.log("✨ Creating Resend admin user and organization...");
    
    // Create admin user
    const hashedPassword = await bcrypt.hash(resendAdmin.password, 12);
    
    const admin = await db.user.create({
      data: {
        name: resendAdmin.name,
        email: resendAdmin.email,
        password: hashedPassword,
        role: "ADMIN",
        emailVerified: new Date()
      }
    });

    // Create organization
    const org = await db.organization.create({
      data: {
        ...resendOrganization,
        adminId: admin.id,
        status: "APPROVED"
      }
    });

    console.log(`   ✓ Created organization: ${org.name}`);

    console.log("🗳️ Creating Resend election with schedule...");
    
    // Create election
    const election = await db.election.create({
      data: {
        ...resendElection,
        orgId: org.id,
        status: "ACTIVE",
      },
    });

    // Create schedule
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30 days for testing
    
    await db.electionSched.create({
      data: { 
        electionId: election.id, 
        dateStart: startDate, 
        dateFinish: endDate 
      },
    });

    // Create MFA settings
    await db.mfaSettings.create({
      data: { 
        electionId: election.id, 
        mfaEnabled: true, 
        mfaMethod: "EMAIL" 
      },
    });

    console.log(`   ✓ Created election: ${election.name}`);

    console.log("📍 Creating voting scopes...");
    
    // Create exactly 3 scopes: Level 1/2/3 (same as IBITS pattern)
    const resendScopeNames = ["Level 1", "Level 2", "Level 3"];
    const createdScopes = [];
    
    for (const name of resendScopeNames) {
      const scope = await db.votingScope.create({
        data: {
          name,
          description: `${name} voters for Resend testing`,
          electionId: election.id,
        },
      });
      createdScopes.push(scope);
    }

    console.log(`   ✓ Created ${createdScopes.length} voting scopes`);

    console.log("🎭 Creating parties...");
    
    // Create parties for the election
    const createdParties = [];
    for (const party of parties) {
      const createdParty = await db.party.create({
        data: {
          ...party,
          electionId: election.id
        }
      });
      createdParties.push(createdParty);
    }

    console.log(`   ✓ Created ${createdParties.length} parties`);

    console.log("🏛️ Creating positions...");
    
    // Create exactly 3 positions LEVEL 1/2/3 bound 1:1 to Level 1/2/3 scopes
    const createdPositions = [];
    const byName = new Map(createdScopes.map((s) => [s.name.toLowerCase(), s]));
    const resendPositions = [
      { name: "LEVEL 1", scopeKey: "level 1" },
      { name: "LEVEL 2", scopeKey: "level 2" },
      { name: "LEVEL 3", scopeKey: "level 3" },
    ];
    
    let order = 1;
    for (const p of resendPositions) {
      const scope = byName.get(p.scopeKey);
      if (!scope) continue;
      
      const pos = await db.position.create({
        data: {
          name: p.name,
          voteLimit: 1,
          numOfWinners: 1,
          order: order++,
          electionId: election.id,
          votingScopeId: scope.id,
        },
      });
      createdPositions.push(pos);
    }

    console.log(`   ✓ Created ${createdPositions.length} positions`);

    console.log("👥 Creating voters with Resend test emails...");
    
    // Generate voters with resend.dev test emails
    const voters = await generateResendVoters(election.id, 150); // 150 voters for testing
    const createdVoters = [];

    // Distribute evenly across Level 1/2/3 scopes (same as IBITS pattern)
    for (let i = 0; i < voters.length; i++) {
      const voter = voters[i];
      const assignedScope = createdScopes[i % createdScopes.length];
      
      const createdVoter = await db.voter.create({
        data: {
          ...voter,
          votingScopeId: assignedScope.id,
        },
      });
      createdVoters.push(createdVoter);
    }

    console.log(`   ✓ Created ${createdVoters.length} voters with resend.dev test emails`);

    console.log("🏃‍♂️ Creating candidates...");

    // Create candidates within their scope
    const createdCandidates = [];
    
    for (const position of createdPositions) {
      const scopedVoters = createdVoters.filter((v) => v.votingScopeId === position.votingScopeId);
      if (scopedVoters.length === 0) continue;

      const numCandidates = Math.floor(Math.random() * 3) + 2; // 2-4 candidates
      for (let i = 0; i < Math.min(numCandidates, scopedVoters.length); i++) {
        const voterIndex = Math.floor(Math.random() * scopedVoters.length);
        const voter = scopedVoters[voterIndex];

        // Skip if this voter is already a candidate
        const existingCandidate = await db.candidate.findUnique({
          where: { voterId: voter.id },
        });
        if (existingCandidate) continue;

        const randomParty = Math.random() > 0.3 ?
          createdParties[Math.floor(Math.random() * createdParties.length)] : null;

        const candidate = await db.candidate.create({
          data: {
            electionId: election.id,
            voterId: voter.id,
            positionId: position.id,
            partyId: randomParty?.id || null,
            isNew: Math.random() > 0.7, // 30% are new
            imageUrl: `/assets/sample/logo.png`,
            credentialUrl: `/assets/sample/credential.pdf`,
          },
        });

        createdCandidates.push(candidate);
      }
    }

    console.log(`   ✓ Created ${createdCandidates.length} candidates`);

    console.log("🗳️ Creating vote responses...");
    
    // Create some vote responses for a random subset of voters
    const votedVoters = createdVoters.filter(() => Math.random() > 0.6); // 40% of voters have voted
    let voteCount = 0;
    let electionChainOrder = 1; // Chain order starts from 1 for this election
    let lastVoteHash = '0'; // Genesis hash for this election
    
    for (const voter of votedVoters) {
      const voterPositions = createdPositions.filter(
        (p) => p.votingScopeId === voter.votingScopeId
      );
      
      for (const position of voterPositions) {
        const candidates = createdCandidates.filter(
          (c) => c.positionId === position.id
        );

        if (candidates.length > 0) {
          const numVotes = Math.min(position.voteLimit, candidates.length);
          const selectedCandidates = candidates
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.floor(Math.random() * numVotes) + 1);

          for (const candidate of selectedCandidates) {
            // Generate chain hash data (per election)
            const timestamp = new Date();
            const voteData = `${voter.id}-${candidate.id}-${position.id}-${timestamp.getTime()}-${electionChainOrder}`;
            const chainData = `${voteData}-${lastVoteHash}`;
            const voteHash = crypto.createHash('sha256').update(chainData).digest('hex');
            
            // Generate HMAC signature
            const signature = crypto.createHmac('sha256', VOTE_SECRET)
              .update(chainData)
              .digest('hex');

            await db.voteResponse.create({
              data: {
                electionId: election.id,
                voterId: voter.id,
                candidateId: candidate.id,
                positionId: position.id,
                voteHash: voteHash,
                prevHash: lastVoteHash,
                chainOrder: electionChainOrder,
                signature: signature,
                timestamp: timestamp,
              },
            });

            // Update for next vote in this election's chain
            lastVoteHash = voteHash;
            electionChainOrder++;
            voteCount++;
          }
        }
      }
    }

    console.log(`   ✓ Created ${voteCount} vote responses`);

    console.log("📊 Resend data addition completed successfully!");
    console.log("\n📈 Summary of added data:");

    console.log(`   Organization: 1 (${org.name})`);
    console.log(`   Admin User: 1 (${admin.name})`);
    console.log(`   Election: 1 (${election.name})`);
    console.log(`   Positions: ${createdPositions.length}`);
    console.log(`   Parties: ${createdParties.length}`);
    console.log(`   Voting Scopes: ${createdScopes.length}`);
    console.log(`   Voters: ${createdVoters.length} (with resend.dev test emails)`);
    console.log(`   Candidates: ${createdCandidates.length}`);
    console.log(`   Votes Cast: ${voteCount}`);

    console.log("\n🔐 Resend Test Credentials:");
    console.log(`   Admin: ${resendAdmin.name}`);
    console.log(`   Email: ${resendAdmin.email}`);
    console.log(`   Password: ${resendAdmin.password}`);

    console.log("\n📧 Email Testing Info:");
    console.log("   All voter emails use resend.dev test addresses:");
    console.log("   - delivered+user1@resend.dev to delivered+user150@resend.dev");
    console.log("   - bounced+user1@resend.dev to bounced+user150@resend.dev");
    console.log("   - complained+user1@resend.dev to complained+user150@resend.dev");
    console.log("   These emails are safe for bulk testing and won't affect domain reputation!");

    console.log("\n🎯 Scope Distribution:");
    const level1Count = createdVoters.filter(v => 
      createdScopes.find(s => s.id === v.votingScopeId)?.name === "Level 1"
    ).length;
    const level2Count = createdVoters.filter(v => 
      createdScopes.find(s => s.id === v.votingScopeId)?.name === "Level 2"
    ).length;
    const level3Count = createdVoters.filter(v => 
      createdScopes.find(s => s.id === v.votingScopeId)?.name === "Level 3"
    ).length;
    
    console.log(`   Level 1: ${level1Count} voters`);
    console.log(`   Level 2: ${level2Count} voters`);
    console.log(`   Level 3: ${level3Count} voters`);

  } catch (error) {
    console.error("❌ Error adding Resend data:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the script
addResendData().catch(console.error);
