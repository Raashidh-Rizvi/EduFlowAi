import React, { useState } from 'react';
import { Rocket, ArrowLeft, Info, CheckCircle2 } from 'lucide-react';
import { courseService } from '../../../services/courseService';
import { SectionHeading, ErrorBanner } from '../shared';
import CourseMetadataFields, { metadataPayload } from './CourseMetadataFields';

const FIELD = {
  width: '100%', padding: '10px 13px', fontSize: '13px', color: 'var(--text-main)',
  background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)', outline: 'none', transition: 'border-color 0.15s ease'
};

const Label = ({ children, required }) => (
  <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
    {children} {required && <span style={{ color: 'var(--accent)' }}>*</span>}
  </label>
);

export default function CreateCourseView({ onNavigate }) {
  const [form, setForm] = useState({
    code: '',
    title: '',
    description: '',
    category: '',
    term: 'Fall 2026',
    difficulty: 'Medium',
    durationHours: 8,
    isFree: true,
    price: 0,
    thumbnailUrl: '',
    shortDescription: '',
    language: 'English',
    xpReward: 0,
    certificateEnabled: false,
    learningOutcomes: [],
    prerequisites: [],
    targetAudience: []
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  const update = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim() || !form.code.trim() || !form.category.trim()) {
      setError('Course title, code and category are required.');
      return;
    }
    if (!form.isFree && Number(form.price) <= 0) {
      setError('Set a price greater than zero, or mark the course as free.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        thumbnailUrl: form.thumbnailUrl.trim() || null,
        term: form.term.trim() || null,
        difficulty: form.difficulty,
        durationHours: Number(form.durationHours) || 0,
        price: form.isFree ? 0 : Number(form.price),
        isFree: Boolean(form.isFree),
        ...metadataPayload(form)
      };
      const result = await courseService.createCourse(payload);
      setCreated(result);
    } catch (err) {
      setError(err.friendlyMessage || 'Could not create the course.');
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <div>
        <div className="card-premium" style={{ padding: '44px 32px', textAlign: 'center' }}>
          <div style={{
            width: '58px', height: '58px', margin: '0 auto 16px', borderRadius: '50%',
            background: 'var(--success-soft)', border: '1px solid var(--success-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CheckCircle2 size={28} color="var(--success)" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 8px' }}>
            Course created as a draft
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 22px' }}>
            <strong style={{ color: 'var(--text-main)' }}>{created?.title || form.title}</strong> is now yours.
            Add modules and lessons, then publish it when you are ready to enroll students.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => onNavigate('courses')}>Open Curriculum Editor</button>
            <button className="btn-secondary" onClick={() => onNavigate('my-courses')}>Back to My Courses</button>
            <button className="btn-ghost" onClick={() => {
              setCreated(null);
              setForm(f => ({
                ...f,
                code: '', title: '', description: '', shortDescription: '',
                learningOutcomes: [], prerequisites: [], targetAudience: []
              }));
            }}>
              Create another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ErrorBanner message={error} />

      <SectionHeading
        title="Create Course"
        subtitle="Ownership is derived from your session — you cannot assign a course to another instructor."
        actions={
          <button className="btn-ghost" onClick={() => onNavigate('my-courses')} style={{ fontSize: '12.5px' }}>
            <ArrowLeft size={14} /> Back to My Courses
          </button>
        }
      />

      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        <div className="card-premium" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Label required>Course Title</Label>
            <input
              aria-label="Course Title"
              value={form.title}
              onChange={update('title')}
              placeholder="Course title e.g. CS-401: Distributed Systems"
              style={FIELD}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '14px' }}>
            <div>
              <Label required>Course Code</Label>
              <input aria-label="Course Code" value={form.code} onChange={update('code')} placeholder="CS-401" style={FIELD} />
            </div>
            <div>
              <Label required>Category</Label>
              <input aria-label="Category" value={form.category} onChange={update('category')} placeholder="Computer Science" style={FIELD} />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <textarea
              value={form.description}
              onChange={update('description')}
              placeholder="What will students learn in this course?"
              rows={5}
              style={{ ...FIELD, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <Label>Thumbnail URL</Label>
            <input value={form.thumbnailUrl} onChange={update('thumbnailUrl')} placeholder="https://…" style={FIELD} />
          </div>
          <div>
            <Label>Term</Label>
            <input value={form.term} onChange={update('term')} placeholder="Fall 2026" style={FIELD} />
          </div>
        </div>

        <CourseMetadataFields form={form} update={update} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card-premium" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <Label>Difficulty</Label>
              <select value={form.difficulty} onChange={update('difficulty')} style={FIELD}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Boss">Boss</option>
              </select>
            </div>

            <div>
              <Label>Duration (hours)</Label>
              <input type="number" min="0" value={form.durationHours} onChange={update('durationHours')} style={FIELD} />
            </div>

            <div>
              <Label>Pricing</Label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={form.isFree ? 'btn-primary' : 'btn-ghost'}
                  onClick={() => setForm(p => ({ ...p, isFree: true, price: 0 }))}
                  style={{ flex: 1, fontSize: '12.5px' }}
                >
                  Free
                </button>
                <button
                  type="button"
                  className={!form.isFree ? 'btn-primary' : 'btn-ghost'}
                  onClick={() => setForm(p => ({ ...p, isFree: false }))}
                  style={{ flex: 1, fontSize: '12.5px' }}
                >
                  Paid
                </button>
              </div>
            </div>

            {!form.isFree && (
              <div>
                <Label required>Price (USD)</Label>
                <input type="number" min="0" step="0.01" value={form.price} onChange={update('price')} style={FIELD} />
              </div>
            )}
          </div>

          <div className="card-premium" style={{ padding: '18px 20px', display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
            <Info size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              New courses start as <strong style={{ color: 'var(--text-main)' }}>drafts</strong>. Students only see
              them after you press <strong style={{ color: 'var(--text-main)' }}>Publish</strong>, and paid courses
              require payment verification before enrollment can be approved.
            </p>
          </div>

          <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700 }}>
            <Rocket size={16} /> {saving ? 'Creating…' : 'Create Course'}
          </button>

          <button type="button" className="btn-ghost" onClick={() => onNavigate('my-courses')} style={{ width: '100%' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
