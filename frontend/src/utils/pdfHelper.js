/**
 * Helper utility for handling PDF URL resolution, previewing, and downloading in EduFlow AI.
 */

import api, { API_ORIGIN } from '../services/api';

export function getBackendBaseUrl() {
  return API_ORIGIN;
}

/**
 * Resolves a relative or full PDF URL to a complete, accessible backend URL.
 */
export function resolvePdfUrl(rawUrl) {
  if (!rawUrl) return null;
  const trimmed = String(rawUrl).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const base = getBackendBaseUrl();
  if (trimmed.startsWith('/')) {
    return `${base}${trimmed}`;
  }
  return `${base}/${trimmed}`;
}

/**
 * Fetches a document as a Blob. Backend-hosted files (/uploads/...) require the
 * signed-in user's bearer token, so they go through the shared API client (which
 * also handles token refresh). External URLs are fetched without credentials.
 * Throws when the document cannot be loaded.
 */
export async function fetchDocumentBlob(rawUrl) {
  const fullUrl = resolvePdfUrl(rawUrl);
  if (!fullUrl) throw new Error('Document URL is missing.');
  if (fullUrl.startsWith('blob:') || fullUrl.startsWith('data:')) {
    const res = await fetch(fullUrl);
    return res.blob();
  }

  const url = new URL(fullUrl, window.location.origin);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid document URL.');

  let blob;
  if (url.origin === new URL(API_ORIGIN, window.location.origin).origin) {
    const response = await api.get(url.href, { responseType: 'blob' });
    blob = response.data;
  } else {
    const res = await fetch(url.href, { credentials: 'omit' });
    if (!res.ok) throw new Error('Document unavailable.');
    blob = await res.blob();
  }

  if (!blob || !blob.size || (blob.type || '').includes('text/html')) {
    throw new Error('Document unavailable.');
  }
  return blob;
}

/**
 * Generates a minimal %PDF-1.4 placeholder that clearly states the real document
 * could not be loaded. It is never presented as the course material itself.
 */
export function createUnavailablePdfBlob(title = 'Course Document', fileName = 'material.pdf') {
  const safeTitle = (title || 'Course Document').replace(/[()\\]/g, '');
  const safeFileName = (fileName || 'material.pdf').replace(/[()\\]/g, '');

  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 260 >>
stream
BT
/F1 18 Tf
50 720 Td
(Document unavailable) Tj
/F1 12 Tf
0 -30 Td
(${safeTitle}) Tj
0 -25 Td
(File: ${safeFileName}) Tj
0 -30 Td
(The document could not be loaded. Check your access or try again later.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000312 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
620
%%EOF`;

  return new Blob([pdfString], { type: 'application/pdf' });
}

/**
 * Downloads the document as a same-origin Blob (avoids cross-origin download
 * attribute blocks). Returns true on success; on failure no file is saved and
 * the user is told the document is unavailable.
 */
export async function downloadPdf(rawUrl, fileName = 'material.pdf') {
  let blob;
  try {
    blob = await fetchDocumentBlob(rawUrl);
  } catch (e) {
    console.warn('PDF download failed:', e?.friendlyMessage || e?.message);
    window.alert('This document could not be downloaded. Check that you have access and try again.');
    return false;
  }

  const blobUrl = URL.createObjectURL(blob);
  const targetFileName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = targetFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  return true;
}

/**
 * Prepares a PDF document object for viewing inside an iframe modal. When the
 * document cannot be loaded, an explicit "Document unavailable" page is shown
 * (isFallback: true) instead of the real material.
 */
export async function preparePdfForViewing(rawUrl, title = 'Document', fileName = 'material.pdf') {
  const fullUrl = resolvePdfUrl(rawUrl);
  try {
    const blob = await fetchDocumentBlob(rawUrl);
    const blobUrl = URL.createObjectURL(new Blob([blob], { type: blob.type || 'application/pdf' }));
    return { url: blobUrl, rawUrl: fullUrl, title, fileName, isFallback: false };
  } catch (e) {
    console.warn('PDF preview failed:', e?.friendlyMessage || e?.message);
  }

  const blobUrl = URL.createObjectURL(createUnavailablePdfBlob(title, fileName));
  return { url: blobUrl, rawUrl: fullUrl, title, fileName, isFallback: true };
}
