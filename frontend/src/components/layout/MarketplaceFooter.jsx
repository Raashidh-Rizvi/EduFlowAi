import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Github, Linkedin, Youtube, Twitter } from 'lucide-react';
import { BrandLogo } from './../common/BrandLogo';

const EXPLORE_LINKS = [
  { label: 'All Courses', to: '/courses' },
  { label: 'Categories', to: '/#categories' },
  { label: 'Featured Instructors', to: '/#instructors' },
  { label: 'Popular Courses', to: '/#popular' },
  { label: 'Become an Instructor', to: '/login?mode=register' }
];

const LEARN_LINKS = [
  { label: 'Free courses', to: '/courses?price=free' },
  { label: 'Top rated', to: '/courses?sort=rating' },
  { label: 'Most popular', to: '/courses?sort=popular' },
  { label: 'New arrivals', to: '/courses?sort=newest' },
  { label: 'Beginner friendly', to: '/courses?level=Easy' }
];

const POLICY_LINKS = [
  { label: 'Privacy Policy', to: '/policies/privacy' },
  { label: 'Terms of Service', to: '/policies/terms' },
  { label: 'Cookie Policy', to: '/policies/cookies' },
  { label: 'Accessibility', to: '/policies/accessibility' }
];

export default function MarketplaceFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-footer__inner">
        <div className="mk-footer__brand">
          <BrandLogo size="md" showTag />
          <p>
            EduFlow AI is an open course marketplace where learners discover published programs,
            meet the instructors behind them and enroll in minutes.
          </p>
          <ul className="mk-footer__contact">
            <li><Mail size={15} aria-hidden="true" /><a href="mailto:support@eduflow.ai">support@eduflow.ai</a></li>
            <li><Phone size={15} aria-hidden="true" /><a href="tel:+15550142200">+1 (555) 014-2200</a></li>
            <li><MapPin size={15} aria-hidden="true" /><span>210 Learning Avenue, Suite 400, San Francisco, CA</span></li>
          </ul>
          <div className="mk-footer__social">
            <a href="https://twitter.com" target="_blank" rel="noreferrer noopener" aria-label="EduFlow on Twitter"><Twitter size={16} /></a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer noopener" aria-label="EduFlow on LinkedIn"><Linkedin size={16} /></a>
            <a href="https://github.com" target="_blank" rel="noreferrer noopener" aria-label="EduFlow on GitHub"><Github size={16} /></a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer noopener" aria-label="EduFlow on YouTube"><Youtube size={16} /></a>
          </div>
        </div>

        <nav className="mk-footer__col" aria-label="Explore">
          <h4>Explore</h4>
          {EXPLORE_LINKS.map((link) => (
            <Link key={link.label} to={link.to}>{link.label}</Link>
          ))}
        </nav>

        <nav className="mk-footer__col" aria-label="Learn">
          <h4>Learn</h4>
          {LEARN_LINKS.map((link) => (
            <Link key={link.label} to={link.to}>{link.label}</Link>
          ))}
        </nav>

        <nav className="mk-footer__col" aria-label="Policies">
          <h4>Policies</h4>
          {POLICY_LINKS.map((link) => (
            <Link key={link.label} to={link.to}>{link.label}</Link>
          ))}
          <a href="mailto:support@eduflow.ai?subject=Support%20request">Help &amp; Contact</a>
        </nav>
      </div>

      <div className="mk-footer__bottom">
        <span>© {new Date().getFullYear()} EduFlow AI. All rights reserved.</span>
        <span className="mk-footer__status">
          <span className="status-dot-active" aria-hidden="true" /> All systems operational
        </span>
      </div>
    </footer>
  );
}
