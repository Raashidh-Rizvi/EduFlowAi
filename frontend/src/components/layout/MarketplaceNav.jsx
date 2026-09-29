import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, LayoutDashboard, LogOut, ChevronDown, UserRound } from 'lucide-react';
import { BrandLogo } from './../common/BrandLogo';
import ThemeToggle from './../common/ThemeToggle';
import RoleSwitcher from './../common/RoleSwitcher';
import Avatar from '../marketplace/Avatar';

const DASHBOARD_LABEL = {
  Student: 'My Learning',
  Instructor: 'Instructor Console',
  Admin: 'Admin Console'
};

/**
 * Public marketplace navigation.
 * Anonymous visitors get Login / Register; authenticated visitors get their
 * profile plus a dashboard entry point matched to their role.
 */
export default function MarketplaceNav({ currentUser, onLogout, onSwitchRole }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!profileOpen) return undefined;
    const onDocClick = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [profileOpen]);

  const submitSearch = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/courses?q=${encodeURIComponent(trimmed)}` : '/courses');
  };

  const goHomeHash = (hash) => {
    if (location.pathname === '/') {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate(`/${hash}`);
    }
  };

  const dashboardLabel = currentUser ? DASHBOARD_LABEL[currentUser.role] || 'Dashboard' : null;

  const links = (
    <>
      <Link to="/courses" className="mk-nav__link">Courses</Link>
      <button type="button" className="mk-nav__link mk-nav__link--btn" onClick={() => goHomeHash('#categories')}>
        Categories
      </button>
      <button type="button" className="mk-nav__link mk-nav__link--btn" onClick={() => goHomeHash('#instructors')}>
        Instructors
      </button>
    </>
  );

  return (
    <header className="mk-nav">
      <div className="mk-nav__inner">
        <Link to="/" className="mk-nav__brand" aria-label="EduFlow home">
          <BrandLogo size="md" showTag />
        </Link>

        <nav className="mk-nav__links" aria-label="Marketplace">
          {links}
        </nav>

        <form className="mk-nav__search" role="search" onSubmit={submitSearch}>
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search courses..."
            aria-label="Search courses"
          />
        </form>

        <div className="mk-nav__actions">
          <div className="mk-nav__roles">
            <RoleSwitcher currentRole={currentUser?.role || null} onSwitchRole={onSwitchRole} compact />
          </div>

          <ThemeToggle compact />

          {currentUser ? (
            <div className="mk-nav__profile" ref={profileRef}>
              <button
                type="button"
                className="mk-nav__profile-btn"
                onClick={() => setProfileOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <Avatar name={currentUser.fullName} src={currentUser.avatarUrl} size={30} />
                <span className="mk-nav__profile-name">{currentUser.fullName}</span>
                <ChevronDown size={14} aria-hidden="true" style={{ transform: profileOpen ? 'rotate(180deg)' : 'none' }} />
              </button>

              {profileOpen && (
                <div className="mk-nav__menu" role="menu">
                  <div className="mk-nav__menu-head">
                    <Avatar name={currentUser.fullName} src={currentUser.avatarUrl} size={36} />
                    <div>
                      <strong>{currentUser.fullName}</strong>
                      <span>{currentUser.email}</span>
                    </div>
                  </div>
                  <span className="mk-nav__menu-role">Role: <strong>{currentUser.role}</strong></span>
                  <Link to="/console" className="mk-nav__menu-item" role="menuitem">
                    <LayoutDashboard size={14} aria-hidden="true" /> {dashboardLabel}
                  </Link>
                  <button
                    type="button"
                    className="mk-nav__menu-item mk-nav__menu-item--danger"
                    role="menuitem"
                    onClick={() => { setProfileOpen(false); onLogout(); }}
                  >
                    <LogOut size={14} aria-hidden="true" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mk-nav__auth">
              <button type="button" className="btn-ghost" onClick={() => navigate('/login')}>
                Log in
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/login?mode=register')}
              >
                Register
              </button>
            </div>
          )}

          <button
            type="button"
            className="mk-nav__burger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mk-nav__mobile">
          <form className="mk-nav__search mk-nav__search--mobile" role="search" onSubmit={submitSearch}>
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search courses, topics, instructors..."
              aria-label="Search courses"
            />
          </form>

          <nav aria-label="Mobile marketplace">
            {links}
            {currentUser ? (
              <>
                <Link to="/console" className="mk-nav__link">
                  <UserRound size={15} aria-hidden="true" /> {dashboardLabel}
                </Link>
                <button type="button" className="mk-nav__link mk-nav__link--btn" onClick={onLogout}>
                  <LogOut size={15} aria-hidden="true" /> Sign out
                </button>
              </>
            ) : (
              <>
                <button type="button" className="mk-nav__link mk-nav__link--btn" onClick={() => navigate('/login')}>
                  Log in
                </button>
                <button type="button" className="mk-nav__link mk-nav__link--btn" onClick={() => navigate('/login?mode=register')}>
                  Register
                </button>
              </>
            )}
          </nav>

          <div className="mk-nav__roles mk-nav__roles--mobile">
            <RoleSwitcher currentRole={currentUser?.role || null} onSwitchRole={onSwitchRole} />
          </div>
        </div>
      )}
    </header>
  );
}
