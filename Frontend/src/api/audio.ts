import { API_BASE_URL } from "@/config";

export async function generateAudioLesson(sessionId: number): Promise<string> {
  const apiUrl = `${API_BASE_URL}/generateAudioLesson?session_id=${sessionId}`;

  const response = await fetch(apiUrl, {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text(); 
    throw new Error(errorText || `Failed to generate audio lesson (HTTP ${response.status})`);
  }

  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = `audio-lesson-${sessionId}.mp3`;
  
  if (contentDisposition) {
      const rfc6266Match = /filename\*=([^;]+)/.exec(contentDisposition);
      if (rfc6266Match && rfc6266Match[1]) {
        let encodedFilename = rfc6266Match[1];
        encodedFilename = encodedFilename.replace(/^(?:UTF-8''|utf-8'')/i, '');
        filename = decodeURIComponent(encodedFilename.replace(/^['"]|['"]$/g, ''));
      } else {
        const rfc2616Match = /filename="([^"]+)"/.exec(contentDisposition);
        if (rfc2616Match && rfc2616Match[1]) {
          filename = rfc2616Match[1];
        } else {
          const unquotedFilenameMatch = /filename=([^;]+)/.exec(contentDisposition);
          if (unquotedFilenameMatch && unquotedFilenameMatch[1]) {
            filename = unquotedFilenameMatch[1].trim();
          }
        }
      }
    }
  
  const filenameParts = filename.split('.');
  const name = filenameParts.slice(0, -1).join('.');
  const ext = filenameParts[filenameParts.length - 1];
  filename = `${name}.${ext}`;

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  
  a.download = filename; 
  
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);


  return filename;
}
