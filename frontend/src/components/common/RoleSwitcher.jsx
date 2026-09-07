import React, { useState } from 'react';
import { GraduationCap, Shield, BookOpen } from 'lucide-react';

export default function RoleSwitcher({ currentRole, onSwitchRole, compact = false }) {
  const [switchingRole, setSwitchingRole] = useState(null);
  const [hoveredRole, setHoveredRole] = useState(null);

  const roles = [
    {
      id: 'Student',
      label: 'Student',
      icon: GraduationCap,
      color: 'var(--secondary)',
      activeGradient: 'linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)',
      shadowColor: 'rgba(14, 165, 233, 0.4)',
      description: 'Learner Workspace & Quests'
    },
    {
      id: 'Instructor',
      label: 'Instructor',
      icon: BookOpen,
      color: 'var(--primary)',
      activeGradient: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
      shadowColor: 'rgba(139, 92, 246, 0.4)',
      description: 'HITL Review & Course Studio'
    },
    {
      id: 'Admin',
      label: 'Admin',
      icon: Shield,
      color: 'var(--accent)',
      activeGradient: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
      shadowColor: 'rgba(244, 63, 94, 0.4)',
      description: 'Platform Governance & RBAC'
    }
  ];

  const handleRoleClick = async (roleId) => {
    if (switchingRole) return;
    setSwitchingRole(roleId);
    try {
      if (onSwitchRole) {
        await onSwitchRole(roleId);
      }
    } finally {
      setTimeout(() => setSwitchingRole(null), 300);
    }
  };

  return (
    <div 
      className="glass-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: compact ? '3px 4px' : '4px 6px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--bg-input)',
        border: '1px solid var(--border-subtle)',
        gap: compact ? '3px' : '4px',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
        userSelect: 'none'
      }}
      role="group"
      aria-label="Role Switcher"
    >
      <span style={{
        fontSize: compact ? '10px' : '11px',
        fontWeight: '700',
        color: 'var(--text-muted)',
        paddingLeft: compact ? '6px' : '8px',
        paddingRight: '4px',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        display: compact ? 'none' : 'inline-block'
      }}>
        Portal:
      </span>

      {roles.map((role) => {
        const isActive = currentRole?.toLowerCase() === role.id.toLowerCase();
        const isHovered = hoveredRole === role.id && !isActive;
        const isSwitching = switchingRole === role.id;
        const Icon = role.icon;

        return (
          <button
            key={role.id}
            id={`btn-switch-${role.id.toLowerCase()}`}
            data-testid={`role-btn-${role.id.toLowerCase()}`}
            title={`Switch to ${role.label} (${role.description})`}
            onClick={() => handleRoleClick(role.id)}
            disabled={isSwitching}
            onMouseEnter={() => setHoveredRole(role.id)}
            onMouseLeave={() => setHoveredRole(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: compact ? '4px' : '6px',
              padding: compact ? '4px 10px' : '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid',
              borderColor: isActive 
                ? 'rgba(255, 255, 255, 0.3)' 
                : isHovered 
                  ? 'var(--border-subtle)' 
                  : 'transparent',
              background: isActive 
                ? role.activeGradient 
                : isHovered 
                  ? 'var(--ghost-hover)' 
                  : 'transparent',
              color: isActive 
                ? '#FFFFFF' 
                : isHovered 
                  ? 'var(--text-main)' 
                  : 'var(--text-secondary)',
              fontSize: compact ? '11px' : '12px',
              fontWeight: isActive ? '700' : '600',
              cursor: isSwitching ? 'wait' : 'pointer',
              transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isActive ? `0 2px 10px ${role.shadowColor}` : 'none',
              transform: isActive ? 'scale(1.02)' : isHovered ? 'scale(1.01)' : 'none',
              outline: 'none',
              position: 'relative'
            }}
          >
            <Icon size={compact ? 12 : 14} color={isActive ? '#FFFFFF' : role.color} />
            <span>{role.label}</span>
            {isActive && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 0 6px rgba(255,255,255,0.8)',
                display: 'inline-block'
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
