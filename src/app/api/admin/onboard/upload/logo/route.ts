import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth'; // ✅ new v5 way
import db from '@/lib/db/db';
import { writeFile, mkdir, unlink, stat } from 'fs/promises';
import { join, extname } from 'path';
import { ALLOWED_FILE_TYPES, FILE_LIMITS, AUDIT_ACTIONS } from '@/lib/constants';

const UPLOAD_DIR = 'src/app/assets/onboard/logo/';

export async function POST(request: NextRequest) {
  const session = await auth(); // ✅ next-auth v5
  const user = session?.user;

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = user.organization?.id?.toString() || 'unknownorg';
  const adminId = user.id || 'unknownadmin';

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
  }

  if (!(ALLOWED_FILE_TYPES.IMAGES as readonly string[]).includes(file.type)) {
    return NextResponse.json({ success: false, error: "Invalid file type" }, { status: 400 });
  }

  if (file.size > FILE_LIMITS.IMAGE_MAX_SIZE) {
    return NextResponse.json({ success: false, error: 'File too large' }, { status: 400 });
  }

  const ext = extname(file.name).toLowerCase();
  const filename = `org-${orgId}_admin-${adminId}_logo${ext}`;
  const saveDir = join(process.cwd(), UPLOAD_DIR);
  const savePath = join(saveDir, filename);

  await mkdir(saveDir, { recursive: true });
  try {
    await stat(savePath);
    await unlink(savePath);
  } catch {
    // File doesn't exist, no problem
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(savePath, buffer);

  await db.audits.create({
    data: {
      actorId: adminId,
      actorRole: user.role || 'ADMIN',
      action: AUDIT_ACTIONS.UPLOAD,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      resource: 'organization_logo',
      resourceId: orgId,
      details: { filename },
    },
  });

  return NextResponse.json({ success: true, path: `/assets/onboard/logo/${filename}` });
}
