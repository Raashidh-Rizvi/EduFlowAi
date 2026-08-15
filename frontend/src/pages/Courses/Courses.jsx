import React, { useState } from 'react';
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
  Layers
} from 'lucide-react';

export default function Courses() {
  const [selectedCourseId, setSelectedCourseId] = useState('c-101');
  const [viewMode, setViewMode] = useState('journey'); // 'journey' | 'curriculum'
  const [showNewModal, setShowNewModal] = useState(false);

  const courses = [
    {
      id: 'c-101',
      code: 'SE3090',
      title: 'Software Engineering Frameworks',
      description: 'Enterprise architecture with ASP.NET Core, PostgreSQL, React, Flutter & LangGraph multi-agent systems.',
      studentsCount: 342,
      completionRate: 68,
      nodesCount: 8,
      xpPool: '4,500 XP',
      modules: [
        {
          id: 'm1',
          title: 'Phase 1: Architecture & Data Modeling',
          lessons: [
            { title: '1.1 Clean Architecture & Repository Pattern', type: 'video', duration: '35m', xp: '+20 XP', completed: true },
            { title: '1.2 PostgreSQL Relational Schemas & Indexes', type: 'doc', duration: '25m', xp: '+20 XP', completed: true },
            { title: '1.3 Hands-on: EF Core Migrations & Foreign Keys', type: 'lab', duration: '45m', xp: '+40 XP', completed: true }
          ]
        },
        {
          id: 'm2',
          title: 'Phase 2: Agentic AI Orchestration (LangGraph)',
          lessons: [
            { title: '2.1 Multi-Agent StateGraph Architecture', type: 'video', duration: '40m', xp: '+30 XP', completed: true },
            { title: '2.2 Deterministic Validation Agent & Safeguards', type: 'lab', duration: '50m', xp: '+50 XP', completed: false },
            { title: '2.3 Midterm Boss Encounter: Concurrency Dungeon', type: 'boss', duration: '30m', xp: '+500 XP', isBoss: true }
          ]
        }
      ],
      journeyNodes: [
        { id: 1, title: '🌱 Architecture Foundations', status: 'completed', xp: 150, type: 'start' },
        { id: 2, title: '🧩 PostgreSQL Indexing Lab', status: 'completed', xp: 200, type: 'quest' },
        { id: 3, title: '⚔️ Entity Framework Core Arena', status: 'active', xp: 350, type: 'challenge' },
        { id: 4, title: '🤖 Multi-Agent LangGraph Node', status: 'locked', xp: 400, type: 'ai' },
        { id: 5, title: '👹 Dungeon Boss: Concurrency Raid', status: 'locked', xp: 500, type: 'boss' }
      ]
    },
    {
      id: 'c-102',
      code: 'CS2040',
      title: 'Data Structures & Algorithms',
      description: 'Master binary search trees, graph algorithms, dynamic programming and algorithmic complexity.',
      studentsCount: 520,
      completionRate: 45,
      nodesCount: 12,
      xpPool: '6,200 XP',
      modules: [],
      journeyNodes: []
    }
  ];

  const currentCourse = courses.find(c => c.id === selectedCourseId) || courses[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {courses.map(c => (
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
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Toggle View: World Map vs Tree */}
          <div style={{
            display: 'flex',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '3px',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              onClick={() => setViewMode('journey')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewMode === 'journey' ? 'var(--primary)' : 'transparent',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Compass size={14} /> World Map Journey
            </button>
            <button
              onClick={() => setViewMode('curriculum')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewMode === 'curriculum' ? 'var(--primary)' : 'transparent',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Layers size={14} /> Curriculum Tree
            </button>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: '12.5px',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <Plus size={16} /> New Module / Quest Node
          </button>
        </div>
      </div>

      {/* Course Overview Card */}
      <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '700', textTransform: 'uppercase' }}>
            Course Blueprint • {currentCourse.code}
          </span>
          <h2 style={{ fontSize: '22px', fontWeight: '800', marginTop: '2px' }}>{currentCourse.title}</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '650px' }}>{currentCourse.description}</p>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Enrolled Students</span>
            <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} color="var(--primary)" /> {currentCourse.studentsCount}
            </p>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cohort Pass Rate</span>
            <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--success)' }}>{currentCourse.completionRate}%</p>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total XP Available</span>
            <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--warning)' }}>{currentCourse.xpPool}</p>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: RPG Learning Journey World Map */}
      {viewMode === 'journey' && (
        <div className="glass-panel" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Map size={18} color="var(--secondary)" /> Interactive Student Journey Map (Flutter Mobile Preview)
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Gamified Non-Linear Progression Flow</span>
          </div>

          {/* Map Node Chain */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            padding: '40px 20px',
            background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.12) 0%, rgba(0, 0, 0, 0.3) 100%)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            overflowX: 'auto'
          }}>
            {currentCourse.journeyNodes.map((node, i) => (
              <React.Fragment key={node.id}>
                {/* Node Item */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  zIndex: 2,
                  minWidth: '130px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    backgroundColor: node.status === 'completed' 
                      ? 'var(--success)' 
                      : node.status === 'active' 
                      ? 'var(--primary)' 
                      : 'rgba(255, 255, 255, 0.05)',
                    border: node.status === 'active' 
                      ? '3px solid var(--secondary)' 
                      : node.type === 'boss'
                      ? '3px solid var(--accent)'
                      : '2px solid var(--border-subtle)',
                    boxShadow: node.status === 'active' ? 'var(--shadow-glow)' : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '18px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}>
                    {node.type === 'boss' ? '👹' : node.status === 'completed' ? '✓' : i + 1}
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: node.status === 'locked' ? 'var(--text-subtle)' : 'var(--text-main)' }}>
                      {node.title}
                    </p>
                    <span style={{ fontSize: '10.5px', color: 'var(--warning)', fontWeight: '700' }}>+{node.xp} XP</span>
                  </div>
                </div>

                {/* Connector Line */}
                {i < currentCourse.journeyNodes.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: '3px',
                    backgroundColor: node.status === 'completed' ? 'var(--success)' : 'rgba(255, 255, 255, 0.1)',
                    margin: '0 -10px',
                    zIndex: 1
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Curriculum Tree */}
      {viewMode === 'curriculum' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {currentCourse.modules.map((mod, idx) => (
            <div key={mod.id} className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>{mod.title}</h4>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{mod.lessons.length} Lessons</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {mod.lessons.map((les, lidx) => (
                  <div key={lidx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: les.isBoss ? 'rgba(244, 63, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: les.isBoss ? '1px solid rgba(244, 63, 94, 0.25)' : '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {les.type === 'video' ? <Video size={16} color="var(--primary)" /> : les.isBoss ? <Sword size={16} color="var(--accent)" /> : <FileText size={16} color="var(--secondary)" />}
                      <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>{les.title}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{les.duration}</span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: les.isBoss ? 'var(--accent)' : 'var(--success)' }}>{les.xp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Module Modal */}
      {showNewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '460px', padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-accent)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700' }}>Add Quest Node / Curriculum Module</h3>
            <input 
              type="text" 
              placeholder="e.g. Phase 3: LangGraph Agent Guardrails" 
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned XP</label>
                <input 
                  type="number" 
                  defaultValue={200}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    marginTop: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Node Type</label>
                <select style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  marginTop: '4px'
                }}>
                  <option>Standard Quest Node</option>
                  <option>Boss Challenge Encounter 👹</option>
                  <option>AI Adaptive Study Node</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button 
                onClick={() => setShowNewModal(false)}
                style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent', color: 'var(--text-muted)', fontSize: '12.5px' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowNewModal(false)}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#FFFFFF', fontSize: '12.5px', fontWeight: '700' }}
              >
                Create Node & Save to DB
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
