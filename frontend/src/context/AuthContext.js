import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

const IMP_KEY = "cs_impersonation";       // metadata about who we're impersonating
const ADMIN_TOKEN_KEY = "cs_admin_token";  // the admin's own token, parked during impersonation

function readImpersonation() {
  try {
    const raw = localStorage.getItem(IMP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // null = checking, false = not authenticated, object = authenticated
  const [user, setUser] = useState(null);
  // Metadata about the user currently being impersonated (null when not impersonating)
  const [impersonation, setImpersonation] = useState(() => readImpersonation());

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    }
  }, []);

  useEffect(() => {
    // If returning from Google OAuth, let AuthCallback exchange the session first.
    if (window.location.hash && window.location.hash.includes("session_id=")) {
      return;
    }
    let active = true;
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        if (active) setUser(data);
      } catch {
        if (active) setUser(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.access_token) localStorage.setItem("cs_token", data.access_token);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    // Registration now requires email verification before a session is issued.
    const { data } = await api.post("/auth/register", { name, email, password });
    return data; // { verification_required, email, dev_mode, dev_code }
  };

  const verifyEmail = async (email, code) => {
    const { data } = await api.post("/auth/verify-email", { email, code });
    if (data.access_token) localStorage.setItem("cs_token", data.access_token);
    setUser(data.user);
    return data;
  };

  const resendVerification = async (email) => {
    const { data } = await api.post("/auth/resend-verification", { email });
    return data;
  };

  const forgotPassword = async (email) => {
    const { data } = await api.post("/auth/forgot-password", {
      email, base_url: window.location.origin,
    });
    return data;
  };

  const setSession = (userObj, token) => {
    if (token) localStorage.setItem("cs_token", token);
    setUser(userObj);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    localStorage.removeItem("cs_token");
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(IMP_KEY);
    setImpersonation(null);
    setUser(false);
  };

  // ---- Impersonation -------------------------------------------------------
  // Park the admin's token, swap in the impersonation token (sent as the Bearer
  // header which the backend prioritises over the admin's cookie), and adopt the
  // target user's identity in the UI.
  const startImpersonation = (targetUser, token) => {
    const adminToken = localStorage.getItem("cs_token");
    if (adminToken) localStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    const info = {
      user_id: targetUser.user_id,
      name: targetUser.name || "",
      email: targetUser.email,
    };
    localStorage.setItem(IMP_KEY, JSON.stringify(info));
    localStorage.setItem("cs_token", token);
    setImpersonation(info);
    setUser(targetUser);
  };

  // Restore the admin's token and identity, then drop the impersonation context.
  // Callers should hard-redirect afterwards so the app re-initialises cleanly.
  const stopImpersonation = () => {
    const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (adminToken) localStorage.setItem("cs_token", adminToken);
    else localStorage.removeItem("cs_token");
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(IMP_KEY);
    setImpersonation(null);
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

export const useAuth = () => useContext(AuthContext);
