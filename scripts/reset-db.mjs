import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function resetDatabase() {
  try {
    console.log("🧹 Resetting database...");
    console.log("⚠️  This will delete all data except super admin users!");
    
    // Delete in correct order to avoid foreign key constraints
    console.log("Deleting audit data...");
    await db.auditTableAffected.deleteMany({});
    await db.audits.deleteMany({});
    
    console.log("Deleting voting data...");
    await db.voteResponse.deleteMany({});
    

    console.log("Deleting candidates...");
    await db.candidate.deleteMany({});
    
    console.log("Deleting voters...");
    await db.voter.deleteMany({});
    
    console.log("Deleting positions...");
    await db.position.deleteMany({});
    
    console.log("Deleting parties...");
    await db.party.deleteMany({});
    
    console.log("Deleting voting scopes...");
    await db.votingScope.deleteMany({});
    
    console.log("Deleting survey data...");
    await db.surveyResponse.deleteMany({});
    await db.surveyForm.deleteMany({});
    
    console.log("Deleting broadcasts...");
    await db.broadcast.deleteMany({});
    
    console.log("Deleting tickets...");
    await db.ticket.deleteMany({});
    
    console.log("Deleting election schedules and MFA settings...");
    await db.electionSched.deleteMany({});
    await db.mfaSettings.deleteMany({});
    
    console.log("Deleting elections...");
    await db.election.deleteMany({});
    
    console.log("Deleting organizations...");
    await db.organization.deleteMany({});
    
    console.log("Deleting non-super admin users...");
    await db.user.deleteMany({
      where: {
        role: {
          not: "SUPER_ADMIN"
        }
      }
    });

    console.log("✅ Database reset completed!");
    
    const remainingUsers = await db.user.count();
    console.log(`📊 Remaining users: ${remainingUsers} (super admins only)`);
    
  } catch (error) {
    console.error("❌ Reset error:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

resetDatabase().catch(console.error);
