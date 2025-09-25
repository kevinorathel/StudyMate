import { Section } from "./Section";
import { FeatureCard } from "./FeatureCard";
import { Sparkles, Film, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function FeatureGrid() {
  return (
    <Section id="features" className="py-14 md:py-20">
      <div className="flex items-center gap-2 mb-6">
        <Badge variant="secondary" className="rounded-full">
          Core features
        </Badge>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Built for fast studying
        </span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FeatureCard
          icon={Sparkles}
          title="AI Notes"
          desc="Get crisp, citation-aware summaries tailored to your course."
        />
        <FeatureCard
          icon={Film}
          title="Explainer Videos"
          desc="Short, auto-generated videos break down tough topics quickly."
        />
        <FeatureCard
          icon={MessageSquare}
          title="Interactive Q&A"
          desc="Ask follow-up questions to clarify definitions and proofs."
        />
        {/* <FeatureCard
          icon={Edit3}
          title="Quiz Builder"
          desc="Generate practice questions with instant feedback."
        /> */}
      </div>
    </Section>
  );
}