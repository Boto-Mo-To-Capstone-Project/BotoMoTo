import { NextRequest, NextResponse } from "next/server";
import { createEmailService } from "@/lib/email";

/**
 * Test email sending endpoint
 * POST /api/email/test
 */
export async function POST(req: NextRequest) {
  try {
    const { to, subject = "Test Email", html, text, provider } = await req.json();

    if (!to) {
      return NextResponse.json(
        { success: false, error: "Missing 'to' field" },
        { status: 400 }
      );
    }

    const emailService = createEmailService();

    // Test provider health
    const healthCheck = await emailService.verifyProviders();
    console.log("[Email Test] Provider health:", healthCheck);

    // Send test email
    const result = await emailService.send({
      to: Array.isArray(to) ? to : [{ email: to }],
      subject,
      html: html || `<h1>Test Email</h1><p>This is a test email from your email service.</p><p>Time: ${new Date().toISOString()}</p>`,
      text: text || `Test Email\n\nThis is a test email from your email service.\nTime: ${new Date().toISOString()}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        messageId: result.id,
        provider: result.provider,
        healthCheck,
      },
    });
  } catch (error) {
    console.error("[Email Test] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Get email service status
 * GET /api/email/test
 */
export async function GET() {
  try {
    const emailService = createEmailService();
    const healthCheck = await emailService.verifyProviders();

    return NextResponse.json({
      success: true,
      data: {
        providers: healthCheck,
        config: {
          // Don't expose sensitive data
          providers: process.env.EMAIL_PROVIDERS,
          from: process.env.EMAIL_FROM,
        },
      },
    });
  } catch (error) {
    console.error("[Email Status] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
