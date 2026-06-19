/**
 * PUT local PNG bytes to Magnific presigned URL (use after creations_request_upload).
 * Usage: node scripts/magnific-upload-put.mjs <localPath> <directUploadUrl>
 */
import fsp from 'node:fs/promises';

const [localPath, uploadUrl] = process.argv.slice(2);
if (!localPath || !uploadUrl) {
  console.error('Usage: node magnific-upload-put.mjs <file> <directUploadUrl>');
  process.exit(1);
}

const buf = await fsp.readFile(localPath);
const r = await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'image/png' },
  body: buf,
});
if (!r.ok) {
  console.error('PUT failed', r.status, await r.text());
  process.exit(1);
}
console.log('OK', localPath, buf.length, 'bytes');
