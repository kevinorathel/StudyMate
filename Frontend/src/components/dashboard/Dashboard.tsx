import * as React from "react";
import { useLocation } from "react-router-dom";
import { DashboardHeader } from "./DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { uploadDocument } from "@/api/uploads";
import {
  fetchSessions,
  createSession,
  type SessionSummary,
  type SessionDocument,
} from "@/api/sessions";
import {
  askQuestion,
  fetchChatHistory,
  fetchChatHistoriesForUser,
  type SessionChatHistory,
  type ChatMessage,
} from "@/api/chat";
import { useAuth } from "@/context/AuthContext";
import { Send, MessageSquare } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const NOTES_STORAGE_KEY = "studymate.notesBySession";
const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx"]);
const QUICK_PROMPTS = [
  "Summarize key ideas",
  "Create 5 flashcards",
];

type NotesBySession = Record<number, string>;

function loadNotesFromStorage(): NotesBySession {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries = Object.entries(parsed);
    const notes: NotesBySession = {};
    for (const [key, value] of entries) {
      const sessionId = Number(key);
      if (Number.isFinite(sessionId) && typeof value === "string") {
        notes[sessionId] = value;
      }
    }
    return notes;
  } catch {
    return {};
  }
}

function saveNotesToStorage(notes: NotesBySession) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const payload: Record<string, string> = {};
    for (const [key, value] of Object.entries(notes)) {
      if (typeof value === "string") {
        payload[String(key)] = value;
      }
    }
    window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

function sortMessagesByTimestamp(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : NaN;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : NaN;
    if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
      return aTime - bTime;
    }
    return 0;
  });
}

function findSession(
  sessions: SessionSummary[],
  sessionId: number | null
): SessionSummary | null {
  if (sessionId == null) {
    return null;
  }
  return sessions.find((session) => session.id === sessionId) ?? null;
}

export default function Dashboard() {
  const location = useLocation();
  const { authToken, user } = useAuth();

  const [sessions, setSessions] = React.useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = React.useState(false);
  const [sessionsError, setSessionsError] = React.useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = React.useState<
    number | null
  >(null);
  const selectedSessionIdRef = React.useRef<number | null>(null);

  const [messagesBySession, setMessagesBySession] = React.useState<
    Record<number, ChatMessage[]>
  >({});
  const [chatLoading, setChatLoading] = React.useState(false);
  const [chatError, setChatError] = React.useState<string | null>(null);
  const [chatInput, setChatInput] = React.useState("");
  const [isThinking, setIsThinking] = React.useState(false);

  const [isUploading, setIsUploading] = React.useState(false);
  const [isCreatingSession, setIsCreatingSession] = React.useState(false);

  const [notesBySession, setNotesBySession] =
    React.useState<NotesBySession>(loadNotesFromStorage);

  const chatContainerRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);

  React.useEffect(
    () => saveNotesToStorage(notesBySession),
    [notesBySession]
  );

  const userId = React.useMemo<number | null>(() => {
    const state = location.state as { user_id?: unknown } | null;
    const valueFromState = state?.user_id;
    const parsedFromState =
      typeof valueFromState === "number"
        ? valueFromState
        : typeof valueFromState === "string"
        ? Number(valueFromState)
        : Number.NaN;

    if (Number.isFinite(parsedFromState)) {
      return Number(parsedFromState);
    }

    if (Number.isFinite(user?.id ?? Number.NaN)) {
      return Number(user?.id);
    }

    if (typeof authToken === "string") {
      const parsedFromToken = Number(authToken);
      if (Number.isFinite(parsedFromToken)) {
        return parsedFromToken;
      }
    }

    return null;
  }, [location.state, authToken, user?.id]);

  const refreshSessions = React.useCallback(
    async (opts?: { selectSessionId?: number | null; silent?: boolean }) => {
      if (userId === null) {
        setSessions([]);
        setSelectedSessionId(null);
        return;
      }

      if (!opts?.silent) {
        setSessionsLoading(true);
      }

      setSessionsError(null);

      try {
        const nextSessions = await fetchSessions(userId);
        setSessions(nextSessions);

        let historyBySession: Record<number, SessionChatHistory> = {};
        if (nextSessions.length > 0) {
          try {
            historyBySession = await fetchChatHistoriesForUser(userId);
          } catch (historyError) {
            console.error("Failed to load chat history:", historyError);
          }
        }

        setMessagesBySession((prev) => {
          const validIds = new Set(nextSessions.map((session) => session.id));
          const next: Record<number, ChatMessage[]> = {};
          validIds.forEach((id) => {
            const history = historyBySession[id];
            if (history) {
              next[id] = sortMessagesByTimestamp(history.messages);
            } else if (prev[id]) {
              next[id] = prev[id];
            }
          });
          return next;
        });

        if (nextSessions.length === 0) {
          setSelectedSessionId(null);
          return;
        }

        const preferredId =
          opts?.selectSessionId ?? selectedSessionIdRef.current;
        if (
          preferredId != null &&
          nextSessions.some((session) => session.id === preferredId)
        ) {
          setSelectedSessionId(preferredId);
        } else {
          setSelectedSessionId(nextSessions[0].id);
        }
      } catch (error) {
        setSessions([]);
        setSelectedSessionId(null);
        setSessionsError((error as Error).message);
      } finally {
        if (!opts?.silent) {
          setSessionsLoading(false);
        }
      }
    },
    [userId]
  );

  React.useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  React.useEffect(() => {
    if (selectedSessionId === null) {
      return;
    }

    if (messagesBySession[selectedSessionId]) {
      return;
    }

    setChatLoading(true);
    setChatError(null);

    fetchChatHistory(selectedSessionId)
      .then((history) => {
        setMessagesBySession((prev) => ({
          ...prev,
          [selectedSessionId]: sortMessagesByTimestamp(history),
        }));
      })
      .catch((error) => {
        setChatError((error as Error).message);
      })
      .finally(() => {
        setChatLoading(false);
      });
  }, [selectedSessionId, messagesBySession]);

  const messages =
    selectedSessionId != null
      ? messagesBySession[selectedSessionId] ?? []
      : [];

  React.useEffect(() => {
    if (!chatContainerRef.current) {
      return;
    }
    chatContainerRef.current.scrollTop =
      chatContainerRef.current.scrollHeight;
  }, [selectedSessionId, messages, isThinking]);

  const currentSession = React.useMemo(
    () => findSession(sessions, selectedSessionId),
    [sessions, selectedSessionId]
  );
  const sessionDocuments = currentSession?.documents ?? [];
  const sessionHasDocuments = sessionDocuments.length > 0;

  const hasSessions = sessions.length > 0;
  const chatDisabled =
    selectedSessionId === null ||
    !sessionHasDocuments ||
    isThinking ||
    isUploading ||
    chatLoading;

  const handleAddNotebookClick = React.useCallback(() => {
    if (isUploading) {
      return;
    }

    if (userId === null) {
      window.alert(
        "We couldn't determine your account. Please sign out and sign back in."
      );
      return;
    }

    if (sessions.length > 0 && selectedSessionId === null) {
      window.alert("Select or create a session before uploading files.");
      return;
    }

    fileInputRef.current?.click();
  }, [isUploading, userId, sessions.length, selectedSessionId]);

  const handleCreateSessionClick = React.useCallback(() => {
    if (userId === null) {
      window.alert(
        "We couldn't determine your account. Please sign out and sign back in."
      );
      return;
    }

    const tempSessionId = Date.now() * -1; 
    const tempSession: SessionSummary = {
      id: tempSessionId,
      name: "New Session", 
      documents: [], 
    };

    setSessions((prev) => [tempSession, ...prev]); // Add to the beginning of sessions
    setSelectedSessionId(tempSessionId);
    setMessagesBySession((prev) => ({
      ...prev,
      [tempSessionId]: [], // Clear chat history for this temp session
    }));
  }, [userId]);

  const handleFileSelection = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";

      if (files.length === 0) {
        return;
      }

      if (userId === null) {
        window.alert(
          "We couldn't determine your account. Please sign out and sign back in."
        );
        return;
      }

      if (sessions.length > 0 && selectedSessionId === null) {
        window.alert("Select or create a session before uploading files.");
        return;
      }

      const validFiles = files.filter((file) => {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        return ALLOWED_EXTENSIONS.has(ext);
      });

      if (validFiles.length === 0) {
        window.alert("Please upload PDF or DOC/DOCX files.");
        return;
      }

      setIsUploading(true);
      const failedUploads: string[] = [];
      let resultingSessionId: number | null = selectedSessionId;

      try {
        // Determine the session ID to use for the upload.
        // If selectedSessionId is a temporary client-side ID (negative),
        // we pass undefined to uploadDocument to create a new backend session.
        let currentSessionIdForUpload: number | undefined = undefined;
        if (selectedSessionId !== null && selectedSessionId > 0) {
          currentSessionIdForUpload = selectedSessionId;
        }

        for (const file of validFiles) {
          try {
            const uploadResult = await uploadDocument({
              file,
              userId,
              sessionId: currentSessionIdForUpload,
            });
            const sessionIdFromUpload = Number(uploadResult.session_id);
            if (Number.isFinite(sessionIdFromUpload)) {
              currentSessionIdForUpload = sessionIdFromUpload; // Update for subsequent uploads in the same batch
              resultingSessionId = sessionIdFromUpload;
            }
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            failedUploads.push(file.name);
          }
        }

        const successfulUploads = validFiles.length - failedUploads.length;

        if (resultingSessionId != null && successfulUploads > 0) {
          // If a temporary session was active, remove it from the state
          if (selectedSessionId !== null && selectedSessionId < 0) {
            setSessions((prev) => prev.filter((s) => s.id !== selectedSessionId));
          }
          setSelectedSessionId(resultingSessionId);
          setMessagesBySession((prev) => ({
            ...prev,
            [resultingSessionId!]: prev[resultingSessionId!] ?? [],
          }));
        }

        await refreshSessions({
          selectSessionId: resultingSessionId ?? null,
          silent: true,
        });

        if (successfulUploads === 0) {
          window.alert(
            "We couldn't upload any of your files. Please try again."
          );
        } else if (failedUploads.length > 0) {
          window.alert(
            `Uploaded with issues. We couldn't upload: ${failedUploads.join(
              ", "
            )}.`
          );
        } else {
          window.alert(
            "Your document has been processed successfully!"
          );
        }
      } catch (error) {
        console.error("Upload failed:", error);
        window.alert(
          (error as Error).message ||
            "We could not upload your files. Please try again."
        );
      } finally {
        setIsUploading(false);
      }
    },
    [userId, sessions.length, selectedSessionId, refreshSessions]
  );

  const handleSelectSessionFromHeader = React.useCallback((id: number) => {
    setSelectedSessionId(id);
  }, []);

  const sendMessage = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || selectedSessionId === null || !sessionHasDocuments) {
        return;
      }

      const sessionId = selectedSessionId;
      const timestamp = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: `${sessionId}-user-${Date.now()}`,
        sender: "user",
        text: trimmed,
        createdAt: timestamp,
      };

      setMessagesBySession((prev) => {
        const existing = prev[sessionId] ?? [];
        return {
          ...prev,
          [sessionId]: [...existing, userMessage],
        };
      });

      setChatInput("");
      setChatError(null);
      setIsThinking(true);

      try {
        const reply = await askQuestion(sessionId, trimmed);
        const assistantMessage: ChatMessage = {
          id: `${sessionId}-assistant-${Date.now()}`,
          sender: "assistant",
          text: reply,
          createdAt: new Date().toISOString(),
        };
        setMessagesBySession((prev) => {
          const existing = prev[sessionId] ?? [];
          return {
            ...prev,
            [sessionId]: [...existing, assistantMessage],
          };
        });
      } catch (error) {
        const fallbackMessage: ChatMessage = {
          id: `${sessionId}-error-${Date.now()}`,
          sender: "assistant",
          text:
            (error as Error).message ||
            "I ran into an issue reaching the server. Please try again in a moment.",
          createdAt: new Date().toISOString(),
        };
        setMessagesBySession((prev) => {
          const existing = prev[sessionId] ?? [];
          return {
            ...prev,
            [sessionId]: [...existing, fallbackMessage],
          };
        });
        setChatError((error as Error).message);
      } finally {
        setIsThinking(false);
      }
    },
    [selectedSessionId, sessionHasDocuments]
  );

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (chatDisabled || !chatInput.trim()) {
        return;
      }
      sendMessage(chatInput);
    },
    [chatDisabled, chatInput, sendMessage]
  );

  const handleQuickPrompt = React.useCallback(
    (prompt: string) => {
      if (chatDisabled) {
        return;
      }
      sendMessage(prompt);
    },
    [chatDisabled, sendMessage]
  );

  React.useEffect(() => {
    if (
      selectedSessionId !== null &&
      !messagesBySession[selectedSessionId] &&
      !chatLoading
    ) {
      setChatError(null);
    }
  }, [selectedSessionId, messagesBySession, chatLoading]);

  const notesForSession =
    selectedSessionId != null ? notesBySession[selectedSessionId] ?? "" : "";

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-zinc-900 dark:bg-[#0f1015] dark:text-zinc-100 antialiased">
      <DashboardHeader
        onCreateSession={handleCreateSessionClick}
        createDisabled={isUploading || isCreatingSession}
        sessions={sessions.map((session) => ({
          id: session.id,
          name: session.name,
          documentCount: session.documents?.length ?? 0,
        }))}
        selectedSessionId={selectedSessionId}
        onSelectSession={handleSelectSessionFromHeader}
        sessionsLoading={sessionsLoading}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        multiple
        onChange={handleFileSelection}
      />

      <main className="flex h-[calc(100vh-114px)] gap-4 p-4">
        <div className="w-64 space-y-4">
          <Card className="h-fit rounded-2xl border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <div className="flex items-baseline justify-between">
                <CardTitle className="text-sm font-semibold">
                  Session files
                </CardTitle>
                {currentSession ? (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {sessionDocuments.length} file
                    {sessionDocuments.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 px-3 pb-3 pt-2">
              {sessionsError ? (
                <p className="text-xs text-red-500">{sessionsError}</p>
              ) : !hasSessions ? (
                <p className="text-xs text-muted-foreground">
                  Create a session from the header to start uploading study materials.
                </p>
              ) : currentSession == null ? (
                <p className="text-xs text-muted-foreground">
                  Select a session to view its files.
                </p>
              ) : sessionDocuments.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No files uploaded yet. Use the button below to add notebooks to this session.
                </p>
              ) : (
                sessionDocuments.map((doc: SessionDocument) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                    title={doc.title}
                  >
                    <span className="truncate">{doc.title}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Button
            className="w-full rounded-2xl"
            onClick={handleAddNotebookClick}
            disabled={isUploading}
          >
            + Add Notebook
          </Button>
        </div>

        <div className="flex flex-1 flex-col space-y-4">
          <Card className="flex flex-1 flex-col h-full rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                Smart QnA
              </div>
              {currentSession ? (
                <p className="text-xs text-muted-foreground">
                  Asking about “{currentSession.name}”
                </p>
              ) : null}
            </CardHeader>

            <CardContent className="flex flex-1 flex-col h-full gap-4 px-5 pb-5 pt-4">
              <div
                ref={chatContainerRef}
                className="h-[400px] overflow-y-auto space-y-3 rounded-xl border border-zinc-200 bg-[#f7f8fc] p-3 dark:border-zinc-700 dark:bg-[#161821] min-h-0"
              >
                {!hasSessions ? (
                  <p className="text-sm text-muted-foreground">
                    Upload your first document to create a session and start
                    chatting with StudyMate.
                  </p>
                ) : selectedSessionId === null ? (
                  <p className="text-sm text-muted-foreground">
                    Select a session to view its chat history.
                  </p>
                ) : !sessionHasDocuments ? (
                  <p className="text-sm text-muted-foreground">
                    Upload at least one notebook to this session to enable Smart
                    QnA.
                  </p>
                ) : chatLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Loading chat history…
                  </p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ask a question about your uploaded files to begin.
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex flex-col",
                        message.sender === "user"
                          ? "items-end"
                          : "items-start"
                      )}
                    >
                      <span className="text-xs uppercase text-zinc-400">
                        {message.sender === "user" ? "You" : "StudyMate"}
                      </span>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                          message.sender === "user"
                            ? "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-100"
                            : "bg-white text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        )}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))
                )}
                {isThinking && (
                  <div className="text-xs text-zinc-400">Thinking...</div>
                )}
                {chatError && !isThinking ? (
                  <div className="text-xs text-red-500">{chatError}</div>
                ) : null}
              </div>

              {selectedSessionId != null && sessionHasDocuments ? (
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full border-zinc-200/60 bg-white/60 text-xs dark:border-zinc-700/60 dark:bg-zinc-900/60"
                      onClick={() => handleQuickPrompt(prompt)}
                      disabled={chatDisabled}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              ) : null}

              <form
                onSubmit={handleSubmit}
                className="mt-auto flex items-end gap-2"
              >
                <Input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder={
                    selectedSessionId == null
                      ? "Create a session to start chatting"
                      : sessionHasDocuments
                      ? "Ask about this session…"
                      : "Upload a notebook to unlock questions"
                  }
                  disabled={chatDisabled}
                  className="flex-1 rounded-2xl"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full"
                  disabled={chatDisabled || !chatInput.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <aside className="w-[320px] flex flex-col bg-[#fafafa] dark:bg-[#111112] border-l border-zinc-100/70 dark:border-zinc-800 overflow-y-auto">
          <div className="px-5 pt-5 pb-4 border-b border-zinc-100/60 dark:border-zinc-800/60">
            <h2 className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">
              Studio
            </h2>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mb-3">
              Create new content views powered by your session files
            </p>

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
                  onClick={() => window.alert(`${tile.label} is coming soon`)}
                >
                  <span className="text-lg">{tile.icon}</span>
                  <span>{tile.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 py-5">
            <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2">
              My Notes
            </h3>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mb-3">
              Jot down highlights for the current session
            </p>
            <textarea
              value={notesForSession}
              onChange={(event) => {
                const next = event.target.value;
                if (selectedSessionId == null) {
                  return;
                }
                setNotesBySession((prev) => ({
                  ...prev,
                  [selectedSessionId]: next,
                }));
              }}
              disabled={selectedSessionId == null}
              className="w-full min-h-[140px] resize-none rounded-xl border border-zinc-200/60 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-600"
              placeholder={
                selectedSessionId == null
                  ? "Select a session to start taking notes…"
                  : "Type or paste your notes..."
              }
            />
          </div>
        </aside>
      </main>

      <Loader isLoading={isUploading} />
    </div>
  );
}
