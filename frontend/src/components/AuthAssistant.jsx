import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bot, Sparkles, SendHorizonal, Loader2, ChevronDown, ChevronUp, KeyRound, MailCheck, UserPlus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApi } from "@/lib/api";
import { getAuthNext, nextQueryString } from "@/lib/authPortal";
import { AssistantMessage } from "@/components/AssistantMessage";

const GREETINGS = {
  login: "Hi, I'm your Sign-in Copilot. Ask about logging in, verification, passwords, or rate limits.",
  register: "Welcome! Ask me about password rules, verification, or what happens after you sign up.",
  verify: "Need help with your 6-digit code? I can guide you through verification.",
  forgot: "I'll help you get a reset link and explain how recovery works.",
  reset: "Ask me about password requirements or expired reset links.",
};

const SUGGESTIONS = {
  login: [
    "I can't log in",
    "Too many attempts",
    "How do I verify my email?",
    "What are the plan prices?",
    "Is my account secure?",
  ],
  register: [
    "What are the password rules?",
    "Is the free plan really free?",
    "How many documents on Free?",
    "What happens after I register?",
  ],
  verify: [
    "Code didn't arrive",
    "How long is the code valid?",
    "Can I use a different email?",
  ],
  forgot: [
    "How long is the reset link valid?",
    "I didn't get the email",
    "What password should I use?",
  ],
  reset: [
    "What are the password rules?",
    "My link expired",
    "Check my password strength: Admin123@",
  ],
};

const QUICK_ACTIONS = {
  login: [
    { label: "Forgot password", icon: KeyRound, to: (next) => `/forgot-password${nextQueryString(next)}` },
    { label: "Create account", icon: UserPlus, to: (next) => `/register${nextQueryString(next)}` },
  ],
  register: [
    { label: "Sign in instead", icon: UserPlus, to: (next) => `/login${nextQueryString(next)}` },
  ],
  verify: [
    { label: "Back to sign in", icon: MailCheck, to: (next) => `/login${nextQueryString(next)}` },
  ],
  forgot: [
    { label: "Back to sign in", icon: KeyRound, to: (next) => `/login${nextQueryString(next)}` },
  ],
  reset: [
    { label: "Request new link", icon: ShieldAlert, to: () => "/forgot-password" },
  ],
};

export function AuthAssistant({ context = "login" }) {
  const [params] = useSearchParams();
  const next = getAuthNext(params);
  const ctx = GREETINGS[context] ? context : "login";

  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: GREETINGS[ctx] }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    setMessages([{ role: "assistant", content: GREETINGS[ctx] }]);
    setInput("");
  }, [ctx]);

  useEffect(() => {
    if (expanded) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, expanded]);

  const send = async (preset) => {
    const text = (preset ?? input).trim();
    if (!text || loading) return;
    const nextMsgs = [...messages, { role: "user", content: text }];
    setMessages(nextMsgs);
    setInput("");
    setExpanded(true);
    setLoading(true);
    try {
      const history = nextMsgs.slice(1, -1).map((m) => ({ role: m.role, content: m.content }));
      const { data } = await publicApi.post("/assistant/auth-chat", {
        message: text,
        history,
        context: ctx,
      });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "I'm having trouble connecting right now. Try the quick links below, or use Forgot password / Resend code on this page.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const actions = QUICK_ACTIONS[ctx] || [];

  return (
    <div
      className="mt-6 overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--card)] shadow-sm"
      data-testid="auth-assistant"
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--c-paper-2)]"
        data-testid="auth-assistant-toggle"
        aria-expanded={expanded}
      >
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--c-ink-solid)", boxShadow: "0 8px 20px rgba(18,33,32,.2)" }}
        >
          <Bot className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-heading text-sm font-semibold text-[var(--c-ink)]">
            Sign-in Copilot
            <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--c-primary)" }} />
          </p>
          <p className="truncate text-xs text-[var(--c-muted-fg)]">AI help for account access</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-[var(--c-muted-fg)]" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--c-muted-fg)]" />
        )}
      </button>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-[var(--c-border)] px-4 py-2.5">
          {actions.map(({ label, icon: Icon, to }) => (
            <Link
              key={label}
              to={to(next)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--c-paper)] px-3 py-1 text-xs font-medium text-[var(--c-ink)] transition-colors hover:border-[var(--c-primary)] hover:text-[var(--c-primary)]"
              data-testid={`auth-assistant-action-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </Link>
          ))}
        </div>
      )}

      {expanded && (
        <div className="border-t border-[var(--c-border)]">
          <div className="max-h-56 space-y-2.5 overflow-y-auto px-4 py-3 cs-scroll" data-testid="auth-assistant-messages">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[92%] rounded-2xl px-3 py-2 text-xs leading-relaxed sm:text-sm ${
                    m.role === "user"
                      ? "whitespace-pre-wrap rounded-br-sm text-white"
                      : "rounded-bl-sm text-[var(--c-ink)]"
                  }`}
                  style={
                    m.role === "user"
                      ? { background: "var(--c-primary)" }
                      : { background: "var(--c-paper-2)" }
                  }
                >
                  {m.role === "assistant" ? <AssistantMessage content={m.content} /> : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-[var(--c-paper-2)] px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--c-muted-fg)]" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-[var(--c-border)] px-4 py-2">
            {(SUGGESTIONS[ctx] || SUGGESTIONS.login).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={loading}
                className="rounded-full border border-[var(--c-border)] px-2.5 py-0.5 text-[11px] text-[var(--c-muted-fg)] transition-colors hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)]"
                data-testid="auth-assistant-suggestion"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex gap-2 border-t border-[var(--c-border)] p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about sign-in, passwords, verification…"
              className="h-9 text-sm"
              data-testid="auth-assistant-input"
              disabled={loading}
            />
            <Button
              type="button"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              data-testid="auth-assistant-send"
              style={{ background: "var(--c-primary)", color: "#fff" }}
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}