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

// Sample data arrays
const organizations = [
  {
    name: "University of Technology",
    email: "admin@university.edu",
    membersCount: 5000,
    photoUrl: "/assets/sample/logo.png",
    letterUrl: "/assets/sample/letter.pdf"
  },
  {
    name: "City College",
    email: "admin@citycollege.edu", 
    membersCount: 3000,
    photoUrl: "/assets/sample/logo.png",
    letterUrl: "/assets/sample/letter.pdf"
  },
  {
    name: "Metro High School",
    email: "admin@metrohigh.edu",
    membersCount: 1200,
    photoUrl: "/assets/sample/logo.png",
    letterUrl: "/assets/sample/letter.pdf"
  },
  // New organization for ibits
  {
    name: "Institute of Bachelors in Information Technology Studies",
    email: "org@ibits.com",
    membersCount: 1500,
    photoUrl: "/assets/sample/logo.png",
    letterUrl: "/assets/sample/letter.pdf"
  }
];

const adminUsers = [
  {
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@university.edu",
    password: "Admin@123"
  },
  {
    name: "Prof. Michael Chen", 
    email: "michael.chen@citycollege.edu",
    password: "Admin@456"
  },
  {
    name: "Principal Lisa Brown",
    email: "lisa.brown@metrohigh.edu", 
    password: "Admin@789"
  },
  // New admin for ibits
  {
    name: "Brian Sebastian",
    email: "brian@ibits.com",
    password: "Admin@999"
  }
];

const elections = [
  {
    name: "Student Council Election 2025",
    description: "Annual student council election for academic year 2025-2026",
    allowSurvey: true
  },
  {
    name: "Department Representative Election",
    description: "Election for department representatives in academic senate",
    allowSurvey: false
  },
  {
    name: "Class President Election",
    description: "Election for class presidents across all grade levels",
    allowSurvey: true
  }
];

const positions = [
  { name: "President", voteLimit: 1, numOfWinners: 1, order: 1 },
  { name: "Vice President", voteLimit: 1, numOfWinners: 1, order: 2 },
  { name: "Secretary", voteLimit: 1, numOfWinners: 1, order: 3 },
  { name: "Treasurer", voteLimit: 1, numOfWinners: 1, order: 4 },
  { name: "Senator", voteLimit: 3, numOfWinners: 5, order: 5 },
  { name: "Class Representative", voteLimit: 2, numOfWinners: 3, order: 6 }
];

const parties = [
  { name: "Progressive Students", color: "#3B82F6" },
  { name: "Unity Party", color: "#10B981" },
  { name: "Innovation Alliance", color: "#8B5CF6" },
  { name: "Student Voice", color: "#F59E0B" }
];

const votingScopes = [
  { name: "Undergraduate", description: "All undergraduate students" },
  { name: "Graduate", description: "All graduate students" },
  { name: "Engineering", description: "Engineering department students" },
  { name: "Business", description: "Business department students" },
  { name: "Arts & Sciences", description: "Arts and Sciences students" },
  { name: "Campus North", description: "Students in north campus area" },
  { name: "Campus South", description: "Students in south campus area" }
];

// Generate realistic voter data
async function generateVoters(electionId, count = 100) {
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

  const domains = ["university.edu", "citycollege.edu", "student.edu"];
  
  const voters = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domains[Math.floor(Math.random() * domains.length)]}`;
    
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

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");

    // Clear existing data (be careful!)
    console.log("🧹 Cleaning existing data...");
    await db.auditTableAffected.deleteMany({});
    await db.audits.deleteMany({});
    await db.voteResponse.deleteMany({});
    await db.candidate.deleteMany({});
    await db.voter.deleteMany({});
    await db.position.deleteMany({});
    await db.party.deleteMany({});
    await db.votingScope.deleteMany({});
    await db.electionSched.deleteMany({});
    await db.mfaSettings.deleteMany({});
    await db.election.deleteMany({});
    await db.organization.deleteMany({});
    await db.user.deleteMany({ where: { role: { not: "SUPER_ADMIN" } } });

    console.log("✨ Creating admin users and organizations...");
    
    // Create admin users and organizations
    const createdOrgs = [];
    for (let i = 0; i < organizations.length; i++) {
      const hashedPassword = await bcrypt.hash(adminUsers[i].password, 12);
      
      const admin = await db.user.create({
        data: {
          name: adminUsers[i].name,
          email: adminUsers[i].email,
          password: hashedPassword,
          role: "ADMIN",
          emailVerified: new Date()
        }
      });

      const org = await db.organization.create({
        data: {
          ...organizations[i],
          adminId: admin.id,
          status: "APPROVED"
        }
      });

      createdOrgs.push(org);
      console.log(`   ✓ Created organization: ${org.name}`);
    }

    console.log("🗳️ Creating elections with schedules...");
    
    // Create elections with a plan: org[0] gets many elections, org[1] gets one, org[2] gets none
    const createdElections = [];
    const noScopeElectionIds = new Set();
    // Track ibits election to customize scopes/positions/voters
    const ibitsElectionIds = new Set();

    // Helper for creating an election + schedule + MFA
    async function createElectionForOrg(org, electionDef) {
      const idx = createdElections.length; // overall index for status/mfa variety
      const election = await db.election.create({
        data: {
          ...electionDef,
          orgId: org.id,
          status: idx === 0 ? "ACTIVE" : "DRAFT",
        },
      });

      // schedule
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      await db.electionSched.create({
        data: { electionId: election.id, dateStart: startDate, dateFinish: endDate },
      });

      // MFA settings
      await db.mfaSettings.create({
        data: { electionId: election.id, mfaEnabled: idx === 0, mfaMethod: "EMAIL" },
      });

      createdElections.push(election);
      console.log(`   ✓ Created election: ${election.name} (Org: ${org.name})`);
      return election;
    }

    // Plan
    const org0 = createdOrgs[0];
    const org1 = createdOrgs[1];
    const org2 = createdOrgs[2];
    const org3 = createdOrgs[3]; // ibits

    if (org0) {
      // First org has MANY elections (sample: 2 elections)
      const deptRepElection = await createElectionForOrg(org0, elections[1]); // DEPARTMENT-based
      const councilElection = await createElectionForOrg(org0, elections[0]); // Will be NO SCOPE
      // mark the Student Council as NO SCOPE sample
      if (councilElection.name.toLowerCase().includes("student council")) {
        noScopeElectionIds.add(councilElection.id);
        console.log(`   → Marked as NO SCOPE: ${councilElection.name}`);
      }
    }

    if (org1) {
      // Second org has ONE election
      await createElectionForOrg(org1, elections[2]);
    }

    if (org2) {
      // Third org: no elections (sample)
      console.log(`   • No elections created for: ${org2.name}`);
    }

    // ibits: create dedicated election
    if (org3) {
      const ibitsElection = await createElectionForOrg(org3, {
        name: "IBITS Election",
        description: "Election for the Institute of Bachelors in Information Technology Studies",
        allowSurvey: false,
      });
      ibitsElectionIds.add(ibitsElection.id);
      console.log(`   → Marked as IBITS ELECTION: ${ibitsElection.name}`);
    }

    console.log("📍 Creating voting scopes...");
    
    // Create voting scopes for each election (no scope type)
    const createdScopes = [];
    const scopesByElection = new Map();
    for (const election of createdElections) {
      if (noScopeElectionIds.has(election.id)) {
        scopesByElection.set(election.id, []);
        console.log(`   ✓ ${election.name}: created 0 scope(s) [NO SCOPE]`);
        continue;
      }

      // IBITS ELECTION: exactly 3 scopes Level 1/2/3
      if (ibitsElectionIds.has(election.id)) {
        const ibitsScopeNames = ["Level 1", "Level 2", "Level 3"];
        const scopesForElection = [];
        for (const name of ibitsScopeNames) {
          const scope = await db.votingScope.create({
            data: {
              name,
              description: `${name} voters`,
              electionId: election.id,
            },
          });
          createdScopes.push(scope);
          scopesForElection.push(scope);
        }
        scopesByElection.set(election.id, scopesForElection);
        console.log(`   ✓ ${election.name}: created ${scopesForElection.length} scope(s) [IBITS ELECTION]`);
        continue;
      }

      const options = votingScopes; // no per-row type filtering
      const toCreate = options.slice(0, Math.min(3, options.length));

      const scopesForElection = [];
      for (const scopeDef of toCreate) {
        const scope = await db.votingScope.create({
          data: {
            name: scopeDef.name,
            description: scopeDef.description || `${scopeDef.name} group`,
            electionId: election.id,
          },
        });
        createdScopes.push(scope);
        scopesForElection.push(scope);
      }

      scopesByElection.set(election.id, scopesForElection);
      console.log(`   ✓ ${election.name}: created ${scopesForElection.length} scope(s)`);
    }

    console.log("🎭 Creating parties...");
    
    // Create parties for each election
    const createdParties = [];
    for (const election of createdElections) {
      for (const party of parties) {
        const createdParty = await db.party.create({
          data: {
            ...party,
            electionId: election.id
          }
        });
        createdParties.push(createdParty);
      }
    }

    console.log("🏛️ Creating positions...");
    
    // Create positions PER SCOPE so each scope has the full set of positions
    const createdPositions = [];
    const positionsByElection = new Map();
    for (const election of createdElections) {
      const scopesForElection = scopesByElection.get(election.id) || [];
      const positionsForElection = [];

      // IBITS ELECTION: create exactly 3 positions LEVEL 1/2/3 bound 1:1 to Level 1/2/3 scopes
      if (ibitsElectionIds.has(election.id)) {
        const byName = new Map(scopesForElection.map((s) => [s.name.toLowerCase(), s]));
        const ibitsPositions = [
          { name: "LEVEL 1", scopeKey: "level 1" },
          { name: "LEVEL 2", scopeKey: "level 2" },
          { name: "LEVEL 3", scopeKey: "level 3" },
        ];
        let order = 1;
        for (const p of ibitsPositions) {
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
          positionsForElection.push(pos);
        }
        positionsByElection.set(election.id, positionsForElection);
        console.log(`   ✓ ${election.name}: created ${positionsForElection.length} position(s) [IBITS ELECTION]`);
        continue;
      }

      if (scopesForElection.length === 0) {
        // NO SCOPE: create one set of positions without votingScopeId
        for (const position of positions) {
          const pos = await db.position.create({
            data: {
              ...position,
              electionId: election.id,
              votingScopeId: null,
            },
          });
          createdPositions.push(pos);
          positionsForElection.push(pos);
        }
      } else {
        for (const scope of scopesForElection) {
          for (const position of positions) {
            const pos = await db.position.create({
              data: {
                ...position,
                electionId: election.id,
                votingScopeId: scope.id,
              },
            });
            createdPositions.push(pos);
            positionsForElection.push(pos);
          }
        }
      }

      positionsByElection.set(election.id, positionsForElection);
      console.log(`   ✓ ${election.name}: created ${positionsForElection.length} position(s)`);
    }

    console.log("👥 Creating voters...");
    
    // Create voters for each election and assign them to one of the election's scopes (or none)
    const createdVoters = [];
    for (const election of createdElections) {
      const voters = await generateVoters(election.id, 50); // 50 voters per election
      const scopesForElection = scopesByElection.get(election.id) || [];

      // IBITS ELECTION: distribute evenly across Level 1/2/3 scopes
      if (ibitsElectionIds.has(election.id) && scopesForElection.length > 0) {
        for (let i = 0; i < voters.length; i++) {
          const voter = voters[i];
          const assignedScope = scopesForElection[i % scopesForElection.length];
          const createdVoter = await db.voter.create({
            data: {
              ...voter,
              votingScopeId: assignedScope.id,
            },
          });
          createdVoters.push(createdVoter);
        }
        continue;
      }

      for (const voter of voters) {
        const randomScope = scopesForElection.length
          ? scopesForElection[Math.floor(Math.random() * scopesForElection.length)]
          : null;
        const createdVoter = await db.voter.create({
          data: {
            ...voter,
            votingScopeId: randomScope ? randomScope.id : null,
          },
        });
        createdVoters.push(createdVoter);
      }
    }

    console.log("🏃‍♂️ Creating candidates...");

    // Track created candidates for reporting
    const createdCandidates = [];

    // Create candidates (some voters become candidates) within their scope (or globally for NO SCOPE)
    for (const election of createdElections) {
      const electionVoters = createdVoters.filter((v) => v.electionId === election.id);
      const electionPositions = positionsByElection.get(election.id) || createdPositions.filter((p) => p.electionId === election.id);
      const electionParties = createdParties.filter((p) => p.electionId === election.id);

      for (const position of electionPositions) {
        const scopedVoters = electionVoters.filter((v) => v.votingScopeId === position.votingScopeId);
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
            electionParties[Math.floor(Math.random() * electionParties.length)] : null;

          const candidate = await db.candidate.create({
            data: {
              electionId: election.id,
              voterId: voter.id,
              positionId: position.id,
              partyId: randomParty?.id || null,
              imageUrl: `/assets/sample/logo.png`,
              credentialUrl: `/assets/sample/credential.pdf`,
            },
          });

          // Record for reporting
          createdCandidates.push(candidate);
        }
      }
    }

    console.log("🗳️ Creating vote responses...");
    
    // Create some vote responses for a random subset of voters, restricted to their scope (or global for NO SCOPE)
    // Process votes PER ELECTION to maintain separate chains
    const votedVoters = createdVoters.filter(() => Math.random() > 0.7);
    
    // Group voters by election for per-election chain ordering
    const votersByElection = new Map();
    for (const voter of votedVoters) {
      if (!votersByElection.has(voter.electionId)) {
        votersByElection.set(voter.electionId, []);
      }
      votersByElection.get(voter.electionId).push(voter);
    }
    
    // Process each election's votes separately
    for (const [electionId, electionVoters] of votersByElection) {
      let electionChainOrder = 1; // Chain order starts from 1 for each election
      let lastVoteHash = '0'; // Genesis hash for this election
      
      console.log(`   Processing votes for election ${electionId}...`);
      
      for (const voter of electionVoters) {
        const electionPositions = createdPositions.filter(
          (p) => p.electionId === voter.electionId && p.votingScopeId === voter.votingScopeId
        );
        
        for (const position of electionPositions) {
          const candidates = await db.candidate.findMany({
            where: {
              electionId: voter.electionId,
              positionId: position.id,
              isDeleted: false,
            },
          });

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
                  electionId: voter.electionId,
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
            }
          }
        }
      }
    }

    console.log("📊 Database seeding completed successfully!");
    console.log("\n📈 Summary:");

    const stats = {
      organizations: await db.organization.count(),
      users: await db.user.count(),
      elections: await db.election.count(),
      positions: await db.position.count(),
      parties: await db.party.count(),
      votingScopes: await db.votingScope.count(),
      voters: await db.voter.count(),
      candidates: await db.candidate.count(),
      votes: await db.voteResponse.count()
    };

    console.log(`   Organizations: ${stats.organizations}`);
    console.log(`   Users: ${stats.users} (including existing super admin)`);
    console.log(`   Elections: ${stats.elections}`);
    console.log(`   Positions: ${stats.positions}`);
    console.log(`   Parties: ${stats.parties}`);
    console.log(`   Voting Scopes: ${stats.votingScopes}`);
    console.log(`   Voters: ${stats.voters}`);
    console.log(`   Candidates: ${stats.candidates}`);
    console.log(`   Votes Cast: ${stats.votes}`);

    console.log("\n🔐 Test Credentials:");
    console.log("Admin Users:");
    adminUsers.forEach((admin, i) => {
      console.log(`   ${admin.name}: ${admin.email} / ${admin.password}`);
    });

    // Admin → Org → Elections breakdown
    console.log("\n👤 Admin → Org → Elections breakdown:");
    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: {
        id: true,
        name: true,
        email: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    for (const admin of admins) {
      const org = admin.organization || null;
      const adminOrgCount = org ? 1 : 0;
      const adminElections = org ? createdElections.filter((e) => e.orgId === org.id) : [];
      const electionCount = adminElections.length;

      const header = `${admin.name} (${admin.email}) has ${adminOrgCount} org and ${electionCount} election${electionCount === 1 ? "" : "s"}`;
      console.log(`   ${header}`);

      if (!org) continue;
      console.log(`     Org: ${org.name}`);

      for (const e of adminElections) {
        const scopes = (scopesByElection.get(e.id) || []);
        const noScope = scopes.length === 0;
        const scopeInfo = noScope ? "NO SCOPE" : `${scopes.length} scope(s)`;
        const posCount = createdPositions.filter((p) => p.electionId === e.id).length;
        const voterCount = createdVoters.filter((v) => v.electionId === e.id).length;
        const candCount = createdCandidates.filter((c) => c.electionId === e.id).length;
        const partyCount = createdParties.filter((p) => p.electionId === e.id).length;
        const voteCount = await db.voteResponse.count({ where: { electionId: e.id } });

        console.log(`     • ${e.name} → scope: ${scopeInfo}`);
        console.log(`         Positions: ${posCount}, Parties: ${partyCount}, Voters: ${voterCount}, Candidates: ${candCount}, Votes: ${voteCount}`);
      }
    }

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the seeder
seedDatabase().catch(console.error);
