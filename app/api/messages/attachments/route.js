export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getOrgId } from '../../../lib/org.js';
import { getSql } from '../../../lib/db.js';
import { getAttachmentWithData } from '../../../lib/repositories/messagesContext.repository.js';

export async function GET(request) {
  try {
    const sql = getSql();
    const orgId = getOrgId(request);
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('id');

    if (!attachmentId) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const attachment = await getAttachmentWithData(sql, orgId, attachmentId);
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    const buffer = Buffer.from(attachment.data, 'base64');
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': attachment.mime_type,
        'Content-Disposition': `inline; filename="${attachment.filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Attachment GET error:', error);
    return NextResponse.json({ error: 'An error occurred while fetching attachment' }, { status: 500 });
  }
}
