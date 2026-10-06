import React, { createContext, useContext } from 'react';

/**
 * Lightweight auth state shared by the public marketplace pages and the console.
 * The provider lives in App.jsx so login/logout/role-switch are reflected
 * everywhere without prop drilling through the router outlet.
 */
const AuthContext = createContext(null);

export function AuthProvider({ value, children }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
