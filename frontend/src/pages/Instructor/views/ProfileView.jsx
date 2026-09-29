import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Users, Star, CalendarDays, Mail, ShieldCheck, Settings, Pencil, Globe, Linkedin, Image } from 'lucide-react';
import instructorService from '../../../services/instructorService';
import {
  SectionHeading, LoadingBlock, ErrorBanner, StarRating, Avatar, fmtDate, fmtNumber
} from '../shared';

const EMPTY_FORM = {
  fullName: '',
  avatarUrl: '',
  headline: '',
  bio: '',
  expertise: '',
  websiteUrl: '',
  linkedInUrl: ''
};

export default function ProfileView({ onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [formReady, setFormReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null); // { tone, text }

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summary, editable] = await Promise.all([
        instructorService.getProfile(),
        instructorService.getMyPublicProfile().catch(() => null)
      ]);
      setProfile(summary);
      if (editable) {
        setForm({
          fullName: editable.fullName || '',
          avatarUrl: editable.avatarUrl || '',
          headline: editable.headline || '',
          bio: editable.bio || '',
          expertise: editable.expertise || '',
          websiteUrl: editable.websiteUrl || '',
          linkedInUrl: editable.linkedInUrl || ''
        });
        setFormReady(true);
      }
    } catch (err) {
      setError(err.friendlyMessage || 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setField = (name) => (event) => {
    setForm((prev) => ({ ...prev, [name]: event.target.value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (saving || !formReady) return;
    setSaving(true);
    setSaveNotice(null);
    try {
      // Partial update: blank-optional fields are sent as-is; the server
      // leaves untouched every field the form does not change.
      await instructorService.updateMyProfile({
        fullName: form.fullName.trim(),
        avatarUrl: form.avatarUrl.trim(),
        headline: form.headline,
        bio: form.bio,
        expertise: form.expertise,
        websiteUrl: form.websiteUrl.trim(),
        linkedInUrl: form.linkedInUrl.trim()
      });
      setSaveNotice({ tone: 'success', text: 'Your public profile was updated.' });
      await load();
    } catch (err) {
      setSaveNotice({
        tone: 'error',
        text: err?.response?.data?.message || err?.friendlyMessage || 'We could not save your profile.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingBlock label="Loading your profile" />;

  return (
    <div>
      <ErrorBanner message={error} onRetry={load} />

      <SectionHeading
        title="Profile"
        subtitle="Your identity as it appears across courses you own."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.7fr)', gap: '20px', alignItems: 'start' }}>
        <div className="card-premium" style={{ padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <Avatar name={profile?.fullName} url={profile?.avatarUrl} size={86} />
          </div>
          <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            {profile?.fullName || 'Instructor'}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <span className="badge-pill badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={12} /> {profile?.role || 'Instructor'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <Mail size={14} color="var(--primary)" /> {profile?.email || '—'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <CalendarDays size={14} color="var(--primary)" /> Member since {fmtDate(profile?.memberSince)}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '18px' }}>
            <StarRating value={profile?.averageRating || 0} size={15} showValue />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
            {[
              { icon: BookOpen, label: 'Total Courses', value: profile?.totalCourses ?? 0 },
              { icon: ShieldCheck, label: 'Published', value: profile?.publishedCourses ?? 0 },
              { icon: Users, label: 'Students', value: profile?.totalStudents ?? 0 },
              { icon: Star, label: 'Avg Rating', value: fmtNumber(profile?.averageRating, 1) }
            ].map(m => (
              <div key={m.label} className="metric-card">
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{m.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginTop: '6px' }}>{m.value}</div>
                </div>
                <m.icon size={18} color="var(--primary)" />
              </div>
            ))}
          </div>

          <div className="card-premium" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}>
              <Settings size={16} color="var(--primary)" />
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Workspace</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '9px' }}>
              <button className="btn-secondary" onClick={() => onNavigate('my-courses')} style={{ justifyContent: 'flex-start', fontSize: '12.5px' }}>
                <BookOpen size={14} /> Manage my courses
              </button>
              <button className="btn-secondary" onClick={() => onNavigate('enrollment-requests')} style={{ justifyContent: 'flex-start', fontSize: '12.5px' }}>
                <Users size={14} /> Enrollment requests
              </button>
              <button className="btn-secondary" onClick={() => onNavigate('reviews')} style={{ justifyContent: 'flex-start', fontSize: '12.5px' }}>
                <Star size={14} /> Reviews & ratings
              </button>
              <button className="btn-secondary" onClick={() => onNavigate('insights')} style={{ justifyContent: 'flex-start', fontSize: '12.5px' }}>
                <CalendarDays size={14} /> Cohort insights
              </button>
            </div>
          </div>

          <div className="card-premium" style={{ padding: '20px 24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 8px' }}>Ownership & security</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>
              Every course, roster, enrollment decision and review you see is scoped server-side to your
              authenticated identity. Another instructor cannot read or modify your courses, and you cannot
              modify theirs — including through direct API calls.
            </p>
          </div>

          <div className="card-premium" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '6px' }}>
              <Pencil size={16} color="var(--primary)" />
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Edit public profile</h3>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 14px' }}>
              This is how learners see you on course pages and on your public instructor profile.
              Expertise is a comma-separated list (up to 12 tags).
            </p>

            {saveNotice && (
              <div
                role={saveNotice.tone === 'error' ? 'alert' : 'status'}
                className={`badge-pill ${saveNotice.tone === 'error' ? 'badge-danger' : 'badge-success'}`}
                style={{ marginBottom: '12px', whiteSpace: 'normal', textAlign: 'left' }}
              >
                {saveNotice.text}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!formReady && (
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Loading your editable profile…
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label className="form-label" htmlFor="ip-fullName">Display name</label>
                  <input id="ip-fullName" className="form-input" value={form.fullName} onChange={setField('fullName')} maxLength={120} required disabled={saving || !formReady} />
                </div>
                <div>
                  <label className="form-label" htmlFor="ip-headline">Headline</label>
                  <input id="ip-headline" className="form-input" value={form.headline} onChange={setField('headline')} maxLength={200} placeholder="e.g. Database systems and backend architecture" disabled={saving || !formReady} />
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="ip-avatar">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Image size={13} /> Profile image URL</span>
                </label>
                <input id="ip-avatar" className="form-input" value={form.avatarUrl} onChange={setField('avatarUrl')} maxLength={500} placeholder="/uploads/avatars/me.png or https://…" disabled={saving || !formReady} />
              </div>

              <div>
                <label className="form-label" htmlFor="ip-bio">Biography</label>
                <textarea id="ip-bio" className="form-textarea" rows={4} value={form.bio} onChange={setField('bio')} maxLength={2000} placeholder="Tell learners who you are and what you teach." disabled={saving || !formReady} />
              </div>

              <div>
                <label className="form-label" htmlFor="ip-expertise">Expertise</label>
                <input id="ip-expertise" className="form-input" value={form.expertise} onChange={setField('expertise')} maxLength={1000} placeholder="PostgreSQL, EF Core, Distributed Systems" disabled={saving || !formReady} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label className="form-label" htmlFor="ip-website">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Globe size={13} /> Website</span>
                  </label>
                  <input id="ip-website" className="form-input" value={form.websiteUrl} onChange={setField('websiteUrl')} maxLength={500} placeholder="https://" disabled={saving || !formReady} />
                </div>
                <div>
                  <label className="form-label" htmlFor="ip-linkedin">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Linkedin size={13} /> LinkedIn</span>
                  </label>
                  <input id="ip-linkedin" className="form-input" value={form.linkedInUrl} onChange={setField('linkedInUrl')} maxLength={500} placeholder="https://" disabled={saving || !formReady} />
                </div>
              </div>

              <div>
                <button type="submit" className="btn-primary" disabled={saving || !formReady} style={{ padding: '8px 20px', fontSize: '12.5px' }}>
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
