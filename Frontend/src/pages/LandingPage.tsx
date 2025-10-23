import * as React from "react";
import {
  gradientBg,
  Navbar,
  Hero,
  FeatureGrid,
  DemoCTA,
  HowItWorks,
  FAQ,
  Footer,
} from "@/components/landing";
import { isAcceptedUpload } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { uploadDocument } from "@/api/uploads";

export default function LandingPage() {
  const { authToken } = useAuth();
  const [sources, setSources] = React.useState<string[]>([
    "UNEP_Montreal_Protocol_summary.pdf",
    "NOAA_Ozone_watch_notes.md",
    "NASA_Ozone_2023_brief.pdf",
  ]);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFileSelected = async (file: File) => {
    if (!isAcceptedUpload(file)) {
      window.alert("Please upload a PDF or DOCX file.");
      return;
    }

    if (!authToken) {
      window.alert("Please log in before uploading a document.");
      return;
    }

    const userId = Number(authToken);
    if (!Number.isFinite(userId)) {
      window.alert(
        "We couldn't determine your account. Please sign out and sign back in."
      );
      return;
    }

    setIsUploading(true);
    try {
      await uploadDocument({ file, userId });
      setSources((prev) => [file.name, ...prev]);
      window.alert(
        "Your document is being processed. You can continue in the dashboard."
      );
    } catch (error) {
      console.error("Upload failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't upload the document. Please try again.";
      window.alert(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={`min-h-screen ${gradientBg} text-zinc-900 dark:text-zinc-100 antialiased`}
    >
      <Navbar />
      <Hero sources={sources} />
      <FeatureGrid />
      <DemoCTA
        sources={sources}
        onFileSelected={handleFileSelected}
        isUploading={isUploading}
      />
      <HowItWorks />
      <FAQ />
      <Footer />
    </div>
  );
}
