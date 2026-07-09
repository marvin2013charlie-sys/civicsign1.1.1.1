import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { restoreSession } from "@/lib/api";
import {
  clearTokens,
  setAccessToken,
  getAccessToken,
  purgeLegacyTokenStorage,
} from "@/lib/tokenStore";
import { getAppOrigin } from "@/lib/appOrigin";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // null = checking, false = not authenticated, object = authenticated
  const [user, setUser] = useState(null);
  const [impersonation, setImpersonation] = useState(null);

  useEffect(() => {
    purgeLegacyTokenStorage();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const data = await restoreSession();
      if (data) {
        setUser(data);
        setImpersonation(null);
      } else {
        setUser(false);
        setImpersonation(null);
        clearTokens();
      }
    } catch {
      setUser(false);
      setImpersonation(null);
      clearTokens();
    }
  }, []);

  useEffect(() => {
    let active = true;
    getAccessToken();
    (async () => {
      try {
        const data = await restoreSession();
        if (!active) return;
        if (data) {
          setUser(data);
          setImpersonation(null);
        } else {
          setUser(false);
          setImpersonation(null);
          clearTokens();
        }
      } catch {
        if (active) {
          setUser(false);
          setImpersonation(null);
          clearTokens();
        }
      }
    })();
    return () => { active = false; };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    clearTokens();
    setImpersonation(null);
    if (data.access_token) setAccessToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    return data;
  };

  const verifyEmail = async (email, code) => {
    const { data } = await api.post("/auth/verify-email", { email, code });
    clearTokens();
    setImpersonation(null);
    if (data.access_token) setAccessToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const resendVerification = async (email) => {
    const { data } = await api.post("/auth/resend-verification", { email });
    return data;
  };

  const forgotPassword = async (email) => {
    const { data } = await api.post("/auth/forgot-password", {
      email, base_url: getAppOrigin(),
    });
    return data;
  };

  const setSession = (userObj, token) => {
    if (token) setAccessToken(token);
    setUser(userObj);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    clearTokens();
    setImpersonation(null);
    setUser(false);
  };

  const startImpersonation = (targetUser, token) => {
    // Bearer overrides the admin's HttpOnly cookie on the backend.
    setAccessToken(token);
    setImpersonation({
      user_id: targetUser.user_id,
      name: targetUser.name || "",
      email: targetUser.email,
    });
    setUser(targetUser);
  };

  const stopImpersonation = async () => {
    clearTokens();
    setImpersonation(null);
    try {
      const data = await restoreSession();
      if (data && (data.role === "admin" || data.role === "staff")) {
        setUser(data);
        return { ok: true, user: data };
      }
    } catch {
      /* admin cookie may have expired */
    }
    setUser(false);
    return { ok: false };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        register,
        verifyEmail,
        resendVerification,
        forgotPassword,
        logout,
        checkAuth,
        setSession,
        impersonation,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};