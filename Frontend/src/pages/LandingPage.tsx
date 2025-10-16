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

export default function LandingPage() {
  const [sources, setSources] = React.useState<string[]>([
    "UNEP_Montreal_Protocol_summary.pdf",
    "NOAA_Ozone_watch_notes.md",
    "NASA_Ozone_2023_brief.pdf",
  ]);

  const handleFileSelected = (file: File) => {
    if (!isAcceptedUpload(file)) {
      window.alert("Please upload a PDF or DOCX file.");
      return;
    }

    setSources((prev) => [file.name, ...prev]);
  };

  return (
    <div
      className={`min-h-screen ${gradientBg} text-zinc-900 dark:text-zinc-100 antialiased`}
    >
      <Navbar />
      <Hero sources={sources} />
      <FeatureGrid />
      <DemoCTA sources={sources} onFileSelected={handleFileSelected} />
      <HowItWorks />
      <FAQ />
      <Footer />
    </div>
  );
}
