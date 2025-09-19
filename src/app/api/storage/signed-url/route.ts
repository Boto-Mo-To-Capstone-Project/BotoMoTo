import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import { getStorageService } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    console.log('📞 Signed URL API called');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { key } = body;

    if (!key || typeof key !== 'string') {
      console.log('❌ Invalid key provided:', key);
      return apiResponse({
        success: false,
        message: "Invalid S3 key provided",
        status: 400,
      });
    }

    console.log('🔑 Generating signed URL for key:', key);

    // Generate signed URL with 1 hour expiry
    const storage = getStorageService();
    const signedUrl = await storage.getSignedUrl(key, 7200);

    console.log('✅ Generated signed URL:', signedUrl.substring(0, 100) + '...');

    return apiResponse({
      success: true,
      message: "Signed URL generated successfully",
      data: { url: signedUrl },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Error generating signed URL:", error);
    return apiResponse({
      success: false,
      message: "Failed to generate signed URL",
      error: error instanceof Error ? error.message : "Unknown error",
      status: 500,
    });
  }
}
