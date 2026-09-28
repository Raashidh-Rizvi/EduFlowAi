import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle, Info, Copy, Check, ChevronDown, ChevronUp, ExternalLink, RefreshCw } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// ErrorModal — Reusable diagnostic error popup
//
// Props:
//   show           : boolean  — controls visibility
//   onClose        : function — called when the user closes the modal
//   title          : string   — short error title
//   message        : string   — human-readable explanation
//   actionableSteps: string[] — list of steps the user should take
//   errorCode      : string   — internal error code (e.g. UNAUTHORIZED_401)
//   statusCode     : number   — HTTP status code
//   endpoint       : string   — which API endpoint failed
//   responseBody   : any      — raw response body from server
//   tokenState     : object   — token diagnostics from api.js
//   color          : string   — 'red' | 'yellow' | 'orange' | 'blue'
//   onRetry        : function — optional retry callback
// ─────────────────────────────────────────────────────────────────
export default function ErrorModal({
  show,
  onClose,
  title = 'An Error Occurred',
  message = 'Something went wrong. Please try again.',
  actionableSteps = [],
  errorCode = '',
  statusCode = null,
  endpoint = '',
  responseBody = null,
  tokenState = null,
  color = 'red',
  onRetry = null,
}) {
  const [showTechnical, setShowTechnical] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!show) return null;

  // ─── Color palette ───
  const palette = {
    red:    { bg: 'bg-red-50',    border: 'border-red-300',    icon: 'text-red-500',    badge: 'bg-red-100 text-red-700',    btn: 'bg-red-600 hover:bg-red-700',    header: 'bg-red-100' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', icon: 'text-yellow-500', badge: 'bg-yellow-100 text-yellow-700', btn: 'bg-yellow-600 hover:bg-yellow-700', header: 'bg-yellow-100' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-300', icon: 'text-orange-500', badge: 'bg-orange-100 text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700', header: 'bg-orange-100' },
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-300',   icon: 'text-blue-500',   badge: 'bg-blue-100 text-blue-700',   btn: 'bg-blue-600 hover:bg-blue-700',   header: 'bg-blue-100' },
  };
  const p = palette[color] || palette.red;

  // ─── Icon by color ───
  const IconComponent = color === 'yellow' || color === 'orange' ? AlertTriangle : color === 'blue' ? Info : AlertCircle;

  // ─── Build copy-to-clipboard text ───
  const buildFullDiagnosticText = () => {
    const lines = [
      `=== EduFlow Error Diagnostic Report ===`,
      `Timestamp: ${new Date().toISOString()}`,
      ``,
      `ERROR: ${title}`,
      `Code: ${errorCode || 'N/A'}`,
      `HTTP Status: ${statusCode ?? 'N/A'}`,
      `Endpoint: ${endpoint || 'N/A'}`,
      ``,
      `Message:`,
      message,
      ``,
    ];

    if (actionableSteps.length > 0) {
      lines.push('Actionable Steps:');
      actionableSteps.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
      lines.push('');
    }

    if (tokenState) {
      lines.push('Token State:');
      lines.push(`  Present: ${tokenState.present}`);
      lines.push(`  Status: ${tokenState.reason}`);
      if (tokenState.present) {
        lines.push(`  Role: ${tokenState.role}`);
        lines.push(`  Email: ${tokenState.email}`);
        lines.push(`  Expires: ${tokenState.expiresAt}`);
      }
      lines.push('');
    }

    if (responseBody) {
      lines.push('Raw Server Response:');
      lines.push(typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody, null, 2));
    }

    return lines.join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildFullDiagnosticText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  // ─── Helper to render response body ───
  const renderResponseBody = (body) => {
    if (!body) return <span className="text-gray-400 italic">No response body</span>;
    if (typeof body === 'string') return <span>{body}</span>;
    try {
      return <pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(body, null, 2)}</pre>;
    } catch {
      return <span>{String(body)}</span>;
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card */}
      <div
        className={`relative w-full max-w-lg rounded-2xl border-2 shadow-2xl ${p.bg} ${p.border} overflow-hidden`}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* ── Header ── */}
        <div className={`${p.header} px-5 py-4 flex items-start gap-3`}>
          <IconComponent className={`w-6 h-6 mt-0.5 flex-shrink-0 ${p.icon}`} />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 leading-tight">{title}</h2>
            {statusCode && (
              <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${p.badge}`}>
                HTTP {statusCode}
              </span>
            )}
            {errorCode && (
              <span className="inline-block mt-1 ml-1 text-xs font-mono px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                {errorCode}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-200 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-5 py-4 space-y-4">

          {/* What went wrong */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">What went wrong</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{message}</p>
          </div>

          {/* Actionable steps */}
          {actionableSteps.length > 0 && (
            <div className={`rounded-xl p-3 border ${p.border} ${p.bg}`}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">🔧 What to do</h3>
              <ul className="space-y-1.5">
                {actionableSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className={`font-bold flex-shrink-0 ${p.icon}`}>{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Token state (if present) */}
          {tokenState && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs font-mono space-y-1">
              <p className="font-semibold text-gray-600 text-xs mb-1">🔐 Auth Token State</p>
              <p className={tokenState.present ? 'text-green-700' : 'text-red-600'}>{tokenState.reason}</p>
              {tokenState.present && (
                <>
                  <p className="text-gray-600">Role: <span className="font-semibold text-gray-800">{tokenState.role}</span></p>
                  <p className="text-gray-600">Email: <span className="text-gray-800">{tokenState.email}</span></p>
                  <p className="text-gray-600">Expires: <span className="text-gray-800">{tokenState.expiresAt}</span></p>
                </>
              )}
            </div>
          )}

          {/* Endpoint */}
          {endpoint && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 font-medium">Failed Endpoint:</span>
              <code className="bg-gray-100 border border-gray-200 rounded px-2 py-0.5 text-gray-800 font-mono">{endpoint}</code>
            </div>
          )}

          {/* Technical details (collapsible) */}
          <div>
            <button
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors font-medium"
              onClick={() => setShowTechnical(!showTechnical)}
            >
              {showTechnical ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showTechnical ? 'Hide' : 'Show'} Technical Details
            </button>

            {showTechnical && (
              <div className="mt-2 rounded-xl border border-gray-200 bg-gray-900 text-gray-100 p-3 text-xs font-mono overflow-auto" style={{ maxHeight: 200 }}>
                <p className="text-gray-400 mb-1">// Raw Server Response Body</p>
                {renderResponseBody(responseBody)}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="px-5 py-3 border-t border-gray-200 bg-white flex flex-wrap items-center gap-2 justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-gray-600"
              title="Copy full diagnostic report to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Report'}
            </button>
            <a
              href="http://localhost:8888/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-gray-600"
              title="Open Python AI Microservice Swagger docs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              AI Service Docs
            </a>
          </div>
          <div className="flex gap-2">
            {onRetry && (
              <button
                onClick={() => { onClose(); onRetry(); }}
                className={`flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg text-white font-medium transition-colors ${p.btn}`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
            <button
              onClick={onClose}
              className="text-xs px-4 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
