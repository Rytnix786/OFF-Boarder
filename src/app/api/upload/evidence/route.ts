import { NextRequest, NextResponse } from "next/server";
import { requireActiveOrg } from "@/lib/auth.server";
import { requirePermission } from "@/lib/rbac.server";
import { prisma } from "@/lib/prisma.server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(request: NextRequest) {
  try {
    const session = await requireActiveOrg();
    await requirePermission(session, "offboarding:read");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const taskId = formData.get("taskId") as string | null;
    const offboardingId = formData.get("offboardingId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!taskId || !offboardingId) {
      return NextResponse.json({ error: "Task ID and Offboarding ID are required" }, { status: 400 });
    }

    // 1. Verify Offboarding belongs to Org
    const offboarding = await prisma.offboarding.findFirst({
      where: { id: offboardingId, organizationId: session.currentOrgId! },
      include: { evidencePack: true }
    });

    if (!offboarding) {
      return NextResponse.json({ error: "Offboarding not found or access denied" }, { status: 403 });
    }

    // 2. Verify Task belongs to Offboarding
    const task = await prisma.offboardingTask.findFirst({
      where: { id: taskId, offboardingId: offboardingId }
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found in this offboarding" }, { status: 404 });
    }

    // 3. Verify Evidence Pack is not sealed
    if (offboarding.evidencePack?.sealed) {
      return NextResponse.json({ 
        error: "Evidence pack is sealed and immutable. No further evidence can be uploaded." 
      }, { status: 403 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 50MB limit" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Allowed: images, PDFs, text, Word documents" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const ext = file.name.split(".").pop() || "bin";
    const fileName = `${session.currentOrgId}/${offboardingId}/${taskId}/${fileHash.slice(0, 16)}-${Date.now()}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from("evidence-files")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("evidence-files")
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
