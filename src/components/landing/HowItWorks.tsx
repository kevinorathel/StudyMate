import { Section } from "./Section";
import { Step } from "./Step";
import { FeatureCard } from "./FeatureCard";
import { ShieldCheck, Upload, Edit3, BookOpen } from "lucide-react";

export function HowItWorks() {
  return (
    <Section id="how" className="py-14 md:py-20">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            How it works
          </h2>
          <div className="space-y-6">
            <Step
              n={1}
              title="Upload sources"
              desc="PDFs, docs, or pasted notes—all supported with automatic text extraction."
            />
            <Step
              n={2}
              title="Generate study pack"
              desc="Summaries, explainer video, quizzes, and a Q&A bot built from your materials."
            />
            <Step
              n={3}
              title="Iterate & share"
              desc="Edit, export, or share a view-only link with your group."
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <FeatureCard
            icon={ShieldCheck}
            title="Privacy first"
            desc="Your data stays yours. Delete anytime."
          />
          <FeatureCard
            icon={Upload}
            title="Zero setup"
            desc="Works in the browser. No installs required."
          />
          <FeatureCard
            icon={Edit3}
            title="Editable output"
            desc="Tweak summaries and regenerate quizzes in one click."
          />
          <FeatureCard
            icon={BookOpen}
            title="Subject-aware"
            desc="Adjusts tone for STEM, humanities, or GRE/GMAT."
          />
        </div>
      </div>
    </Section>
  );
}
