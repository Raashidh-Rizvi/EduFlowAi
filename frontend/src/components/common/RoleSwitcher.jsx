import React from 'react';

// Kept as a compatible component for existing portal consumers; it never logs
// into another account or changes the authenticated role.
export default function RoleSwitcher({ currentRole }) {
  return currentRole ? <span className="badge-pill badge-neutral">{currentRole}</span> : null;
}
