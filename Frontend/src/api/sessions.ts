import { API_BASE_URL } from "@/config";

export interface SessionDocument {
  id: number;
  title: string;
  uploadedAt?: string | null;
}

export interface SessionSummary {
  id: number;
  name: string;
  documents: SessionDocument[];
}

export interface CreateSessionArgs {
  userId: number;
  name?: string;
}

type RawSession = Record<string, unknown>;

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

function normalizeDocument(
  raw: unknown,
  fallbackIndex: number
): SessionDocument | null {
  if (typeof raw === "string") {
    return { id: fallbackIndex, title: raw };
  }
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const rawId =
    record.document_id ??
    record.documentId ??
    record.id ??
    record.file_id ??
    record.fileId ??
    record.pk;
  const parsedId = toNumber(rawId);
  const id = parsedId ?? fallbackIndex;

  const rawTitle =
    record.document_title ??
    record.documentTitle ??
    record.title ??
    record.name ??
    record.filename ??
    record.file_name ??
    record.label;
  const title = typeof rawTitle === "string" ? rawTitle : `File ${id}`;

  const uploadedAt =
    typeof record.created_at === "string"
      ? record.created_at
      : typeof record.uploaded_at === "string"
      ? record.uploaded_at
      : typeof record.createdAt === "string"
      ? record.createdAt
      : null;

  return { id, title, uploadedAt };
}

function collectDocuments(raw: unknown): SessionDocument[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item, index) => normalizeDocument(item, index + 1))
      .filter((item): item is SessionDocument => item !== null);
  }
  if (raw && typeof raw === "object") {
    const values = Object.values(raw as Record<string, unknown>);
    return values
      .map((item, index) => normalizeDocument(item, index + 1))
      .filter((item): item is SessionDocument => item !== null);
  }
  return [];
}

function normalizeSession(input: unknown): SessionSummary | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const raw = input as RawSession;
  const rawId =
    raw.session_id ?? raw.sessionId ?? raw.id ?? raw.pk ?? raw.identifier;
  const id = toNumber(rawId);
  if (id === null) {
    return null;
  }

  const rawName =
    raw.session_name ??
    raw.sessionName ??
    raw.name ??
    raw.title ??
    raw.label ??
    `Session ${id}`;
  const name =
    typeof rawName === "string" && rawName.trim().length > 0
      ? rawName.trim()
      : `Session ${id}`;

  const documents = collectDocuments(
    raw.documents ??
      raw.files ??
      raw.session_documents ??
      raw.docs ??
      raw.items ??
      raw.sources
  );

  return { id, name, documents };
}

function normalizeSessions(payload: unknown): SessionSummary[] | null {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload
      .map(normalizeSession)
      .filter((item): item is SessionSummary => item !== null);
  }

  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    for (const key of ["sessions", "data", "results", "items", "records"]) {
      const candidate = record[key];
      if (Array.isArray(candidate)) {
        return candidate
          .map(normalizeSession)
          .filter((item): item is SessionSummary => item !== null);
      }
    }

    const values = Object.values(record);
    if (values.length > 0 && values.every((value) => typeof value === "object")) {
      return values
        .map(normalizeSession)
        .filter((item): item is SessionSummary => item !== null);
    }
  }

  return null;
}

export async function fetchSessions(
  userId: number
): Promise<SessionSummary[]> {
  if (!Number.isFinite(userId)) {
    throw new Error("A valid numeric user id is required to load sessions.");
  }

  const candidates = [
    `${API_BASE_URL}/sessions/?user_id=${userId}`,
    `${API_BASE_URL}/sessions?user_id=${userId}`,
    `${API_BASE_URL}/api/sessions/?user_id=${userId}`,
    `${API_BASE_URL}/api/sessions?user_id=${userId}`,
    `${API_BASE_URL}/user-sessions/?user_id=${userId}`,
    `${API_BASE_URL}/user-sessions?user_id=${userId}`,
    `${API_BASE_URL}/user/${userId}/sessions`,
    `${API_BASE_URL}/getSessions/?user_id=${userId}`,
    `${API_BASE_URL}/getSessions?user_id=${userId}`,
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
      const sessions = normalizeSessions(payload);
      if (sessions !== null) {
        return sessions;
      }
      errors.push(`${url} → Unexpected payload shape`);
    } catch (error) {
      errors.push(`${url} → ${(error as Error).message}`);
    }
  }

  const errorMessage =
    errors.length > 0
      ? `Unable to load sessions. Tried endpoints:\n${errors.join("\n")}`
      : "Unable to load sessions.";
  throw new Error(errorMessage);
}

export async function createSession({
  userId,
  name,
}: CreateSessionArgs): Promise<SessionSummary> {
  if (!Number.isFinite(userId)) {
    throw new Error("A valid numeric user id is required to create a session.");
  }

  const payload =
    name && name.trim().length > 0
      ? { user_id: userId, session_name: name.trim() }
      : { user_id: userId };

  const candidates = [
    `${API_BASE_URL}/sessions/`,
    `${API_BASE_URL}/sessions`,
    `${API_BASE_URL}/api/sessions/`,
    `${API_BASE_URL}/api/sessions`,
  ];

  const errors: string[] = [];

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        errors.push(`${url} → ${response.status}`);
        continue;
      }

      const data = await response.json();
      const normalized = normalizeSession(data);
      if (normalized) {
        return normalized;
      }
      errors.push(`${url} → Unexpected payload shape`);
    } catch (error) {
      errors.push(`${url} → ${(error as Error).message}`);
    }
  }

  const message =
    errors.length > 0
      ? `Unable to create session. Tried endpoints:\n${errors.join("\n")}`
      : "Unable to create session.";
  throw new Error(message);
}
