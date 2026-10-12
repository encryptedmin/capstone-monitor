import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi, terminateSession, tokenStore } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!tokenStore.access) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      // A session from before email-login has no `email`: drop it and sign in again.
      if (!data?.email) {
        tokenStore.clear();
        setUser(null);
        return;
      }
      setUser(data);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const handlePageHide = () => {
      if (window.location.pathname === "/admin/report") {
        tokenStore.clear();
        return;
      }
      terminateSession();
      tokenStore.clear();
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  const login = async (email, password) => {
    const { data } = await authApi.login(email, password);
    tokenStore.set(data.access, data.refresh);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    const refresh = tokenStore.refresh;
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        // Local cleanup still wins if the network disappears during sign-out.
      }
    }
    setUser(null);
    tokenStore.clear();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
