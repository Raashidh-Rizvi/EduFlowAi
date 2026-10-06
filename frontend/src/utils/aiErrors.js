/**
 * Central mapper for the AI quiz pipeline's stable error codes.
 *
 * The .NET API and the Python AI service report failures with a structured
 * shape: { status, code, message, detail, details, requestId, traceId }.
 * This module turns that shape — or an unknown failure — into copy that is
 * safe and useful to show an instructor or a student:
 *
 *   - never a stack trace, raw JSON envelope, or provider secret,
 *   - a clear title and an actionable sentence,
 *   - a correlation reference (traceId/requestId) when one exists, so the
 *     exact server log line can be found during support.
 *
 * Backend behaviour keyed to these codes is documented in docs/AI_ARCHITECTURE.md.
 */

// Codes that belong to the AI/RAG/quiz pipeline (vs. generic app errors).
const AI_CODE_RE = /^(AI_|RAG_|DOCUMENT_|EMBEDDING_|QUIZ_)/;

export function isAiErrorCode(code) {
  return typeof code === 'string' && AI_CODE_RE.test(code);
}

/**
 * code -> user-facing presentation. `fallback` is only used when the server
 * did not supply a readable message; the server message always wins because
 * it carries provider-specific detail (e.g. which variable is missing).
 */
const AI_ERROR_CATALOG = {
  AI_PROVIDER_NOT_CONFIGURED: {
    title: 'AI provider not configured',
    color: 'yellow',
    fallback: 'The selected provider cannot generate quizzes yet. Please configure the provider and try again.'
  },
  AI_PROVIDER_UNAVAILABLE: {
    title: 'AI service unavailable',
    color: 'red',
    fallback: 'The AI service is unreachable right now. Please try again in a moment.'
  },
  AI_MODEL_NOT_FOUND: {
    title: 'AI model not found',
    color: 'yellow',
    fallback: 'The selected model is not available for this provider. Pick another model and try again.'
  },
  AI_AUTHENTICATION_FAILED: {
    title: 'AI provider authentication failed',
    color: 'red',
    fallback: 'The provider rejected the configured credentials. Ask your administrator to update the AI provider credentials.'
  },
  AI_RATE_LIMITED: {
    title: 'AI rate limit reached',
    color: 'yellow',
    fallback: 'The AI provider is rate limiting requests right now. Please wait a moment and try again.'
  },
  AI_REQUEST_FAILED: {
    title: 'AI request failed',
    color: 'red',
    fallback: 'The request to the AI service failed. Please try again.'
  },
  AI_TIMEOUT: {
    title: 'AI generation timed out',
    color: 'yellow',
    fallback: 'The AI provider took too long to answer. It may still be working — wait a moment and try again, or generate fewer questions.'
  },
  AI_GENERATION_FAILED: {
    title: 'AI generation failed',
    color: 'red',
    fallback: 'The AI service could not generate the quiz. Please try again.'
  },
  AI_INVALID_RESPONSE: {
    title: 'AI returned an unreadable response',
    color: 'red',
    fallback: 'The AI response could not be read, so nothing was saved. Please try again.'
  },
  AI_OUTPUT_VALIDATION_FAILED: {
    title: 'Generated quiz failed validation',
    color: 'yellow',
    fallback: 'The AI produced a quiz that failed our quality checks, so nothing was saved. Please try again.'
  },
  AI_GENERATION_IN_PROGRESS: {
    title: 'Quiz generation already in progress',
    color: 'yellow',
    fallback: 'A quiz is already being generated for this scope. Please wait for it to finish.'
  },
  RAG_CONTEXT_NOT_FOUND: {
    title: 'No course content found',
    color: 'yellow',
    fallback: 'We could not find indexed course material for this quiz. Upload and process the lecture PDF first, then try again.'
  },
  RAG_RETRIEVAL_FAILED: {
    title: 'Course content search failed',
    color: 'red',
    fallback: 'Searching the indexed course material failed. Please try again.'
  },
  DOCUMENT_NOT_PROCESSED: {
    title: 'Document not processed yet',
    color: 'yellow',
    fallback: 'This PDF is still being processed. Wait for it to finish, then generate the quiz.'
  },
  DOCUMENT_EXTRACTION_FAILED: {
    title: 'Document processing failed',
    color: 'red',
    fallback: 'We could not prepare this PDF for AI generation. Please try uploading the file again.'
  },
  EMBEDDING_FAILED: {
    title: 'Embedding generation failed',
    color: 'red',
    fallback: 'We could not index this document. Please try uploading the file again.'
  },
  QUIZ_VALIDATION_FAILED: {
    title: 'Quiz validation failed',
    color: 'yellow',
    fallback: 'The quiz did not pass validation. Review the questions and try again.'
  },
  QUIZ_SAVE_FAILED: {
    title: 'Quiz could not be saved',
    color: 'red',
    fallback: 'The quiz could not be saved. Please try again.'
  },
  QUIZ_ASSIGNMENT_FAILED: {
    title: 'Quiz could not be assigned',
    color: 'red',
    fallback: 'The quiz could not be assigned. Please try again.'
  },
  QUIZ_EVALUATION_FAILED: {
    title: 'Quiz could not be evaluated',
    color: 'red',
    fallback: 'The submission could not be graded. Please try again.'
  }
};

const STATUS_FALLBACKS = [
  [429, 'Too many requests. Please slow down and try again in a few moments.'],
  [503, 'The service is temporarily unavailable. Please try again shortly.'],
  [504, 'The request timed out. Please try again.'],
  [500, 'Something went wrong on our side. Please try again.']
];

/** Removes anything technical that leaked into a message (stack frames, markers). */
function toSafeText(value) {
  if (value == null) return '';
  let text = String(value);
  const stackTraceMarker = text.indexOf('Stack trace');
  if (stackTraceMarker >= 0) text = text.slice(0, stackTraceMarker);
  const frameStart = text.search(/\n\s+at\s+\S+/);
  if (frameStart >= 0) text = text.slice(0, frameStart);
  return text.replace(/\s+/g, ' ').trim();
}

function statusFallback(status) {
  const match = STATUS_FALLBACKS.find(([code]) => code === status);
  return match ? match[1] : '';
}

/**
 * Maps an axios error (or anything thrown by a service call) to
 * { title, message, color, code, reference } for display.
 * Safe to call with unexpected input — it never throws.
 */
export function mapAiError(err) {
  const data = err?.response?.data;
  const status = err?.response?.status;
  const code = isAiErrorCode(data?.code) ? data.code : null;
  const entry = code ? AI_ERROR_CATALOG[code] : null;

  const serverMessage = toSafeText(data?.message) || toSafeText(data?.detail);
  const serverDetails = toSafeText(data?.details);
  const reference = toSafeText(data?.traceId) || toSafeText(data?.requestId) || '';

  let message = serverMessage
    || (entry ? entry.fallback : '')
    || statusFallback(status)
    || toSafeText(err?.message)
    || 'The request could not be completed. Please try again.';

  // Append supporting detail (e.g. "Supported providers: gemini, groq, azure")
  // when it adds information beyond the main message.
  if (serverDetails && serverDetails !== message && !message.includes(serverDetails)) {
    message = `${message} ${serverDetails}`;
  }

  if (reference && !message.includes(reference)) {
    message = `${message} (Reference: ${reference})`;
  }

  return {
    title: entry?.title
      || (status === 429 ? 'Too many requests' : 'Request failed'),
    message,
    color: entry?.color || 'red',
    code: code || data?.code || '',
    reference
  };
}

export default mapAiError;

/**
 * Readable text for any API failure. Validation responses look like
 * { message, errors: [...] }; showing only `message` hides the actual reason
 * (e.g. "XP reward (289) exceeds platform maximum of 250 XP."), so the list is
 * appended one problem per line.
 */
export function getApiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const data = err?.response?.data;
  const message = data?.message || err?.message || fallback;
  const list = Array.isArray(data?.errors)
    ? data.errors.filter((e) => typeof e === 'string' && e.trim())
    : [];
  return list.length ? `${message}\n\n${list.map((e) => `• ${e}`).join('\n')}` : message;
}
