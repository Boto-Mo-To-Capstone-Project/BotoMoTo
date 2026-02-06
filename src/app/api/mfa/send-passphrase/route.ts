import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";
import { createEmailService } from "@/lib/email";

// Generate a random passphrase (4 words from a predefined list)
function generatePassphrase(): string {
  const words = [
    'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest', 'garden', 'happy',
    'island', 'jungle', 'knight', 'lemon', 'mountain', 'night', 'ocean', 'peace',
    'quiet', 'river', 'sunset', 'tree', 'umbrella', 'violet', 'water', 'yellow',
    'zebra', 'anchor', 'bridge', 'castle', 'dream', 'escape', 'flame', 'golden',
    'harbor', 'ivory', 'jasmine', 'kingdom', 'liberty', 'marble', 'nature', 'orange'
  ];
  
  const selectedWords = [];
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * words.length);
    selectedWords.push(words[randomIndex]);
  }
  
  return selectedWords.join('-');
}

// Handle POST request to send passphrase via email for MFA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken } = body;

    // Validate required fields
    if (!sessionToken) {
      return apiResponse({
        success: false,
        message: "Session token is required",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Get and validate MFA session
    const mfaSession = await db.mfaSession.findUnique({
      where: { sessionToken },
    });

    if (!mfaSession) {
      return apiResponse({
        success: false,
        message: "Invalid session token",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check expiry
    if (mfaSession.expiresAt < new Date()) {
      await db.mfaSession.delete({
        where: { id: mfaSession.id },
      });
      
      return apiResponse({
        success: false,
        message: "MFA session expired",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Validate passphrase method is required and current
    const expectedMethod = 'passphrase-email';
    if (!mfaSession.requiredMethods.includes(expectedMethod)) {
      return apiResponse({
        success: false,
        message: "Passphrase verification not required for this session",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Must complete methods in order
    const currentExpectedMethod = mfaSession.requiredMethods[mfaSession.currentStep];
    if (expectedMethod !== currentExpectedMethod) {
      return apiResponse({
        success: false,
        message: `Must complete ${currentExpectedMethod} before passphrase verification`,
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Generate passphrase
    const passphrase = generatePassphrase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Store passphrase in database using VerificationToken table temporarily
    const identifier = `mfa_passphrase_${mfaSession.sessionToken}`;
    
    // Delete any existing passphrase for this session
    await db.verificationToken.deleteMany({
      where: {
        identifier: identifier
      }
    });

    // Create new passphrase record
    await db.verificationToken.create({
      data: {
        identifier: identifier,
        token: passphrase,
        expires: expiresAt
      }
    });

    // Get voter name for email
    const voter = await db.voter.findFirst({
      where: {
        electionId: mfaSession.electionId,
        email: mfaSession.voterEmail,
        code: mfaSession.voterCode,
        isDeleted: false,
        isActive: true
      },
      select: {
        firstName: true,
        lastName: true
      }
    });

    if (!voter) {
      return apiResponse({
        success: false,
        message: "Voter not found",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Send passphrase via email
    try {
      const emailService = createEmailService();
      
      const emailResult = await emailService.send({
        to: { email: mfaSession.voterEmail, name: voter.firstName },
        subject: "Your Security Passphrase for Election Access",
        text: `Hello ${voter.firstName},\n\nYour security passphrase for election access is: ${passphrase}\n\nThis passphrase will expire in 15 minutes.\n\nDo not share this passphrase with anyone.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Election Access - Security Passphrase</h2>
            <p>Hello ${voter.firstName},</p>
            <p>Your security passphrase for election access is:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <span style="font-size: 20px; font-weight: bold; font-family: monospace; color: #2c3e50;">${passphrase}</span>
            </div>
            <p><strong>This passphrase will expire in 15 minutes.</strong></p>
            <p style="color: #e74c3c;"><strong>Important:</strong> Do not share this passphrase with anyone.</p>
            <p>If you did not request this passphrase, please ignore this email.</p>
          </div>
        `
      });

      console.log('[MFA Passphrase] Email sent successfully:', emailResult);

    } catch (emailError) {
      console.error('[MFA Passphrase] Failed to send email:', emailError);
      
      // Clean up passphrase record since email failed
      await db.verificationToken.deleteMany({
        where: {
          identifier: identifier
        }
      });

      return apiResponse({
        success: false,
        message: "Failed to send passphrase email",
        data: null,
        error: "Email Service Error",
        status: 500
      });
    }

    // Update session last active time
    await db.mfaSession.update({
      where: { id: mfaSession.id },
      data: { lastActiveAt: new Date() },
    });

    return apiResponse({
      success: true,
      message: "Passphrase sent successfully to your email address",
      data: {
        email: mfaSession.voterEmail,
        expiresAt: expiresAt
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Send passphrase error:", error);
    return apiResponse({
      success: false,
      message: "Failed to send passphrase",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
