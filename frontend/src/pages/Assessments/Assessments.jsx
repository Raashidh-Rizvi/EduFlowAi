import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Sword, 
  FileSpreadsheet, 
  Plus, 
  Clock, 
  HelpCircle, 
  Sliders, 
  Award, 
  Flame, 
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Trash2
} from 'lucide-react';

export default function Assessments() {
  const [activeSubTab, setActiveSubTab] = useState('quizzes'); // 'quizzes' | 'bosses' | 'rubrics'
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showBossModal, setShowBossModal] = useState(false);

  // New Quiz Form State
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizCourse, setNewQuizCourse] = useState('SE3090');
  const [newQuizTime, setNewQuizTime] = useState(20);
  const [newQuizXp, setNewQuizXp] = useState(50);
  const [newQuizPass, setNewQuizPass] = useState(70);

  // New Boss Raid Form State
  const [newBossName, setNewBossName] = useState('');
  const [newBossXp, setNewBossXp] = useState(500);

  const [quizzesList, setQuizzesList] = useState([
    {
      id: '99999999-9999-9999-9999-999999999999',
      title: 'Diagnostic Quiz: PostgreSQL Indexing & Query Execution Plans',
      course: 'SE3090',
      questionsCount: 10,
      timeLimit: '20 mins',
      avgScore: 78.4,
      xpReward: '+50 XP',
      passThreshold: 70,
      status: 'Active'
    },
    {
      id: 'q-102',
      title: 'Clean Architecture & Repository Abstractions',
      course: 'SE3090',
      questionsCount: 15,
      timeLimit: '30 mins',
      avgScore: 82.1,
      xpReward: '+60 XP',
      passThreshold: 75,
      status: 'Active'
    },
    {
      id: 'q-103',
      title: 'LangGraph Multi-Agent Workflows & Deterministic Guards',
      course: 'SE3090',
      questionsCount: 8,
      timeLimit: '15 mins',
      avgScore: 71.0,
      xpReward: '+40 XP',
      passThreshold: 70,
      status: 'Scheduled'
    }
  ]);

  const [bossEncounters, setBossEncounters] = useState([
    {
      id: 'b-1',
      bossName: '👹 PostgreSQL Concurrency Dungeon Boss',
      course: 'SE3090: Architecture & Frameworks',
      questions: 15,
      timeLimit: '20 mins',
      passThreshold: '80%',
      xpReward: '+500 XP',
      badgeReward: 'Boss Slayer Badge',
      attemptedCount: 184,
      passedCount: 118,
      status: 'Active Live Raid'
    },
    {
      id: 'b-2',
      bossName: '⚔️ Entity Framework Transaction Overlord',
      course: 'SE3090: Architecture & Frameworks',
      questions: 20,
      timeLimit: '30 mins',
      passThreshold: '85%',
      xpReward: '+600 XP',
      badgeReward: 'Transaction Master',
      attemptedCount: 92,
      passedCount: 54,
      status: 'Scheduled for Week 6'
    }
  ]);

  const handleCreateQuiz = () => {
    if (!newQuizTitle) {
      alert('Please enter a quiz title.');
      return;
    }

    const created = {
      id: `q-${Date.now()}`,
      title: newQuizTitle,
      course: newQuizCourse,
      questionsCount: 5,
      timeLimit: `${newQuizTime} mins`,
      avgScore: 0,
      xpReward: `+${newQuizXp} XP`,
      passThreshold: newQuizPass,
      status: 'Active'
    };

    setQuizzesList(prev => [created, ...prev]);
    setShowQuizModal(false);
    setNewQuizTitle('');
    alert(`Quiz "${created.title}" successfully authored and published!`);
  };

  const handleCreateBoss = () => {
    if (!newBossName) {
      alert('Please enter a Boss name.');
      return;
    }

    const created = {
      id: `b-${Date.now()}`,
      bossName: newBossName.startsWith('👹') || newBossName.startsWith('⚔️') ? newBossName : `👹 ${newBossName}`,
      course: 'SE3090: Architecture & Frameworks',
      questions: 15,
      timeLimit: '25 mins',
      passThreshold: '80%',
      xpReward: `+${newBossXp} XP`,
      badgeReward: 'Boss Conqueror Badge',
      attemptedCount: 0,
      passedCount: 0,
      status: 'Active Live Raid'
    };

    setBossEncounters(prev => [created, ...prev]);
    setShowBossModal(false);
    setNewBossName('');
    alert(`Boss Raid "${created.bossName}" created!`);
  };

  const handleDeleteQuiz = (id) => {
    if (confirm('Are you sure you want to delete this quiz?')) {
      setQuizzesList(prev => prev.filter(q => q.id !== id));
    }
  };

  const handleDeleteBoss = (id) => {
    if (confirm('Are you sure you want to delete this boss raid?')) {
      setBossEncounters(prev => prev.filter(b => b.id !== id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Sub Tab Navigation & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setActiveSubTab('quizzes')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: activeSubTab === 'quizzes' ? 'var(--primary)' : 'transparent',
              color: activeSubTab === 'quizzes' ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '12.5px',
              fontWeight: '600'
            }}
          >
            <CheckCircle2 size={15} /> Interactive Quizzes ({quizzesList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('bosses')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: activeSubTab === 'bosses' ? 'var(--accent)' : 'transparent',
              color: activeSubTab === 'bosses' ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '12.5px',
              fontWeight: '600'
            }}
          >
            <Sword size={15} /> Boss Raids ({bossEncounters.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {activeSubTab === 'quizzes' ? (
            <button
              onClick={() => setShowQuizModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: '12.5px',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              <Plus size={15} /> Author New Quiz
            </button>
          ) : (
            <button
              onClick={() => setShowBossModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--accent), #E11D48)',
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: '12.5px',
                boxShadow: '0 0 15px rgba(244, 63, 94, 0.4)'
              }}
            >
              <Plus size={15} /> Create Boss Encounter 👹
            </button>
          )}
        </div>
      </div>

      {/* Quizzes List View */}
      {activeSubTab === 'quizzes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {quizzesList.map(quiz => (
            <div 
              key={quiz.id} 
              className="glass-panel" 
              style={{ 
                padding: '20px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                gap: '14px' 
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '10.5px',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    color: 'var(--secondary)',
                    fontWeight: '700'
                  }}>
                    {quiz.course}
                  </span>
                  <span style={{ fontSize: '11px', color: quiz.status === 'Active' ? 'var(--success)' : 'var(--text-subtle)', fontWeight: '600' }}>
                    ● {quiz.status}
                  </span>
                </div>

                <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.4' }}>
                  {quiz.title}
                </h4>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                fontSize: '11.5px',
                textAlign: 'center'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Questions</span>
                  <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{quiz.questionsCount}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Time</span>
                  <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{quiz.timeLimit}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>XP Reward</span>
                  <div style={{ fontWeight: '700', color: 'var(--warning)' }}>{quiz.xpReward}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Pass Threshold: <strong>{quiz.passThreshold}%</strong>
                </span>
                <button
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(244, 63, 94, 0.15)',
                    color: 'var(--accent)',
                    fontSize: '11.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Boss Encounters View */}
      {activeSubTab === 'bosses' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {bossEncounters.map(boss => (
            <div 
              key={boss.id} 
              className="glass-panel" 
              style={{ 
                padding: '24px', 
                background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12), rgba(17, 24, 39, 0.9))',
                border: '1px solid rgba(244, 63, 94, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: '10.5px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(244, 63, 94, 0.25)',
                  color: 'var(--accent)',
                  fontWeight: '800'
                }}>
                  {boss.status.toUpperCase()}
                </span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent)' }}>
                  {boss.xpReward}
                </span>
              </div>

              <h4 style={{ fontSize: '17px', fontWeight: '800', color: '#FFFFFF' }}>
                {boss.bossName}
              </h4>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                fontSize: '12px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Defeated By:</span>
                  <div style={{ fontWeight: '700', color: 'var(--success)' }}>{boss.passedCount} Learners</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Trophy Unlock:</span>
                  <div style={{ fontWeight: '700', color: 'var(--warning)' }}>{boss.badgeReward}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => handleDeleteBoss(boss.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-muted)',
                    fontSize: '12px'
                  }}
                >
                  Remove Raid
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Author Quiz Modal */}
      {showQuizModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '480px', padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-accent)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Author New Interactive Quiz</h3>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quiz Title</label>
              <input 
                type="text"
                placeholder="e.g. EF Core Concurrency & Isolation"
                value={newQuizTitle}
                onChange={(e) => setNewQuizTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Time Limit (Mins)</label>
                <input 
                  type="number"
                  value={newQuizTime}
                  onChange={(e) => setNewQuizTime(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>XP Reward</label>
                <input 
                  type="number"
                  value={newQuizXp}
                  onChange={(e) => setNewQuizXp(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button 
                onClick={() => setShowQuizModal(false)}
                style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateQuiz}
                style={{ padding: '8px 18px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#FFFFFF', fontWeight: '700' }}
              >
                Publish Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Author Boss Modal */}
      {showBossModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '480px', padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid rgba(244, 63, 94, 0.4)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Create Boss Encounter Raid 👹</h3>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Boss Title</label>
              <input 
                type="text"
                placeholder="e.g. Distributed Consensus Dungeon Boss"
                value={newBossName}
                onChange={(e) => setNewBossName(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Reward XP Pool</label>
              <input 
                type="number"
                value={newBossXp}
                onChange={(e) => setNewBossXp(Number(e.target.value))}
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', marginTop: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button 
                onClick={() => setShowBossModal(false)}
                style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateBoss}
                style={{ padding: '8px 18px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--accent), #E11D48)', color: '#FFFFFF', fontWeight: '700' }}
              >
                Launch Raid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
