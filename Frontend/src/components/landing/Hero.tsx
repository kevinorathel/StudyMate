import { motion } from "framer-motion";
import { Section } from "./Section";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { NotebookMock } from "./NotebookMock";

export function Hero({ sources }: { sources: string[] }) {
  return (
    <header className="relative overflow-hidden">
      <Section className="py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight"
            >
              Your notes.{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-violet-600 to-emerald-600">
                Explained.
              </span>
            </motion.h1>
            <p className="mt-4 text-lg text-zinc-700 dark:text-zinc-300 max-w-prose">
              Upload textbooks and lecture notes to instantly get concise
              summaries, auto-generated explainer videos, quizzes, and an
              interactive Q&amp;A.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="rounded-full" asChild>
                <a href="#demo">
                  Try the demo{" "}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full"
                asChild
              >
                <a href="#how">See how it works</a>
              </Button>
            </div>

            <div className="mt-6 flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
              <CheckCircle2 className="h-4 w-4" /> No setup •
              <CheckCircle2 className="h-4 w-4" /> Works with PDF &amp; DOCX •
              <CheckCircle2 className="h-4 w-4" /> Private by default
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:pl-6"
          >
            <NotebookMock sources={sources} />
          </motion.div>
        </div>
      </Section>
    </header>
  );
}
