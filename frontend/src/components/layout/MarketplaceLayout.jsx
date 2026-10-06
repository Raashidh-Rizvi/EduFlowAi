import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MarketplaceNav from './MarketplaceNav';
import MarketplaceFooter from './MarketplaceFooter';
import { useAuth } from '../../context/AuthContext';

/**
 * Shell for every public marketplace route: sticky navigation,
 * routed content and the global footer, with hash-aware scrolling.
 */
export default function MarketplaceLayout() {
  const { currentUser, onLogout, onSwitchRole } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const timer = window.setTimeout(() => {
        const target = document.querySelector(location.hash);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return () => window.clearTimeout(timer);
    }
    if (!location.state?.preserveScroll) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    return undefined;
  }, [location.pathname, location.hash, location.state]);

  return (
    <div className="mk-shell">
      <a href="#main-content" className="mk-skip">Skip to main content</a>
      <MarketplaceNav currentUser={currentUser} onLogout={onLogout} onSwitchRole={onSwitchRole} />
      <main id="main-content" className="mk-main">
        <Outlet />
      </main>
      <MarketplaceFooter />
    </div>
  );
}
