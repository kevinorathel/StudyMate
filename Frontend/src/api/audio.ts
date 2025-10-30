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
  let filename = `audio-lesson-${sessionId}.mp3`; // Fallback name

  if (contentDisposition) {
      const parts = contentDisposition.split('filename=');
      if (parts.length > 1) {
          filename = parts.pop()!.trim().replace(/['"]|utf-8''/g, '');
          filename = decodeURIComponent(filename);
      }
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  
  a.download = filename; 
  
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);


  return `Audio lesson "${filename}" downloaded successfully.`;
}