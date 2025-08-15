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
  { name: "President", description: "Student body president", voteLimit: 1, numOfWinners: 1, order: 1 },
  { name: "Vice President", description: "Student body vice president", voteLimit: 1, numOfWinners: 1, order: 2 },
  { name: "Secretary", description: "Student council secretary", voteLimit: 1, numOfWinners: 1, order: 3 },
  { name: "Treasurer", description: "Student council treasurer", voteLimit: 1, numOfWinners: 1, order: 4 },
  { name: "Senator", description: "Student senators", voteLimit: 3, numOfWinners: 5, order: 5 },
  { name: "Class Representative", description: "Class representatives", voteLimit: 2, numOfWinners: 3, order: 6 }
];

const parties = [
  { name: "Progressive Students", color: "#3B82F6", description: "Advocating for progressive student policies" },
  { name: "Unity Party", color: "#10B981", description: "Bringing students together for common goals" },
  { name: "Innovation Alliance", color: "#8B5CF6", description: "Promoting innovation and technology in education" },
  { name: "Student Voice", color: "#F59E0B", description: "Amplifying every student's voice in governance" }
];

const votingScopes = [
  { type: "LEVEL", name: "Undergraduate", description: "All undergraduate students" },
  { type: "LEVEL", name: "Graduate", description: "All graduate students" },
  { type: "DEPARTMENT", name: "Engineering", description: "Engineering department students" },
  { type: "DEPARTMENT", name: "Business", description: "Business department students" },
  { type: "DEPARTMENT", name: "Arts & Sciences", description: "Arts and Sciences students" },
  { type: "AREA", name: "Campus North", description: "Students in north campus area" },
  { type: "AREA", name: "Campus South", description: "Students in south campus area" }
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
      address: `${Math.floor(Math.random() * 9999) + 1} Student St, Campus City`,
      isVerified: Math.random() > 0.1, // 90% verified
      isActive: Math.random() > 0.05, // 95% active
      hasVoted: Math.random() > 0.7 // 30% have voted
    });
  }
  
  return voters;
}

// Generate candidate experiences
function generateExperiences() {
  const leadership = [
    { organization: "Student Government", position: "Class Representative", dateRange: "2023-2024" },
    { organization: "Debate Club", position: "Vice President", dateRange: "2022-2023" },
    { organization: "Honor Society", position: "Secretary", dateRange: "2023-Present" },
    { organization: "Volunteer Corps", position: "Team Leader", dateRange: "2022-2024" }
  ];

  const work = [
    { company: "Campus Library", role: "Student Assistant", dateRange: "2023-Present" },
    { company: "Local Restaurant", role: "Server", dateRange: "2022-2023" },
    { company: "Tutoring Center", role: "Math Tutor", dateRange: "2023-2024" },
    { company: "Summer Camp", role: "Counselor", dateRange: "Summer 2023" }
  ];

  const education = [
    { school: "Metro High School", educationLevel: "High School Diploma", dateRange: "2018-2022" },
    { school: "University of Technology", educationLevel: "Bachelor's in Progress", dateRange: "2022-Present" },
    { school: "Community College", educationLevel: "Associate Degree", dateRange: "2020-2022" }
  ];

  return { leadership, work, education };
}

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");

    // Clear existing data (be careful!)
    console.log("🧹 Cleaning existing data...");
    await db.auditTableAffected.deleteMany({});
    await db.audits.deleteMany({});
    await db.voteResponse.deleteMany({});
    await db.candidateEducationLevel.deleteMany({});
    await db.candidateWorkExperience.deleteMany({});
    await db.candidateLeadershipExperience.deleteMany({});
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

    // Helper for creating an election + schedule + MFA
    async function createElectionForOrg(org, electionDef) {
      const idx = createdElections.length; // overall index for status/mfa variety
      const election = await db.election.create({
        data: {
          ...electionDef,
          orgId: org.id,
          status: idx === 0 ? "ACTIVE" : idx === 1 ? "DRAFT" : "CLOSED",
          isLive: idx === 0,
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

    console.log("📍 Creating voting scopes...");
    
    // Create voting scopes for each election ensuring a single scope type per election
    const createdScopes = [];
    const scopesByElection = new Map();
    for (const election of createdElections) {
      if (noScopeElectionIds.has(election.id)) {
        scopesByElection.set(election.id, []);
        console.log(`   ✓ ${election.name}: created 0 scope(s) [NO SCOPE]`);
        continue;
      }

      // Determine scope type per election (example rule: department-focused election gets DEPARTMENT)
      const scopeType = election.name.toLowerCase().includes("department") ? "DEPARTMENT" : "LEVEL";
      const options = votingScopes; // no per-row type filtering
      const toCreate = options.slice(0, Math.min(3, options.length));

      const scopesForElection = [];
      for (const scopeDef of toCreate) {
        const scope = await db.votingScope.create({
          data: {
            // scopeDef may contain 'type' originally; omit it now
            name: scopeDef.name,
            description: scopeDef.description,
            electionId: election.id,
          },
        });
        createdScopes.push(scope);
        scopesForElection.push(scope);
      }

      scopesByElection.set(election.id, scopesForElection);
      console.log(`   ✓ ${election.name}: created ${scopesForElection.length} ${scopeType} scope(s)`);
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
      console.log(`   ✓ ${election.name}: created ${positionsForElection.length} positions${scopesForElection.length ? ` across ${scopesForElection.length} scope(s)` : " (NO SCOPE)"}`);
    }

    console.log("👥 Creating voters...");
    
    // Create voters for each election and assign them to one of the election's scopes (or none)
    const createdVoters = [];
    for (const election of createdElections) {
      const voters = await generateVoters(election.id, 50); // 50 voters per election
      const scopesForElection = scopesByElection.get(election.id) || [];

      for (const voter of voters) {
        const randomScope = scopesForElection.length
          ? scopesForElection[Math.floor(Math.random() * scopesForElection.length)]
          : null;
        const createdVoter = await db.voter.create({
          data: {
            ...voter,
            votingScopeId: randomScope ? randomScope.id : null,
            votedAt: voter.hasVoted ? new Date() : null,
          },
        });
        createdVoters.push(createdVoter);
      }
    }

    console.log("🏃‍♂️ Creating candidates...");
    
    // Track created candidates for reporting
    const createdCandidates = [];
    
    // Create candidates (some voters become candidates) within their scope (or globally for NO SCOPE)
    const experiences = generateExperiences();
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
              isNew: Math.random() > 0.7, // 30% are new
              bio: `Experienced candidate committed to representing students with integrity and dedication. Passionate about making positive changes in our academic community.`,
              imageUrl: `/assets/sample/logo.png`,
            },
          });

          // Record for reporting
          createdCandidates.push(candidate);

          if (Math.random() > 0.3) {
            const randomLeadership = experiences.leadership[Math.floor(Math.random() * experiences.leadership.length)];
            await db.candidateLeadershipExperience.create({
              data: {
                candidateId: candidate.id,
                ...randomLeadership,
                description: "Led various initiatives and contributed to organizational success.",
              },
            });
          }

          if (Math.random() > 0.4) {
            const randomWork = experiences.work[Math.floor(Math.random() * experiences.work.length)];
            await db.candidateWorkExperience.create({
              data: {
                candidateId: candidate.id,
                ...randomWork,
                description: "Gained valuable skills and experience in professional environment.",
              },
            });
          }

          if (Math.random() > 0.2) {
            const randomEducation = experiences.education[Math.floor(Math.random() * experiences.education.length)];
            await db.candidateEducationLevel.create({
              data: {
                candidateId: candidate.id,
                ...randomEducation,
                description: "Academic achievements and educational background.",
              },
            });
          }
        }
      }
    }

    console.log("🗳️ Creating vote responses...");
    
    // Create some vote responses for voters who have voted, restricted to their scope (or global for NO SCOPE)
    const votedVoters = createdVoters.filter((v) => v.hasVoted);
    for (const voter of votedVoters) {
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
            await db.voteResponse.create({
              data: {
                electionId: voter.electionId,
                voterId: voter.id,
                candidateId: candidate.id,
                positionId: position.id,
                voteHash: `hash_${voter.id}_${candidate.id}_${Date.now()}`,
                timestamp: voter.votedAt || new Date(),
              },
            });
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
        const scopeInfo = noScope ? "NO SCOPE" : `${scopes[0]?.type} (${scopes.length})`;
        const posCount = createdPositions.filter((p) => p.electionId === e.id).length;
        const voterCount = createdVoters.filter((v) => v.electionId === e.id).length;
        const candCount = createdCandidates.filter((c) => c.electionId === e.id).length;
        const partyCount = createdParties.filter((p) => e.electionId === p.electionId).length;
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
