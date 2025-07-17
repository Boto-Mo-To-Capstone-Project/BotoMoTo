import { NextRequest } from "next/server";
import { join } from "path";
import { createReadStream, statSync } from "fs";

export async function GET(req: NextRequest) {
  // Absolute path to the PDF file
  const filePath = join(process.cwd(), "src/app/assets/template_pdf/sample_org_letter.pdf");
  try {
    const stat = statSync(filePath);
    const stream = createReadStream(filePath);
    return new Response(stream as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": stat.size.toString(),
        "Content-Disposition": 'attachment; filename="Sample_Organization_Letter.pdf"',
        "Cache-Control": "public, max-age=3600"
      },
    });
  } catch (err) {
    return new Response("File not found", { status: 404 });
  }
} 