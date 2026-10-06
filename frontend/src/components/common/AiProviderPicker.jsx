import { useEffect, useState } from 'react';
import { quizService } from '../../services/quizService';

/**
 * Provider + model selector for AI quiz generation.
 *
 * Loads GET /api/ai/providers — a server-side status catalog that lists which
 * providers (gemini / groq / azure) are configured and which models each one
 * allows. It NEVER contains credentials; only variable *names* of whatever is
 * missing, which are safe to show so an instructor knows what to ask an
 * administrator for.
 *
 * Controlled component: reports { provider, model } upward. An empty string
 * means "server default" (the QUIZ_LLM_PROVIDER configured for the AI
 * service), so omitting a selection keeps existing behaviour.
 */
export default function AiProviderPicker({ provider, model, onProviderChange, onModelChange, disabled = false }) {
  const [catalog, setCatalog] = useState(null); // null = loading, [] = nothing to show
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    quizService.getAiProviders()
      .then((data) => {
        if (cancelled) return;
        setCatalog(Array.isArray(data?.providers) ? data.providers : []);
        setLoadFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCatalog([]);
        setLoadFailed(true);
      });
    return () => { cancelled = true; };
  }, []);

  const providers = catalog || [];
  const selected = providers.find((p) => p.provider === provider) || null;
  const models = selected?.models || [];

  // Only meaningful once the catalog has arrived; the server-side gate
  // validates the selection anyway, so failures here degrade to "default".
  const handleProviderChange = (nextProvider) => {
    onProviderChange(nextProvider);
    onModelChange(''); // reset model when the provider changes
  };

  const selectedMissing = selected && !selected.configured && Array.isArray(selected.missing)
    ? selected.missing.join(', ')
    : '';

  const labelStyle = {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    display: 'block',
    marginBottom: '6px'
  };
  const selectStyle = {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'var(--bg-canvas)',
    border: '1px solid var(--border-card)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-main)',
    fontSize: '13px'
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: models.length > 1 ? '1fr 1fr' : '1fr', gap: '12px' }}>
      <div>
        <label style={labelStyle}>AI Provider</label>
        <select
          className="form-select"
          style={selectStyle}
          value={provider}
          disabled={disabled || catalog === null}
          onChange={(e) => handleProviderChange(e.target.value)}
        >
          <option value="">
            {catalog === null
              ? 'Loading providers…'
              : loadFailed
                ? 'Server default (status unavailable)'
                : 'Server default'}
          </option>
          {providers.map((p) => (
            <option key={p.provider} value={p.provider}>
              {p.label}{p.configured ? '' : ' — not configured'}
            </option>
          ))}
        </select>
        {selectedMissing && (
          <div style={{ fontSize: '11px', color: '#D97706', marginTop: '4px' }}>
            Requires: {selectedMissing}
          </div>
        )}
        {!selectedMissing && selected?.active && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Active default provider
          </div>
        )}
      </div>

      {models.length > 1 && (
        <div>
          <label style={labelStyle}>Model</label>
          <select
            className="form-select"
            style={selectStyle}
            value={model || ''}
            disabled={disabled}
            onChange={(e) => onModelChange(e.target.value)}
          >
            <option value="">
              Default{selected?.defaultModel ? ` (${selected.defaultModel})` : ''}
            </option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
