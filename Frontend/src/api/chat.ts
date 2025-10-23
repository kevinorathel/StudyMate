import { API_BASE_URL } from "@/config";

export type ChatSender = "user" | "assistant";

export interface ChatMessage {
  id: string;
  sender: ChatSender;
  text: string;
  createdAt?: string | null;
}

export interface SessionChatHistory {
  sessionId: number;
  sessionName: string;
  messages: ChatMessage[];
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeSender(value: unknown): ChatSender {
  if (typeof value !== "string") {
    return "assistant";
  }

  const normalized = value.trim().toLowerCase();
  if (["user", "human", "you", "student"].includes(normalized)) {
    return "user";
  }
  if (["assistant", "bot", "ai", "tutor"].includes(normalized)) {
    return "assistant";
  }
  return normalized.startsWith("user") ? "user" : "assistant";
}

function normalizeMessageEntry(
  entry: unknown,
  index: number
): ChatMessage | null {
  if (entry == null) {
    return null;
  }

  if (typeof entry === "string") {
    const colonIndex = entry.indexOf(":");
    if (colonIndex > -1) {
      const sender = normalizeSender(entry.slice(0, colonIndex));
      const text = entry.slice(colonIndex + 1).trim();
      return {
        id: `line-${index}`,
        sender,
        text,
      };
    }

    return {
      id: `line-${index}`,
      sender: "assistant",
      text: entry,
    };
  }

  if (Array.isArray(entry)) {
    const [rawSender, rawText, rawCreatedAt] = entry;
    const sender = normalizeSender(rawSender);
    const text =
      typeof rawText === "string"
        ? rawText
        : rawText != null
        ? String(rawText)
        : "";
    const createdAt =
      typeof rawCreatedAt === "string" ? rawCreatedAt : undefined;
    return {
      id: `line-${index}`,
      sender,
      text,
      createdAt,
    };
  }

  if (typeof entry === "object") {
    const record = entry as Record<string, unknown>;
    const sender = normalizeSender(
      record.sender ?? record.role ?? record.author
    );
    const textValue =
      record.message ?? record.text ?? record.content ?? record.body ?? "";
    const text =
      typeof textValue === "string"
        ? textValue
        : textValue != null
        ? String(textValue)
        : "";
    const createdAt =
      typeof record.created_at === "string"
        ? record.created_at
        : typeof record.timestamp === "string"
        ? record.timestamp
        : typeof record.createdAt === "string"
        ? record.createdAt
        : undefined;

    const idSource =
      record.id ??
      record.message_id ??
      record.messageId ??
      record.pk ??
      record.uuid ??
      index;

    const id =
      typeof idSource === "string"
        ? idSource
        : typeof idSource === "number" && Number.isFinite(idSource)
        ? `line-${idSource}`
        : `line-${index}`;

    return {
      id,
      sender,
      text,
      createdAt,
    };
  }

  return null;
}

function extractEntries(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["response", "responses", "messages", "history", "data"]) {
      const candidate = record[key];
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function extractSessionEntries(payload: unknown): unknown[] | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const direct = record.sessions ?? record.session_history ?? record.histories;
  if (Array.isArray(direct)) {
    return direct;
  }
  if (direct && typeof direct === "object") {
    return Object.values(direct as Record<string, unknown>);
  }

  for (const key of ["data", "results", "items"]) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return null;
}

function normalizeSessionHistory(raw: unknown): SessionChatHistory | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const id = toNumber(
    record.session_id ??
      record.sessionId ??
      record.id ??
      record.pk ??
      record.identifier
  );
  if (id === null) {
    return null;
  }

  const rawName =
    record.session_name ??
    record.sessionName ??
    record.name ??
    record.title ??
    `Session ${id}`;
  const sessionName =
    typeof rawName === "string" && rawName.trim().length > 0
      ? rawName.trim()
      : `Session ${id}`;

  const rawMessages =
    record.messages ??
    record.history ??
    record.entries ??
    record.response ??
    [];

  const entries = Array.isArray(rawMessages)
    ? rawMessages
    : extractEntries(rawMessages) ?? [];

  const messages: ChatMessage[] = [];
  entries.forEach((entry, index) => {
    const normalized = normalizeMessageEntry(entry, index);
    if (normalized) {
      messages.push(normalized);
    }
  });

  return {
    sessionId: id,
    sessionName,
    messages,
  };
}

export async function fetchChatHistory(
  sessionId: number
): Promise<ChatMessage[]> {
  if (!Number.isFinite(sessionId)) {
    throw new Error("A valid session id is required to load chat history.");
  }

  const candidates = [
    `${API_BASE_URL}/retrieveChatHistory/?session_id=${sessionId}`,
    `${API_BASE_URL}/retrieveChatHistory?session_id=${sessionId}`,
    `${API_BASE_URL}/sessions/${sessionId}/history`,
    `${API_BASE_URL}/api/sessions/${sessionId}/history`,
  ];

  const errors: string[] = [];

  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        errors.push(`${url} → ${response.status}`);
        continue;
      }

      const payload = await response.json();
      const entries = extractEntries(payload);
      if (!entries) {
        errors.push(`${url} → Unexpected payload shape`);
        continue;
      }

      return entries
        .map(normalizeMessageEntry)
        .filter((item): item is ChatMessage => item !== null);
    } catch (error) {
      errors.push(`${url} → ${(error as Error).message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Unable to load chat history. Tried endpoints:\n${errors.join("\n")}`
    );
  }

  return [];
}

export async function fetchChatHistoriesForUser(
  userId: number
): Promise<Record<number, SessionChatHistory>> {
  if (!Number.isFinite(userId)) {
    throw new Error("A valid numeric user id is required to load chat history.");
  }

  const candidates = [
    `${API_BASE_URL}/retrieveChatHistory/?user_id=${userId}`,
    `${API_BASE_URL}/retrieveChatHistory?user_id=${userId}`,
  ];

  const errors: string[] = [];

  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        errors.push(`${url} → ${response.status}`);
        continue;
      }

      const payload = await response.json();
      const rawSessions = extractSessionEntries(payload);
      if (!rawSessions) {
        errors.push(`${url} → Unexpected payload shape`);
        continue;
      }

      const histories: Record<number, SessionChatHistory> = {};
      rawSessions.forEach((raw) => {
        const normalized = normalizeSessionHistory(raw);
        if (
          normalized &&
          Number.isFinite(normalized.sessionId) &&
          histories[normalized.sessionId] == null
        ) {
          histories[normalized.sessionId] = normalized;
        }
      });

      return histories;
    } catch (error) {
      errors.push(`${url} → ${(error as Error).message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Unable to load chat history. Tried endpoints:\n${errors.join("\n")}`
    );
  }

  return {};
}

function extractAnswer(payload: unknown): string | null {
  if (payload == null) {
    return null;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const direct =
      record.response ??
      record.answer ??
      record.reply ??
      record.data ??
      record.result ??
      null;

    if (typeof direct === "string") {
      return direct;
    }

    if (direct && typeof direct === "object") {
      return extractAnswer(direct);
    }
  }

  return null;
}

export async function askQuestion(
  sessionId: number,
  question: string
): Promise<string> {
  if (!Number.isFinite(sessionId)) {
    throw new Error("A valid session id is required to ask a question.");
  }
  if (!question.trim()) {
    throw new Error("Question text is required.");
  }

  const body = JSON.stringify({
    session_id: sessionId,
    question,
  });

  const postCandidates = [
    `${API_BASE_URL}/ask/`,
    `${API_BASE_URL}/ask`,
    `${API_BASE_URL}/api/ask/`,
    `${API_BASE_URL}/api/ask`,
    `${API_BASE_URL}/sessions/${sessionId}/ask`,
  ];

  const errors: string[] = [];

  for (const url of postCandidates) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!response.ok) {
        errors.push(`${url} → ${response.status}`);
        continue;
      }

      const payload = await response.json();
      const answer = extractAnswer(payload);
      if (answer !== null) {
        return answer;
      }
      errors.push(`${url} → Unexpected payload shape`);
    } catch (error) {
      errors.push(`${url} → ${(error as Error).message}`);
    }
  }

  // Fallback to GET with query parameters if POST endpoints fail.
  const encodedQuestion = encodeURIComponent(question);
  const getCandidates = [
    `${API_BASE_URL}/ask/?session_id=${sessionId}&question=${encodedQuestion}`,
    `${API_BASE_URL}/ask?session_id=${sessionId}&question=${encodedQuestion}`,
    `${API_BASE_URL}/api/ask/?session_id=${sessionId}&question=${encodedQuestion}`,
    `${API_BASE_URL}/api/ask?session_id=${sessionId}&question=${encodedQuestion}`,
  ];

  for (const url of getCandidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        errors.push(`${url} → ${response.status}`);
        continue;
      }

      const payload = await response.json();
      const answer = extractAnswer(payload);
      if (answer !== null) {
        return answer;
      }
      errors.push(`${url} → Unexpected payload shape`);
    } catch (error) {
      errors.push(`${url} → ${(error as Error).message}`);
    }
  }

  const message =
    errors.length > 0
      ? `Unable to get an answer from the server:\n${errors.join("\n")}`
      : "Unable to get an answer from the server.";
  throw new Error(message);
}
