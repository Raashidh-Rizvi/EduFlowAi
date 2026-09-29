import React from 'react';
import {
  LayoutDashboard, BookOpen, PlusCircle, UserCheck, Users, Star, UserCog,
  Sparkles, CheckCircle2, Trophy, BarChart3, Bell, ChevronRight
} from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';

export const INSTRUCTOR_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Workspace' },
  { id: 'my-courses', label: 'My Courses', icon: BookOpen, group: 'Workspace' },
  { id: 'create-course', label: 'Create Course', icon: PlusCircle, group: 'Workspace' },
  { id: 'enrollment-requests', label: 'Enrollment Requests', icon: UserCheck, group: 'Workspace' },
  { id: 'my-students', label: 'My Students', icon: Users, group: 'Workspace' },
  { id: 'reviews', label: 'Reviews & Ratings', icon: Star, group: 'Workspace' },
  { id: 'profile', label: 'Profile', icon: UserCog, group: 'Workspace' },
  { id: 'courses', label: 'Curriculum & Modules', icon: BookOpen, group: 'Course Studio' },
  { id: 'assessments', label: 'Assessments & Quizzes', icon: CheckCircle2, group: 'Course Studio' },
  { id: 'ai-review', label: 'AI Review & Approvals', icon: Sparkles, group: 'Course Studio' },
  { id: 'gamification', label: 'Gamification & XP', icon: Trophy, group: 'Insights' },
  { id: 'insights', label: 'Cohort Insights', icon: BarChart3, group: 'Insights' },
  { id: 'communications', label: 'Communications Hub', icon: Bell, group: 'Insights' }
];

export default function InstructorSidebar({
  activeSection,
  onNavigate,
  pendingEnrollments = 0,
  pendingAiProposals = 0,
  currentUser,
  onLogout,
  onLogoClick
}) {
  const user = currentUser || {};
  const groups = [...new Set(INSTRUCTOR_SECTIONS.map(s => s.group))];
  const badgeFor = (id) => {
    if (id === 'enrollment-requests' && pendingEnrollments > 0) return `${pendingEnrollments} New`;
    if (id === 'ai-review' && pendingAiProposals > 0) return `${pendingAiProposals} Pending`;
    return null;
  };

  return (
    <div style={{ padding: '24px 0 24px 24px', display: 'flex', height: '100vh', position: 'sticky', top: 0 }}>
      <nav className="liquid-glass" style={{
        width: '268px', height: '100%', borderRadius: 'var(--radius-xl)',
        display: 'flex', flexDirection: 'column', padding: '24px 16px', userSelect: 'none'
      }}>
        <div style={{ marginBottom: '26px', paddingLeft: '8px' }}>
          <BrandLogo size="sm" subtitle="Instructor" onClick={onLogoClick} style={{ cursor: 'pointer' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '22px', paddingRight: '4px' }}>
          {groups.map((group) => (
            <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{
                fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.07em',
                color: 'var(--text-subtle)', fontWeight: 800, paddingLeft: '12px', marginBottom: '6px'
              }}>
                {group}
              </div>

              {INSTRUCTOR_SECTIONS.filter(s => s.group === group).map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const badge = badgeFor(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="hover-scale"
                    aria-current={isActive ? 'page' : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 13px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: isActive ? 'var(--primary-soft)' : 'transparent',
                      color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                      fontWeight: isActive ? 700 : 600,
                      border: isActive ? '1px solid var(--primary-border)' : '1px solid transparent',
                      textAlign: 'left', transition: 'all 0.15s ease', cursor: 'pointer',
                      fontSize: '13px', width: '100%'
                    }}
                  >
                    <Icon size={17} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                    {badge && (
                      <span className="badge-pill badge-primary" style={{ fontSize: '9.5px', padding: '2px 7px' }}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--primary)' }}>
              Instructor Console
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 600 }}>
              {user.fullName || 'Instructor'}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="btn-ghost"
            style={{ width: '100%', justifyContent: 'space-between', fontSize: '12.5px', padding: '8px 13px' }}
          >
            Sign out <ChevronRight size={14} />
          </button>
        </div>
      </nav>
    </div>
  );
}
