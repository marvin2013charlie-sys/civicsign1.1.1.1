import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from "react";
import { useLocation } from "react-router-dom";
import api, { restoreSession, AUTH_TIMEOUT_MS } from "@/lib/api";
import {
  clearTokens,
  setAccessToken,
  getAccessToken,
  purgeLegacyTokenStorage,
} from "@/lib/tokenStore";
import { getAppOrigin } from "@/lib/appOrigin";

const AuthContext = createContext(null);

const PORTAL_ROOTS = [
  "/dashboard", "/admin", "/prepare", "/send", "/envelope", "/documents",
  "/templates", "/contacts", "/manage-pdf", "/reports", "/usage",
  "/organisation", "/settings", "/new",
];

function isPortalPath(path) {
  return PORTAL_ROOTS.some((root) => path === root || path.startsWith(`${root}/`));
}

export function AuthProvider({ children }) {
  // null = checking, false = not authenticated, object = authenticated
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [impersonation, setImpersonation] = useState(null);
  const location = useLocation();
  const checkStartedRef = useRef(false);
  const idleIdRef = useRef(null);
  const sessionCheckRef = useRef(null);

  useEffect(() => {
    purgeLegacyTokenStorage();
  }, []);

  const resolveSession = useCallback(async () => {
    sessionCheckRef.current?.abort();
    const controller = new AbortController();
    sessionCheckRef.current = controller;
    setAuthError(false);
    setAuthReady(false);
    try {
      const data = await restoreSession(controller.signal);
      if (controller.signal.aborted) return;
      if (data) {
        setUser(data);
        setImpersonation(data.impersonating_session ? { user_id: data.user_id, name: data.name, email: data.email } : null);
      } else {
        setUser(false);
        setImpersonation(null);
        clearTokens();
      }
    } catch {
      if (!controller.signal.aborted) setAuthError(true);
    } finally {
      if (!controller.signal.aborted) setAuthReady(true);
    }
  }, []);

  const startAuthCheck = useCallback(() => {
    if (checkStartedRef.current) return;
    checkStartedRef.current = true;
    if (idleIdRef.current != null) {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleIdRef.current);
      } else {
        window.clearTimeout(idleIdRef.current);
      }
      idleIdRef.current = null;
    }
    resolveSession();
  }, [resolveSession]);

  useEffect(() => {
    if (authReady) return undefined;

    // Begin the session request immediately while the visitor fills in the form.
    if (isPortalPath(location.pathname) || ["/login", "/register", "/verify-email"].includes(location.pathname)) {
      startAuthCheck();
      return undefined;
    }

    if (checkStartedRef.current) return undefined;

    if (typeof window.requestIdleCallback === "function") {
      idleIdRef.current = window.requestIdleCallback(() => { startAuthCheck(); }, { timeout: 1500 });
    } else {
      idleIdRef.current = window.setTimeout(() => { startAuthCheck(); }, 0);
    }

    return () => {
      if (idleIdRef.current == null) return;
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleIdRef.current);
      } else {
        window.clearTimeout(idleIdRef.current);
      }
      idleIdRef.current = null;
    };
  }, [location.pathname, authReady, startAuthCheck]);

  const checkAuth = useCallback(async () => {
    checkStartedRef.current = true;
    await resolveSession();
  }, [resolveSession]);

  const login = async (email, password) => {
    sessionCheckRef.current?.abort();
    checkStartedRef.current = true;
    setAuthReady(true);
    // Allow the hosted API to wake up, while keeping a bounded timeout.
    const { data } = await api.post(
      "/auth/login",
      { email, password },
      { timeout: AUTH_TIMEOUT_MS },
    );
    clearTokens();
    setImpersonation(null);
    checkStartedRef.current = true;
    setAuthReady(true);
    setAuthError(false);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password, inviteCode) => {
    sessionCheckRef.current?.abort();
    checkStartedRef.current = true;
    setAuthReady(true);
    const { data } = await api.post(
      "/auth/register",
      {
        name,
        email,
        password,
        invite_code: inviteCode || undefined,
      },
      { timeout: AUTH_TIMEOUT_MS },
    );
    return data;
  };

  const verifyEmail = async (email, code) => {
    sessionCheckRef.current?.abort();
    checkStartedRef.current = true;
    setAuthReady(true);
    const { data } = await api.post("/auth/verify-email", { email, code });
    clearTokens();
    setImpersonation(null);
    checkStartedRef.current = true;
    setAuthReady(true);
    setAuthError(false);
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
    checkStartedRef.current = true;
    setAuthReady(true);
    setUser(userObj);
  };

  const logout = async () => {
    sessionCheckRef.current?.abort();
    checkStartedRef.current = true;
    setAuthReady(true);
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    clearTokens();
    setImpersonation(null);
    setUser(false);
    setAuthReady(true);
    checkStartedRef.current = true;
  };

  const startImpersonation = (targetUser) => {
    clearTokens();
    setImpersonation({
      user_id: targetUser.user_id,
      name: targetUser.name || "",
      email: targetUser.email,
    });
    checkStartedRef.current = true;
    setAuthReady(true);
    setUser(targetUser);
  };

  const stopImpersonation = async () => {
    clearTokens();
    setImpersonation(null);
    try {
      const { data } = await api.post("/auth/impersonation/exit");
      if (data?.user && (data.user.role === "admin" || data.user.role === "staff")) {
        setAuthError(false);
    setUser(data.user);
        setAuthReady(true);
        return { ok: true, user: data.user };
      }
      const restored = await restoreSession();
      if (restored && (restored.role === "admin" || restored.role === "staff")) {
        setUser(restored);
        setAuthReady(true);
        return { ok: true, user: restored };
      }
    } catch {
      /* admin cookie may have expired */
    }
    setUser(false);
    setAuthReady(true);
    return { ok: false };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        authError,
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