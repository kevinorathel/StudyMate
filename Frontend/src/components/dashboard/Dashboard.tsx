import * as React from "react";
import { DashboardHeader } from "./DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  // Sparkles,
  Send,
  MessageSquare,
  // ListChecks,
  // BookOpen,
} from "lucide-react";

/* =========================
   Types
========================= */
type Notebook = {
  id: string;
  title: string;
  subject?: string;
  createdAt?: string;
  lastUpdated?: string;
};

type Message = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  ts?: number;
};

type ViewKey = "summary" | "outline" | "flashcards";

type NotebookCitation = {
  id: string;
  sourceId: string;
  label: string;
  snippet: string;
};

type BulletPoint = {
  id: string;
  text: string;
  cite?: string;
};

type GlossaryEntry = {
  id: string;
  term: string;
  definition: string;
  cite?: string;
};

type ChecklistItem = {
  id: string;
  label: string;
  cite?: string;
};

type Flashcard = {
  id: string;
  front: string;
  back: string;
  cite?: string;
};

type BulletModule = {
  kind: "bullets";
  id: string;
  title: string;
  description?: string;
  bullets: BulletPoint[];
};

type GlossaryModule = {
  kind: "glossary";
  id: string;
  title: string;
  terms: GlossaryEntry[];
};

type ChecklistModule = {
  kind: "checklist";
  id: string;
  title: string;
  items: ChecklistItem[];
};

type FlashcardModule = {
  kind: "flashcards";
  id: string;
  title: string;
  cards: Flashcard[];
};

type ModuleContent =
  | BulletModule
  | GlossaryModule
  | ChecklistModule
  | FlashcardModule;

type ViewContent = {
  helperText?: string;
  modules: ModuleContent[];
};

type NotebookContent = {
  views: Record<ViewKey, ViewContent>;
  citations: Record<string, NotebookCitation>;
};

/* =========================
   Local Storage Keys
========================= */
const LS_KEYS = {
  NOTEBOOKS: "studymate.notebooks",
  SELECTED: "studymate.selectedNotebookIds",
  MESSAGES: "studymate.messagesBySession", // keyed by "session" of selected notebooks
  CONTENT: "studymate.contentByNotebook",
  NOTES: "studymate.notesByNotebook",
};

/* =========================
   Helpers
========================= */
const nowISO = () => new Date().toISOString();

// Stable key for a “chat session” = the selected notebook ids set.
function sessionKey(ids: string[]) {
  // sort for stable identity regardless of selection order
  return ids.slice().sort().join("|") || "none";
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function generateNotebookId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* =========================
   Dashboard
========================= */
export default function Dashboard() {
  // ----- Notebooks & selection (persisted) -----
  const [notebooks, setNotebooks] = React.useState<Notebook[]>(() =>
    loadJSON<Notebook[]>(LS_KEYS.NOTEBOOKS, [])
  );
  const [selectedNotebooks, setSelectedNotebooks] = React.useState<string[]>(
    () => loadJSON<string[]>(LS_KEYS.SELECTED, [])
  );

  React.useEffect(() => saveJSON(LS_KEYS.NOTEBOOKS, notebooks), [notebooks]);
  React.useEffect(
    () => saveJSON(LS_KEYS.SELECTED, selectedNotebooks),
    [selectedNotebooks]
  );

  // ----- Content by notebook (persisted). Empty by default (no mock). -----
  const [contentByNotebook, setContentByNotebook] = React.useState<
    Record<string, NotebookContent>
  >(() => loadJSON<Record<string, NotebookContent>>(LS_KEYS.CONTENT, {}));
  React.useEffect(
    () => saveJSON(LS_KEYS.CONTENT, contentByNotebook),
    [contentByNotebook]
  );

  // ----- Per-notebook notes (persisted) -----
  const [notesByNotebook, setNotesByNotebook] = React.useState<
    Record<string, string>
  >(() => loadJSON<Record<string, string>>(LS_KEYS.NOTES, {}));
  React.useEffect(
    () => saveJSON(LS_KEYS.NOTES, notesByNotebook),
    [notesByNotebook]
  );

  // ----- Messages by "session" (the set of selected notebooks) -----
  const [messagesBySession, setMessagesBySession] = React.useState<
    Record<string, Message[]>
  >(() => loadJSON<Record<string, Message[]>>(LS_KEYS.MESSAGES, {}));
  const session = sessionKey(selectedNotebooks);
  const messages = messagesBySession[session] ?? [];
  React.useEffect(
    () => saveJSON(LS_KEYS.MESSAGES, messagesBySession),
    [messagesBySession]
  );

  // ----- UI state -----
  const [chatInput, setChatInput] = React.useState("");
  const [isThinking, setIsThinking] = React.useState(false);
  const chatContainerRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    // Scroll to bottom on new message
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // ----- Actions -----
  const toggleNotebook = (id: string) => {
    setSelectedNotebooks((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  const handleAddNotebookClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleNotebookFileSelection = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      event.target.value = "";
      return;
    }

    const allowedExtensions = new Set(["pdf", "doc", "docx"]);
    const validFiles = files.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      return allowedExtensions.has(ext);
    });

    if (validFiles.length === 0) {
      event.target.value = "";
      return;
    }

    const newNotebooks: Notebook[] = validFiles.map((file) => {
      const iso = nowISO();
      return {
        id: generateNotebookId(),
        title: file.name,
        createdAt: iso,
        lastUpdated: iso,
      };
    });

    setNotebooks((prev) => [...prev, ...newNotebooks]);

    setContentByNotebook((prev) => {
      const next = { ...prev };
      newNotebooks.forEach(({ id }) => {
        if (!next[id]) {
          next[id] = {
            citations: {},
            views: {
              summary: { helperText: "No content yet.", modules: [] },
              outline: { helperText: "No content yet.", modules: [] },
              flashcards: { helperText: "No content yet.", modules: [] },
            },
          };
        }
      });
      return next;
    });

    setNotesByNotebook((prev) => {
      const next = { ...prev };
      newNotebooks.forEach(({ id }) => {
        if (next[id] === undefined) {
          next[id] = "";
        }
      });
      return next;
    });

    event.target.value = "";
  };

  const setMessagesForSession = React.useCallback(
    (sessionId: string, next: Message[]) => {
      setMessagesBySession((prev) => ({ ...prev, [sessionId]: next }));
    },
    []
  );

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const sessionId = sessionKey(selectedNotebooks);
    const userMsg: Message = {
      id: `${Date.now()}`,
      sender: "user",
      text: trimmed,
      ts: Date.now(),
    };
    setMessagesForSession(sessionId, [...messages, userMsg]);
    setChatInput("");
    setIsThinking(true);

    // Mock assistant reply. In real app, call your backend with selectedNotebooks + prompt.
    setTimeout(() => {
      const replyText =
        selectedNotebooks.length > 0
          ? `Answering with context from ${selectedNotebooks.length} notebook${
              selectedNotebooks.length > 1 ? "s" : ""
            } (IDs: ${selectedNotebooks.join(", ")}).`
          : "Select one or more notebooks from the left to contextualize the answer.";
      const assistant: Message = {
        id: `a-${Date.now()}`,
        sender: "assistant",
        text: replyText,
        ts: Date.now(),
      };
      setMessagesForSession(sessionId, [
        ...(messagesBySession[sessionId] ?? []),
        userMsg,
        assistant,
      ]);
      setIsThinking(false);
    }, 750);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isThinking) return;
    sendMessage(chatInput);
  };

  const handleSelectNotebookFromHeader = React.useCallback((id: string) => {
    setSelectedNotebooks((prev) => {
      const remainder = prev.filter((existing) => existing !== id);
      return [id, ...remainder];
    });
  }, []);

  // Merge content across selected notebooks for the right panel (very minimal for now).
  // Today we just show the FIRST selected notebook’s content; you can replace this with a real merge later.
  const primaryNotebookId = selectedNotebooks[0];
  // const primaryContent = primaryNotebookId
  //   ? contentByNotebook[primaryNotebookId]
  //   : undefined;
  const primaryNotebook: Notebook | null =
    notebooks.find((n) => n.id === primaryNotebookId) ?? null;

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-zinc-900 dark:bg-[#0f1015] dark:text-zinc-100 antialiased">
      <DashboardHeader
        onCreateNotebook={handleAddNotebookClick}
        createDisabled={isThinking}
        notebooks={notebooks.map((nb) => ({
          id: nb.id,
          title: nb.title,
          subject: nb.subject ?? "",
        }))}
        selectedNotebookId={primaryNotebookId ?? null}
        onSelectNotebook={handleSelectNotebookFromHeader}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        multiple
        onChange={handleNotebookFileSelection}
      />

      <main className="flex h-[calc(100vh-64px)] gap-4 p-4">
        {/* LEFT: Sources (multi-select) */}
        <div className="w-64 space-y-4">
          <Card className="h-fit rounded-2xl border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <div className="flex items-baseline justify-between">
                <CardTitle className="text-sm font-semibold">Sources</CardTitle>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Select multiple
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 px-3 pb-3 pt-2">
              {notebooks.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No notebooks yet
                </p>
              ) : (
                notebooks.map((nb) => (
                  <Button
                    key={nb.id}
                    variant={
                      selectedNotebooks.includes(nb.id) ? "default" : "outline"
                    }
                    size="sm"
                    className="rounded-full text-xs px-3 py-1"
                    onClick={() => toggleNotebook(nb.id)}
                    title={
                      nb.subject ? `${nb.title} • ${nb.subject}` : nb.title
                    }
                  >
                    {nb.title}
                  </Button>
                ))
              )}
            </CardContent>
          </Card>

          <Button
            className="w-full rounded-2xl"
            onClick={handleAddNotebookClick}
          >
            + Add Notebook
          </Button>
        </div>

        {/* CENTER: Smart QnA */}
        <div className="flex flex-1 flex-col space-y-4">
          <Card className="flex flex-1 flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                Smart QnA
              </div>
              {selectedNotebooks.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Using {selectedNotebooks.length} notebook
                  {selectedNotebooks.length > 1 ? "s" : ""}
                </p>
              )}
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-4">
              {/* Messages */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto space-y-3 rounded-xl border border-zinc-200 bg-[#f7f8fc] p-3 dark:border-zinc-700 dark:bg-[#161821]"
              >
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Start by adding a notebook on the left and asking a
                    question.
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex flex-col",
                        m.sender === "user" ? "items-end" : "items-start"
                      )}
                    >
                      <span className="text-xs uppercase text-zinc-400">
                        {m.sender === "user" ? "You" : "StudyMate"}
                      </span>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                          m.sender === "user"
                            ? "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-100"
                            : "bg-white text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        )}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))
                )}
                {isThinking && (
                  <div className="text-xs text-zinc-400">Thinking...</div>
                )}
              </div>

              {/* Suggested Quick Prompts (optional) */}
              <div className="flex flex-wrap gap-2">
                {[
                  "Summarize key ideas",
                  "What should I study next?",
                  "Create 5 flashcards",
                ].map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full border-zinc-200/60 bg-white/60 text-xs dark:border-zinc-700/60 dark:bg-zinc-900/60"
                    onClick={() => sendMessage(p)}
                    disabled={isThinking}
                  >
                    {p}
                  </Button>
                ))}
              </div>

              {/* Input */}
              <form
                onSubmit={handleSubmit}
                className="mt-auto flex items-end gap-2"
              >
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    selectedNotebooks.length > 0
                      ? "Ask across selected notebooks…"
                      : "Select notebooks on the left to power your chat"
                  }
                  disabled={isThinking}
                  className="flex-1 rounded-2xl"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full"
                  disabled={isThinking || !chatInput.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Final Studio + Notes Sidebar (polished borders) */}
        <aside className="w-[320px] flex flex-col bg-[#fafafa] dark:bg-[#111112] border-l border-zinc-100/70 dark:border-zinc-800 overflow-y-auto">
          {/* === Studio Section === */}
          <div className="px-5 pt-5 pb-4 border-b border-zinc-100/60 dark:border-zinc-800/60">
            <h2 className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">
              Studio
            </h2>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mb-3">
              Create new content views powered by your notebooks
            </p>

            {/* Studio Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Audio Overview",
                  icon: "💡",
                  color:
                    "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                },
                {
                  label: "Video Overview",
                  icon: "🎬",
                  color:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                },
                {
                  label: "Summary",
                  icon: "📝",
                  color:
                    "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
                },
                {
                  label: "Outline",
                  icon: "📘",
                  color:
                    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
                },
                {
                  label: "Flashcards",
                  icon: "🧠",
                  color:
                    "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
                },
              ].map((tile) => (
                <button
                  key={tile.label}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl py-4 text-[13px] font-medium ${tile.color} hover:shadow-sm transition-all`}
                  onClick={() => alert(`${tile.label} clicked`)}
                >
                  <span className="text-lg">{tile.icon}</span>
                  <span>{tile.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* === My Notes Section === */}
          <div className="px-5 py-5">
            <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2">
              My Notes
            </h3>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mb-3">
              Add highlights or insights here
            </p>
            <textarea
              value={
                primaryNotebook ? notesByNotebook[primaryNotebook.id] ?? "" : ""
              }
              onChange={(e) =>
                primaryNotebook &&
                setNotesByNotebook((prev) => ({
                  ...prev,
                  [primaryNotebook.id]: e.target.value,
                }))
              }
              className="w-full min-h-[140px] resize-none rounded-xl border border-zinc-200/60 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-600"
              placeholder="Type or paste your notes..."
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
