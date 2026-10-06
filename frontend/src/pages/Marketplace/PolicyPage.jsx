import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, FileText, Cookie, Accessibility } from 'lucide-react';
import { ErrorState } from '../../components/marketplace/States';

const POLICIES = {
  privacy: {
    icon: ShieldCheck,
    title: 'Privacy Policy',
    updated: 'Last updated September 2026',
    intro:
      'This policy explains what information EduFlow AI collects when you browse the course marketplace, why we collect it and the choices you have.',
    sections: [
      ['Information we collect', 'Account details you provide (name, email, role), course activity such as enrollments, lesson completions and reviews you submit, and basic technical data such as browser type and device.'],
      ['How we use it', 'To operate the marketplace, show your progress to you and your instructor, secure your account and improve course discovery.'],
      ['Your choices', 'You can request a copy or deletion of your personal data at any time by emailing support@eduflow.ai. We never sell personal data.']
    ]
  },
  terms: {
    icon: FileText,
    title: 'Terms of Service',
    updated: 'Last updated September 2026',
    intro:
      'These terms govern your use of the EduFlow AI course marketplace, including course discovery, enrollment and instructor tools.',
    sections: [
      ['Accounts', 'You are responsible for keeping your credentials secure and for activity that happens under your account.'],
      ['Enrollments', 'Enrollment requests are reviewed by the course instructor. Access begins once a request is approved and ends if the enrollment is withdrawn.'],
      ['Acceptable use', 'Do not share paid course materials, resubmit content as your own, or interfere with the platform for other learners.']
    ]
  },
  cookies: {
    icon: Cookie,
    title: 'Cookie Policy',
    updated: 'Last updated September 2026',
    intro: 'EduFlow AI uses a small number of first-party cookies and local storage entries to keep the platform working.',
    sections: [
      ['Essential storage', 'Session tokens, your theme preference and your last selected portal are stored so the app can restore your session securely.'],
      ['Analytics', 'We aggregate page performance and catalog usage to improve search and course discovery. No advertising trackers are used.'],
      ['Managing cookies', 'You can clear stored data at any time in your browser settings; you will be signed out and preferences reset.']
    ]
  },
  accessibility: {
    icon: Accessibility,
    title: 'Accessibility Statement',
    updated: 'Last updated September 2026',
    intro:
      'EduFlow AI is committed to making the course marketplace usable by everyone, including learners who rely on assistive technology.',
    sections: [
      ['Standards we follow', 'Pages target WCAG 2.1 AA: semantic landmarks, keyboard-navigable controls, visible focus states and sufficient colour contrast in both themes.'],
      ['Learning content', 'Course authors are encouraged to caption video, provide text alternatives and avoid conveying meaning by colour alone.'],
      ['Feedback', 'If you hit a barrier, email support@eduflow.ai with the page address and we will prioritise a fix.']
    ]
  }
};

export default function PolicyPage() {
  const { slug } = useParams();
  const policy = POLICIES[slug];

  if (!policy) {
    return (
      <div className="mk-container mk-detail__error">
        <ErrorState title="Page not found" message="The document you requested does not exist." />
        <Link to="/" className="btn-secondary">
          <ChevronLeft size={15} aria-hidden="true" /> Back to home
        </Link>
      </div>
    );
  }

  const Icon = policy.icon;

  return (
    <article className="mk-container mk-policy">
      <nav className="mk-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{policy.title}</span>
      </nav>

      <header className="mk-policy__head">
        <span className="mk-policy__icon" aria-hidden="true"><Icon size={24} /></span>
        <h1>{policy.title}</h1>
        <p>{policy.updated}</p>
      </header>

      <p className="mk-policy__intro">{policy.intro}</p>

      {policy.sections.map(([heading, body]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{body}</p>
        </section>
      ))}

      <p className="mk-policy__contact">
        Questions? Write to <a href="mailto:support@eduflow.ai">support@eduflow.ai</a>.
      </p>
    </article>
  );
}
