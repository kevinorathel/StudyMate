export async function generateVideoLesson(sessionId: number): Promise<string> {
    const res = await fetch(
      `http://localhost:8000/generateVideoLesson?session_id=${sessionId}`
    );
    if (!res.ok) {
      throw new Error(`Failed to generate video: ${res.statusText}`);
    }
  
    // Turn response into a downloadable object
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
  
    // Trigger download automatically
    const a = document.createElement("a");
    a.href = url;
    a.download = `studymate_video_overview_${sessionId}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  
    return url;
  }
  