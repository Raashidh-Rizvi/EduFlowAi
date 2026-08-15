import React, { useState } from 'react';
import { 
  Bell, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MessageSquare,
  ShieldCheck,
  Radio
} from 'lucide-react';

export default function Communications() {
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [announcements, setAnnouncements] = useState([
    {
      id: 'a-1',
      title: '⚔️ Midterm Boss Challenge "Concurrency Raid" is Live!',
      message: 'Students who score ≥ 80% will unlock the Boss Slayer Trophy and +500 XP bonus towards Level 5.',
      sentAt: '2 hours ago',
      channel: 'Push Notification + In-App',
      recipients: '342 Students',
      delivered: true
    },
    {
      id: 'a-2',
      title: '📅 Assignment 1 Lab Submission Deadline Reminder',
      message: 'Please ensure your ASP.NET Core & LangGraph multi-agent test suites pass automated CI checks.',
      sentAt: 'Yesterday',
      channel: 'Email Broadcast (SendGrid)',
      recipients: '342 Students',
      delivered: true
    }
  ]);

  const handleBroadcast = (e) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;

    const newAnn = {
      id: `a-${Date.now()}`,
      title: broadcastTitle,
      message: broadcastMessage,
      sentAt: 'Just now',
      channel: 'FCM Push + In-App Banner',
      recipients: targetAudience === 'all' ? 'All Enrolled (342)' : 'At-Risk Students (42)',
      delivered: true
    };

    setAnnouncements([newAnn, ...announcements]);
    setBroadcastTitle('');
    setBroadcastMessage('');
    alert('Announcement successfully dispatched to student mobile clients via Firebase Cloud Messaging!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Composer + Status Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
        {/* Broadcast Announcement Form */}
        <section className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Radio size={20} color="var(--primary)" />
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '700' }}>Broadcast Cohort Announcement</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Dispatches real-time push alerts to Flutter mobile clients and dashboard feeds.</p>
            </div>
          </div>

          <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Announcement Headline
              </label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. 🏆 Double XP Weekend Quest has commenced!"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  outline: 'none',
                  marginTop: '4px'
                }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Message Content
              </label>
              <textarea
                rows={3}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Write message instructions for students..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  outline: 'none',
                  marginTop: '4px',
                  resize: 'none'
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Target:</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '12px'
                  }}
                >
                  <option value="all">All Enrolled Students (342)</option>
                  <option value="at-risk">At-Risk Learners Only (42)</option>
                  <option value="top">Top 10 Leaderboard Achievers</option>
                </select>
              </div>

              <button
                type="submit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  boxShadow: 'var(--shadow-glow)'
                }}
              >
                <Send size={14} /> Dispatch Broadcast
              </button>
            </div>
          </form>
        </section>

        {/* AI Automated Study Reminders Panel */}
        <aside className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>AI Automated Habit Nudges</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { rule: 'Streak Protection Nudge 🔥', trigger: 'Student inactive for 20 hours with streak > 3 days', status: 'Active (84 sent today)' },
              { rule: 'Boss Challenge Warning ⚔️', trigger: '3 days remaining before Midterm Raid closes', status: 'Active (Scheduled 6 PM)' },
              { rule: 'Remedial Quest Recommendation 🎯', trigger: 'Quiz score < 60% in EF Core transactions', status: 'Active (Real-time)' }
            ].map((nudge, idx) => (
              <div key={idx} style={{
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px'
              }}>
                <strong style={{ color: 'var(--text-main)' }}>{nudge.rule}</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{nudge.trigger}</p>
                <span style={{ fontSize: '10.5px', color: 'var(--success)', marginTop: '4px', display: 'inline-block', fontWeight: '600' }}>
                  ✓ {nudge.status}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Broadcast History Log */}
      <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Sent Broadcast & Notification Log</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {announcements.map((item) => (
            <div key={item.id} style={{
              padding: '14px 18px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{item.title}</strong>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>{item.message}</p>
                <div style={{ display: 'flex', gap: '14px', marginTop: '8px', fontSize: '11px', color: 'var(--text-subtle)' }}>
                  <span>Channel: <strong style={{ color: 'var(--secondary)' }}>{item.channel}</strong></span>
                  <span>Recipients: {item.recipients}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--success)'
                }}>
                  ✓ DELIVERED
                </span>
                <p style={{ fontSize: '10.5px', color: 'var(--text-subtle)', marginTop: '4px' }}>{item.sentAt}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
