"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Languages, Sparkles, WandSparkles, ChevronRight } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { postChat } from "@/lib/api";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "kn", label: "ಕನ್ನಡ" },
];

export default function ChatWidget(props: { stationId: string | null; stationName?: string }) {
  const { stationId, stationName } = props;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("en");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [everOpened, setEverOpened] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "Is it safe to go for a walk this evening?",
    "What is driving the pollution here?",
    "Give me a simple health advisory.",
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, open]);

  // One-time discoverability nudge: a small speech-bubble callout appears
  // a few seconds after load, then dismisses itself. Never reappears once
  // the chat has been opened.
  useEffect(() => {
    if (everOpened) return;
    const showTimer = window.setTimeout(() => setShowNudge(true), 2500);
    const hideTimer = window.setTimeout(() => setShowNudge(false), 9000);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [everOpened]);

  function toggleOpen() {
    setOpen((o) => !o);
    setEverOpened(true);
    setShowNudge(false);
  }

  function sendQuickPrompt(prompt: string) {
    setInput(prompt);
  }

  async function handleSend() {
    if (!input.trim() || !stationId || sending) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim(), timestamp: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    try {
      const res = await postChat(userMsg.content, stationId, language, sessionId ?? undefined);
      setSessionId(res.session_id ?? sessionId);
      setMessages((m) => [...m, {
        role: "assistant", content: res.response, sources: res.sources, timestamp: new Date().toISOString(),
      }]);
    } catch {
      setMessages((m) => [...m, {
        role: "assistant",
        content: "Sorry, I couldn't reach the advisory service just now. Try again in a moment.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[1000] flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[34rem] w-[24rem] flex-col overflow-hidden rounded-[1.75rem] border border-border/80 bg-bg-elevated/96 shadow-[0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="relative overflow-hidden border-b border-border/80 bg-linear-to-br from-bg-elevated-2 via-bg-elevated to-bg-elevated-2 px-4 py-4">
            <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "radial-gradient(circle at 15% 0%, rgba(39,230,236,0.18), transparent 38%), radial-gradient(circle at 100% 20%, rgba(111,113,161,0.16), transparent 34%)" }} />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-cyan">
                  <WandSparkles size={11} />
                  Air quality copilot
                </div>
                <p className="mt-1 truncate text-base font-semibold text-fg">{stationName || "Select a station"}</p>
                <p className="mt-1 text-xs leading-5 text-fg-faint">Ask for a plain-language explanation, a safety check, or a source breakdown.</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 rounded-full border border-border/80 bg-navy/35 px-2.5 py-1.5 text-[10px] text-fg-muted shadow-sm">
                  <Languages size={11} className="text-fg-faint" />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-transparent text-fg-muted outline-none"
                    aria-label="Chat language"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code} className="bg-bg-elevated-2">{l.label}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => setOpen(false)} className="rounded-full border border-border/70 bg-bg-elevated-2/75 p-2 text-fg-faint transition-colors hover:bg-bg-elevated-2 hover:text-fg" aria-label="Close chat">
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          {messages.length === 0 && (
            <div className="border-b border-border/70 bg-bg-elevated-2/35 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-fg-faint">Quick prompts</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendQuickPrompt(prompt)}
                    className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-bg-elevated px-3 py-1.5 text-[11px] text-fg-muted transition-colors hover:border-teal/40 hover:text-fg"
                  >
                    <ChevronRight size={11} className="text-teal" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-bg-elevated-2/40 p-4 shadow-inner">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-fg-faint">
                  <Sparkles size={11} className="text-cyan" />
                  Start here
                </div>
                <p className="mt-2 text-sm leading-6 text-fg-muted">
                  Ask in normal language. Example: “Is it safe for my dad to walk outside this evening?”
                </p>
              </div>
            )}

            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div key={i} className={"flex " + (isUser ? "justify-end" : "justify-start")}>
                  <div
                    className={
                      "max-w-[88%] rounded-[1.4rem] px-3.5 py-3 text-sm leading-6 shadow-sm ring-1 ring-inset " +
                      (isUser
                        ? "bg-linear-to-br from-teal/25 to-teal/12 text-fg ring-teal/25"
                        : "bg-bg-elevated-2/90 text-fg-muted ring-border/60")
                    }
                  >
                    <p>{m.content}</p>
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-2 border-t border-border/60 pt-2">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-fg-faint">Sources</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {m.sources.map((source) => (
                            <span
                              key={source}
                              className="rounded-full border border-border/70 bg-bg-elevated px-2 py-0.5 text-[10px] text-fg-muted"
                            >
                              {source}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-[1.2rem] border border-border/70 bg-bg-elevated-2/90 px-3.5 py-3 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan" />
                  <span className="pl-1 text-[11px] text-fg-faint">Thinking…</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/80 bg-bg-elevated-2/45 p-3.5">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={!stationId || sending}
                placeholder={stationId ? "Ask about air quality…" : "Select a station first"}
                className="flex-1 rounded-full border border-border bg-navy/35 px-4 py-2.5 text-sm text-fg placeholder:text-fg-faint outline-none transition-colors focus:border-teal disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!stationId || !input.trim() || sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal text-navy transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal/20 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {!open && showNudge && (
        <div className="mr-1 max-w-[13rem] rounded-2xl rounded-br-sm border border-cyan/25 bg-bg-elevated-2/95 px-3.5 py-2.5 text-sm leading-snug text-fg-muted shadow-xl backdrop-blur-xl">
          <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan">
            <Sparkles size={10} />
            New
          </span>
          Ask the air quality copilot anything about a station.
        </div>
      )}

      <button
        onClick={toggleOpen}
        className={
          "relative flex items-center gap-2 rounded-full border border-cyan/20 bg-linear-to-r from-indigo via-teal/80 to-cyan/80 text-fg shadow-xl transition-all hover:scale-105 hover:shadow-2xl " +
          (open
            ? "h-12 w-12 justify-center"
            : "h-12 pl-4 pr-5")
        }
        aria-label="Toggle air quality chat"
      >
        {open ? (
          <X size={20} />
        ) : (
          <>
            <MessageCircle size={19} />
            <span className="text-[13px] font-semibold">Ask about air quality</span>
          </>
        )}
      </button>
    </div>
  );
}