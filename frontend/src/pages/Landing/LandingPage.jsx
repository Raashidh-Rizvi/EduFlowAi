import React from 'react';
import { ArrowRight, BrainCircuit, Users, Bot, CheckCircle2, TrendingUp, Clock, Target, Star, PlayCircle, Smartphone } from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';
import RoleSwitcher from '../../components/common/RoleSwitcher';

export default function LandingPage({ onLoginClick, currentUser, onSwitchRole }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-canvas)',
      backgroundImage: 'var(--body-gradient)',
      color: 'var(--text-main)',
      fontFamily: 'var(--font-display)',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Decorative background blurs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-5%',
        width: '40vw',
        height: '40vw',
        background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(255,255,255,0) 70%)',
        filter: 'blur(60px)',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '-10%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(255,255,255,0) 70%)',
        filter: 'blur(80px)',
        zIndex: 0
      }}></div>

      {/* Navigation Header */}
      <header className="landing-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '24px',
        paddingBottom: '24px',
        position: 'relative',
        zIndex: 10,
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BrainCircuit size={28} color="var(--primary)" />
          <span style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
            EduFlow<span style={{ color: 'var(--primary)' }}>.Ai</span>
          </span>
        </div>

        {/* Direct Role Redirection Switcher */}
        <RoleSwitcher 
          currentRole={currentUser?.role || null} 
          onSwitchRole={onSwitchRole} 
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={onLoginClick}
            className="btn-primary" 
            style={{ 
              borderRadius: 'var(--radius-full)', 
              padding: '12px 24px', 
              fontSize: '14px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              border: 'none',
              boxShadow: 'var(--shadow-primary-sm)'
            }}>
            {currentUser ? 'Return to Console' : 'Try Now'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="landing-container fade-in" style={{ position: 'relative', zIndex: 10, paddingTop: '80px', paddingBottom: '120px' }}>
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
          
          <div className="glass-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', marginBottom: '32px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }}></span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Next-Gen Learning Platform</span>
          </div>

          <h1 style={{ fontSize: '64px', lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.04em', marginBottom: '24px' }}>
            Transform <span className="glass-badge" style={{ padding: '4px 16px', margin: '0 8px', display: 'inline-flex', alignItems: 'center', gap: '8px', verticalAlign: 'middle', background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.1) 100%)' }}>
              <BrainCircuit size={40} color="var(--primary)" />
            </span> Your <br />
            Institution With <span className="text-gradient">AI Agents</span>
          </h1>

          <p style={{ fontSize: '18px', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto 48px auto' }}>
            AI tutors and orchestrators working 24/7, ready to boost student engagement and success without breaks, vacations, or errors.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
             <button onClick={onLoginClick} className="btn-primary hover-scale" style={{ padding: '16px 32px', fontSize: '16px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', border: 'none', boxShadow: 'var(--shadow-primary-sm)' }}>
               {currentUser ? 'Return to Console' : 'Get Started Free'} <ArrowRight size={18} />
             </button>
             <button className="glass-badge hover-scale" style={{ padding: '16px 32px', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.8)' }}>
               <PlayCircle size={18} color="var(--primary)" /> Watch Demo
             </button>
          </div>

          {/* Floating UI Elements matching the image aesthetic */}
          <div className="glass-panel-heavy" style={{ position: 'absolute', top: '150px', left: '-80px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', marginRight: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', border: '2px solid white', zIndex: 3 }}></div>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--secondary)', border: '2px solid white', marginLeft: '-12px', zIndex: 2 }}></div>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent)', border: '2px solid white', marginLeft: '-12px', zIndex: 1 }}></div>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700' }}>10k+ Users</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active students</div>
            </div>
          </div>

          <div className="glass-panel-heavy" style={{ position: 'absolute', top: '20px', right: '-120px', padding: '24px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '4px dashed var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>24/7</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>Automated</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Service & Tutoring</div>
          </div>
        </div>
      </main>

      {/* Results Section */}
      <section id="results" className="landing-container fade-in-delayed" style={{ position: 'relative', zIndex: 10, paddingBottom: '120px' }}>
        <h2 style={{ fontSize: '40px', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '48px', maxWidth: '400px' }}>
          Proven Results For Your <span className="text-gradient">Institution</span>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) 1.2fr', gap: '24px' }}>
          <div className="glass-panel-heavy hover-scale" style={{ padding: '32px', background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(245,243,255,0.9) 100%)' }}>
            <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--primary)', marginBottom: '16px' }}>95%</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Up to 95% automated support</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>AI handles simple and repetitive tasks, freeing up your team to focus on more strategic activities.</p>
          </div>

          <div className="glass-panel-heavy hover-scale" style={{ padding: '32px', background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(245,243,255,0.9) 100%)' }}>
            <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--primary)', marginBottom: '16px' }}>78%</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Up to 78% increase in course completion</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>AI ensures automatic and personalized scheduling, optimizing student-to-tutor conversion.</p>
          </div>

          <div className="glass-panel-heavy hover-scale" style={{ padding: '32px', background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(245,243,255,0.9) 100%)' }}>
            <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--primary)', marginBottom: '16px' }}>89%</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Up to 89% savings on operational costs</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>With automation, your institution reduces personnel costs and eliminates human errors.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '32px' }}>
            <h3 style={{ fontSize: '28px', fontWeight: '800', lineHeight: '1.2', marginBottom: '24px' }}>
              See How Your Institution Can Achieve These Results
            </h3>
            <button onClick={onLoginClick} className="btn-primary" style={{ padding: '16px 24px', fontSize: '15px', borderRadius: 'var(--radius-full)', background: 'var(--primary)', border: 'none', alignSelf: 'flex-start' }}>
              Speak To A Specialist Now!
            </button>
          </div>
        </div>
      </section>

      {/* Automate Section */}
      <section className="landing-container fade-in-delayed" style={{ position: 'relative', zIndex: 10, paddingBottom: '120px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ maxWidth: '500px' }}>
          <h2 style={{ fontSize: '40px', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '24px' }}>
            Automate Your Institution <span className="text-gradient">Simply And Efficiently</span>
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '32px' }}>
            Our AI agents are always available to act, 24 hours a day, 7 days a week. They operate across multiple channels to ensure your students always have answers.
          </p>
          
          <div className="glass-panel-heavy" style={{ display: 'inline-flex', alignItems: 'center', gap: '24px', padding: '24px', borderRadius: '24px' }}>
             <div>
               <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>Download our mobile app</div>
               <div style={{ display: 'flex', gap: '12px' }}>
                 <div className="glass-badge" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                   <Smartphone size={20} /> App Store
                 </div>
                 <div className="glass-badge" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                   <PlayCircle size={20} /> Google Play
                 </div>
               </div>
             </div>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          {/* Stylized Mockup container */}
          <div className="glass-panel-heavy" style={{ width: '300px', height: '600px', borderRadius: '40px', border: '8px solid rgba(255,255,255,0.9)', padding: '16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ background: 'var(--bg-canvas)', height: '100%', borderRadius: '24px', padding: '24px', position: 'relative' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <Bot size={48} color="var(--primary)" style={{ margin: '0 auto 12px auto' }} />
                <div style={{ fontWeight: '700' }}>EduFlow Assistant</div>
                <div style={{ fontSize: '12px', color: 'var(--success)' }}>Online</div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(139,92,246,0.1)', padding: '12px', borderRadius: '12px 12px 12px 0', fontSize: '13px' }}>
                  Hello! How can I help you with your computer science module today?
                </div>
                <div style={{ background: 'rgba(59,130,246,0.1)', padding: '12px', borderRadius: '12px 12px 0 12px', fontSize: '13px', alignSelf: 'flex-end' }}>
                  I need help understanding Big O notation.
                </div>
                <div style={{ background: 'rgba(139,92,246,0.1)', padding: '12px', borderRadius: '12px 12px 12px 0', fontSize: '13px' }}>
                  Big O notation is used to describe the performance or complexity of an algorithm. Let me break it down into simpler terms with some examples...
                </div>
              </div>
            </div>
          </div>
          
          <div className="glass-badge" style={{ position: 'absolute', top: '100px', left: '-100px', padding: '12px 24px', transform: 'rotate(-5deg)' }}>
            <span style={{ fontWeight: '800', color: 'var(--primary)' }}>TUTORING</span>
          </div>
        </div>
      </section>

    </div>
  );
}
