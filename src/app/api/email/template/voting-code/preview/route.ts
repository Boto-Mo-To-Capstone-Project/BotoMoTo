import { NextRequest, NextResponse } from "next/server";
import { templateRegistry } from "@/lib/email/templates/registry";
import { prepareVotingCodeTemplateData, formatElectionSchedule } from "@/lib/email/templates/data";
import { templateEngine } from "@/lib/email/templates/engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "html"; // html, text, json
    const scenario = searchParams.get("scenario") || "default"; // default, minimal, complete

    // Get the voting code template
    const template = templateRegistry['voting-code'];
    if (!template) {
      return NextResponse.json(
        { error: "Voting code template not found" },
        { status: 404 }
      );
    }

    // Generate sample data based on scenario
    let sampleData;
    
    switch (scenario) {
      case "minimal":
        sampleData = {
          voterName: "Maria Santos",
          votingCode: "654321",
          electionTitle: "Quick Poll",
          organizationName: "Test Organization",
        };
        break;
        
      case "complete":
        const schedule = formatElectionSchedule(
          new Date("2024-12-01T08:00:00Z"),
          new Date("2024-12-15T18:00:00Z")
        );
        sampleData = {
          voterName: "Dr. Jose P. Rizal Jr.",
          votingCode: "987654",
          electionTitle: "University Student Government Elections 2024",
          organizationName: "Philippine National University",
          ...schedule,
          instructions: `
            <h3>Voting Instructions:</h3>
            <ol>
              <li>Click the "Access Voting Portal" button below</li>
              <li>Log in with your student credentials</li>
              <li>Enter your 6-digit voting code: <strong>987654</strong></li>
              <li>Review all candidate information carefully</li>
              <li>Vote for your preferred candidates in each position</li>
              <li>Review your ballot before submitting</li>
              <li>Click "Submit Ballot" to cast your vote</li>
            </ol>
            <p><strong>Note:</strong> You can only vote once. Ensure all selections are correct before submitting.</p>
          `
        };
        break;
        
      default:
        sampleData = template.previewProps;
    }

    if (format === "json") {
      return NextResponse.json({
        template: {
          id: 'voting-code',
          type: 'component' in template ? 'react-email' : 'raw-html',
          defaultSubject: template.defaultSubject
        },
        sampleData,
        scenarios: {
          default: "Standard voting code email with all fields",
          minimal: "Basic voting code email with minimal data",
          complete: "Complete voting code email with full schedule and instructions"
        }
      });
    }

    // Render the template
    const result = await templateEngine.render('voting-code', sampleData || {});

    if (format === "text") {
      return new NextResponse(result.text, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    // Default to HTML
    return new NextResponse(result.html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });

  } catch (error) {
    console.error("Template preview error:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate template preview",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
