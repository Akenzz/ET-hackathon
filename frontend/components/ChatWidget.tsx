"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Languages } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, open]);

  async function handleSend() {
    if (!input.trim() || !stationId || sending) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim(), timestamp: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    try {
      const res = await postChat(userMsg.content, stationId, language);
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
        <div className="flex h-[28rem] w-80 flex-col overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-bg-elevated-2 px-3.5 py-2.5">
            <div>
              <p className="text-sm font-semibold text-fg">Air quality copilot</p>
              <p className="text-[11px] text-fg-faint">{stationName || "Select a station"}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 rounded-md border border-border bg-navy/40 px-1.5 py-1 text-[10px]">
                <Languages size={11} className="text-fg-faint" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-transparent text-fg-muted outline-none"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="bg-bg-elevated-2">{l.label}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-fg-faint hover:bg-bg-elevated-2 hover:text-fg">
                <X size={16} />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="mt-6 text-center text-xs text-fg-faint">
                Ask something like &ldquo;is it safe for my dad to walk outside this evening?&rdquo;
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={
                    "max-w-[85%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed " +
                    (m.role === "user" ? "bg-teal/25 text-fg" : "bg-bg-elevated-2 text-fg-muted")
                  }
                >
                  <p>{m.content}</p>
                  {m.sources && m.sources.length > 0 && (
                    <p className="mt-1.5 border-t border-border/60 pt-1.5 text-[10px] text-fg-faint">
                      Sources: {m.sources.map((s) => s.title).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-bg-elevated-2 px-3 py-2 text-[12.5px] text-fg-faint">Typing…</div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border p-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={!stationId}
              placeholder={stationId ? "Ask about air quality…" : "Select a station first"}
              className="flex-1 rounded-md border border-border bg-navy/40 px-2.5 py-1.5 text-xs text-fg placeholder:text-fg-faint outline-none focus:border-teal disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!stationId || !input.trim() || sending}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-teal text-navy transition-opacity disabled:opacity-40"
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo text-fg shadow-lg transition-transform hover:scale-105"
        aria-label="Toggle air quality chat"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>
  );
}
