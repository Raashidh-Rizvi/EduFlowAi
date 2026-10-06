import React from 'react';
import { Zap, Award, Globe2 } from 'lucide-react';

const FIELD = {
  width: '100%', padding: '10px 13px', fontSize: '13px', color: 'var(--text-main)',
  background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)', outline: 'none', transition: 'border-color 0.15s ease'
};

const LABEL = {
  display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px'
};

/**
 * Shared instructor form section for the student-facing course metadata:
 * short description, language, XP reward, certificate flag, learning outcomes,
 * prerequisites and target audience. Multi-value fields are edited as one item
 * per line. Used by both CreateCourseView and the MyCoursesView edit modal so
 * the two flows can never drift apart.
 */
export default function CourseMetadataFields({ form, update }) {
  const listValue = (key) => (Array.isArray(form[key]) ? form[key].join('\n') : (form[key] || ''));

  const updateList = (key) => (e) => {
    const items = e.target.value
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    update(key)(items);
  };

  return (
    <>
      <div>
        <label style={LABEL}>Short Description (shown on course cards &amp; search)</label>
        <input
          value={form.shortDescription || ''}
          onChange={update('shortDescription')}
          placeholder="One or two sentences that sell the course"
          maxLength={200}
          style={FIELD}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
        <div>
          <label style={LABEL}><Globe2 size={11} aria-hidden="true" /> Language</label>
          <select value={form.language || 'English'} onChange={update('language')} style={FIELD}>
            <option value="English">English</option>
            <option value="Sinhala">Sinhala</option>
            <option value="Tamil">Tamil</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="German">German</option>
            <option value="Hindi">Hindi</option>
            <option value="Mandarin">Mandarin</option>
          </select>
        </div>
        <div>
          <label style={LABEL}><Zap size={11} aria-hidden="true" /> XP Reward</label>
          <input
            type="number" min="0" step="50"
            value={form.xpReward ?? 0}
            onChange={update('xpReward')}
            title="Headline XP shown to students. Lesson & quiz XP is always awarded server-side on top of activity rules."
            style={FIELD}
          />
        </div>
        <div>
          <label style={LABEL}><Award size={11} aria-hidden="true" /> Certificate</label>
          <button
            type="button"
            className={form.certificateEnabled ? 'btn-primary' : 'btn-ghost'}
            onClick={() => update('certificateEnabled')(!form.certificateEnabled)}
            style={{ width: '100%', fontSize: '12.5px' }}
          >
            {form.certificateEnabled ? 'Certificate on' : 'Certificate off'}
          </button>
        </div>
      </div>

      <div>
        <label style={LABEL}>Learning Outcomes — "What you'll learn" (one per line)</label>
        <textarea
          value={listValue('learningOutcomes')}
          onChange={updateList('learningOutcomes')}
          rows={4}
          placeholder={'Build responsive web applications\nUnderstand REST API architecture\nDeploy applications to production'}
          style={{ ...FIELD, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
        />
      </div>

      <div>
        <label style={LABEL}>Requirements / Prerequisites (one per line, leave empty if none)</label>
        <textarea
          value={listValue('prerequisites')}
          onChange={updateList('prerequisites')}
          rows={3}
          placeholder={'Basic programming knowledge\nFamiliarity with HTML and CSS'}
          style={{ ...FIELD, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
        />
      </div>

      <div>
        <label style={LABEL}>Who This Course Is For (one per line)</label>
        <textarea
          value={listValue('targetAudience')}
          onChange={updateList('targetAudience')}
          rows={3}
          placeholder={'Beginners\nUniversity students\nCareer changers'}
          style={{ ...FIELD, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
        />
      </div>
    </>
  );
}

/** Builds the API payload for the metadata fields shared by create + update. */
export function metadataPayload(form) {
  return {
    shortDescription: (form.shortDescription || '').trim(),
    language: (form.language || 'English').trim(),
    xpReward: Math.max(0, Number(form.xpReward) || 0),
    certificateEnabled: Boolean(form.certificateEnabled),
    learningOutcomes: Array.isArray(form.learningOutcomes) ? form.learningOutcomes : [],
    prerequisites: Array.isArray(form.prerequisites) ? form.prerequisites : [],
    targetAudience: Array.isArray(form.targetAudience) ? form.targetAudience : []
  };
}

/** Normalizes the API course object into the metadata form shape. */
export function metadataFormState(course) {
  return {
    shortDescription: course?.shortDescription || '',
    language: course?.language || 'English',
    xpReward: course?.xpReward ?? 0,
    certificateEnabled: Boolean(course?.certificateEnabled),
    learningOutcomes: Array.isArray(course?.learningOutcomes) ? course.learningOutcomes : [],
    prerequisites: Array.isArray(course?.prerequisites) ? course.prerequisites : [],
    targetAudience: Array.isArray(course?.targetAudience) ? course.targetAudience : []
  };
}
