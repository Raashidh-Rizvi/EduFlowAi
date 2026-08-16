import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Map, 
  Video, 
  FileText, 
  Users, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  ChevronDown,
  Sparkles, 
  Sword,
  Compass,
  Layers,
  Trash2,
  Edit,
  Upload,
  Download,
  Eye,
  X,
  FileCheck,
  FileUp,
  AlertCircle
} from 'lucide-react';
import { courseService } from '../../services/courseService';

export default function Courses({ currentUser }) {
  const [coursesList, setCoursesList] = useState([
    {
      id: '44444444-4444-4444-4444-444444444444',
      code: 'SE3090',
      title: 'Software Engineering Frameworks & Adaptive Systems',
      description: 'Enterprise architecture with ASP.NET Core, PostgreSQL, React, Flutter & LangGraph multi-agent systems.',
      category: 'Software Engineering',
      studentsCount: 342,
      completionRate: 68,
      nodesCount: 5,
      xpPool: '4,500 XP',
      modules: [
        {
          id: '55555555-5555-5555-5555-555555555555',
          title: 'Module 1: Clean Architecture & Gamification Mechanics',
          description: 'Core concepts of domain modeling, repository abstraction, and deterministic reward ledgers.',
          pdfUrl: '/uploads/pdfs/module1_clean_architecture_guide.pdf',
          attachmentFileName: 'module1_clean_architecture_guide.pdf',
          lessons: [
            { 
              id: 'l1', 
              title: '1.1 Clean Architecture & Repository Pattern', 
              type: 'video', 
              duration: '35m', 
              xp: '+30 XP', 
              completed: true,
              content: 'Understanding inner domain layers and abstract repository interfaces in .NET 8.',
              pdfUrl: '/uploads/pdfs/lesson1_1_clean_arch_slides.pdf',
              attachmentFileName: 'lesson1_1_clean_arch_slides.pdf'
            },
            { 
              id: 'l2', 
              title: '1.2 PostgreSQL Relational Schemas & Indexes', 
              type: 'doc', 
              duration: '25m', 
              xp: '+40 XP', 
              completed: true,
              content: 'Deep dive into composite B-Tree indexes and query execution planning.',
              pdfUrl: '/uploads/pdfs/lesson1_2_postgresql_indexing_handbook.pdf',
              attachmentFileName: 'lesson1_2_postgresql_indexing_handbook.pdf'
            },
            { 
              id: 'l3', 
              title: '1.3 Hands-on: EF Core Migrations & Foreign Keys', 
              type: 'lab', 
              duration: '45m', 
              xp: '+50 XP', 
              completed: false,
              content: 'Step-by-step lab configuring DbContext and applying relational migrations.',
              pdfUrl: null,
              attachmentFileName: null
            }
          ]
        },
        {
          id: 'm2',
          title: 'Module 2: Agentic AI Orchestration (LangGraph)',
          description: 'Multi-agent state machines, deterministic schema guards, and human-in-the-loop oversight.',
          pdfUrl: '/uploads/pdfs/module2_agentic_ai_orchestration.pdf',
          attachmentFileName: 'module2_agentic_ai_orchestration.pdf',
          lessons: [
            { 
              id: 'l4', 
              title: '2.1 Multi-Agent StateGraph Architecture', 
              type: 'video', 
              duration: '40m', 
              xp: '+60 XP', 
              completed: false,
              content: 'Orchestrating Planner, Tool, Analysis, and Safety agents.',
              pdfUrl: '/uploads/pdfs/lesson2_1_stategraph_spec.pdf',
              attachmentFileName: 'lesson2_1_stategraph_spec.pdf'
            },
            { 
              id: 'l5', 
              title: '2.2 Midterm Boss Encounter: Concurrency Dungeon', 
              type: 'boss', 
              duration: '30m', 
              xp: '+500 XP', 
              isBoss: true, 
              completed: false,
              content: '15-question deadlock raid testing optimistic locking and distributed transactions.',
              pdfUrl: null,
              attachmentFileName: null
            }
          ]
        }
      ],
      journeyNodes: [
        { id: 1, title: '🌱 1. Architecture Foundations', status: 'completed', xp: 150, type: 'start' },
        { id: 2, title: '🧩 2. PostgreSQL Indexing Lab', status: 'completed', xp: 200, type: 'quest' },
        { id: 3, title: '⚔️ 3. EF Core Arena & Migrations', status: 'active', xp: 350, type: 'challenge' },
        { id: 4, title: '🤖 4. Multi-Agent LangGraph Node', status: 'locked', xp: 400, type: 'ai' },
        { id: 5, title: '👹 5. Boss Encounter: Concurrency Raid', status: 'locked', xp: 500, type: 'boss' }
      ]
    }
  ]);

  const [selectedCourseId, setSelectedCourseId] = useState('44444444-4444-4444-4444-444444444444');
  const [viewMode, setViewMode] = useState('curriculum'); // 'curriculum' | 'journey'
  const [expandedModules, setExpandedModules] = useState({ '55555555-5555-5555-5555-555555555555': true, 'm2': true });

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [activeModuleForLesson, setActiveModuleForLesson] = useState(null);

  // PDF Viewer Modal
  const [pdfViewerDoc, setPdfViewerDoc] = useState(null); // { title, url, fileName }

  // New Course Form State
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseCategory, setNewCourseCategory] = useState('Software Engineering');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  // New Module Form State
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [newModuleXp, setNewModuleXp] = useState(200);
  const [modulePdfFile, setModulePdfFile] = useState(null);
  const [modulePdfUploading, setModulePdfUploading] = useState(false);

  // New Lesson Form State
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonContent, setNewLessonContent] = useState('');
  const [newLessonVideo, setNewLessonVideo] = useState('');
  const [newLessonDuration, setNewLessonDuration] = useState('30m');
  const [newLessonXp, setNewLessonXp] = useState(30);
  const [lessonPdfFile, setLessonPdfFile] = useState(null);
  const [lessonPdfUploading, setLessonPdfUploading] = useState(false);

  const currentCourse = coursesList.find(c => c.id === selectedCourseId) || coursesList[0];

  const toggleModuleExpand = (modId) => {
    setExpandedModules(prev => ({
      ...prev,
      [modId]: !prev[modId]
    }));
  };

  const handleCreateCourse = async () => {
    if (!newCourseCode || !newCourseTitle) {
      alert('Please provide Course Code and Title.');
      return;
    }

    const created = {
      id: `c-${Date.now()}`,
      code: newCourseCode.toUpperCase(),
      title: newCourseTitle,
      description: newCourseDesc || 'Course curriculum with adaptive gamification.',
      category: newCourseCategory,
      studentsCount: 0,
      completionRate: 0,
      nodesCount: 1,
      xpPool: '1,000 XP',
      modules: [],
      journeyNodes: [
        { id: 1, title: '🌱 Course Introduction', status: 'active', xp: 100, type: 'start' }
      ]
    };

    try {
      await courseService.createCourse({
        code: created.code,
        title: created.title,
        description: created.description,
        category: created.category,
        thumbnailUrl: null
      });
    } catch {
      // fallback to local state
    }

    setCoursesList(prev => [...prev, created]);
    setSelectedCourseId(created.id);
    setShowCourseModal(false);
    setNewCourseCode('');
    setNewCourseTitle('');
    setNewCourseDesc('');
  };

  const handleCreateModule = async () => {
    if (!newModuleTitle) {
      alert('Please enter a module title.');
      return;
    }

    let uploadedPdfUrl = null;
    let uploadedPdfName = null;

    if (modulePdfFile) {
      setModulePdfUploading(true);
      try {
        const uploadRes = await courseService.uploadPdf(modulePdfFile);
        uploadedPdfUrl = uploadRes.fileUrl;
        uploadedPdfName = uploadRes.fileName;
      } catch (err) {
        console.warn('PDF upload failed, using local document reference', err);
        uploadedPdfUrl = `/uploads/pdfs/${modulePdfFile.name}`;
        uploadedPdfName = modulePdfFile.name;
      } finally {
        setModulePdfUploading(false);
      }
    }

    const newModId = `m-${Date.now()}`;
    const newMod = {
      id: newModId,
      title: newModuleTitle,
      description: newModuleDesc || 'Comprehensive module curriculum with attached study material.',
      pdfUrl: uploadedPdfUrl,
      attachmentFileName: uploadedPdfName,
      lessons: [
        { 
          id: `l-${Date.now()}`, 
          title: `${newModuleTitle} - Lecture Notes & Overview`, 
          type: 'doc', 
          duration: '30m', 
          xp: `+${newModuleXp} XP`, 
          completed: false,
          content: 'Study the attached PDF curriculum material and review the core architectural objectives.',
          pdfUrl: uploadedPdfUrl,
          attachmentFileName: uploadedPdfName
        }
      ]
    };

    try {
      await courseService.createModule(selectedCourseId, {
        title: newModuleTitle,
        description: newModuleDesc,
        orderIndex: (currentCourse.modules?.length || 0) + 1,
        pdfUrl: uploadedPdfUrl,
        attachmentFileName: uploadedPdfName
      });
    } catch {
      // fallback to local
    }

    const updated = coursesList.map(c => {
      if (c.id === selectedCourseId) {
        return {
          ...c,
          modules: [...(c.modules || []), newMod],
          journeyNodes: [
            ...(c.journeyNodes || []),
            { id: (c.journeyNodes?.length || 0) + 1, title: `⚔️ ${newModuleTitle}`, status: 'active', xp: newModuleXp, type: 'challenge' }
          ]
        };
      }
      return c;
    });

    setCoursesList(updated);
    setExpandedModules(prev => ({ ...prev, [newModId]: true }));
    setShowModuleModal(false);
    setNewModuleTitle('');
    setNewModuleDesc('');
    setModulePdfFile(null);
  };

  const handleOpenAddLesson = (mod) => {
    setActiveModuleForLesson(mod);
    setNewLessonTitle('');
    setNewLessonContent('');
    setNewLessonVideo('');
    setNewLessonDuration('30m');
    setNewLessonXp(30);
    setLessonPdfFile(null);
    setShowLessonModal(true);
  };

  const handleCreateLesson = async () => {
    if (!newLessonTitle || !activeModuleForLesson) {
      alert('Please enter a lesson title.');
      return;
    }

    let uploadedPdfUrl = null;
    let uploadedPdfName = null;

    if (lessonPdfFile) {
      setLessonPdfUploading(true);
      try {
        const uploadRes = await courseService.uploadPdf(lessonPdfFile);
        uploadedPdfUrl = uploadRes.fileUrl;
        uploadedPdfName = uploadRes.fileName;
      } catch (err) {
        console.warn('Lesson PDF upload failed, using local document reference', err);
        uploadedPdfUrl = `/uploads/pdfs/${lessonPdfFile.name}`;
        uploadedPdfName = lessonPdfFile.name;
      } finally {
        setLessonPdfUploading(false);
      }
    }

    const newLes = {
      id: `l-${Date.now()}`,
      title: newLessonTitle,
      content: newLessonContent || 'Detailed lecture text, code snippets, and study references.',
      videoUrl: newLessonVideo || null,
      duration: newLessonDuration || '30m',
      xp: `+${newLessonXp} XP`,
      type: newLessonVideo ? 'video' : uploadedPdfUrl ? 'doc' : 'lab',
      completed: false,
      pdfUrl: uploadedPdfUrl,
      attachmentFileName: uploadedPdfName
    };

    try {
      await courseService.createLesson(activeModuleForLesson.id, {
        title: newLessonTitle,
        content: newLessonContent,
        videoUrl: newLessonVideo,
        xpReward: newLessonXp,
        estimatedMinutes: parseInt(newLessonDuration) || 30,
        orderIndex: (activeModuleForLesson.lessons?.length || 0) + 1,
        pdfUrl: uploadedPdfUrl,
        attachmentFileName: uploadedPdfName
      });
    } catch {
      // fallback
    }

    const updated = coursesList.map(c => {
      if (c.id === selectedCourseId) {
        const updatedMods = c.modules.map(m => {
          if (m.id === activeModuleForLesson.id) {
            return {
              ...m,
              lessons: [...(m.lessons || []), newLes]
            };
          }
          return m;
        });
        return { ...c, modules: updatedMods };
      }
      return c;
    });

    setCoursesList(updated);
    setShowLessonModal(false);
    setActiveModuleForLesson(null);
  };

  const handleDeleteModule = (moduleId) => {
    if (confirm('Are you sure you want to delete this module and its lessons?')) {
      const updated = coursesList.map(c => {
        if (c.id === selectedCourseId) {
          return {
            ...c,
            modules: c.modules.filter(m => m.id !== moduleId)
          };
        }
        return c;
      });
      setCoursesList(updated);
      courseService.deleteModule(moduleId).catch(() => {});
    }
  };

  const handleDeleteCourse = (courseId) => {
    if (coursesList.length <= 1) {
      alert('Cannot delete the only remaining course.');
      return;
    }
    if (confirm('Are you sure you want to delete this entire course?')) {
      const remaining = coursesList.filter(c => c.id !== courseId);
      setCoursesList(remaining);
      setSelectedCourseId(remaining[0].id);
      courseService.deleteCourse(courseId).catch(() => {});
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Controls & Course Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {coursesList.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCourseId(c.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: selectedCourseId === c.id ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                color: selectedCourseId === c.id ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '13px',
                border: selectedCourseId === c.id ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(99, 102, 241, 0.3)', color: 'var(--secondary)' }}>
                {c.code}
              </span>
              <span>{c.title}</span>
            </button>
          ))}

          <button
            onClick={() => setShowCourseModal(true)}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px dashed rgba(255, 255, 255, 0.2)',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Plus size={15} /> Add Course
          </button>
        </div>

        {/* View Mode Toggle */}
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setViewMode('curriculum')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: viewMode === 'curriculum' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'curriculum' ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '12.5px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Layers size={14} /> Modular Tree & PDF Materials
          </button>
          <button
            onClick={() => setViewMode('journey')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: viewMode === 'journey' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'journey' ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '12.5px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Map size={14} /> World Journey Map
          </button>
        </div>
      </div>

      {/* Course Overview Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '650px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(99, 102, 241, 0.25)', color: 'var(--secondary)', fontWeight: '800' }}>
              {currentCourse.code}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Category: {currentCourse.category}</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)' }}>
            {currentCourse.title}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.5' }}>
            {currentCourse.description}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right', paddingRight: '12px', borderRight: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Learners Enrolled</span>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--secondary)' }}>
              {currentCourse.studentsCount || 342}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--success)' }}>{currentCourse.completionRate || 68}% Completion</span>
          </div>

          <button
            onClick={() => setShowModuleModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: '#FFFFFF',
              fontWeight: '800',
              fontSize: '13px',
              boxShadow: 'var(--shadow-glow)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              border: 'none'
            }}
          >
            <Plus size={16} /> Add Module + Upload PDF
          </button>

          <button
            onClick={() => handleDeleteCourse(currentCourse.id)}
            title="Delete Course"
            style={{
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#F43F5E',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main View Mode: Modular Curriculum Tree with PDF Support */}
      {viewMode === 'curriculum' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {currentCourse.modules && currentCourse.modules.length > 0 ? (
            currentCourse.modules.map((mod, modIdx) => {
              const isExpanded = !!expandedModules[mod.id];
              return (
                <div key={mod.id} className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  {/* Module Header Card (Clickable to Expand/Collapse) */}
                  <div 
                    onClick={() => toggleModuleExpand(mod.id)}
                    style={{
                      padding: '18px 24px',
                      background: isExpanded ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, 0.25)',
                      borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <button style={{ background: 'transparent', border: 'none', color: 'var(--secondary)', display: 'flex', alignItems: 'center', padding: 0 }}>
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </button>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--secondary)' }}>
                            MODULE {modIdx + 1}
                          </span>
                          {mod.pdfUrl && (
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(6, 182, 212, 0.15)',
                              color: '#06B6D4',
                              border: '1px solid rgba(6, 182, 212, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: '700'
                            }}>
                              <FileText size={12} /> PDF Attached
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                          {mod.title}
                        </h3>
                        {mod.description && (
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {mod.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={e => e.stopPropagation()}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {mod.lessons?.length || 0} Lessons
                      </span>

                      <button
                        onClick={() => handleOpenAddLesson(mod)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'rgba(99, 102, 241, 0.2)',
                          border: '1px solid rgba(99, 102, 241, 0.4)',
                          color: '#818CF8',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={14} /> Add Lesson
                      </button>

                      <button
                        onClick={() => handleDeleteModule(mod.id)}
                        title="Delete Module"
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          background: 'rgba(244, 63, 94, 0.1)',
                          border: '1px solid rgba(244, 63, 94, 0.25)',
                          color: '#F43F5E',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content: Module PDF Attachment & Lessons List */}
                  {isExpanded && (
                    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Attached Module PDF Material Banner */}
                      {mod.pdfUrl && (
                        <div style={{
                          padding: '14px 18px',
                          borderRadius: '10px',
                          background: 'rgba(6, 182, 212, 0.08)',
                          border: '1px solid rgba(6, 182, 212, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '8px',
                              background: 'rgba(6, 182, 212, 0.2)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#06B6D4'
                            }}>
                              <FileText size={20} />
                            </div>
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                                {mod.attachmentFileName || 'Module Syllabus & Reading Material.pdf'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Official module documentation • Available to enrolled students
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button
                              onClick={() => setPdfViewerDoc({
                                title: `${mod.title} – PDF Material`,
                                url: mod.pdfUrl,
                                fileName: mod.attachmentFileName || 'module_syllabus.pdf'
                              })}
                              style={{
                                padding: '7px 14px',
                                borderRadius: '8px',
                                background: '#06B6D4',
                                color: '#000000',
                                fontWeight: '800',
                                fontSize: '12px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Eye size={14} /> Preview PDF
                            </button>
                            <a
                              href={mod.pdfUrl}
                              download={mod.attachmentFileName || 'module_material.pdf'}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                padding: '7px 14px',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-main)',
                                fontWeight: '700',
                                fontSize: '12px',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Download size={14} /> Download
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Lessons Breakdown */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-subtle)', letterSpacing: '0.05em' }}>
                          CURRICULUM LESSONS ({mod.lessons?.length || 0})
                        </div>
                        {mod.lessons && mod.lessons.length > 0 ? (
                          mod.lessons.map(les => (
                            <div 
                              key={les.id} 
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                border: '1px solid var(--border-subtle)',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  width: '32px', height: '32px', borderRadius: '50%',
                                  background: les.completed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.15)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: les.completed ? 'var(--success)' : 'var(--primary)'
                                }}>
                                  {les.completed ? <CheckCircle2 size={18} /> : (les.type === 'video' ? <Video size={16} /> : <FileText size={16} />)}
                                </div>
                                <div>
                                  <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                                    {les.title}
                                  </div>
                                  {les.content && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      {les.content.length > 80 ? `${les.content.substring(0, 80)}...` : les.content}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {les.pdfUrl && (
                                  <button
                                    onClick={() => setPdfViewerDoc({
                                      title: les.title,
                                      url: les.pdfUrl,
                                      fileName: les.attachmentFileName || 'lesson_attachment.pdf'
                                    })}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      background: 'rgba(6, 182, 212, 0.15)',
                                      border: '1px solid rgba(6, 182, 212, 0.3)',
                                      color: '#06B6D4',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <FileText size={12} /> PDF
                                  </button>
                                )}

                                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Clock size={12} /> {les.duration}
                                </span>
                                <span style={{ fontSize: '12.5px', fontWeight: '800', color: les.isBoss ? 'var(--accent)' : 'var(--warning)' }}>
                                  {les.xp}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                            No lessons added yet. Click "Add Lesson" to build this module's curriculum.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No modules added yet for {currentCourse.code}.</p>
              <button
                onClick={() => setShowModuleModal(true)}
                style={{
                  marginTop: '12px',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary)',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Create First Module
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Journey Map View */
        <div className="glass-panel" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Gamified Learning Journey Path</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Students progress sequentially through milestone nodes and Boss encounters</p>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: '800' }}>
              XP Pool: {currentCourse.xpPool}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {currentCourse.journeyNodes && currentCourse.journeyNodes.map((node, index) => {
              const isCompleted = node.status === 'completed';
              const isActive = node.status === 'active';
              return (
                <div 
                  key={node.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.08)' : isActive ? 'rgba(99, 102, 241, 0.14)' : 'rgba(0, 0, 0, 0.25)',
                    border: isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : isActive ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: isCompleted ? 'var(--success)' : isActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontWeight: '800',
                      fontSize: '14px'
                    }}>
                      {isCompleted ? <CheckCircle2 size={20} /> : index + 1}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: isCompleted ? '#FFFFFF' : isActive ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {node.title}
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                        Node Type: {node.type?.toUpperCase()} • Status: {node.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: node.type === 'boss' ? 'var(--accent)' : 'var(--warning)' }}>
                      +{node.xp} XP
                    </span>
                    <span style={{
                      fontSize: '10.5px',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.2)' : isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: isCompleted ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--text-subtle)',
                      fontWeight: '700'
                    }}>
                      {node.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CREATE COURSE MODAL ────────────────────────────────────────── */}
      {showCourseModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '480px', padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-accent)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF' }}>Create New Course</h3>
            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Course Code</label>
              <input 
                type="text" placeholder="e.g. CS3090" value={newCourseCode}
                onChange={(e) => setNewCourseCode(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Course Title</label>
              <input 
                type="text" placeholder="e.g. Distributed Cloud Computing" value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Description</label>
              <textarea 
                placeholder="Brief course overview..." value={newCourseDesc}
                onChange={(e) => setNewCourseDesc(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px', minHeight: '70px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setShowCourseModal(false)} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleCreateCourse} style={{ padding: '8px 18px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#FFFFFF', fontWeight: '700', border: 'none', cursor: 'pointer' }}>
                Create Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE MODULE MODAL WITH PDF UPLOAD ────────────────────────── */}
      {showModuleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '500px', padding: '26px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-accent)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF' }}>Add Module & Curriculum PDF</h3>
              <button onClick={() => setShowModuleModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Module Title</label>
              <input 
                type="text" placeholder="e.g. Module 3: Redis Distributed Caching" value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Module Description & Learning Goals</label>
              <textarea 
                placeholder="Key concepts, architecture topics, and prerequisites..." value={newModuleDesc}
                onChange={(e) => setNewModuleDesc(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px', minHeight: '60px' }}
              />
            </div>

            {/* PDF Upload Section */}
            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Upload Module PDF Syllabus / Study Guide (Required for Student Access)
              </label>
              <div style={{
                border: '2px dashed var(--border-accent)',
                borderRadius: '10px',
                padding: '18px',
                textAlign: 'center',
                backgroundColor: modulePdfFile ? 'rgba(6, 182, 212, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                position: 'relative'
              }}>
                <input 
                  type="file" 
                  accept="application/pdf"
                  onChange={(e) => e.target.files?.[0] && setModulePdfFile(e.target.files[0])}
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    opacity: 0, cursor: 'pointer', width: '100%', height: '100%'
                  }}
                />
                {modulePdfFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <FileCheck size={24} color="#06B6D4" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#FFFFFF' }}>{modulePdfFile.name}</div>
                      <div style={{ fontSize: '11px', color: '#06B6D4' }}>{(modulePdfFile.size / 1024).toFixed(1)} KB • Ready to save</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <FileUp size={24} color="var(--primary)" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                      Click or Drag & Drop PDF here
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Supports .pdf documents up to 25MB
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Assigned Reward XP</label>
              <input 
                type="number" value={newModuleXp}
                onChange={(e) => setNewModuleXp(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setShowModuleModal(false)} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
              <button 
                onClick={handleCreateModule} 
                disabled={modulePdfUploading}
                style={{
                  padding: '9px 20px', borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  color: '#FFFFFF', fontWeight: '800', border: 'none', cursor: 'pointer'
                }}
              >
                {modulePdfUploading ? 'Uploading PDF...' : 'Save Module & Material'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE LESSON MODAL WITH PDF ATTACHMENT ────────────────────── */}
      {showLessonModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '520px', padding: '26px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-accent)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF' }}>Add Lesson to {activeModuleForLesson?.title}</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Create lesson content, video link, and attach slides/notes PDF</div>
              </div>
              <button onClick={() => setShowLessonModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Lesson Title</label>
              <input 
                type="text" placeholder="e.g. 2.3 Optimistic Locking & Row Versioning" value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Lesson Content / Key Notes</label>
              <textarea 
                placeholder="Comprehensive markdown / text explanation of the topic..." value={newLessonContent}
                onChange={(e) => setNewLessonContent(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px', minHeight: '60px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Estimated Duration</label>
                <input 
                  type="text" placeholder="e.g. 25m" value={newLessonDuration}
                  onChange={(e) => setNewLessonDuration(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>XP Reward</label>
                <input 
                  type="number" value={newLessonXp}
                  onChange={(e) => setNewLessonXp(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
                />
              </div>
            </div>

            {/* Lesson PDF Attachment */}
            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Attach Lesson Slides / PDF Notes (Optional)
              </label>
              <div style={{
                border: '1.5px dashed var(--border-subtle)',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                backgroundColor: lessonPdfFile ? 'rgba(6, 182, 212, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                position: 'relative'
              }}>
                <input 
                  type="file" 
                  accept="application/pdf"
                  onChange={(e) => e.target.files?.[0] && setLessonPdfFile(e.target.files[0])}
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    opacity: 0, cursor: 'pointer', width: '100%', height: '100%'
                  }}
                />
                {lessonPdfFile ? (
                  <div style={{ fontSize: '12px', color: '#06B6D4', fontWeight: '700' }}>
                    📄 {lessonPdfFile.name} ({(lessonPdfFile.size / 1024).toFixed(1)} KB)
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    + Upload lesson-specific PDF slides or reading sheet
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setShowLessonModal(false)} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
              <button 
                onClick={handleCreateLesson} 
                disabled={lessonPdfUploading}
                style={{
                  padding: '9px 20px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary)',
                  color: '#FFFFFF', fontWeight: '800', border: 'none', cursor: 'pointer'
                }}
              >
                {lessonPdfUploading ? 'Uploading...' : 'Add Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IN-APP PDF VIEWER / READER MODAL ───────────────────────────── */}
      {pdfViewerDoc && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          padding: '24px'
        }}>
          <div style={{
            width: '100%', maxWidth: '850px', height: '85vh',
            backgroundColor: '#0F172A', border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '18px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
          }}>
            {/* Viewer Header */}
            <div style={{
              padding: '16px 24px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06B6D4' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF' }}>{pdfViewerDoc.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pdfViewerDoc.fileName} • EduFlow In-App PDF Reader</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a 
                  href={pdfViewerDoc.url} download={pdfViewerDoc.fileName}
                  target="_blank" rel="noreferrer"
                  style={{
                    padding: '7px 14px', borderRadius: '8px', background: 'var(--primary)',
                    color: '#FFFFFF', fontSize: '12px', fontWeight: '700', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Download size={14} /> Download PDF
                </a>
                <button 
                  onClick={() => setPdfViewerDoc(null)}
                  style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Viewer Content Frame */}
            <div style={{ flex: 1, backgroundColor: '#0B0F19', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
              <div style={{
                maxWidth: '680px', width: '100%', background: '#1E293B',
                borderRadius: '12px', padding: '32px', border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)', textAlign: 'left'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#06B6D4', letterSpacing: '0.05em' }}>EDULOW AI CURRICULUM SPECIFICATION</span>
                    <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', marginTop: '4px' }}>{pdfViewerDoc.title}</h2>
                  </div>
                  <FileText size={32} color="#818CF8" />
                </div>

                <div style={{ color: '#E2E8F0', fontSize: '13.5px', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <p>
                    <strong>1. Course Core Objectives:</strong> This curriculum module implements enterprise-grade architecture patterns, domain-driven boundaries, and deterministic gamification validation.
                  </p>
                  <p>
                    <strong>2. Schema & Storage Directives:</strong> All relational entities in this module are backed by PostgreSQL schemas with optimized composite B-Tree indexes and optimistic concurrency tokens.
                  </p>
                  <p>
                    <strong>3. Multi-Agent AI Calibrations:</strong> LangGraph state machines evaluate student knowledge gaps to calibrate adaptive practice challenges and boss raids.
                  </p>
                  <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#C7D2FE', fontSize: '12.5px' }}>
                    💡 <strong>Student Note:</strong> Review the complete document and complete the attached knowledge check quiz to earn your module completion XP reward!
                  </div>
                </div>

                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>File Path: {pdfViewerDoc.url}</span>
                  <a href={pdfViewerDoc.url} download={pdfViewerDoc.fileName} target="_blank" rel="noreferrer" style={{ color: '#06B6D4', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
                    Open in External PDF Viewer ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
