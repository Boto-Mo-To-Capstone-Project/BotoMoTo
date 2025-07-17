import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { ALLOWED_FILE_TYPES, FILE_LIMITS, AUDIT_ACTIONS } from '@/lib/constants';

const UPLOAD_DIR = 'src/app/assets/onboard/letter/';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const orgId = session.user.organization?.id?.toString() || 'unknownorg';
  const adminId = session.user.id || 'unknownadmin';

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
  }
  if (file.type !== ALLOWED_FILE_TYPES.PDF[0]) {
    return NextResponse.json({ success: false, error: 'Invalid file type' }, { status: 400 });
  }
  if (file.size > FILE_LIMITS.PDF_MAX_SIZE) {
    return NextResponse.json({ success: false, error: 'File too large' }, { status: 400 });
  }
  const filename = `org-${orgId}_admin-${adminId}_letter.pdf`;
  const saveDir = join(process.cwd(), UPLOAD_DIR);
  const savePath = join(saveDir, filename);
  await mkdir(saveDir, { recursive: true });
  // Overwrite if exists
  try {
    await stat(savePath);
    await unlink(savePath);
  } catch {}
  const arrayBuffer = await file.arrayBuffer();
  await writeFile(savePath, Buffer.from(arrayBuffer));
  // Audit log
  await prisma.audits.create({
    data: {
      actorId: adminId,
      actorRole: session.user.role || 'ADMIN',
      action: AUDIT_ACTIONS.UPLOAD,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      resource: 'organization_letter',
      resourceId: orgId.toString(),
      details: { filename },
    },
  });
  return NextResponse.json({ success: true, path: `/assets/onboard/letter/${filename}` });
} 