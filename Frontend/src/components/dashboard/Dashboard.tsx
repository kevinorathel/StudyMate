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
  generateSessionSummary,
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
import { Send, MessageSquare, X } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateAudioLesson } from "@/api/audio";
import { API_BASE_URL } from "@/config";

const NOTES_STORAGE_KEY = "studymate.notesBySession";
const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx"]);
//const QUICK_PROMPTS = ["Summarize key ideas", "Create 15 flashcards"];

const MAX_FLASHCARDS = 15;

type NotesBySession = Record<number, string>;

interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

function toFlashcardFromRecord(
  record: Record<string, unknown>,
  index: number
): Flashcard | null {
  const questionFields = ["question", "front", "prompt", "q", "term", "card"];
  const answerFields = [
    "answer",
    "back",
    "response",
    "a",
    "definition",
    "explanation",
  ];

  let question = "";
  for (const field of questionFields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) {
      question = value.trim();
      break;
    }
  }

  let answer = "";
  for (const field of answerFields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) {
      answer = value.trim();
      break;
    }
  }

  if (!question || !answer) {
    return null;
  }

  const rawId = record.id;
  const id =
    typeof rawId === "string" && rawId.trim()
      ? rawId.trim()
      : `flashcard-${index}`;

  return { id, question, answer };
}

function parseFlashcardsResponse(raw: string): Flashcard[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  const tryParseArray = (value: unknown): Flashcard[] => {
    if (!Array.isArray(value)) {
      return [];
    }
    const results: Flashcard[] = [];
    value.forEach((entry, index) => {
      if (entry && typeof entry === "object") {
        const flashcard = toFlashcardFromRecord(
          entry as Record<string, unknown>,
          index
        );
        if (flashcard) {
          results.push(flashcard);
        }
      } else if (typeof entry === "string") {
        const segments = entry
          .split(/answer\s*[:\-]/i)
          .map((segment) => segment.trim())
          .filter(Boolean);
        if (segments.length >= 2) {
          const question = segments[0]
            .replace(/^(?:\d+\.\s*)?(?:q(?:uestion)?\s*[:\-])?/i, "")
            .trim();
          const answer = segments.slice(1).join(" ").trim();
          if (question && answer) {
            results.push({
              id: `flashcard-${index}`,
              question,
              answer,
            });
          }
        }
      }
    });

    return results;
  };

  const tryParseJson = (input: string): Flashcard[] => {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return tryParseArray(parsed);
      }
      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        for (const key of ["flashcards", "cards", "data", "items"]) {
          const candidate = record[key];
          const attempt = tryParseArray(candidate);
          if (attempt.length > 0) {
            return attempt;
          }
        }
      }
    } catch {
      // ignore parse errors
    }
    return [];
  };

  const jsonFirstAttempt = tryParseJson(trimmed);
  if (jsonFirstAttempt.length > 0) {
    return jsonFirstAttempt;
  }

  const bracketMatch = trimmed.match(/\[[\s\S]*\]/);
  if (bracketMatch) {
    const attempt = tryParseJson(bracketMatch[0]);
    if (attempt.length > 0) {
      return attempt;
    }
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    const attempt = tryParseJson(objectMatch[0]);
    if (attempt.length > 0) {
      return attempt;
    }
  }

  const normalized = trimmed.replace(/\r\n/g, "\n");
  const sections = normalized
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const fallback: Flashcard[] = [];

  sections.forEach((section, sectionIndex) => {
    const lines = section
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      return;
    }

    let questionLine = lines[0];
    const questionMatch = questionLine.match(
      /^(?:\d+\.\s*)?(?:q(?:uestion)?|card)\s*(?:[:\-\.]|\))?\s*(.+)$/i
    );
    if (questionMatch && questionMatch[1]) {
      questionLine = questionMatch[1].trim();
    }

    let answerLines = lines.slice(1);
    if (answerLines.length === 0) {
      const inlineSplit = questionLine.split(/answer\s*[:\-]/i);
      if (inlineSplit.length > 1) {
        questionLine = inlineSplit[0].trim();
        answerLines = [inlineSplit.slice(1).join(" ").trim()];
      }
    } else if (/^a(?:nswer)?/i.test(answerLines[0])) {
      answerLines[0] = answerLines[0].replace(
        /^a(?:nswer)?\s*(?:[:\-\.]|\))?\s*/i,
        ""
      );
    }

    const answerText = answerLines.join(" ").trim();
    if (questionLine && answerText) {
      fallback.push({
        id: `flashcard-${sectionIndex}`,
        question: questionLine,
        answer: answerText,
      });
    }
  });

  if (fallback.length > 0) {
    return fallback;
  }

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = 0; i + 1 < lines.length; i += 2) {
    const potentialQuestion = lines[i].replace(
      /^(?:\d+\.\s*)?(?:q(?:uestion)?|card)\s*(?:[:\-\.]|\))?\s*/i,
      ""
    );
    const potentialAnswer = lines[i + 1].replace(
      /^a(?:nswer)?\s*(?:[:\-\.]|\))?\s*/i,
      ""
    );
    if (potentialQuestion && potentialAnswer) {
      fallback.push({
        id: `flashcard-${i}`,
        question: potentialQuestion,
        answer: potentialAnswer,
      });
    }
  }

  const qaRegex =
    /(?:^|\n)\s*(?:\d+\.\s*)?(?:q(?:uestion)?|card)[^:\n]*[:\-]\s*(.+?)(?:\r?\n|\r|\n)+\s*(?:[\-\*]?\s*)?(?:a(?:nswer)?)[:\-\s]+([\s\S]+?)(?=(?:\n\s*(?:\d+\.\s*)?(?:q(?:uestion)?|card)\b|\n\s*[\-\*]\s*(?:q(?:uestion)?|card)\b|$))/gi;

  const regexCards: Flashcard[] = [];
  for (const match of normalized.matchAll(qaRegex)) {
    const question = match[1]?.trim();
    const answer = match[2]?.trim();
    if (question && answer) {
      regexCards.push({
        id: `flashcard-regex-${regexCards.length}`,
        question: question.replace(/^["'“”]+|["'“”]+$/g, ""),
        answer: answer.replace(/^["'“”]+|["'“”]+$/g, ""),
      });
    }
  }

  if (regexCards.length > 0) {
    return regexCards;
  }

  return fallback;
}

function normalizeFlashcardsFromUnknown(payload: unknown): Flashcard[] {
  if (typeof payload === "string") {
    return parseFlashcardsResponse(payload);
  }

  if (Array.isArray(payload)) {
    const results: Flashcard[] = [];
    payload.forEach((entry, index) => {
      if (entry && typeof entry === "object") {
        const card = toFlashcardFromRecord(
          entry as Record<string, unknown>,
          index
        );
        if (card) {
          results.push(card);
        }
      } else if (typeof entry === "string") {
        const parsed = parseFlashcardsResponse(entry);
        parsed.forEach((card) => {
          results.push({
            ...card,
            id: card.id || `flashcard-${results.length}`,
          });
        });
      }
    });
    return results;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const directCard = toFlashcardFromRecord(record, 0);
    if (directCard) {
      return [directCard];
    }
    for (const key of ["flashcards", "cards", "data", "items"]) {
      const attempt = normalizeFlashcardsFromUnknown(record[key]);
      if (attempt.length > 0) {
        return attempt;
      }
    }
  }

  return [];
}

function detectFlashcardPayload(raw: string): Flashcard[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  const looksLikeJson =
    trimmed.startsWith("[") ||
    trimmed.startsWith("{") ||
    /"question"\s*:/i.test(trimmed);
  if (!looksLikeJson) {
    return [];
  }

  const parsed = normalizeFlashcardsFromUnknown(trimmed);
  if (parsed.length === 0) {
    return [];
  }
  return parsed;
}

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
  const [showFilesDrawer, setShowFilesDrawer] = React.useState(false);
  const [showStudioDrawer, setShowStudioDrawer] = React.useState(false);
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
  const [isGeneratingAudio, setIsGeneratingAudio] = React.useState(false);
  const [audioError, setAudioError] = React.useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = React.useState(false);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);

  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = React.useState(false);
  const [flashcards, setFlashcards] = React.useState<Flashcard[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = React.useState(false);
  const [flashcardsError, setFlashcardsError] = React.useState<string | null>(
    null
  );
  const [flippedCardIds, setFlippedCardIds] = React.useState<
    Record<string, boolean>
  >({});

  const [notesBySession, setNotesBySession] =
    React.useState<NotesBySession>(loadNotesFromStorage);

  const chatContainerRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);

  React.useEffect(() => saveNotesToStorage(notesBySession), [notesBySession]);

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
    selectedSessionId != null ? messagesBySession[selectedSessionId] ?? [] : [];

  React.useEffect(() => {
    if (!chatContainerRef.current) {
      return;
    }
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [selectedSessionId, messages, isThinking]);

  const currentSession = React.useMemo(
    () => findSession(sessions, selectedSessionId),
    [sessions, selectedSessionId]
  );
  const sessionDocuments = currentSession?.documents ?? [];
  const sessionHasDocuments = sessionDocuments.length > 0;
  const studioDisabled = !sessionHasDocuments;

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
            setSessions((prev) =>
              prev.filter((s) => s.id !== selectedSessionId)
            );
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
          window.alert("Your document has been processed successfully!");
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

  const loadFlashcards = React.useCallback(async () => {
    if (selectedSessionId === null) {
      setFlashcardsError("Select a session to generate flashcards.");
      setFlashcards([]);
      return;
    }

    if (!sessionHasDocuments) {
      setFlashcardsError("Upload a notebook to unlock flashcards.");
      setFlashcards([]);
      return;
    }

    setFlashcardsLoading(true);
    setFlashcardsError(null);

    const endpoints = [
      `${API_BASE_URL}/generateFlashcards?session_id=${selectedSessionId}`,
      `${API_BASE_URL}/generateFlashcards/?session_id=${selectedSessionId}`,
    ];

    const errors: string[] = [];

    try {
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          if (!response.ok) {
            errors.push(`${endpoint} → ${response.status}`);
            continue;
          }

          const payload = await response.json();
          const parsed = normalizeFlashcardsFromUnknown(payload).slice(
            0,
            MAX_FLASHCARDS
          );

          if (parsed.length === 0) {
            errors.push(`${endpoint} → No flashcards returned`);
            continue;
          }

          const timestamp = Date.now();
          setFlashcards(
            parsed.map((card, index) => ({
              ...card,
              id: card.id || `flashcard-${timestamp}-${index}`,
            }))
          );
          setFlippedCardIds({});
          return;
        } catch (error) {
          errors.push(`${endpoint} → ${(error as Error).message}`);
        }
      }

      setFlashcards([]);
      setFlippedCardIds({});
      setFlashcardsError(
        errors.length > 0
          ? `We couldn't load flashcards for this session.\n\nDetails:\n${errors.join(
              "\n"
            )}`
          : "We couldn't load flashcards for this session. Please try again later."
      );
    } finally {
      setFlashcardsLoading(false);
    }
  }, [selectedSessionId, sessionHasDocuments]);

  const handleFlashcardsClick = React.useCallback(() => {
    if (selectedSessionId === null) {
      window.alert("Please select a session first.");
      return;
    }

    if (!sessionHasDocuments) {
      window.alert("Upload a notebook to generate flashcards.");
      return;
    }

    setIsFlashcardModalOpen(true);
  }, [selectedSessionId, sessionHasDocuments]);

  const handleFlashcardFlip = React.useCallback((id: string) => {
    setFlippedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const handleCloseFlashcardModal = React.useCallback(() => {
    setIsFlashcardModalOpen(false);
    setFlippedCardIds({});
    setFlashcardsError(null);
  }, []);

  React.useEffect(() => {
    if (isFlashcardModalOpen) {
      void loadFlashcards();
    }
  }, [isFlashcardModalOpen, loadFlashcards]);

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

  // const handleQuickPrompt = React.useCallback(
  //   (prompt: string) => {
  //     const normalized = prompt.trim().toLowerCase();
  //     if (normalized.includes("flashcard")) {
  //       handleFlashcardsClick();
  //       return;
  //     }

  //     if (chatDisabled) {
  //       return;
  //     }
  //     sendMessage(prompt);
  //   },
  //   [chatDisabled, sendMessage, handleFlashcardsClick]
  // );

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
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#f5f7fb] text-zinc-900 dark:bg-[#0f1015] dark:text-zinc-100 antialiased">
      <DashboardHeader
        onCreateSession={handleCreateSessionClick}
        createDisabled={isUploading}
        sessions={sessions.map((session) => ({
          id: session.id,
          name: session.name,
          documentCount: session.documents?.length ?? 0,
        }))}
        selectedSessionId={selectedSessionId}
        onSelectSession={handleSelectSessionFromHeader}
        sessionsLoading={sessionsLoading}
        onShowFilesDrawer={() => setShowFilesDrawer(true)}
        onShowStudioDrawer={() => setShowStudioDrawer(true)}
        // 🆕 add this line ↓
        sessionHasDocuments={sessionHasDocuments}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        multiple
        onChange={handleFileSelection}
      />

      <main
        className="
    relative
    flex
    h-[calc(100vh-114px)]
    overflow-hidden
    p-4
    gap-4
    lg:gap-6
    flex-col
    lg:flex-row
  "
      >
        {/* ---------- MOBILE DRAWER TRIGGERS ( < 1024px ) ----------
        <div className="lg:hidden absolute top-3 left-4 z-20 flex gap-2">
          <button
            onClick={() => setShowFilesDrawer(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 shadow"
            title="Files"
          >
            📁
          </button>
        </div>
        <div className="lg:hidden absolute top-3 right-4 z-20 flex gap-2">
          <button
            onClick={() => setShowStudioDrawer(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 shadow"
            title="Studio"
          >
            ⚙️
          </button>
        </div> */}

        {/* ---------- MOBILE FILES DRAWER ---------- */}
        {showFilesDrawer && (
          <div className="fixed inset-0 z-40 flex">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowFilesDrawer(false)}
            />
            <div className="relative z-50 w-full max-w-full bg-white dark:bg-zinc-900 flex flex-col h-full animate-slideInLeft">
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-lg font-semibold">📁 Files</h2>
                <button
                  onClick={() => setShowFilesDrawer(false)}
                  className="text-2xl leading-none text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sessionsError ? (
                  <p className="text-xs text-red-500">{sessionsError}</p>
                ) : !hasSessions ? (
                  <p className="text-sm text-muted-foreground">
                    Create a session from the header to start uploading study
                    materials.
                  </p>
                ) : currentSession == null ? (
                  <p className="text-sm text-muted-foreground">
                    Select a session to view its files.
                  </p>
                ) : sessionDocuments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No files uploaded yet. Use the button below to add notebooks
                    to this session.
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
              </div>
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                <Button
                  className="w-full rounded-2xl"
                  onClick={handleAddNotebookClick}
                  disabled={isUploading}
                >
                  + Add Notebook
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- MOBILE STUDIO DRAWER ---------- */}
        {showStudioDrawer && (
          <div className="fixed inset-0 z-40 flex justify-end">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowStudioDrawer(false)}
            />
            <div className="relative z-50 w-full max-w-full bg-white dark:bg-zinc-900 flex flex-col h-full animate-slideInRight">
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-lg font-semibold">⚙️ Studio</h2>
                <button
                  onClick={() => setShowStudioDrawer(false)}
                  className="text-2xl leading-none text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div>
                  <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mb-3">
                    Create new content powered by your session files
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        label: "Audio Overview",
                        icon: "💡",
                        color:
                          "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                        onClick: async () => {
                          if (studioDisabled) return;
                          if (selectedSessionId === null) {
                            window.alert("Please select a session first.");
                            return;
                          }
                          setIsGeneratingAudio(true);
                          setAudioError(null);
                          try {
                            const filename = await generateAudioLesson(
                              selectedSessionId
                            );
                            window.alert(
                              `Audio lesson "${filename}" downloaded successfully!`
                            );
                          } catch (error) {
                            setAudioError((error as Error).message);
                            window.alert(
                              `Error generating audio: ${
                                (error as Error).message
                              }`
                            );
                          } finally {
                            setIsGeneratingAudio(false);
                          }
                        },
                      },
                      {
                        label: "Video Overview",
                        icon: "🎬",
                        color:
                          "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                      },
                      {
                        label: "Summary Notes",
                        icon: "📝",
                        color:
                          "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
                        onClick: async () => {
                          if (studioDisabled) return;
                          if (selectedSessionId === null) {
                            window.alert("Please select a session first.");
                            return;
                          }
                          setIsGeneratingSummary(true);
                          setSummaryError(null);
                          try {
                            await generateSessionSummary(selectedSessionId);
                            window.alert(
                              "Session summary PDF downloaded successfully!"
                            );
                          } catch (error) {
                            setSummaryError((error as Error).message);
                            window.alert(
                              `Error generating summary: ${
                                (error as Error).message
                              }`
                            );
                          } finally {
                            setIsGeneratingSummary(false);
                          }
                        },
                      },
                      {
                        label: "Flashcards",
                        icon: "🧠",
                        color:
                          "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
                        onClick: () => {
                          if (studioDisabled) return;
                          handleFlashcardsClick();
                        },
                      },
                    ].map((tile) => (
                      <button
                        key={tile.label}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1 rounded-xl py-4 text-[13px] font-medium transition-all min-h-[90px]",
                          tile.color,
                          studioDisabled
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:shadow-sm cursor-pointer"
                        )}
                        onClick={
                          tile.onClick ??
                          (() => window.alert(`${tile.label} is coming soon`))
                        }
                        disabled={
                          studioDisabled ||
                          (isGeneratingAudio &&
                            tile.label === "Audio Overview") ||
                          (isGeneratingSummary &&
                            tile.label === "Summary Notes") ||
                          (flashcardsLoading && tile.label === "Flashcards")
                        }
                        title={
                          studioDisabled
                            ? "Upload a file to unlock Studio tools"
                            : tile.label
                        }
                      >
                        {isGeneratingAudio &&
                        tile.label === "Audio Overview" ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-blue-700 border-t-transparent dark:border-blue-300 dark:border-t-transparent" />
                        ) : isGeneratingSummary &&
                          tile.label === "Summary Notes" ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-violet-700 border-t-transparent dark:border-violet-300 dark:border-t-transparent" />
                        ) : flashcardsLoading && tile.label === "Flashcards" ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-rose-700 border-t-transparent dark:border-rose-300 dark:border-t-transparent" />
                        ) : (
                          <span className="text-lg">{tile.icon}</span>
                        )}
                        <span>
                          {isGeneratingAudio && tile.label === "Audio Overview"
                            ? "Generating Audio..."
                            : isGeneratingSummary &&
                              tile.label === "Summary Notes"
                            ? "Generating Summary..."
                            : flashcardsLoading && tile.label === "Flashcards"
                            ? "Loading Flashcards..."
                            : tile.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-medium">My Notes</h4>
                  <textarea
                    value={notesForSession}
                    onChange={(event) => {
                      const next = event.target.value;
                      if (selectedSessionId == null) return;
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
              </div>
            </div>
          </div>
        )}

        {/* ---------- DESKTOP LEFT (FILES) ---------- */}
        <section className="hidden lg:block lg:w-[20%] lg:flex-none space-y-4 overflow-y-auto pr-1">
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
                  Create a session from the header to start uploading study
                  materials.
                </p>
              ) : currentSession == null ? (
                <p className="text-xs text-muted-foreground">
                  Select a session to view its files.
                </p>
              ) : sessionDocuments.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No files uploaded yet. Use the button below to add notebooks
                  to this session.
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
        </section>

        {/* ---------- CENTER CHAT (scrollable feed, fixed input) ---------- */}
        <section
          className="
    relative
    flex-1 lg:flex-[3]
    flex flex-col
    bg-white dark:bg-zinc-900
    overflow-hidden
  "
        >
          {/* DESKTOP HEADER ONLY */}
          <div className="hidden lg:block border-b border-zinc-100 dark:border-zinc-800 px-5 py-2 sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span>Smart QnA</span>
            </div>
            {currentSession && (
              <p className="text-xs text-muted-foreground">
                Asking about “{currentSession.name}”
              </p>
            )}
          </div>

          {/* CHAT FEED (independent scroll area) */}
          <div
            ref={chatContainerRef}
            className="
      flex-1
      overflow-y-auto
      px-4 lg:px-5 pt-4 pb-28
      space-y-3
      scroll-smooth
      bg-white dark:bg-zinc-900
    "
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
                Upload at least one notebook to this session to enable QnA.
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
              messages.map((message) => {
                const isUser = message.sender === "user";
                const flashcardPayload = !isUser
                  ? detectFlashcardPayload(message.text)
                  : [];
                const showFlashcardPreview =
                  flashcardPayload.length > 0 &&
                  flashcardPayload.every(
                    (card) => card.question && card.answer
                  );

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex flex-col",
                      isUser ? "items-end" : "items-start"
                    )}
                  >
                    <span className="text-xs uppercase text-zinc-400">
                      {isUser ? "You" : "StudyMate"}
                    </span>
                    <div
                      className={cn(
                        "max-w-[85%] lg:max-w-[90%] rounded-2xl px-4 py-2 text-sm",
                        isUser
                          ? "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-100"
                          : "bg-white text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                      )}
                    >
                      {showFlashcardPreview ? (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500 dark:text-rose-300">
                            Flashcards ready
                          </p>
                          <div className="space-y-3">
                            {flashcardPayload.map((card, index) => (
                              <div
                                key={card.id || `${message.id}-card-${index}`}
                                className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-xs text-zinc-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-zinc-100"
                              >
                                <p className="font-semibold text-red-600 dark:text-red-300">
                                  Q: {card.question}
                                </p>
                                <p className="mt-1 text-emerald-600 dark:text-emerald-200">
                                  A: {card.answer}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.text}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isThinking && (
              <div className="text-xs text-zinc-400">Thinking...</div>
            )}
            {chatError && !isThinking && (
              <div className="text-xs text-red-500">{chatError}</div>
            )}
          </div>

          {/* INPUT BAR (fixed at bottom) */}
          <div
            className="
      pointer-events-auto
      fixed left-0 right-0 bottom-4
      px-4
      lg:static lg:px-0
      bg-gradient-to-t from-white dark:from-zinc-900
    "
          >
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex items-end gap-2 w-full max-w-3xl"
            >
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  selectedSessionId == null
                    ? "Create a session to start chatting"
                    : sessionHasDocuments
                    ? "Ask about this session…"
                    : "Upload a notebook to unlock questions"
                }
                disabled={chatDisabled}
                className="flex-1 rounded-2xl bg-white dark:bg-zinc-900"
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
          </div>
        </section>

        {/* ---------- DESKTOP RIGHT (STUDIO + NOTES) ---------- */}
        <aside
          className="
    hidden lg:flex
    lg:w-[20%] lg:flex-none
    flex-col overflow-y-auto
    border-l border-zinc-100/70 dark:border-zinc-800
    pl-1
  "
        >
          <div className="px-5 pt-5 pb-4 border-b border-zinc-100/60 dark:border-zinc-800/60">
            <h2 className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">
              Studio
            </h2>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mb-3">
              Create new content powered by your session files
            </p>

            {/* 🆕 Studio Cards Section (Disabled state handled) */}
            <div
              className={cn(
                "grid grid-cols-2 gap-3 transition-opacity",
                studioDisabled
                  ? "opacity-50 pointer-events-none cursor-not-allowed"
                  : "opacity-100"
              )}
              title={
                studioDisabled
                  ? "Upload a file to unlock Studio tools"
                  : undefined
              }
            >
              {[
                {
                  label: "Audio Overview",
                  icon: "💡",
                  color:
                    "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
                  onClick: async () => {
                    if (studioDisabled) return;
                    if (selectedSessionId === null) {
                      window.alert("Please select a session first.");
                      return;
                    }
                    setIsGeneratingAudio(true);
                    setAudioError(null);
                    try {
                      const filename = await generateAudioLesson(
                        selectedSessionId
                      );
                      window.alert(
                        `Audio lesson "${filename}" downloaded successfully!`
                      );
                    } catch (error) {
                      setAudioError((error as Error).message);
                      window.alert(
                        `Error generating audio: ${(error as Error).message}`
                      );
                    } finally {
                      setIsGeneratingAudio(false);
                    }
                  },
                },
                {
                  label: "Video Overview",
                  icon: "🎬",
                  color:
                    "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
                },
                {
                  label: "Summary Notes",
                  icon: "📝",
                  color:
                    "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
                  onClick: async () => {
                    if (studioDisabled) return;
                    if (selectedSessionId === null) {
                      window.alert("Please select a session first.");
                      return;
                    }
                    setIsGeneratingSummary(true);
                    setSummaryError(null);
                    try {
                      await generateSessionSummary(selectedSessionId);
                      window.alert(
                        "Session summary PDF downloaded successfully!"
                      );
                    } catch (error) {
                      setSummaryError((error as Error).message);
                      window.alert(
                        `Error generating summary: ${(error as Error).message}`
                      );
                    } finally {
                      setIsGeneratingSummary(false);
                    }
                  },
                },
                {
                  label: "Flashcards",
                  icon: "🧠",
                  color:
                    "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
                  onClick: handleFlashcardsClick,
                },
              ].map((tile) => (
                <button
                  key={tile.label}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl py-4 text-[13px] font-medium transition-all",
                    tile.color,
                    studioDisabled ? "cursor-not-allowed" : "hover:shadow-sm"
                  )}
                  onClick={tile.onClick}
                  disabled={
                    studioDisabled ||
                    (isGeneratingAudio && tile.label === "Audio Overview") ||
                    (isGeneratingSummary && tile.label === "Summary Notes") ||
                    (flashcardsLoading && tile.label === "Flashcards")
                  }
                >
                  {isGeneratingAudio && tile.label === "Audio Overview" ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-blue-700 border-t-transparent dark:border-blue-300 dark:border-t-transparent" />
                  ) : isGeneratingSummary && tile.label === "Summary Notes" ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-violet-700 border-t-transparent dark:border-violet-300 dark:border-t-transparent" />
                  ) : flashcardsLoading && tile.label === "Flashcards" ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-rose-700 border-t-transparent dark:border-rose-300 dark:border-t-transparent" />
                  ) : (
                    <span className="text-lg">{tile.icon}</span>
                  )}
                  <span>{tile.label}</span>
                </button>
              ))}
            </div>

            {audioError && (
              <p className="text-xs text-red-500 mt-2">{audioError}</p>
            )}
            {summaryError && (
              <p className="text-xs text-red-500 mt-2">{summaryError}</p>
            )}
          </div>

          {/* Notes Section */}
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
                if (selectedSessionId == null) return;
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

      {isFlashcardModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
          onClick={handleCloseFlashcardModal}
        >
          <div
            className="relative w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl transition-shadow dark:bg-zinc-900 sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
                  Flashcard Drill
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Tap a card to flip between the prompt and answer. Scroll to
                  review all flashcards for this session.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseFlashcardModal}
                >
                  <span className="sr-only">Close flashcards</span>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-6">
              {flashcardsLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-solid border-rose-500 border-t-transparent dark:border-rose-300 dark:border-t-transparent" />
                </div>
              ) : flashcardsError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-200 whitespace-pre-wrap">
                  {flashcardsError}
                </div>
              ) : flashcards.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  No flashcards are available yet. Please check back once they
                  have been generated.
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto pr-1 sm:pr-2">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {flashcards.map((card) => {
                      const flipped = Boolean(flippedCardIds[card.id]);
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => handleFlashcardFlip(card.id)}
                          className={cn(
                            "relative h-44 w-full overflow-hidden rounded-2xl text-left shadow-sm transition-all hover:shadow-md focus:outline-none focus:ring-2",
                            flipped
                              ? "border border-emerald-200 bg-emerald-50/70 focus:ring-emerald-200 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:focus:ring-emerald-700"
                              : "border border-red-200 bg-red-100/70 focus:ring-red-200 dark:border-red-900/40 dark:bg-red-500/20 dark:focus:ring-red-700"
                          )}
                          style={{ perspective: "1200px" }}
                        >
                          <span className="sr-only">
                            Reveal answer for {card.question}
                          </span>
                          <div
                            className="absolute inset-0 h-full w-full"
                            style={{
                              transformStyle: "preserve-3d",
                              transition: "transform 0.6s",
                              transform: flipped
                                ? "rotateY(180deg)"
                                : "rotateY(0deg)",
                            }}
                          >
                            <div
                              className="absolute inset-0 flex h-full w-full flex-col justify-between rounded-2xl bg-red-100/70 p-4 text-zinc-800 dark:bg-red-500/20 dark:text-zinc-100"
                              style={{ backfaceVisibility: "hidden" }}
                            >
                              <div className="text-xs font-semibold uppercase tracking-wide text-red-500 dark:text-red-300">
                                Question
                              </div>
                              <p className="text-sm font-medium leading-relaxed text-red-600 dark:text-red-300">
                                {card.question}
                              </p>
                              <div className="text-[11px] text-red-400 dark:text-red-300/80">
                                Tap to show answer
                              </div>
                            </div>

                            <div
                              className="absolute inset-0 flex h-full w-full flex-col justify-between rounded-2xl bg-emerald-100/70 p-4 text-zinc-800 dark:bg-emerald-500/20 dark:text-zinc-100"
                              style={{
                                backfaceVisibility: "hidden",
                                transform: "rotateY(180deg)",
                              }}
                            >
                              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-200">
                                Answer
                              </div>
                              <p className="text-sm leading-relaxed text-emerald-700 dark:text-emerald-200">
                                {card.answer}
                              </p>
                              <div className="text-[11px] text-emerald-500 dark:text-emerald-200/70">
                                Tap to go back
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* The main loader for uploads, etc. */}
      <Loader isLoading={isUploading} />
    </div>
  );
}
