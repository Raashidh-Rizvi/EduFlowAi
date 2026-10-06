import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MessageSquare,
  ShieldCheck,
  Radio,
  RefreshCw
} from 'lucide-react';
import api from '../../services/api';

export default function Communications() {
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const loadBroadcasts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/notifications/broadcasts', { params: { limit: 20 } });
      const data = response.data;
      if (Array.isArray(data)) {
        setAnnouncements(data.map(b => ({
          id: b.id,
          title: b.title,
          message: b.content,
          sentAt: b.createdAt ? new Date(b.createdAt).toLocaleString() : 'Unknown',
          isGlobal: b.isGlobal,
          authorName: b.authorName || 'Instructor',
          channel: 'In-App Notification'
        })));
      }
    } catch (err) {
      setError('Unable to load broadcast history. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    setSending(true);
    try {
      const payload = {
        title: broadcastTitle.trim(),
        content: broadcastMessage.trim(),
        isGlobal: targetAudience === 'all',
        courseId: null
      };

      const response = await api.post('/notifications/broadcast', payload);
      const newId = response.data?.announcementId || `a-${Date.now()}`;

      const newAnn = {
        id: newId,
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        sentAt: new Date().toLocaleString(),
        isGlobal: targetAudience === 'all',
        authorName: 'You',
        channel: 'In-App Notification'
      };

      setAnnouncements([newAnn, ...announcements]);
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to send broadcast.';
      alert(`Broadcast Error: ${msg}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Composer + Status Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        {/* Broadcast Announcement Form */}
        <section className="card-premium" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--primary-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <Radio size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Broadcast Cohort Announcement</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Dispatches real-time push alerts to Flutter mobile clients and student dashboard feeds.</p>
            </div>
          </div>

          <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="form-label">
                Announcement Headline
              </label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Double XP Weekend Quest has commenced"
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">
                Message Content
              </label>
              <textarea
                rows={3}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Write message instructions for students..."
                className="form-textarea"
                style={{ resize: 'none' }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Target Cohort:</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="form-select"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                >
                  <option value="all">All Enrolled Students</option>
                  <option value="at-risk">At-Risk Learners Only</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '12.5px' }}
                disabled={sending || !broadcastTitle.trim() || !broadcastMessage.trim()}
              >
                {sending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Dispatch Broadcast</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* AI Automated Study Reminders Panel */}
        <aside className="card-premium" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="var(--primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Automated AI Nudge Rules</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { rule: 'Streak Protection Nudge', trigger: 'Student inactive for 20 hours with streak > 3 days', status: 'Active (84 sent today)' },
              { rule: 'Assessment Deadline Notice', trigger: '3 days remaining before Midterm Challenge closes', status: 'Active (Scheduled 6 PM)' },
              { rule: 'Remedial Quest Recommendation', trigger: 'Quiz score < 60% in EF Core transactions', status: 'Active (Real-time)' }
            ].map((nudge, idx) => (
              <div key={idx} style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px'
              }}>
                <strong style={{ color: 'var(--text-main)' }}>{nudge.rule}</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{nudge.trigger}</p>
                <span className="badge-pill badge-success" style={{ fontSize: '10.5px', marginTop: '4px' }}>
                  ✓ {nudge.status}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Broadcast History Log */}
      <section className="card-premium" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Broadcast & Notification History</h3>
          <button
            onClick={loadBroadcasts}
            className="btn-ghost"
            style={{ fontSize: '12px', padding: '4px 8px' }}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Loading...' : 'Refresh'}</span>
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            fontSize: '12.5px',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              Loading broadcast history...
            </div>
          ) : announcements.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No broadcast announcements sent yet. Dispatched announcements and push notifications will be logged here.
            </div>
          ) : (
            announcements.map((item) => (
            <div key={item.id} style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-main)' }}>{item.title}</strong>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.message}</p>
                <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '11px', color: 'var(--text-subtle)' }}>
                  <span>Channel: <strong style={{ color: 'var(--secondary)' }}>{item.channel}</strong></span>
                  <span>By: {item.authorName}</span>
                  <span>Scope: {item.isGlobal ? 'Global' : 'Course-specific'}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="badge-pill badge-success">
                  Delivered
                </span>
                <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.sentAt}</p>
              </div>
            </div>
          ))
        )}
        </div>
      </section>
    </div>
  );
}
