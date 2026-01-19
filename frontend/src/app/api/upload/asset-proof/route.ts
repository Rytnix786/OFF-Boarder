import { NextRequest, NextResponse } from "next/server";
import { requireEmployeeOffboarding } from "@/lib/employee-auth";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

export async function POST(request: NextRequest) {
  try {
    const session = await requireEmployeeOffboarding();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const assetReturnId = formData.get("assetReturnId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!assetReturnId) {
      return NextResponse.json({ error: "Asset Return ID is required" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 50MB limit" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Allowed: images and PDFs" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const ext = file.name.split(".").pop() || "bin";
    const fileName = `${session.organizationId}/${session.offboardingId}/${assetReturnId}/${fileHash.slice(0, 16)}-${Date.now()}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from("asset-proofs")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("asset-proofs")
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      fileUrl: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      fileHash,
      storagePath: data.path,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
