import React, { useState, useEffect, useRef } from 'react';
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
  ArrowUpRight,
  Eye,
  HelpCircle,
  XCircle,
  BarChart2
} from 'lucide-react';
import gamificationService, { getLoggedInRole, isStaffRole } from '../../services/gamificationService';
import { quizService } from '../../services/quizService';

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

// Roster shown by the squad builder until GET /api/gamification/eligible-students
// resolves, and when that endpoint returns nothing. Kept empty on purpose: the real
// roster always comes from the API, and a fabricated one would be offered as if it
// were live data.
const DEFAULT_FALLBACK_STUDENTS = [];

// Background cadence for the console: a quiet 15s poll keeps standings/XP fresh
// without hammering the API, and a refresh also fires whenever the tab regains
// focus or visibility (see the effect below).
const REFRESH_INTERVAL_MS = 15000;

// BadgeCategory enum order from DomainEnums.cs — labels shown instead of the
// fabricated "4 Rarity tiers configured" line.
const BADGE_CATEGORIES = [
  'Learning',
  'Assessment',
  'Consistency',
  'Improvement',
  'Mastery',
  'Challenge',
  'Streak',
  'Social',
  'Milestone'
];

const badgeCategoryLabel = (category) =>
  BADGE_CATEGORIES[category] ?? (category === undefined || category === null ? 'General' : 'Achievement');

// XpSourceType enum order from DomainEnums.cs. The API serialises enums as
// numbers, so without this map the ledger prints "Source: 3".
const XP_SOURCE_LABELS = [
  'Lesson completed',
  'Practice completed',
  'Topic completed',
  'Module completed',
  'Course completed',
  'Quiz completed',
  'Pass bonus',
  'High-score bonus',
  'Perfect score',
  'Improvement bonus',
  'Streak bonus',
  'Daily mission grand bonus',
  'Daily challenge',
  'Weekly challenge',
  'Boss battle',
  'Team challenge',
  'AI adaptive challenge',
  'Remediation completed',
  'Focus session',
  'Level up',
  'Badge unlocked',
  'Daily mission completed'
];

const xpSourceLabel = (sourceType) => XP_SOURCE_LABELS[sourceType] ?? 'XP event';

// Signed XP rendering: credits are green "+", debits red "-". The old UI forced
// a "+" on every row, which would misreport any deduction.
const signedXp = (amount) => `${amount >= 0 ? '+' : '\u2212'}${Math.abs(Number(amount) || 0).toLocaleString()} XP`;
const signedXpColor = (amount) => (amount >= 0 ? 'var(--success)' : 'var(--danger)');

export default function Gamification() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      if (urlTab) return urlTab;
    } catch {}
    return isStaffRole() ? 'quiz-performance' : 'teams';
  });
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
  // Staff view of the ledger: cohort-wide XP movements (Admin/Instructor only).
  const [cohortLedger, setCohortLedger] = useState([]);
  const [ledgerScope, setLedgerScope] = useState('cohort'); // 'cohort' | 'mine'
  // Real courses a quest can bind to (role-scoped by GET /courses).
  const [questCourses, setQuestCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Quiz Performance & Answers Audit States
  const [quizPerfCourseId, setQuizPerfCourseId] = useState('');
  const [quizPerfData, setQuizPerfData] = useState(null);
  const [quizPerfLoading, setQuizPerfLoading] = useState(false);
  const [selectedSubModal, setSelectedSubModal] = useState(null);
  const [subModalLoading, setSubModalLoading] = useState(false);
  const [subAnswersList, setSubAnswersList] = useState([]);

  // Guards overlapping refreshes (poll tick + focus tick can collide).
  const inFlight = useRef(false);

  // Modal State for Instructor Team Creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamTheme, setNewTeamTheme] = useState(THEME_PRESETS[0]);
  const [newTeamQuest, setNewTeamQuest] = useState('');
  const [newTeamTargetXp, setNewTeamTargetXp] = useState(0);
  // Course the quest is anchored to. Persisted server-side on the Team row and
  // drives both the quest title and the real XP target.
  const [newTeamCourseId, setNewTeamCourseId] = useState('');
  const [courseXpSummary, setCourseXpSummary] = useState(null);
  const [courseXpLoading, setCourseXpLoading] = useState(false);
  const [targetXpTouched, setTargetXpTouched] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Modal for Adding Member to Existing Team
  const [addMemberSquad, setAddMemberSquad] = useState(null);
  const [studentToAddId, setStudentToAddId] = useState('');

  // Roster Directory Filtering & Search State
  const [studentFilterTab, setStudentFilterTab] = useState('all');
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async ({ background = false } = {}) => {
    if (inFlight.current) return;
    inFlight.current = true;
    background ? setRefreshing(true) : setLoading(true);
    try {
      setError(null);
      // Every feed loads independently. A single failing endpoint (a 403 on a
      // staff-only route, a transient 500) must not blank the whole console, so
      // only the squad roster is treated as essential.
      const results = await Promise.allSettled([
        gamificationService.getAllSquads(),
        gamificationService.getEligibleStudents(),
        gamificationService.getLeaderboard('weekly', 20),
        gamificationService.getSquadLeaderboard(10),
        gamificationService.getAllBadges(),
        gamificationService.getXpMultiplier(),
        gamificationService.getQuestCourses()
      ]);
      const settledValue = (index) => (
        results[index].status === 'fulfilled' ? results[index].value : undefined
      );

      if (results[0].status === 'rejected') {
        throw results[0].reason;
      }

      const squadsData = settledValue(0);
      const studentsData = settledValue(1);
      const leaderboardData = settledValue(2);
      const squadLeaderboardData = settledValue(3);
      const badgesData = settledValue(4);
      const multiplierVal = settledValue(5);
      const coursesData = settledValue(6);

      setSquads(squadsData || []);
      setStudents(studentsData || []);
      setLeaderboard(leaderboardData || []);
      setSquadLeaderboard(squadLeaderboardData || []);
      setBadges(badgesData || []);
      if (multiplierVal !== undefined) setXpMultiplier(multiplierVal || 1.0);
      setQuestCourses(coursesData || []);

      if (coursesData && coursesData.length > 0) {
        const firstCId = coursesData[0].id;
        setQuizPerfCourseId(prev => prev || firstCId);
        try {
          const perf = await quizService.getCourseQuizPerformance(firstCId);
          setQuizPerfData(perf);
        } catch (e) {
          console.warn('Could not load course quiz performance:', e);
        }
      }

      await refreshLedger();
      setLastUpdated(new Date());
    } catch (err) {
      console.warn('Error loading gamification data:', err);
      if (!background) {
        setError('Unable to load gamification data. Please try refreshing.');
      }
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Ledger: staff get the cohort-wide audit trail (they would otherwise see the
  // signed-in staffer's own — almost always empty — transactions), students get
  // their own. Failures are swallowed here so one 403 can't blank the console.
  const refreshLedger = async () => {
    if (isStaffRole()) {
      try {
        setCohortLedger(await gamificationService.getCohortLedger(60));
      } catch {
        setCohortLedger([]);
      }
    }
    try {
      const mine = await gamificationService.getXpLedger();
      setLedger(Array.isArray(mine) ? mine : []);
    } catch {
      setLedger([]);
    }
  };

  useEffect(() => {
    loadData();

    const tick = () => loadData({ background: true });
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };

    const timer = setInterval(tick, REFRESH_INTERVAL_MS);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // POST /gamification/multiplier is [Authorize(Roles="Admin")]; everyone else
  // only ever reads it.
  const canEditMultiplier = getLoggedInRole() === 'Admin';
  // Squad mutations are [Authorize(Roles="Instructor,Admin")] on the backend.
  const canManageSquads = isStaffRole();

  const handleToggleMultiplier = async () => {
    if (!canEditMultiplier) {
      showToast('Only administrators can change the platform XP multiplier.');
      return;
    }
    const nextVal = xpMultiplier > 1.0 ? 1.0 : 2.0;
    setMultiplierLoading(true);
    try {
      await gamificationService.setXpMultiplier(nextVal);
      setXpMultiplier(nextVal);
      showToast(`Global Event: ${nextVal > 1.0 ? '⚡ 2.0x DOUBLE XP EVENT ACTIVATED' : 'Standard 1.0x XP Restored'}`);
    } catch (err) {
      // Report the failure honestly instead of flipping state optimistically.
      showToast(err?.message || 'Could not change the XP multiplier.');
      loadData({ background: true });
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
    if (e && e.preventDefault) e.preventDefault();
    const finalTeamName = (newTeamName && newTeamName.trim()) ? newTeamName.trim() : 'Apex Builders';
    if (selectedStudentIds.length === 0) {
      showToast('Please select at least 1 student for the squad');
      return;
    }

    const chosenCourse = questCourses.find(c => (c.id || c.courseId) === newTeamCourseId);
    const courseTitle = chosenCourse?.title || chosenCourse?.name || '';
    const questTitle = (newTeamQuest && newTeamQuest.trim())
      ? newTeamQuest.trim()
      : (courseTitle ? `${courseTitle} Quest` : '');
    const targetXp = Number(newTeamTargetXp) || 0;

    setCreatingTeam(true);
    try {
      const res = await gamificationService.instructorCreateSquad({
        name: finalTeamName,
        description: questTitle ? `Quest: ${questTitle}` : null,
        avatarUrl: newTeamTheme?.icon || '🚀',
        leaderId: selectedLeaderId || selectedStudentIds[0],
        studentIds: selectedStudentIds,
        activeQuest: questTitle || null,
        targetGoalXp: targetXp,
        courseId: newTeamCourseId || null
      });

      if (res?.success === false) {
        throw new Error(res?.message || 'The server refused the squad creation.');
      }

      showToast(`🎉 Squad "${finalTeamName}" assembled & launched successfully!`);
      resetCreateModal();
      setShowCreateModal(false);
      await loadData();
    } catch (err) {
      console.warn('Error launching squad:', err);
      // Honest failure: the modal stays open and the server's reason is shown.
      showToast(err?.message || `Could not create squad "${finalTeamName}".`);
    } finally {
      setCreatingTeam(false);
    }
  };

  const resetCreateModal = () => {
    setNewTeamName('');
    setSelectedStudentIds([]);
    setSelectedLeaderId('');
    setNewTeamQuest('');
    setNewTeamCourseId('');
    setCourseXpSummary(null);
    setNewTeamTargetXp(0);
    setTargetXpTouched(false);
    setStudentSearchQuery('');
  };

  // Selecting a course re-anchors the quest: the title follows the course and
  // the XP target is read from GET /courses/{id}/xp-summary (the course's real
  // reward total) rather than a fixed 2500.
  const handleCourseChange = async (courseId) => {
    setNewTeamCourseId(courseId);
    setCourseXpSummary(null);
    if (!courseId) return;

    const course = questCourses.find(c => (c.id || c.courseId) === courseId);
    const title = course?.title || course?.name || '';
    if (title && !(newTeamQuest && newTeamQuest.trim())) {
      setNewTeamQuest(`${title} Quest`);
    }

    setCourseXpLoading(true);
    try {
      const summary = await gamificationService.getCourseXpSummary(courseId);
      setCourseXpSummary(summary);
      if (!targetXpTouched && summary?.displayTotal) {
        setNewTeamTargetXp(Number(summary.displayTotal));
      }
    } catch (err) {
      console.warn('Could not load course XP summary:', err);
    } finally {
      setCourseXpLoading(false);
    }
  };

  const handleRemoveMember = async (squadId, studentId, studentName) => {
    if (!window.confirm(`Remove ${studentName} from this squad?`)) return;
    try {
      const res = await gamificationService.removeSquadMember(squadId, studentId);
      if (res?.success === false) {
        showToast(res?.message || 'Error removing student');
        return;
      }
      showToast(`Removed ${studentName} from squad`);
      await loadData();
    } catch (err) {
      showToast(err?.message || 'Error removing student');
    }
  };

  const handleAddMemberSubmit = async () => {
    if (!addMemberSquad || !studentToAddId) return;
    try {
      const res = await gamificationService.addSquadMember(addMemberSquad.id, studentToAddId);
      if (res?.success === false) {
        showToast(res?.message || 'Error adding student to squad');
        return;
      }
      showToast(`Added student to squad ${addMemberSquad.name}`);
      setAddMemberSquad(null);
      setStudentToAddId('');
      await loadData();
    } catch (err) {
      showToast(err?.message || 'Error adding student to squad');
    }
  };

  const handleDeleteSquad = async (squadId, squadName) => {
    if (!window.confirm(`Are you sure you want to disband the squad "${squadName}"?`)) return;
    try {
      const res = await gamificationService.deleteSquad(squadId);
      if (res?.success === false) {
        showToast(res?.message || 'Error disbanding squad');
        return;
      }
      showToast(`Squad "${squadName}" has been disbanded`);
      await loadData();
    } catch (err) {
      showToast(err?.message || 'Error disbanding squad');
    }
  };

  const totalCombinedXp = squads.reduce((acc, s) => acc + (s.combinedXp || 0), 0);

  // Distinct BadgeCategory values present in the loaded catalogue — replaces the
  // hard-coded "4 Rarity tiers configured" line with something actually counted.
  const badgeCategoryCount = new Set(badges.map((b) => b.category)).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Error Banner */}
      {error && (
        <div style={{
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          fontSize: '13px',
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{error}</span>
          <button onClick={loadData} className="btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }}>
            Retry
          </button>
        </div>
      )}

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
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: error ? '#EF4444' : (refreshing ? '#F59E0B' : '#10B981'),
                boxShadow: error ? '0 0 6px #EF4444' : '0 0 6px rgba(16,185,129,0.7)'
              }} />
              {error
                ? 'Disconnected'
                : loading && !lastUpdated
                  ? 'Loading\u2026'
                  : refreshing
                    ? 'Syncing\u2026'
                    : lastUpdated
                      ? `Live \u00b7 updated ${lastUpdated.toLocaleTimeString()}`
                      : 'Live \u00b7 awaiting first sync'}
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
          {/* Multiplier control — Admin can change it, everyone else reads it */}
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
              disabled={multiplierLoading || !canEditMultiplier}
              title={
                canEditMultiplier
                  ? 'Toggle the platform-wide XP event multiplier'
                  : 'Read-only: the platform multiplier is managed by administrators'
              }
              className={canEditMultiplier ? 'hover-scale' : undefined}
              style={{
                fontSize: '12px',
                fontWeight: '700',
                padding: '4px 10px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: xpMultiplier > 1.0 ? 'var(--warning)' : 'var(--bg-surface)',
                color: xpMultiplier > 1.0 ? '#000000' : 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                cursor: canEditMultiplier ? 'pointer' : 'not-allowed',
                opacity: canEditMultiplier ? 1 : 0.75,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {xpMultiplier}x {xpMultiplier > 1.0 ? 'DOUBLE XP' : 'Standard'}
            </button>
            {!canEditMultiplier && (
              <span className="badge-pill badge-neutral" style={{ fontSize: '10px' }}>
                Admin only
              </span>
            )}
          </div>

          {canManageSquads ? (
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
          ) : (
            <span className="badge-pill badge-neutral" style={{ fontSize: '11.5px', padding: '6px 12px' }}>
              Read-only view — squads are managed by instructors
            </span>
          )}
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
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {badgeCategoryCount} award categories configured
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '8px'
      }}>
        {(isStaffRole() ? [
          { id: 'quiz-performance', label: 'Quiz Submissions & Answers', icon: CheckCircle2, count: quizPerfData?.recentSubmissions?.length || 0 },
          { id: 'teams', label: 'Student Teams & Squads', icon: Users, count: squads.length },
          { id: 'students', label: 'Learners Directory', icon: Compass, count: (students && students.length > 0 ? students.length : DEFAULT_FALLBACK_STUDENTS.length) },
          { id: 'leaderboard', label: 'Leaderboard Standings', icon: Trophy },
          { id: 'badges', label: 'Milestones & Badges', icon: Award, count: badges.length },
          { id: 'ledger', label: 'Points Ledger & Audit', icon: Layers }
        ] : [
          { id: 'teams', label: 'Student Teams & Squads', icon: Users, count: squads.length },
          { id: 'students', label: 'Learners Directory', icon: Compass, count: (students && students.length > 0 ? students.length : DEFAULT_FALLBACK_STUDENTS.length) },
          { id: 'leaderboard', label: 'Leaderboard Standings', icon: Trophy },
          { id: 'quiz-performance', label: 'Quiz Submissions & Answers', icon: CheckCircle2, count: quizPerfData?.recentSubmissions?.length || 0 },
          { id: 'badges', label: 'Milestones & Badges', icon: Award, count: badges.length },
          { id: 'ledger', label: 'Points Ledger & Audit', icon: Layers }
        ]).map(tab => {
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
            {canManageSquads && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} /> Assemble New Team
              </button>
            )}
          </div>

          {squads.length === 0 ? (
            <div className="card-premium" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <Users size={36} color="var(--primary)" style={{ opacity: 0.6, marginBottom: '12px' }} />
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>No Teams Assembled Yet</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '440px', margin: '6px auto 16px' }}>
                {canManageSquads
                  ? 'Create your first student squad and bind it to a course to unlock collaborative quests, collective XP pooling, and peer accountability.'
                  : 'No squads have been assembled for this cohort yet.'}
              </p>
              {canManageSquads && (
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                  <Plus size={15} /> Create Team Now
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
              {squads.map((sq) => {
                // Real quest target from the bound course (0 = squad is unbound).
                const targetXp = sq.targetXp || 0;
                const progressPct = targetXp > 0
                  ? Math.min(100, Math.round(((sq.combinedXp || 0) / targetXp) * 100))
                  : 0;
                const questLabel = sq.questTitle || sq.description || 'Unbound quest — pick a course';
                const learningPct = Math.round(sq.learningProgressPercent || 0);

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

                      {canManageSquads && (
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
                      )}
                    </div>

                    {/* Quest Progress Tracker */}
                    <div style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                          <Target size={12} /> {questLabel}
                        </span>
                        <span style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                          {sq.courseTitle
                            ? `${learningPct}% complete`
                            : targetXp > 0
                              ? `${progressPct}% of ${targetXp.toLocaleString()} XP`
                              : 'No target set'}
                        </span>
                      </div>
                      {/* Bound quests advance on real enrollment/lesson progress;
                          unbound ones fall back to the XP ratio against their target. */}
                      <div style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: 'var(--bg-canvas)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${sq.courseTitle ? learningPct : progressPct}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)',
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                          <BookOpen size={11} />
                          {sq.courseTitle ? sq.courseTitle : 'No course bound'}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                          {sq.courseTitle
                            ? (sq.totalLessons > 0
                              ? `${sq.completedLessons || 0}/${sq.totalLessons} lessons done`
                              : 'Enrollment progress')
                            : 'Bind a course to track learning'}
                        </span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        Squad lifetime XP {(sq.combinedXp || 0).toLocaleString()}
                        {targetXp > 0
                          ? ` \u00b7 ${sq.courseTitle ? 'course reward' : 'quest target'} ${targetXp.toLocaleString()} XP`
                          : ''}
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
                                {canManageSquads && (
                                  <button
                                    onClick={() => handleRemoveMember(sq.id, m.studentId, m.studentName)}
                                    title="Remove from squad"
                                    className="btn-ghost"
                                    style={{ padding: '3px', color: 'var(--text-muted)' }}
                                  >
                                    <X size={13} />
                                  </button>
                                )}
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

      {/* ── TAB 1.5: LEARNERS & ROSTER DIRECTORY FOR INSTRUCTORS & ADMINS ───── */}
      {activeTab === 'students' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Instructor & Admin Learner Directory
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Complete visibility of all enrolled students, current XP stats, streak velocity, and squad assignments.
              </p>
            </div>
          </div>

          {/* Filters & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'all', label: 'All Learners' },
                { id: 'free', label: 'Free Agents (Unassigned)' },
                { id: 'squad', label: 'Assigned to Squads' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStudentFilterTab(f.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: studentFilterTab === f.id ? 'var(--primary-soft)' : 'var(--bg-surface)',
                    color: studentFilterTab === f.id ? 'var(--primary)' : 'var(--text-muted)',
                    border: studentFilterTab === f.id ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    fontSize: '12px',
                    fontWeight: studentFilterTab === f.id ? '700' : '500',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by name, email, level..."
                value={rosterSearchQuery}
                onChange={(e) => setRosterSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-card)',
                  color: 'var(--text-main)',
                  fontSize: '12px'
                }}
              />
            </div>
          </div>

          {/* Roster Directory Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {(() => {
              const effective = students || [];
              const filtered = effective.filter(st => {
                const sId = st.studentId || st.id || st.userId;
                const squad = squads.find(sq => (sq.members || []).some(m => (m.studentId || m.id) === sId));
                const inSquadName = squad ? squad.name : st.currentSquadName;

                if (studentFilterTab === 'free' && inSquadName) return false;
                if (studentFilterTab === 'squad' && !inSquadName) return false;

                const q = rosterSearchQuery.toLowerCase();
                const name = (st.fullName || st.name || '').toLowerCase();
                const email = (st.email || '').toLowerCase();
                return name.includes(q) || email.includes(q);
              });

              if (filtered.length === 0) {
                return (
                  <div className="card-premium" style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No learners match your search query.
                  </div>
                );
              }

              return filtered.map(st => {
                const sId = st.studentId || st.id || st.userId;
                const squad = squads.find(sq => (sq.members || []).some(m => (m.studentId || m.id) === sId));
                const inSquadName = squad ? squad.name : st.currentSquadName;

                return (
                  <div key={sId} className="card-premium glass-card-hover" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--primary-soft)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '15px'
                        }}>
                          {(st.fullName || st.name || 'S')[0]}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                            {st.fullName || st.name}
                          </h4>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {st.email || 'Email unavailable'}
                          </span>
                        </div>
                      </div>

                      {inSquadName ? (
                        <span className="badge-pill badge-primary" style={{ fontSize: '10px' }}>
                          Squad: {inSquadName}
                        </span>
                      ) : (
                        <span className="badge-pill badge-neutral" style={{ fontSize: '10px' }}>
                          Free Agent
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '10px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-xs)' }}>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>LEVEL</span>
                        <strong style={{ fontSize: '13px', color: 'var(--primary)' }}>Lvl {st.currentLevel ?? st.level ?? 1}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>TOTAL XP</span>
                        <strong style={{ fontSize: '13px', color: 'var(--secondary)' }}>{(st.totalXp ?? st.totalXP ?? 0).toLocaleString()} XP</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>STREAK</span>
                        <strong style={{ fontSize: '13px', color: 'var(--warning)' }}>🔥 {st.currentStreak ?? st.streak ?? 0}d</strong>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
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
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '3px' }}>
                    {badgeCategoryLabel(b.category)}
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>{b.description}</p>
                  <div style={{
                    fontSize: '10.5px',
                    marginTop: '6px',
                    fontWeight: '600',
                    color: b.isUnlocked ? 'var(--success)' : 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <CheckCircle2 size={12} />
                    {b.isUnlocked
                      ? `Unlocked ${b.unlockedAt ? new Date(b.unlockedAt).toLocaleDateString() : ''}`.trim()
                      : `Criterion: ${b.criteriaLabel || 'Awarded automatically by the reward engine'}`}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Deterministic Points Ledger & Audit Trail
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Append-only record of every XP mutation across the cohort, straight from the database.
              </p>
            </div>

            {isStaffRole() && (
              <div style={{
                display: 'flex',
                backgroundColor: 'var(--bg-canvas)',
                borderRadius: 'var(--radius-sm)',
                padding: '3px',
                border: '1px solid var(--border-subtle)',
                gap: '4px'
              }}>
                {[{ id: 'cohort', label: 'Cohort ledger' }, { id: 'mine', label: 'My XP' }].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setLedgerScope(opt.id)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: ledgerScope === opt.id ? 'var(--bg-card)' : 'transparent',
                      color: ledgerScope === opt.id ? 'var(--text-main)' : 'var(--text-muted)',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      border: ledgerScope === opt.id ? '1px solid var(--border-card)' : '1px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(() => {
            const rows = isStaffRole() && ledgerScope === 'cohort' ? cohortLedger : ledger;

            if (rows.length === 0) {
              return (
                <div className="card-premium" style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <Layers size={32} color="var(--primary)" style={{ opacity: 0.6, marginBottom: '10px' }} />
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
                    No XP transactions recorded yet
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Points appear here the moment a lesson, assessment, challenge or focus session is credited.
                  </div>
                </div>
              );
            }

            return (
              <div className="card-premium" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rows.map((tx) => {
                  const isCredit = (tx.xpAmount || 0) >= 0;
                  return (
                    <div key={tx.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '12.5px',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <CheckCircle2 size={16} color={isCredit ? 'var(--success)' : 'var(--danger)'} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{tx.description}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {tx.studentName ? `${tx.studentName} \u00b7 ` : ''}
                            {xpSourceLabel(tx.sourceType)}
                            {' \u00b7 '}
                            {new Date(tx.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontWeight: '800', color: signedXpColor(tx.xpAmount), fontSize: '13px', whiteSpace: 'nowrap' }}>
                        {signedXp(tx.xpAmount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── TAB: QUIZ SUBMISSIONS & ANSWERS PERFORMANCE ────────────────────────── */}
      {activeTab === 'quiz-performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Quiz Submissions & Student Performance Analytics
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Inspect students who attempted questions, view exact answer submissions, score rankings, and XP/Reward standings.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-muted)' }}>Course Filter:</span>
              <select
                value={quizPerfCourseId}
                onChange={async (e) => {
                  const val = e.target.value;
                  setQuizPerfCourseId(val);
                  if (val) {
                    setQuizPerfLoading(true);
                    try {
                      const res = await quizService.getCourseQuizPerformance(val);
                      setQuizPerfData(res);
                    } catch (err) {
                      showToast('Could not load course performance data');
                    } finally {
                      setQuizPerfLoading(false);
                    }
                  }
                }}
                className="input-primary"
                style={{ padding: '6px 12px', fontSize: '12.5px', borderRadius: 'var(--radius-sm)', minWidth: '220px' }}
              >
                <option value="">Select Course...</option>
                {questCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="card-premium" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                <BookOpen size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Submissions</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                  {quizPerfData?.totalSubmissions || 0} Attempts
                </div>
              </div>
            </div>

            <div className="card-premium" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                <TrendingUp size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Average Cohort Score</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                  {quizPerfData?.averageCourseQuizScore || 0}%
                </div>
              </div>
            </div>

            <div className="card-premium" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <Zap size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quiz Pass Rate</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                  {quizPerfData?.passRatePercentage || 0}%
                </div>
              </div>
            </div>

            <div className="card-premium" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
                <Crown size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Top Performer</div>
                <div style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {quizPerfData?.topPerformers?.[0]?.studentName || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Top Performing Students Leaderboard */}
          <div className="card-premium" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Trophy size={18} color="var(--warning)" />
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Top Performing Students Leaderboard (Ranked by Quiz Score & XP)
              </h4>
            </div>

            {quizPerfLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading course student performance...
              </div>
            ) : (!quizPerfData?.topPerformers || quizPerfData.topPerformers.length === 0) ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No quiz submissions recorded yet for this course selection. Students who attempt quizzes will be ranked here automatically.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>Rank</th>
                      <th style={{ padding: '8px 12px' }}>Student</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Quizzes Taken</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Avg Score</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Highest Score</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Passes</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total XP Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizPerfData.topPerformers.map((p, idx) => (
                      <tr key={p.studentId || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '800' }}>
                          {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{p.studentName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.studentEmail}</div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600' }}>{p.quizzesTaken}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700', color: p.averageScore >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                          {p.averageScore}%
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600' }}>{p.highestScore}%</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span className="badge-pill badge-primary" style={{ fontSize: '11px' }}>
                            {p.passedCount} Passed
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: 'var(--success)' }}>
                          +{p.totalXpEarned} XP
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Recent Quiz Attempt Submissions & Answers Audit Log */}
          <div className="card-premium" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={18} color="var(--primary)" />
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Student Quiz Attempt Log & Answer Audits
              </h4>
            </div>

            {(!quizPerfData?.recentSubmissions || quizPerfData.recentSubmissions.length === 0) ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No quiz submissions recorded yet. When students take quizzes, their detailed attempt answers will be displayed here.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>Student</th>
                      <th style={{ padding: '8px 12px' }}>Quiz Title</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Score</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>XP Awarded</th>
                      <th style={{ padding: '8px 12px' }}>Submitted At</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Answers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizPerfData.recentSubmissions.map((sub, idx) => (
                      <tr key={sub.submissionId || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-main)' }}>
                          {sub.studentName}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: '600' }}>
                          {sub.quizTitle}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '800', color: sub.percentageScore >= 70 ? 'var(--success)' : 'var(--danger)' }}>
                          {sub.percentageScore}%
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span className={`badge-pill ${sub.passed ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10.5px' }}>
                            {sub.passed ? 'PASSED' : 'NEEDS PRACTICE'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700', color: 'var(--success)' }}>
                          +{sub.xpEarned} XP
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                          {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'Just now'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button
                            onClick={async () => {
                              setSelectedSubModal(sub);
                              setSubModalLoading(true);
                              setSubAnswersList([]);
                              try {
                                const details = await quizService.getQuizSubmissions(sub.quizId);
                                const match = (details || []).find(d => d.submissionId === sub.submissionId || d.studentId === sub.studentId);
                                if (match && match.answers) {
                                  setSubAnswersList(match.answers);
                                }
                              } catch (err) {
                                showToast('Could not load detailed question answers');
                              } finally {
                                setSubModalLoading(false);
                              }
                            }}
                            className="btn-ghost"
                            style={{ padding: '4px 10px', fontSize: '11.5px', fontWeight: '700', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={13} /> View Answers
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: DETAILED SUBMISSION ANSWERS AUDIT & STUDENT JOURNEY ────────────────────────────── */}
      {selectedSubModal && (
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
            maxWidth: '820px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            gap: '16px',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={20} color="var(--primary)" />
                  Student Quiz Attempt & Journey Audit
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Student: <strong style={{ color: 'var(--text-main)' }}>{selectedSubModal.studentName}</strong> &middot; Quiz: <strong style={{ color: 'var(--text-main)' }}>{selectedSubModal.quizTitle}</strong>
                </p>
              </div>
              <button onClick={() => setSelectedSubModal(null)} className="btn-ghost" style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Score & Evaluation Banner */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
              padding: '14px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Score Achieved</div>
                <div style={{ color: selectedSubModal.percentageScore >= 70 ? 'var(--success)' : 'var(--danger)', fontSize: '18px', fontWeight: '800', marginTop: '2px' }}>
                  {selectedSubModal.percentageScore}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>XP Awarded</div>
                <div style={{ color: 'var(--success)', fontSize: '18px', fontWeight: '800', marginTop: '2px' }}>
                  +{selectedSubModal.xpEarned} XP
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Grading Result</div>
                <div style={{ marginTop: '4px' }}>
                  <span className={`badge-pill ${selectedSubModal.passed ? 'badge-success' : 'badge-danger'}`}>
                    {selectedSubModal.passed ? 'PASSED' : 'NEEDS PRACTICE'}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Submission Date</div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginTop: '4px' }}>
                  {selectedSubModal.submittedAt ? new Date(selectedSubModal.submittedAt).toLocaleString() : 'Just now'}
                </div>
              </div>
            </div>

            {/* Student Journey Step Map */}
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-canvas)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={13} /> Student Journey & Lifecycle Map
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '10px' }}>1</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Quiz Generated</span>
                </div>
                <div style={{ height: '2px', flex: 1, minWidth: '15px', backgroundColor: 'var(--primary-soft)' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '10px' }}>2</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Attempt Submitted</span>
                </div>
                <div style={{ height: '2px', flex: 1, minWidth: '15px', backgroundColor: 'var(--primary-soft)' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: selectedSubModal.passed ? 'var(--success)' : 'var(--warning)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '10px' }}>3</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Evaluated ({selectedSubModal.percentageScore}%)</span>
                </div>
                <div style={{ height: '2px', flex: 1, minWidth: '15px', backgroundColor: 'var(--primary-soft)' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--success)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '10px' }}>4</span>
                  <span style={{ fontWeight: '700', color: 'var(--success)' }}>+{selectedSubModal.xpEarned} XP Ledger</span>
                </div>
              </div>
            </div>

            {/* Question Breakdown & Fixes Needed */}
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HelpCircle size={16} color="var(--primary)" /> Detailed Answers & Identified Improvement Areas
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {subModalLoading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading student question answers...
                </div>
              ) : subAnswersList.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No question breakdowns available for this attempt.
                </div>
              ) : (
                subAnswersList.map((ans, idx) => (
                  <div key={ans.questionId || idx} style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-canvas)',
                    border: `1px solid ${ans.isCorrect ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13.5px', flex: 1 }}>
                        Q{idx + 1}. {ans.prompt || 'Question'}
                      </div>
                      <span className={`badge-pill ${ans.isCorrect ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '11px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {ans.isCorrect ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {ans.isCorrect ? 'Correct (+10 pts)' : 'Incorrect (0 pts)'}
                      </span>
                    </div>

                    <div style={{ fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: ans.isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        borderLeft: `3px solid ${ans.isCorrect ? 'var(--success)' : 'var(--danger)'}`,
                        color: ans.isCorrect ? 'var(--success)' : 'var(--danger)',
                        fontWeight: '600'
                      }}>
                        <strong>Student Answer:</strong> {ans.selectedAnswer || '(No answer provided)'}
                      </div>

                      {!ans.isCorrect && (
                        <div style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: 'rgba(16, 185, 129, 0.08)',
                          borderLeft: '3px solid var(--success)',
                          color: 'var(--success)',
                          fontWeight: '600'
                        }}>
                          <strong>Correct Answer:</strong> {ans.correctAnswer}
                        </div>
                      )}

                      {/* Identified Issues & Fix Action Items */}
                      <div style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '12px'
                      }}>
                        {ans.isCorrect ? (
                          <div style={{ color: 'var(--success)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={14} /> Concept Mastered! Student selected the correct option accurately.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ color: 'var(--danger)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <XCircle size={14} /> Concept Issue Identified: Student selected incorrect option "{ans.selectedAnswer || 'None'}".
                            </div>
                            <div style={{ color: 'var(--text-main)', fontWeight: '600', marginTop: '2px' }}>
                              💡 <strong>Action / Fix Needed:</strong> Student should review the core topic covered in this question ({ans.prompt || 'Topic Concept'}).
                            </div>
                            {ans.feedback && (
                              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                                Reference Note: {ans.feedback}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setSelectedSubModal(null)} className="btn-secondary" style={{ padding: '8px 18px' }}>
                Close Audit
              </button>
            </div>
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
              <button onClick={() => { resetCreateModal(); setShowCreateModal(false); }} className="btn-ghost" style={{ padding: '6px' }}>
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

              {/* Quest binding: which real course the squad is chasing */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                  QUEST COURSE
                </label>
                <select
                  value={newTeamCourseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    fontSize: '13px'
                  }}
                >
                  <option value="">— Free-form quest (no course) —</option>
                  {questCourses.map((c) => {
                    const cId = c.id || c.courseId;
                    return (
                      <option key={cId} value={cId}>
                        {c.title || c.name} {c.isPublished === false ? '(draft)' : ''}
                      </option>
                    );
                  })}
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                  {questCourses.length === 0
                    ? 'No courses available to your role yet.'
                    : 'The quest title and XP target are derived from this course.'}
                </div>
              </div>

              {/* Active Quest Objective */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                  ACTIVE QUEST TITLE
                </label>
                <input
                  type="text"
                  value={newTeamQuest}
                  onChange={(e) => setNewTeamQuest(e.target.value)}
                  placeholder={newTeamCourseId ? 'e.g. React Foundations Quest' : 'e.g. Clean Architecture & PostgreSQL Indexing Sprint'}
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

              {/* XP target — seeded from the course's real reward total */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                  QUEST TARGET XP
                </label>
                <input
                  type="number"
                  min="0"
                  value={newTeamTargetXp || ''}
                  onChange={(e) => {
                    setTargetXpTouched(true);
                    setNewTeamTargetXp(Number(e.target.value) || 0);
                  }}
                  placeholder={courseXpLoading ? 'Loading course XP…' : '0'}
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
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                  {courseXpLoading
                    ? 'Reading the course reward total…'
                    : courseXpSummary?.displayTotal
                      ? `Course reward total: ${Number(courseXpSummary.displayTotal).toLocaleString()} XP (lessons + quizzes unless the course sets its own reward).`
                      : 'No course selected — set a custom target or leave 0 to track progress only.'}
                </div>
              </div>

              {/* Student Roster Selector */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                    SELECT STUDENTS FOR SQUAD ({selectedStudentIds.length} Selected) *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {(() => {
                      const effectiveStudents = (students && students.length > 0) ? students : DEFAULT_FALLBACK_STUDENTS;
                      const allIds = effectiveStudents.map(st => st.studentId || st.id || st.userId);
                      const allSelected = allIds.length > 0 && allIds.every(id => selectedStudentIds.includes(id));
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            if (allSelected) {
                              setSelectedStudentIds([]);
                              setSelectedLeaderId('');
                            } else {
                              setSelectedStudentIds(allIds);
                              if (allIds.length > 0) setSelectedLeaderId(allIds[0]);
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            padding: '0 4px'
                          }}
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      );
                    })()}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Pick at least 1 student
                    </span>
                  </div>
                </div>

                {/* Quick Search Bar for Students */}
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search students by name or email..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 30px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      fontSize: '12px'
                    }}
                  />
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
                  {(() => {
                    const effectiveStudents = (students && students.length > 0) ? students : DEFAULT_FALLBACK_STUDENTS;
                    const filtered = effectiveStudents.filter(st => {
                      const q = studentSearchQuery.toLowerCase();
                      const name = (st.fullName || st.name || '').toLowerCase();
                      const email = (st.email || '').toLowerCase();
                      return name.includes(q) || email.includes(q);
                    });

                    if (filtered.length === 0) {
                      return (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                          No students match your filter.
                        </div>
                      );
                    }

                    return filtered.map((st) => {
                      const sId = st.studentId || st.id || st.userId;
                      const isChecked = selectedStudentIds.includes(sId);
                      return (
                        <label
                          key={sId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-xs)',
                            backgroundColor: isChecked ? 'var(--primary-soft)' : 'transparent',
                            border: isChecked ? '1px solid var(--primary)' : '1px solid transparent',
                            cursor: 'pointer',
                            fontSize: '12px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleStudentSelection(sId)}
                              style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: isChecked ? '700' : '600', color: 'var(--text-main)' }}>
                                  {st.fullName || st.name}
                                </span>
                                {st.currentSquadName ? (
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    (in {st.currentSquadName})
                                  </span>
                                ) : (
                                  <span className="badge-pill badge-neutral" style={{ fontSize: '9.5px', padding: '1px 5px' }}>
                                    Free Agent
                                  </span>
                                )}
                              </div>
                              {st.email && (
                                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                  {st.email}
                                </span>
                              )}
                            </div>
                          </div>
                          <span style={{ color: 'var(--secondary)', fontWeight: '700', fontSize: '11.5px' }}>
                            {st.totalXp ?? st.totalXP ?? 0} XP • Lvl {st.currentLevel ?? st.level ?? 1}
                          </span>
                        </label>
                      );
                    });
                  })()}
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
                      const effectiveStudents = (students && students.length > 0) ? students : DEFAULT_FALLBACK_STUDENTS;
                      const st = effectiveStudents.find(s => (s.studentId || s.id || s.userId) === id);
                      return (
                        <option key={id} value={id}>
                          {st ? (st.fullName || st.name) : id}
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
                  onClick={() => { resetCreateModal(); setShowCreateModal(false); }}
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTeam || selectedStudentIds.length === 0}
                  onClick={handleCreateTeamSubmit}
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
              {((students && students.length > 0) ? students : DEFAULT_FALLBACK_STUDENTS)
                .filter(st => !(addMemberSquad.members || []).some(m => (m.studentId || m.id) === (st.studentId || st.id || st.userId)))
                .map(st => {
                  const sId = st.studentId || st.id || st.userId;
                  return (
                    <option key={sId} value={sId}>
                      {st.fullName || st.name} ({st.totalXp ?? st.totalXP ?? 0} XP) {st.currentSquadName ? `[in ${st.currentSquadName}]` : '[Free Agent]'}
                    </option>
                  );
                })}
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
