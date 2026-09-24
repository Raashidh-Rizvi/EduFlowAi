import React from 'react';
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('[React Error Boundary Caught Error]', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-canvas)',
          color: 'var(--text-main)',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-subtle)',
            maxWidth: '600px',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <AlertCircle size={48} color="var(--error)" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Something went wrong.</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              An unexpected error occurred in the application interface. The engineering team has been notified via logs.
            </p>
            <div style={{ 
              backgroundColor: 'var(--bg-card)', 
              padding: '16px', 
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
              overflowX: 'auto',
              marginBottom: '24px'
            }}>
              <code style={{ color: 'var(--error)', fontSize: '12px' }}>
                {this.state.error && this.state.error.toString()}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                backgroundColor: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
