import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Flame, 
  Award, 
  Coins, 
  Zap, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  Sliders,
  ChevronRight,
  Plus,
  Trash2,
  UserPlus,
  UserMinus,
  Sparkles,
  CheckCircle2,
  Clock,
  Target,
  Search,
  X,
  Crown,
  BookOpen,
  Compass,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import gamificationService from '../../services/gamificationService';

const THEME_PRESETS = [
  { icon: '🚀', label: 'Quantum Coders', color: '#3b82f6' },
  { icon: '⚡', label: 'Neural Navigators', color: '#eab308' },
  { icon: '⚔️', label: 'Cyber Knights', color: '#8b5cf6' },
  { icon: '🛡️', label: 'Apex Builders', color: '#10b981' },
  { icon: '🔮', label: 'Data Alchemists', color: '#ec4899' },
  { icon: '🧠', label: 'Synapse Collective', color: '#06b6d4' }
];

const RANDOM_NAMES = [
  'Quantum Coders',
  'Neural Navigators',
  'Cyber Knights',
  'Apex Builders',
  'Data Alchemists',
  'Byte Pioneers',
  'Kernel Champions',
  'Vector Vanguard'
];

export default function Gamification() {
  const [activeTab, setActiveTab] = useState('teams'); // 'teams' | 'leaderboard' | 'badges' | 'ledger'
  const [leaderboardScope, setLeaderboardScope] = useState('cohort'); // 'cohort' | 'squads'
  const [xpMultiplier, setXpMultiplier] = useState(1.0);
  const [multiplierLoading, setMultiplierLoading] = useState(false);

  // Live Data States
  const [squads, setSquads] = useState([]);
  const [students, setStudents] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [squadLeaderboard, setSquadLeaderboard] = useState([]);
  const [badges, setBadges] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Modal State for Instructor Team Creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamTheme, setNewTeamTheme] = useState(THEME_PRESETS[0]);
  const [newTeamQuest, setNewTeamQuest] = useState('Architecture Mastery Sprint');
  const [newTeamTargetXp, setNewTeamTargetXp] = useState(2500);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Modal for Adding Member to Existing Team
  const [addMemberSquad, setAddMemberSquad] = useState(null);
  const [studentToAddId, setStudentToAddId] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        squadsData,
        studentsData,
        leaderboardData,
        squadLeaderboardData,
        badgesData,
        ledgerData,
        multiplierVal
      ] = await Promise.all([
        gamificationService.getAllSquads(),
        gamificationService.getEligibleStudents(),
        gamificationService.getLeaderboard('weekly', 20),
        gamificationService.getSquadLeaderboard(10),
        gamificationService.getAllBadges(),
        gamificationService.getXpLedger(),
        gamificationService.getXpMultiplier()
      ]);

      setSquads(squadsData || []);
      setStudents(studentsData || []);
      setLeaderboard(leaderboardData || []);
      setSquadLeaderboard(squadLeaderboardData || []);
      setBadges(badgesData || []);
      setLedger(ledgerData || []);
      setXpMultiplier(multiplierVal || 1.0);
    } catch (err) {
      console.warn('Error loading gamification data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleMultiplier = async () => {
    const nextVal = xpMultiplier > 1.0 ? 1.0 : 2.0;
    setMultiplierLoading(true);
    try {
      await gamificationService.setXpMultiplier(nextVal);
      setXpMultiplier(nextVal);
      showToast(`Global Event: ${nextVal > 1.0 ? '⚡ 2.0x DOUBLE XP EVENT ACTIVATED' : 'Standard 1.0x XP Restored'}`);
    } catch {
      setXpMultiplier(nextVal);
    } finally {
      setMultiplierLoading(false);
    }
  };

  const handleInspireName = () => {
    const randomPick = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    setNewTeamName(randomPick);
  };

  const handleToggleStudentSelection = (studentId) => {
    setSelectedStudentIds(prev => {
      const exists = prev.includes(studentId);
      const updated = exists ? prev.filter(id => id !== studentId) : [...prev, studentId];
      if (!updated.includes(selectedLeaderId) && updated.length > 0) {
        setSelectedLeaderId(updated[0]);
      } else if (updated.length === 0) {
        setSelectedLeaderId('');
      }
      return updated;
    });
  };

  const handleCreateTeamSubmit = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      showToast('Please enter a team name');
      return;
    }
    if (selectedStudentIds.length === 0) {
      showToast('Please select at least 1 student for the team');
      return;
    }

    setCreatingTeam(true);
    try {
      const res = await gamificationService.instructorCreateSquad({
        name: newTeamName.trim(),
        description: `Quest: ${newTeamQuest.trim()}`,
        avatarUrl: newTeamTheme.icon,
        leaderId: selectedLeaderId || selectedStudentIds[0],
        studentIds: selectedStudentIds,
        activeQuest: newTeamQuest.trim(),
        targetGoalXp: Number(newTeamTargetXp)
      });

      if (res?.success) {
        showToast(`🎉 Team "${newTeamName}" created successfully!`);
        setShowCreateModal(false);
        setNewTeamName('');
        setSelectedStudentIds([]);
        setSelectedLeaderId('');
        await loadData();
      } else {
        showToast(res?.message || 'Failed to create team');
      }
    } catch (err) {
      console.error(err);
      showToast('Error creating team');
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleRemoveMember = async (squadId, studentId, studentName) => {
    if (!window.confirm(`Remove ${studentName} from this squad?`)) return;
    try {
      const res = await gamificationService.removeSquadMember(squadId, studentId);
      if (res?.success) {
        showToast(`Removed ${studentName} from squad`);
        await loadData();
      }
    } catch {
      showToast('Error removing student');
    }
  };

  const handleAddMemberSubmit = async () => {
    if (!addMemberSquad || !studentToAddId) return;
    try {
      const res = await gamificationService.addSquadMember(addMemberSquad.id, studentToAddId);
      if (res?.success) {
        showToast(`Added student to squad ${addMemberSquad.name}`);
        setAddMemberSquad(null);
        setStudentToAddId('');
        await loadData();
      }
    } catch {
      showToast('Error adding student to squad');
    }
  };

  const handleDeleteSquad = async (squadId, squadName) => {
    if (!window.confirm(`Are you sure you want to disband the squad "${squadName}"?`)) return;
    try {
      await gamificationService.deleteSquad(squadId);
      showToast(`Squad "${squadName}" has been disbanded`);
      await loadData();
    } catch {
      showToast('Error disbanding squad');
    }
  };

  const totalCombinedXp = squads.reduce((acc, s) => acc + (s.combinedXp || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '28px',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-main)',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          border: '1px solid var(--primary-border)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: '600'
        }} className="fade-in">
          <Sparkles size={16} color="var(--warning)" />
          {toastMessage}
        </div>
      )}

      {/* Top Banner: Global Multiplier & Ledger Engine */}
      <div className="card-premium" style={{
        padding: '24px 28px',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        borderLeft: xpMultiplier > 1.0 ? '4px solid var(--warning)' : '4px solid var(--primary)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className={xpMultiplier > 1.0 ? "badge-pill badge-warning" : "badge-pill badge-primary"} style={{ fontWeight: '800' }}>
              {xpMultiplier > 1.0 ? '⚡ 2.0x BOOST EVENT ACTIVE' : 'REWARD ENGINE ONLINE'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Deterministic Progression & Team Quests
            </span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
            Gamification & Team Command Center
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '680px', lineHeight: '1.5' }}>
            Drive student focus through collaborative team quests, milestone progression, and deep work focus sessions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Multiplier control */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-card)'
          }}>
            <Zap size={16} color={xpMultiplier > 1.0 ? "var(--warning)" : "var(--primary)"} />
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '600' }}>XP Event Multiplier:</span>
            <button
              onClick={handleToggleMultiplier}
              disabled={multiplierLoading}
              className="hover-scale"
              style={{
                fontSize: '12px',
                fontWeight: '700',
                padding: '4px 10px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: xpMultiplier > 1.0 ? 'var(--warning)' : 'var(--bg-surface)',
                color: xpMultiplier > 1.0 ? '#000000' : 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {xpMultiplier}x {xpMultiplier > 1.0 ? 'DOUBLE XP' : 'Standard'}
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary hover-scale"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: '700',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
            }}
          >
            <Plus size={16} />
            Create Student Team
          </button>
        </div>
      </div>

      {/* Quick Stat Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="card-premium" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Teams</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>{squads.length} Squads</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Assigned collaborative rosters</div>
        </div>
        <div className="card-premium" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Enrolled Learners</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>{students.length} Students</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{students.filter(s => !s.currentSquadName).length} Free Agents unassigned</div>
        </div>
        <div className="card-premium" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Combined Team XP</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--secondary)', marginTop: '4px' }}>{totalCombinedXp.toLocaleString()} XP</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Points generated via study sprints</div>
        </div>
        <div className="card-premium" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Milestone Registry</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--warning)', marginTop: '4px' }}>{badges.length} Badges</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>4 Rarity tiers configured</div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '8px'
      }}>
        {[
          { id: 'teams', label: 'Student Teams & Rosters', icon: Users, count: squads.length },
          { id: 'leaderboard', label: 'Leaderboard Standings', icon: Trophy },
          { id: 'badges', label: 'Milestones & Badges', icon: Award, count: badges.length },
          { id: 'ledger', label: 'Points Ledger & Audit', icon: Layers }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: isActive ? '700' : '500',
                fontSize: '13px',
                border: isActive ? '1px solid var(--border-card)' : '1px solid transparent',
                cursor: 'pointer'
              }}
            >
              <Icon size={15} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="badge-pill badge-neutral" style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: STUDENT TEAMS & ROSTERS ────────────────────────────────────── */}
      {activeTab === 'teams' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Instructor Team Roster & Collaborative Quests
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Organize students into squads, assign custom names & theme symbols, and track their collective sprint velocity.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} /> Assemble New Team
            </button>
          </div>

          {squads.length === 0 ? (
            <div className="card-premium" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <Users size={36} color="var(--primary)" style={{ opacity: 0.6, marginBottom: '12px' }} />
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>No Teams Assembled Yet</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '440px', margin: '6px auto 16px' }}>
                Create your first student squad to unlock collaborative challenges, collective XP pooling, and peer learning accountability.
              </p>
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                <Plus size={15} /> Create Team Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
              {squads.map((sq) => {
                const targetXp = 2500;
                const progressPct = Math.min(100, Math.round(((sq.combinedXp || 0) / targetXp) * 100));

                return (
                  <div key={sq.id} className="card-premium glass-card-hover" style={{
                    padding: '20px',
                    backgroundColor: 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    {/* Squad Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-card)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px'
                        }}>
                          {sq.avatarUrl || '⚔️'}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                            {sq.name}
                          </h4>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            Leader: <strong style={{ color: 'var(--warning)' }}>{sq.leaderName}</strong> • {sq.memberCount || sq.members?.length || 0} Members
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => { setAddMemberSquad(sq); setStudentToAddId(''); }}
                          title="Add student to squad"
                          className="btn-ghost"
                          style={{ padding: '6px', color: 'var(--primary)' }}
                        >
                          <UserPlus size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteSquad(sq.id, sq.name)}
                          title="Disband squad"
                          className="btn-ghost"
                          style={{ padding: '6px', color: 'var(--danger)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Quest Progress Tracker */}
                    <div style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Target size={12} /> {sq.description || 'Sprint Quest'}
                        </span>
                        <span style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                          {sq.combinedXp?.toLocaleString() || 0} / {targetXp.toLocaleString()} XP ({progressPct}%)
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: 'var(--bg-canvas)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${progressPct}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)',
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>

                    {/* Member Roster List */}
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                        Assigned Students ({sq.members?.length || 0})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(sq.members || []).map((m) => {
                          const isLeader = m.role === 0 || m.role === 'Leader' || m.studentId === sq.leaderId;
                          return (
                            <div key={m.studentId} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-xs)',
                              backgroundColor: 'var(--bg-input)',
                              border: '1px solid var(--border-subtle)',
                              fontSize: '12px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: 'var(--radius-full)',
                                  backgroundColor: isLeader ? 'var(--warning-soft)' : 'var(--primary-soft)',
                                  color: isLeader ? 'var(--warning)' : 'var(--primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '800',
                                  fontSize: '10.5px'
                                }}>
                                  {m.studentName ? m.studentName[0] : 'S'}
                                </div>
                                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                                  {m.studentName}
                                </span>
                                {isLeader && (
                                  <span className="badge-pill badge-warning" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                    LEADER
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: '700', color: 'var(--secondary)' }}>
                                  {m.totalXp?.toLocaleString() || 0} XP
                                </span>
                                <button
                                  onClick={() => handleRemoveMember(sq.id, m.studentId, m.studentName)}
                                  title="Remove from squad"
                                  className="btn-ghost"
                                  style={{ padding: '3px', color: 'var(--text-muted)' }}
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: LEADERBOARD STANDINGS ──────────────────────────────────────── */}
      {activeTab === 'leaderboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={18} color="var(--warning)" />
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                {leaderboardScope === 'cohort' ? 'Cohort Individual Standings' : 'Squad & Team Rankings'}
              </h3>
            </div>

            <div style={{
              display: 'flex',
              backgroundColor: 'var(--bg-canvas)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px',
              border: '1px solid var(--border-subtle)',
              gap: '4px'
            }}>
              <button
                onClick={() => setLeaderboardScope('cohort')}
                style={{
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: leaderboardScope === 'cohort' ? 'var(--bg-card)' : 'transparent',
                  color: leaderboardScope === 'cohort' ? 'var(--text-main)' : 'var(--text-muted)',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  border: leaderboardScope === 'cohort' ? '1px solid var(--border-card)' : '1px solid transparent',
                  cursor: 'pointer'
                }}
              >
                Individual Learners
              </button>
              <button
                onClick={() => setLeaderboardScope('squads')}
                style={{
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: leaderboardScope === 'squads' ? 'var(--bg-card)' : 'transparent',
                  color: leaderboardScope === 'squads' ? 'var(--text-main)' : 'var(--text-muted)',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  border: leaderboardScope === 'squads' ? '1px solid var(--border-card)' : '1px solid transparent',
                  cursor: 'pointer'
                }}
              >
                Squads & Teams
              </button>
            </div>
          </div>

          {leaderboardScope === 'cohort' ? (
            <div className="card-premium" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {leaderboard.map((item, idx) => (
                <div key={item.studentId || idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: idx === 0 ? 'var(--warning-soft)' : 'var(--bg-surface)',
                  border: idx === 0 ? '1px solid var(--warning-border)' : '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '800',
                      fontFamily: 'var(--font-mono)',
                      color: idx === 0 ? 'var(--warning)' : (idx === 1 ? 'var(--text-main)' : (idx === 2 ? 'var(--secondary)' : 'var(--text-muted)')),
                      width: '24px'
                    }}>
                      {idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`))}
                    </span>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-card)',
                      color: idx === 0 ? 'var(--warning)' : 'var(--text-main)',
                      fontWeight: '800',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {item.studentName ? item.studentName.slice(0, 2).toUpperCase() : 'ST'}
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                        {item.studentName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Level {item.level || 1} • {item.streak || 0}d streak
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Flame size={13} color="var(--warning)" /> {item.streak || 0}d
                    </span>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '800',
                      color: 'var(--secondary)',
                      minWidth: '80px',
                      textAlign: 'right'
                    }}>
                      {(item.scoreXp || 0).toLocaleString()} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-premium" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {squadLeaderboard.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No squads formed yet. Assemble teams to see squad rankings!
                </div>
              ) : (
                squadLeaderboard.map((sq, idx) => (
                  <div key={sq.squadId || idx} style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: idx === 0 ? 'var(--primary-soft)' : 'var(--bg-surface)',
                    border: idx === 0 ? '1px solid var(--primary-border)' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{
                        fontSize: '15px',
                        fontWeight: '800',
                        width: '28px',
                        color: idx === 0 ? 'var(--primary)' : 'var(--text-muted)'
                      }}>
                        {idx === 0 ? '🏆' : `#${idx + 1}`}
                      </span>
                      <span style={{ fontSize: '24px' }}>{sq.avatarUrl || '🚀'}</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                          {sq.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {sq.memberCount} active learners
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--secondary)' }}>
                        {(sq.combinedXp || 0).toLocaleString()} XP
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Combined Squad XP</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: MILESTONES & BADGES ────────────────────────────────────────── */}
      {activeTab === 'badges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              Milestone & Credential Registry
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Badges awarded for verified technical evaluations, study streaks, and collaborative team participation.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {badges.map((b) => (
              <div key={b.id} className="card-premium" style={{
                padding: '16px',
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                backgroundColor: 'var(--bg-surface)'
              }}>
                <div style={{
                  fontSize: '28px',
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {b.iconUrl || '🏅'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{b.title}</h4>
                    <span className="badge-pill badge-primary" style={{ fontSize: '10px' }}>
                      +{b.xpBonus} XP
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>{b.description}</p>
                  <div style={{ fontSize: '10.5px', color: 'var(--success)', marginTop: '6px', fontWeight: '600' }}>
                    Criteria: Automated verification enabled
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: XP POINTS LEDGER & AUDIT ──────────────────────────────────── */}
      {activeTab === 'ledger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              Deterministic Points Ledger & Audit Trail
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Append-only immutable record of all XP mutations, ensuring points integrity across all learners.
            </p>
          </div>

          <div className="card-premium" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ledger.map((tx) => (
              <div key={tx.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12.5px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{tx.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Source: {tx.sourceType} • {new Date(tx.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: '800', color: 'var(--success)', fontSize: '13px' }}>
                  +{tx.xpAmount} XP
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE NEW TEAM ────────────────────────────────────────────── */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="card-premium" style={{
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            boxShadow: 'var(--shadow-popover)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  Assemble New Student Squad
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="btn-ghost" style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTeamSubmit} style={{
              padding: '24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}>
              {/* Team Name with Random Generator */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                    TEAM NAME *
                  </label>
                  <button
                    type="button"
                    onClick={handleInspireName}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Sparkles size={11} /> Inspire Me
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Quantum Coders, Apex Builders"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Theme Badge Preset Selector */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
                  CHOOSE THEME EMBLEM
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {THEME_PRESETS.map((preset) => {
                    const isSelected = newTeamTheme.label === preset.label;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setNewTeamTheme(preset)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: isSelected ? 'var(--primary-soft)' : 'var(--bg-surface)',
                          border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>{preset.icon}</span>
                        <span style={{ fontSize: '11px', fontWeight: isSelected ? '700' : '500', color: 'var(--text-main)' }}>
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Quest Objective */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                  ACTIVE SPRINT QUEST
                </label>
                <input
                  type="text"
                  value={newTeamQuest}
                  onChange={(e) => setNewTeamQuest(e.target.value)}
                  placeholder="e.g. Clean Architecture & PostgreSQL Indexing Sprint"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Student Roster Selector */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                    SELECT STUDENTS FOR SQUAD ({selectedStudentIds.length} Selected) *
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Pick at least 1 student
                  </span>
                </div>

                <div style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '6px',
                  backgroundColor: 'var(--bg-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {students.map((st) => {
                    const isChecked = selectedStudentIds.includes(st.studentId);
                    return (
                      <label
                        key={st.studentId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: isChecked ? 'var(--primary-soft)' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStudentSelection(st.studentId)}
                          />
                          <span style={{ fontWeight: isChecked ? '700' : '500', color: 'var(--text-main)' }}>
                            {st.fullName}
                          </span>
                          {st.currentSquadName ? (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              (Currently in {st.currentSquadName})
                            </span>
                          ) : (
                            <span className="badge-pill badge-neutral" style={{ fontSize: '9.5px', padding: '1px 5px' }}>
                              Free Agent
                            </span>
                          )}
                        </div>
                        <span style={{ color: 'var(--secondary)', fontWeight: '700', fontSize: '11.5px' }}>
                          {st.totalXp} XP • Lvl {st.currentLevel}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Appoint Leader */}
              {selectedStudentIds.length > 0 && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                    APPOINT SQUAD LEADER
                  </label>
                  <select
                    value={selectedLeaderId}
                    onChange={(e) => setSelectedLeaderId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      fontSize: '12.5px'
                    }}
                  >
                    {selectedStudentIds.map((id) => {
                      const st = students.find(s => s.studentId === id);
                      return (
                        <option key={id} value={id}>
                          {st ? st.fullName : id}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTeam || !newTeamName || selectedStudentIds.length === 0}
                  className="btn-primary hover-scale"
                  style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {creatingTeam ? 'Assembling...' : 'Assemble & Launch Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD STUDENT TO EXISTING SQUAD ──────────────────────────────── */}
      {addMemberSquad && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="card-premium" style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Add Member to {addMemberSquad.name}
              </h3>
              <button onClick={() => setAddMemberSquad(null)} className="btn-ghost" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
              Select a student to enroll into this squad:
            </p>

            <select
              value={studentToAddId}
              onChange={(e) => setStudentToAddId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
                color: 'var(--text-main)',
                fontSize: '13px'
              }}
            >
              <option value="">-- Choose a Student --</option>
              {students
                .filter(st => !(addMemberSquad.members || []).some(m => m.studentId === st.studentId))
                .map(st => (
                  <option key={st.studentId} value={st.studentId}>
                    {st.fullName} ({st.totalXp} XP) {st.currentSquadName ? `[in ${st.currentSquadName}]` : '[Free Agent]'}
                  </option>
                ))}
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setAddMemberSquad(null)} className="btn-secondary" style={{ padding: '6px 14px' }}>
                Cancel
              </button>
              <button onClick={handleAddMemberSubmit} disabled={!studentToAddId} className="btn-primary" style={{ padding: '6px 18px' }}>
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
