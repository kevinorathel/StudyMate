import { API_BASE_URL } from "@/config";

export async function generateVideoLesson(sessionId: number): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/generateVideo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ session_id: sessionId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || `Failed to generate video (HTTP ${response.status})`
    );
  }

  const contentDisposition = response.headers.get("Content-Disposition");
  let filename = `studymate_video_overview_${sessionId}.mp4`;

  if (contentDisposition) {
    const rfc6266Match = /filename\*=([^;]+)/.exec(contentDisposition);
    if (rfc6266Match && rfc6266Match[1]) {
      let encodedFilename = rfc6266Match[1];
      encodedFilename = encodedFilename.replace(/^(?:UTF-8''|utf-8'')/i, "");
      filename = decodeURIComponent(encodedFilename.replace(/^['"]|['"]$/g, ""));
    } else {
      const rfc2616Match = /filename="([^"]+)"/.exec(contentDisposition);
      if (rfc2616Match && rfc2616Match[1]) {
        filename = rfc2616Match[1];
      } else {
        const unquotedFilenameMatch = /filename=([^;]+)/.exec(
          contentDisposition
        );
        if (unquotedFilenameMatch && unquotedFilenameMatch[1]) {
          filename = unquotedFilenameMatch[1].trim();
        }
      }
    }
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(downloadUrl);

  return filename;
}
