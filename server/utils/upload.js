import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOADS_DIR = path.resolve('uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function saveBase64File(base64Data) {
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return base64Data; // Return as-is if not a valid base64 data URI
  }

  const mimeType = matches[1];
  const base64Payload = matches[2];
  const buffer = Buffer.from(base64Payload, 'base64');

  // Determine file extension
  let extension = '';
  if (mimeType === 'application/pdf') {
    extension = '.pdf';
  } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    extension = '.jpg';
  } else if (mimeType === 'image/png') {
    extension = '.png';
  } else if (mimeType === 'image/gif') {
    extension = '.gif';
  } else {
    const parts = mimeType.split('/');
    extension = parts[1] ? `.${parts[1]}` : '';
  }

  // Generate unique filename to avoid collision
  const fileId = crypto.randomBytes(8).toString('hex');
  const filename = `attachment-${Date.now()}-${fileId}${extension}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  // Write buffer to local file system
  fs.writeFileSync(filePath, buffer);

  // Return the relative URL to store in the database
  return `/uploads/${filename}`;
}

/**
 * Iterates through claim items and extracts base64 attachments,
 * saving them to the local uploads directory.
 */
export function processItemAttachments(items) {
  if (!items || !Array.isArray(items)) return items;

  return items.map(item => {
    let receipts = item.receipts || [];
    if (item.receipt && receipts.length === 0) {
      receipts = [item.receipt];
    }

    const processedReceipts = receipts.map(rcpt => {
      if (typeof rcpt === 'string' && rcpt.startsWith('data:')) {
        try {
          return saveBase64File(rcpt);
        } catch (err) {
          console.error('Failed to save base64 attachment:', err);
          return rcpt;
        }
      }
      return rcpt;
    });

    return {
      ...item,
      receipts: processedReceipts,
      receipt: processedReceipts[0] || ''
    };
  });
}
