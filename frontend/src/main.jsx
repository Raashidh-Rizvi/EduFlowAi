import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext';
import { UIVersionProvider } from './context/UIVersionContext';
import ErrorBoundary from './components/layout/ErrorBoundary';
import './index.css';
import './styles/marketplace.css';
import './styles/theme-v2.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <UIVersionProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </UIVersionProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
