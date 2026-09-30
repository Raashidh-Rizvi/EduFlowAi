import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { BookOpen, Download, Edit3, Eye, Plus, RefreshCw, Users, X } from 'lucide-react';
import { courseService } from '../../services/courseService';
import { resolvePdfUrl } from '../../utils/pdfHelper';

const row = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' };
const stack = { display: 'grid', gap: 16 };
const muted = { color: 'var(--text-muted)' };
const field = { width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', background: 'var(--bg-canvas)', color: 'var(--text-main)' };
const panel = { padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)', background: 'var(--bg-surface)' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16 };

function errorMessage(error, fallback) {
  const data = error?.response?.data;
  return typeof data?.message === 'string' ? data.message : fallback;
}

function Notice({ error, children }) {
  return children ? <p role={error ? 'alert' : 'status'} style={{ ...panel, padding: 12, margin: 0, color: error ? 'var(--danger, #b42318)' : 'var(--text-main)' }}>{children}</p> : null;
}

function Dialog({ title, busy = false, onClose, children, wide = false, className }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className={className} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} style={{ ...panel, margin: 'auto', width: wide ? 960 : 620, maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh', overflow: 'auto', color: 'var(--text-main)' }}>
    <header style={{ ...row, justifyContent: 'space-between', marginBottom: 20 }}>
      <h2 id={titleId} style={{ margin: 0, fontSize: 20 }}>{title}</h2>
      <button type="button" className="btn-secondary" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={18} /></button>
    </header>
    {children}
  </dialog>;
}

function Field({ label, children }) {
  return <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 600 }}>{label}{children}</label>;
}

function CourseEditor({ course, onClose, onSaved }) {
  const [draft, setDraft] = useState({ code: course?.code || '', title: course?.title || '', category: course?.category || '', term: course?.term || '', description: course?.description || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const change = event => setDraft(previous => ({ ...previous, [event.target.name]: event.target.value }));
  async function save(event) {
    event.preventDefault();
    if (saving.current) return;
    const payload = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()]));
    if (!payload.code || !payload.title || !payload.category || !payload.term) {
      setError('Enter a course code, title, category, and term.');
      return;
    }
    payload.thumbnailUrl = course?.thumbnailUrl ?? null;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = course ? await courseService.updateCourse(course.id, payload) : await courseService.createCourse(payload);
      // Update returns zero counts and no instructor name; retain the existing inventory values.
      onSaved(course ? { ...course, ...payload } : saved);
    } catch (error) {
      setError(errorMessage(error, 'Could not save the course. Your entries have been kept; please try again.'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return <Dialog title={course ? 'Edit Course' : 'New Course'} busy={busy} onClose={onClose}>
    <form onSubmit={save} style={stack}>
      <Notice error>{error}</Notice>
      <fieldset disabled={busy} style={{ ...stack, border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div style={grid}>
          <Field label="Course code *"><input autoFocus required name="code" style={field} value={draft.code} onChange={change} /></Field>
          <Field label="Category *"><input required name="category" style={field} value={draft.category} onChange={change} /></Field>
        </div>
        <Field label="Course title *"><input required name="title" style={field} value={draft.title} onChange={change} /></Field>
        <Field label="Semester / term *"><input required name="term" style={field} value={draft.term} onChange={change} /></Field>
        <Field label="Description"><textarea name="description" rows={4} style={field} value={draft.description} onChange={change} /></Field>
        <div style={{ ...row, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">{busy ? 'Saving…' : course ? 'Save Changes' : 'Create Course'}</button>
        </div>
      </fieldset>
    </form>
  </Dialog>;
}

function ModuleEditor({ courseId, module, nextOrder, onClose, onSaved }) {
  const [draft, setDraft] = useState({ title: module?.title || '', description: module?.description || '', orderIndex: module?.orderIndex ?? nextOrder });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const uploaded = useRef(null);
  const change = event => setDraft(previous => ({ ...previous, [event.target.name]: event.target.value }));
  async function save(event) {
    event.preventDefault();
    if (saving.current) return;
    const orderIndex = Number(draft.orderIndex);
    if (!draft.title.trim() || draft.orderIndex === '' || !Number.isInteger(orderIndex) || orderIndex < 0 || orderIndex > 2147483647) {
      setError('Enter a module title and a valid non-negative whole-number order.');
      return;
    }
    if (file && (!/\.(pdf|pptx?|docx?)$/i.test(file.name) || file.size === 0 || file.size > 50 * 1024 * 1024)) {
      setError('Choose a non-empty PDF, PowerPoint, or Word document up to 50 MB.');
      return;
    }
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      if (file && !uploaded.current) uploaded.current = await courseService.uploadPdf(file);
      const payload = { title: draft.title.trim(), description: draft.description.trim(), orderIndex };
      if (!module && uploaded.current) {
        payload.pdfUrl = uploaded.current.fileUrl;
        payload.attachmentFileName = uploaded.current.fileName;
      }
      // Metadata-only updates deliberately omit document fields, which the API preserves.
      const saved = module
        ? await courseService.updateModule(module.id, payload)
        : await courseService.createModule(courseId, payload);
      // Metadata edits preserve loaded attachments/content; creates use the server-issued ID.
      onSaved(module ? { ...module, ...payload } : { ...saved, ...payload }, !module);
    } catch (error) {
      setError(errorMessage(error, 'Could not save the module. Your entries have been kept; please try again.'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return <Dialog title={module ? 'Edit Module Details' : 'Add Module'} busy={busy} onClose={onClose}>
    <form onSubmit={save} style={stack}>
      <Notice error>{error}</Notice>
      <fieldset disabled={busy} style={{ ...stack, border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <Field label="Module title *"><input autoFocus required name="title" style={field} value={draft.title} onChange={change} /></Field>
        <Field label="Description"><textarea name="description" rows={3} style={field} value={draft.description} onChange={change} /></Field>
        <Field label="Display order *"><input required type="number" min="0" max="2147483647" step="1" name="orderIndex" style={field} value={draft.orderIndex} onChange={change} /></Field>
        {!module && <Field label="Attach document (optional, up to 50 MB)"><input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx" onChange={event => { setFile(event.target.files?.[0] || null); uploaded.current = null; }} /></Field>}
        {module?.pdfUrl && <p style={muted}>Attached document: {module.attachmentFileName || 'Document'}</p>}
        <div style={{ ...row, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">{busy ? 'Saving…' : module ? 'Save Changes' : 'Add Module'}</button>
        </div>
      </fieldset>
    </form>
  </Dialog>;
}

function StudentsDialog({ course, onClose, onChanged }) {
  const [students, setStudents] = useState([]);
  const [enrolled, setEnrolled] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removing, setRemoving] = useState(null);
  const saving = useRef(false);
  const busy = Boolean(pending);
  const load = useCallback(async (rosterOnly = false) => {
    setLoading(true);
    setError('');
    try {
      const [available, roster] = await Promise.all([
        rosterOnly ? Promise.resolve(null) : courseService.getAvailableStudents(),
        courseService.getEnrolledStudents(course.id)
      ]);
      if (available) setStudents(available);
      setEnrolled(roster);
      onChanged(course.id, roster.length);
    } catch (error) {
      setError(errorMessage(error, rosterOnly
        ? 'Enrollment saved, but the student list could not refresh. Retry the list; do not repeat the enrollment change.'
        : 'Could not load student information. Please retry.'));
    } finally { setLoading(false); }
  }, [course.id, onChanged]);
  useEffect(() => { load(); }, [load]);
  async function changeEnrollment(student, remove) {
    if (saving.current) return;
    saving.current = true;
    setPending({ studentId: student.studentId, action: remove ? 'remove' : 'enroll' });
    setError('');
    setNotice('');
    try {
      if (remove) await courseService.removeStudentFromCourse(course.id, student.studentId);
      else await courseService.addStudentToCourse(course.id, { studentId: student.studentId });
      setRemoving(null);
      setNotice(remove ? student.fullName + ' removed from this course.' : student.fullName + ' enrolled successfully.');
      await load(true);
    } catch (error) {
      setError(errorMessage(error, 'Could not update enrollment. Please retry.'));
    } finally { saving.current = false; setPending(null); }
  }
  const enrolledIds = new Set(enrolled.map(student => student.studentId));
  const matches = student => (student.fullName + ' ' + student.email).toLowerCase().includes(query.trim().toLowerCase());
  const available = students.filter(student => !enrolledIds.has(student.studentId));
  const candidates = available.filter(matches);
  const roster = enrolled.filter(matches);
  const blocked = busy || loading || Boolean(error) || Boolean(removing);
  return <Dialog title={'Add & Manage Course Students — ' + course.code} busy={busy} onClose={onClose} wide className="acm-students-dialog">
    <div className="acm-students-body">
      <Field label="Search students by name or email"><input autoFocus type="search" style={field} value={query} onChange={event => setQuery(event.target.value)} /></Field>
      {!error && <Notice>{notice}</Notice>}
      <Notice error>{error}</Notice>
      {error && <button className="btn-secondary" style={{ alignSelf: 'flex-start' }} disabled={busy || loading} onClick={() => load()}>Retry student information</button>}
      {loading && !busy && <p role="status" style={{ margin: 0 }}>Loading students…</p>}
      {busy && <small role="status" style={muted}>Saving this student's change; other actions will unlock when the roster is synchronized.</small>}
      {removing && <div style={{ ...panel, padding: 12 }} role="group" aria-label="Confirm removal">
        <p style={{ margin: '0 0 10px' }}>Remove <strong>{removing.fullName}</strong> from <strong>{course.title}</strong>? Their enrollment will be marked as dropped and their history retained.</p>
        <div style={row}>
          <button className="btn-secondary" disabled={busy} onClick={() => setRemoving(null)}>Cancel removal</button>
          <button className="btn-primary" disabled={busy || loading} onClick={() => changeEnrollment(removing, true)}>{pending?.studentId === removing.studentId ? 'Removing…' : 'Confirm removal'}</button>
        </div>
      </div>}
      <div className="acm-students-columns">
        <section className="acm-students-section" aria-label="Enrolled students">
          <h3>Enrolled Students ({query ? roster.length + ' / ' : ''}{enrolled.length})</h3>
          <div className="acm-students-list" tabIndex={0} aria-label="Enrolled student list">
            {!loading && !error && !roster.length && <p style={{ ...muted, padding: 12 }}>{query ? 'No enrolled students match your search.' : 'No students are enrolled yet.'}</p>}
            {roster.map(student => <div key={student.studentId} className="acm-student-row" aria-busy={pending?.studentId === student.studentId}>
              <div><strong>{student.fullName}</strong><div style={{ ...muted, fontSize: 12 }}>{student.email}</div><small style={muted}>{student.status} · {new Date(student.enrolledAt).toLocaleDateString()}</small></div>
              <button className="btn-secondary" aria-label={'Remove ' + student.fullName + ' from course'} disabled={blocked} onClick={() => setRemoving(student)}>{pending?.studentId === student.studentId && pending.action === 'remove' ? 'Removing…' : 'Remove'}</button>
            </div>)}
          </div>
        </section>
        <section className="acm-students-section" aria-label="Available students">
          <h3>Available Students ({query ? candidates.length + ' / ' : ''}{available.length})</h3>
          <div className="acm-students-list" tabIndex={0} aria-label="Available student list">
            {!loading && !error && !candidates.length && <p style={{ ...muted, padding: 12 }}>{query ? 'No available students match your search.' : 'No additional active students are available.'}</p>}
            {candidates.map(student => <div key={student.studentId} className="acm-student-row" aria-busy={pending?.studentId === student.studentId}>
              <div><strong>{student.fullName}</strong><div style={{ ...muted, fontSize: 12 }}>{student.email}</div></div>
              <button className="btn-secondary" aria-label={'Enroll ' + student.fullName} disabled={blocked} onClick={() => changeEnrollment(student, false)}>{pending?.studentId === student.studentId && pending.action === 'enroll' ? 'Updating…' : 'Enroll'}</button>
            </div>)}
          </div>
        </section>
      </div>
      <div style={{ ...row, justifyContent: 'flex-end' }}><button className="btn-secondary" disabled={busy} onClick={onClose}>Close</button></div>
    </div>
  </Dialog>;
}

async function fetchDocument(module) {
  const url = new URL(resolvePdfUrl(module.pdfUrl), window.location.origin);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid document URL.');
  const response = await fetch(url.href);
  if (!response.ok || response.headers.get('content-type')?.includes('text/html')) throw new Error('Document unavailable.');
  const blob = await response.blob();
  if (!blob.size) throw new Error('Document is empty.');
  return blob;
}

function DocumentPreview({ module, onClose }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const isPdf = /\.pdf(?:$|[?#])/i.test(module.attachmentFileName || module.pdfUrl);
  useEffect(() => {
    if (!isPdf) return;
    let active = true;
    let objectUrl;
    setError('');
    setUrl('');
    fetchDocument(module).then(async blob => {
      if (await blob.slice(0, 5).text() !== '%PDF-') throw new Error('Not a PDF.');
      if (active) {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        setUrl(objectUrl);
      }
    }).catch(() => { if (active) setError('Could not preview this document. Check that the attachment is available and try again.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [module, isPdf, attempt]);
  return <Dialog title={module.attachmentFileName || 'Document Preview'} onClose={onClose} wide>
    {!isPdf ? <p>Inline preview is available for PDF files. Close this dialog and choose Download to open this document in Word or PowerPoint.</p> : error ? <div style={stack}><Notice error>{error}</Notice><button className="btn-secondary" onClick={() => setAttempt(value => value + 1)}>Retry preview</button></div> : url ? <iframe title={'Preview of ' + module.title} src={url} style={{ width: '100%', height: '65vh', border: 0 }} /> : <p role="status">Loading document…</p>}
  </Dialog>;
}

function Modules({ course, revision, onChanged }) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null);
  const [preview, setPreview] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [documentError, setDocumentError] = useState('');
  const request = useRef(0);
  const downloadBusy = useRef(false);
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await courseService.getModules(course.id);
      if (id === request.current) setModules(result.sort((a, b) => a.orderIndex - b.orderIndex));
    } catch (error) {
      if (id === request.current) setError(errorMessage(error, 'Could not load modules. Please retry.'));
    } finally { if (id === request.current) setLoading(false); }
  }, [course.id]);
  useEffect(() => { load(); return () => { request.current += 1; }; }, [load, revision]);
  async function download(module) {
    if (downloadBusy.current) return;
    downloadBusy.current = true;
    setDownloading(module.id);
    setNotice('');
    setDocumentError('');
    try {
      const blob = await fetchDocument(module);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = module.attachmentFileName || new URL(resolvePdfUrl(module.pdfUrl), window.location.origin).pathname.split('/').pop() || 'document';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setNotice('Document download started.');
    } catch {
      setDocumentError('Could not download the document. Check that the attachment is available and try again.');
    } finally { downloadBusy.current = false; setDownloading(null); }
  }
  function savedModule(module, created) {
    // A completed mutation is authoritative; an older list response must not replace it.
    request.current += 1;
    setLoading(false);
    setError('');
    setModules(previous => (created ? [...previous, module] : previous.map(item => item.id === module.id ? module : item)).sort((a, b) => a.orderIndex - b.orderIndex));
    setEditor(null);
    setNotice('Module saved successfully.');
    if (created) onChanged(course.id, 'modulesCount', 1);
  }
  return <section style={stack} aria-label="Course modules">
    <div style={{ ...row, justifyContent: 'space-between' }}>
      <h3 style={{ margin: 0 }}>Modules</h3>
      <button className="btn-primary" disabled={loading || Boolean(error)} onClick={() => setEditor({})}><Plus size={16} /> Add Module</button>
    </div>
    <Notice>{notice}</Notice>
    <Notice error>{error}</Notice>
    <Notice error>{documentError}</Notice>
    {error && <button className="btn-secondary" disabled={loading} onClick={load}>Retry modules</button>}
    {loading && <p role="status">Loading modules…</p>}
    {!loading && !error && !modules.length && <div style={panel}><p>No modules yet. Add the first module to organize this course.</p></div>}
    {modules.map(module => <article key={module.id} style={{ ...panel, ...stack }}>
      <div style={{ ...row, justifyContent: 'space-between' }}>
        <div><small style={muted}>Order {module.orderIndex}</small><h4 style={{ margin: '4px 0' }}>{module.title}</h4></div>
        <button className="btn-secondary" disabled={loading || Boolean(error)} onClick={() => setEditor(module)}><Edit3 size={16} /> Edit Details</button>
      </div>
      {module.description && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{module.description}</p>}
      {module.pdfUrl ? <div style={row}>
        <span style={{ overflowWrap: 'anywhere' }}>{module.attachmentFileName || 'Attached document'}</span>
        <button className="btn-secondary" onClick={() => setPreview(module)}><Eye size={16} /> Preview Document</button>
        <button className="btn-secondary" disabled={Boolean(downloading)} onClick={() => download(module)}><Download size={16} /> {downloading === module.id ? 'Downloading…' : 'Download'}</button>
      </div> : <span style={muted}>No document attached.</span>}
    </article>)}
    {editor && <ModuleEditor courseId={course.id} module={editor.id ? editor : null} nextOrder={modules.reduce((max, module) => Math.max(max, module.orderIndex), 0) + 1} onClose={() => setEditor(null)} onSaved={savedModule} />}
    {preview && <DocumentPreview module={preview} onClose={() => setPreview(null)} />}
  </section>;
}

export default function AdminCourseManagement() {
  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [instructor, setInstructor] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('title-asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null);
  const [studentsCourse, setStudentsCourse] = useState(null);
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await courseService.getCourses();
      if (id !== request.current) return;
      setCourses(result);
      setSelectedId(current => result.some(course => course.id === current) ? current : result[0]?.id ?? null);
    } catch (error) {
      if (id === request.current) setError(errorMessage(error, 'Could not refresh courses. Displayed information may be out of date. Please retry.'));
    } finally { if (id === request.current) setLoading(false); }
  }, []);
  useEffect(() => { load(); return () => { request.current += 1; }; }, [load]);
  const updateCount = useCallback((courseId, key, delta) => {
    request.current += 1;
    setLoading(false);
    setCourses(previous => previous.map(course => course.id === courseId ? { ...course, [key]: course[key] + delta } : course));
  }, []);
  const updateStudentCount = useCallback((courseId, count) => {
    request.current += 1;
    setLoading(false);
    setCourses(previous => previous.map(course => course.id === courseId ? { ...course, studentsCount: count } : course));
  }, []);
  const selected = courses.find(course => course.id === selectedId);
  const instructors = [...new Map(courses.map(course => [course.instructorId, course.instructorName || 'Name not provided'])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const categories = [...new Set(courses.map(course => course.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const statuses = [...new Set(courses.map(course => course.isPublished ? 'published' : 'draft'))].sort();
  const compareText = (a, b, key) => (a[key] || '').localeCompare(b[key] || '', undefined, { numeric: true, sensitivity: 'base' });
  const visible = courses.filter(course =>
    [course.code, course.title, course.category, course.term, course.instructorName].join(' ').toLowerCase().includes(query.trim().toLowerCase()) &&
    (!instructor || course.instructorId === instructor) && (!category || course.category === category) &&
    (!status || (course.isPublished ? 'published' : 'draft') === status)
  ).sort((a, b) => {
    if (sort === 'title-desc') return compareText(b, a, 'title');
    if (sort === 'code') return compareText(a, b, 'code');
    if (sort === 'instructor') return compareText(a, b, 'instructorName') || compareText(a, b, 'title');
    if (sort === 'students') return b.studentsCount - a.studentsCount || compareText(a, b, 'title');
    if (sort === 'modules') return b.modulesCount - a.modulesCount || compareText(a, b, 'title');
    return compareText(a, b, 'title');
  });
  function resetFilters() { setQuery(''); setInstructor(''); setCategory(''); setStatus(''); setSort('title-asc'); }
  function savedCourse(course) {
    // Preserve the confirmed mutation instead of issuing an unnecessary second list request.
    request.current += 1;
    setLoading(false);
    setError('');
    setCourses(previous => {
      const knownInstructor = previous.find(item => item.instructorId === course.instructorId)?.instructorName;
      const saved = { ...course, instructorName: course.instructorName || knownInstructor || null };
      return previous.some(item => item.id === course.id) ? previous.map(item => item.id === course.id ? saved : item) : [...previous, saved];
    });
    setSelectedId(course.id);
    resetFilters();
    setEditor(null);
    setNotice('Course saved successfully.');
  }
  return <div style={{ containerType: 'inline-size', containerName: 'admin-course', color: 'var(--text-main)' }}>
    <style>{`
.acm-workspace { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; align-items: start; }
.acm-inventory, .acm-detail { min-width: 0; }
.acm-filters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.acm-detail { scroll-margin-top: 16px; }
.acm-students-dialog[open] { display: flex; flex-direction: column; overflow: hidden !important; height: min(780px, 90dvh); }
.acm-students-dialog > header { flex-shrink: 0; }
.acm-students-body { display: flex; flex-direction: column; gap: 14px; flex: 1; min-height: 0; }
.acm-students-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; flex: 1; min-height: 0; }
.acm-students-section { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
.acm-students-section h3 { font-size: 14px; margin: 0 0 10px; }
.acm-students-list { overflow-y: auto; overscroll-behavior: contain; flex: 1; min-height: 0; border: 1px solid var(--border-card); border-radius: var(--radius-sm); }
.acm-student-row { display: flex; align-items: center; gap: 10px; padding: 12px; border-bottom: 1px solid var(--border-card); }
.acm-student-row:last-child { border-bottom: 0; }
.acm-student-row > div { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.acm-student-row button { flex: 0 0 auto; width: auto; padding: 7px 10px; font-size: 12px; }
@container admin-course (min-width: 900px) {
  .acm-workspace { grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr); }
  .acm-detail { position: sticky; top: 16px; max-height: calc(100dvh - 160px); overflow-y: auto; overscroll-behavior: contain; }
}
@media (max-width: 620px) {
  .acm-students-dialog[open] { height: 92dvh; max-height: 92dvh !important; padding: 16px !important; }
  .acm-students-columns { grid-template-columns: minmax(0, 1fr); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 14px; }
}
`}</style>
    <div className="acm-workspace">
      <section className="acm-inventory" style={stack} aria-label="Course inventory">
        <header style={stack}>
          <div><h1 style={{ margin: '0 0 8px', fontSize: 26 }}>Course Management</h1><p style={{ ...muted, margin: 0 }}>Manage platform courses, enrollments, modules, and course access.</p></div>
          <div style={row}>
            <button className="btn-secondary" disabled={loading} onClick={() => { load(); setRevision(value => value + 1); }}><RefreshCw size={16} /> Refresh</button>
            <button className="btn-primary" disabled={loading} onClick={() => setEditor({})}><Plus size={16} /> New Course</button>
          </div>
        </header>
        <Notice>{notice}</Notice>
        <Notice error>{error}</Notice>
        {error && <button className="btn-secondary" disabled={loading} onClick={load}>Retry courses</button>}
        <Field label="Search courses"><input type="search" style={field} placeholder="Code, title, instructor, category, or term" value={query} onChange={event => setQuery(event.target.value)} /></Field>
        <div className="acm-filters">
          <Field label="Instructor"><select style={field} value={instructor} onChange={event => setInstructor(event.target.value)}><option value="">All instructors</option>{instructors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field>
          <Field label="Category"><select style={field} value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{categories.map(value => <option key={value} value={value}>{value}</option>)}</select></Field>
          <Field label="Status"><select style={field} value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{value === 'published' ? 'Published' : 'Draft'}</option>)}</select></Field>
          <Field label="Sort"><select style={field} value={sort} onChange={event => setSort(event.target.value)}><option value="title-asc">Title A–Z</option><option value="title-desc">Title Z–A</option><option value="code">Course code</option><option value="instructor">Instructor</option><option value="students">Most students</option><option value="modules">Most modules</option></select></Field>
        </div>
        <div style={{ ...row, justifyContent: 'space-between' }}><small style={muted}>{visible.length} of {courses.length} courses</small>{(query || instructor || category || status || sort !== 'title-asc') && <button className="btn-secondary" onClick={resetFilters}>Reset filters</button>}</div>
        {loading && <p role="status">Loading courses…</p>}
        {!loading && !error && !courses.length && <div style={panel}><BookOpen size={28} /><h2>No courses yet</h2><p style={muted}>Choose New Course to create your first platform course.</p></div>}
        {!loading && courses.length > 0 && !visible.length && <p style={muted}>No courses match your filters. Reset filters to see all courses.</p>}
        <div style={stack}>
          {visible.map(course => <button type="button" key={course.id} disabled={loading} aria-pressed={selectedId === course.id} aria-controls="admin-selected-course" onClick={() => setSelectedId(course.id)} style={{ ...panel, ...stack, gap: 8, textAlign: 'left', cursor: 'pointer', color: 'var(--text-main)', font: 'inherit', borderWidth: selectedId === course.id ? 2 : 1, borderColor: selectedId === course.id ? 'var(--primary)' : 'var(--border-card)', background: selectedId === course.id ? 'var(--primary-soft)' : 'var(--bg-surface)' }}>
            <div style={{ ...row, justifyContent: 'space-between' }}><strong>{course.code}</strong><small>{course.isPublished ? 'Published' : 'Draft'}</small></div>
            <strong style={{ fontSize: 18, overflowWrap: 'anywhere' }}>{course.title}</strong>
            <span style={muted}>{course.category || 'No category'} · {course.term || 'No term'}</span>
            <span style={muted}>Instructor: {course.instructorName || 'Not provided'}</span>
            <div style={{ ...row, justifyContent: 'space-between' }}><span>{course.studentsCount} students · {course.modulesCount} modules</span><small style={{ color: 'var(--primary)' }}>{selectedId === course.id ? 'Selected course' : 'View course'}</small></div>
          </button>)}
        </div>
      </section>
      <section id="admin-selected-course" className="acm-detail" style={{ ...panel, ...stack, gap: 24 }} aria-label="Selected course">
        {selected ? <>
          <header style={stack}>
            <div><small style={{ color: 'var(--primary)', fontWeight: 700 }}>SELECTED COURSE · {selected.isPublished ? 'Published' : 'Draft'}</small><h2 style={{ margin: '8px 0', overflowWrap: 'anywhere' }}>{selected.title}</h2><span style={muted}>{selected.code} · {selected.category} · {selected.term}</span></div>
            <div style={row}><span>Instructor: {selected.instructorName || 'Not provided'}</span><span>{selected.studentsCount} students · {selected.modulesCount} modules</span></div>
            <div style={row}>
              <button className="btn-secondary" disabled={loading} onClick={() => setEditor(selected)}><Edit3 size={16} /> Edit Course</button>
              <button className="btn-primary" disabled={loading} onClick={() => setStudentsCourse(selected)}><Users size={16} /> Add / Manage Students</button>
            </div>
          </header>
          {!visible.some(course => course.id === selected.id) && <small style={muted}>This selected course is outside the current inventory filters.</small>}
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selected.description || 'No description provided.'}</p>
          <Modules key={selected.id} course={selected} revision={revision} onChanged={updateCount} />
        </> : <div style={{ padding: '32px 0', textAlign: 'center' }}><BookOpen size={32} /><h2>Select a course</h2><p style={muted}>Select a course to manage its details.</p></div>}
      </section>
    </div>
    {editor && <CourseEditor course={editor.id ? editor : null} onClose={() => setEditor(null)} onSaved={savedCourse} />}
    {studentsCourse && <StudentsDialog course={studentsCourse} onClose={() => setStudentsCourse(null)} onChanged={updateStudentCount} />}
  </div>;
}
