import { API_BASE_URL } from "@/config";

export interface UploadDocumentResult {
  message: string;
  document_id: number;
  session_id: number;
  session_name: string;
}

interface UploadDocumentArgs {
  file: File;
  userId: number;
  sessionId?: number | string;
}

export async function uploadDocument({
  file,
  userId,
  sessionId,
}: UploadDocumentArgs): Promise<UploadDocumentResult> {
  if (!Number.isFinite(userId)) {
    throw new Error("A valid numeric user id is required for uploads.");
  }

  const params = new URLSearchParams({ user_id: String(userId) });
  if (sessionId !== undefined && sessionId !== null) {
    params.append("session_id", String(sessionId));
  }

  const url = `${API_BASE_URL}/upload/?${params.toString()}`;
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = `Upload failed with status ${response.status}.`;
    try {
      const errorBody = await response.json();
      if (typeof errorBody?.detail === "string") {
        message = errorBody.detail;
      }
    } catch {
      // ignore JSON parse errors and fall back to default message
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as UploadDocumentResult;
  return payload;
}
