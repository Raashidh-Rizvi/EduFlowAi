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
  Sparkles, 
  Sword,
  Compass,
  Layers,
  Trash2,
  Edit
} from 'lucide-react';
import { courseService } from '../../services/courseService';

export default function Courses() {
  const [coursesList, setCoursesList] = useState([
    {
      id: '44444444-4444-4444-4444-444444444444',
      code: 'SE3090',
      title: 'Software Engineering Frameworks & Adaptive Systems',
      description: 'Enterprise architecture with ASP.NET Core, PostgreSQL, React, Flutter & LangGraph multi-agent systems.',
      studentsCount: 342,
      completionRate: 68,
      nodesCount: 5,
      xpPool: '4,500 XP',
      modules: [
        {
          id: '55555555-5555-5555-5555-555555555555',
          title: 'Module 1: Clean Architecture & Gamification Mechanics',
          lessons: [
            { id: 'l1', title: '1.1 Clean Architecture & Repository Pattern', type: 'video', duration: '35m', xp: '+30 XP', completed: true },
            { id: 'l2', title: '1.2 PostgreSQL Relational Schemas & Indexes', type: 'doc', duration: '25m', xp: '+40 XP', completed: true },
            { id: 'l3', title: '1.3 Hands-on: EF Core Migrations & Foreign Keys', type: 'lab', duration: '45m', xp: '+50 XP', completed: false }
          ]
        },
        {
          id: 'm2',
          title: 'Module 2: Agentic AI Orchestration (LangGraph)',
          lessons: [
            { id: 'l4', title: '2.1 Multi-Agent StateGraph Architecture', type: 'video', duration: '40m', xp: '+60 XP', completed: false },
            { id: 'l5', title: '2.2 Midterm Boss Encounter: Concurrency Dungeon', type: 'boss', duration: '30m', xp: '+500 XP', isBoss: true, completed: false }
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
  const [viewMode, setViewMode] = useState('journey'); // 'journey' | 'curriculum'
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  
  // New Course Form State
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseCategory, setNewCourseCategory] = useState('Software Engineering');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  // New Module Form State
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleXp, setNewModuleXp] = useState(200);

  const currentCourse = coursesList.find(c => c.id === selectedCourseId) || coursesList[0];

  const handleCreateCourse = () => {
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

    setCoursesList(prev => [...prev, created]);
    setSelectedCourseId(created.id);
    setShowCourseModal(false);
    setNewCourseCode('');
    setNewCourseTitle('');
    setNewCourseDesc('');
    alert(`Course ${created.code} successfully created!`);
  };

  const handleCreateModule = () => {
    if (!newModuleTitle) {
      alert('Please enter module title.');
      return;
    }

    const newMod = {
      id: `m-${Date.now()}`,
      title: newModuleTitle,
      lessons: [
        { id: `l-${Date.now()}`, title: `${newModuleTitle} - Lesson 1`, type: 'video', duration: '30m', xp: `+${newModuleXp} XP`, completed: false }
      ]
    };

    const updated = coursesList.map(c => {
      if (c.id === selectedCourseId) {
        return {
          ...c,
          modules: [...c.modules, newMod],
          journeyNodes: [
            ...c.journeyNodes,
            { id: c.journeyNodes.length + 1, title: `⚔️ ${newModuleTitle}`, status: 'active', xp: newModuleXp, type: 'challenge' }
          ]
        };
      }
      return c;
    });

    setCoursesList(updated);
    setShowModuleModal(false);
    setNewModuleTitle('');
    alert(`Module "${newModuleTitle}" created and added to Curriculum!`);
  };

  const handleDeleteCourse = (courseId) => {
    if (coursesList.length <= 1) {
      alert('Cannot delete the last remaining course.');
      return;
    }
    if (confirm('Are you sure you want to delete this course?')) {
      const remaining = coursesList.filter(c => c.id !== courseId);
      setCoursesList(remaining);
      setSelectedCourseId(remaining[0].id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {coursesList.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCourseId(c.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: selectedCourseId === c.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                color: selectedCourseId === c.id ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '13px',
                border: selectedCourseId === c.id ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                transition: 'all 0.2s ease'
              }}
            >
              {c.code} – {c.title}
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
              gap: '6px'
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
              fontWeight: '600'
            }}
          >
            <Map size={14} /> World Journey Map
          </button>
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
              fontWeight: '600'
            }}
          >
            <Layers size={14} /> Modular Tree
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
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(99, 102, 241, 0.25)', color: 'var(--secondary)', fontWeight: '700' }}>
              {currentCourse.code}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Category: {currentCourse.category}</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)' }}>
            {currentCourse.title}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
            {currentCourse.description}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cohort Completion</span>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--success)' }}>
              {currentCourse.completionRate}%
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{currentCourse.studentsCount} Enrolled Learners</span>
          </div>

          <button
            onClick={() => setShowModuleModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: '13px',
              boxShadow: 'var(--shadow-glow)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} /> Add Quest Node / Module
          </button>

          <button
            onClick={() => handleDeleteCourse(currentCourse.id)}
            title="Delete Course"
            style={{
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--accent)',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main View: World Journey Map */}
      {viewMode === 'journey' ? (
        <div className="glass-panel" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Gamified Learning Journey Path</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Students progress sequentially through milestone nodes and Boss encounters</p>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: '700' }}>
              XP Pool: {currentCourse.xpPool}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {currentCourse.journeyNodes.map((node, index) => {
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
                        Node Type: {node.type.toUpperCase()} • Status: {node.status.toUpperCase()}
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
                      {node.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Modular Curriculum Tree */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {currentCourse.modules.map(mod => (
            <div key={mod.id} className="glass-panel" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>{mod.title}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {mod.lessons.map(les => (
                  <div key={les.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <span style={{ fontSize: '13px' }}>{les.title}</span>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{les.duration}</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: les.isBoss ? 'var(--accent)' : 'var(--success)' }}>{les.xp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      {showCourseModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '480px', padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-accent)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Create New Course</h3>
            
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Course Code</label>
              <input 
                type="text"
                placeholder="e.g. CS3050"
                value={newCourseCode}
                onChange={(e) => setNewCourseCode(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Course Title</label>
              <input 
                type="text"
                placeholder="e.g. Distributed Cloud Computing"
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Description</label>
              <textarea 
                placeholder="Brief course overview..."
                value={newCourseDesc}
                onChange={(e) => setNewCourseDesc(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px', minHeight: '70px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button 
                onClick={() => setShowCourseModal(false)}
                style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateCourse}
                style={{ padding: '8px 18px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#FFFFFF', fontWeight: '700' }}
              >
                Create Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Module Modal */}
      {showModuleModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '460px', padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-accent)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Add Quest Node / Module</h3>
            
            <input 
              type="text"
              placeholder="e.g. Module 3: Redis In-Memory Leaderboards"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}
            />

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned Reward XP</label>
              <input 
                type="number"
                value={newModuleXp}
                onChange={(e) => setNewModuleXp(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button 
                onClick={() => setShowModuleModal(false)}
                style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateModule}
                style={{ padding: '8px 18px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#FFFFFF', fontWeight: '700' }}
              >
                Save Module
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
