import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const UI_VERSION_KEY = 'eduflow_ui_version';

const UIVersionContext = createContext({
  uiVersion: 'v1',
  setUIVersion: () => {},
});

export function UIVersionProvider({ children }) {
  const [uiVersion, setUIVersionState] = useState(() => {
    try {
      return localStorage.getItem(UI_VERSION_KEY) || 'v1';
    } catch {
      return 'v1';
    }
  });

  const setUIVersion = useCallback((version) => {
    try {
      localStorage.setItem(UI_VERSION_KEY, version);
    } catch {}
    setUIVersionState(version);
  }, []);

  // Apply data-ui-version attribute to <html> so CSS can scope styles
  useEffect(() => {
    document.documentElement.setAttribute('data-ui-version', uiVersion);
  }, [uiVersion]);

  return (
    <UIVersionContext.Provider value={{ uiVersion, setUIVersion }}>
      {children}
    </UIVersionContext.Provider>
  );
}

export function useUIVersion() {
  return useContext(UIVersionContext);
}

export default UIVersionContext;
