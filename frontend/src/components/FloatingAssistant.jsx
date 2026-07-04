import React, { useEffect, useRef, useState } from "react";
import { Bot, X, SendHorizonal, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

const GREETING = {
  role: "assistant",
  content:
    "Hi! I'm the CivicSign Assistant. Ask me about e-signing, our UK plans (Free \u00a30, Pro \u00a315/mo, Business \u00a349/mo), or how electronic signatures work under UK law.",
};

const SUGGESTIONS = [
  "Are e-signatures legal in the UK?",
  "What's included in each plan?",
  "How do I send a document for signature?",
];

export const FloatingAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(
    () => !localStorage.getItem("cs_cookie_consent")
  );
  const endRef = useRef(null);

  useEffect(() => {
    const onConsent = () => setBannerVisible(false);
    window.addEventListener("cs-cookie-consent", onConsent);
    return () => window.removeEventListener("cs-cookie-consent", onConsent);
  }, []);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  const send = async (preset) => {
    const text = (preset ?? input).trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const history = next.slice(1, -1).map((m) => ({ role: m.role, content: m.content }));
      const { data } = await api.post("/assistant/chat", { message: text, history });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't respond right now. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Launcher button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        data-testid="floating-assistant-toggle"
        className={`fixed ${bannerVisible ? "bottom-[190px] sm:bottom-28" : "bottom-5"} right-5 z-[300] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-[bottom,transform] duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
        style={{ background: "var(--c-primary)", boxShadow: "0 10px 30px rgba(20,184,166,0.4)" }}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          data-testid="floating-assistant-panel"
          className={`fixed ${bannerVisible ? "bottom-[270px] sm:bottom-[184px] h-[min(560px,calc(100vh-290px))] sm:h-[min(560px,calc(100vh-204px))]" : "bottom-24 h-[min(560px,75vh)]"} right-5 z-[300] flex w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-paper)] shadow-2xl`}
          style={{ animation: "cs-pop 200ms ease-out" }}
        >
          <div className="flex items-center gap-2 border-b border-[var(--c-border)] px-4 py-3" style={{ background: "var(--c-ink-solid)" }}>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--c-primary)" }}>
              <Bot className="h-4 w-4 text-white" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">CivicSign Assistant</p>
              <p className="text-xs text-white/60">AI help · UK e-signatures</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" data-testid="floating-assistant-close"
              className="rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 cs-scroll" data-testid="floating-assistant-messages">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${m.role === "user" ? "rounded-br-sm text-white" : "rounded-bl-sm text-[var(--c-ink)]"}`}
                  style={m.role === "user" ? { background: "var(--c-primary)" } : { background: "var(--c-paper-2)" }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-[var(--c-paper-2)] px-3.5 py-2 text-sm text-[var(--muted-foreground)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} data-testid="floating-assistant-suggestion"
                  className="rounded-full border border-[var(--c-border)] px-3 py-1 text-xs text-[var(--muted-foreground)] transition-colors hover:bg-[var(--c-paper-2)] hover:text-[var(--c-ink)]">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-[var(--c-border)] p-3">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown}
              placeholder="Ask the assistant…" data-testid="floating-assistant-input" />
            <Button onClick={() => send()} disabled={loading || !input.trim()} data-testid="floating-assistant-send"
              style={{ background: "var(--c-primary)", color: "#fff" }}>
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
