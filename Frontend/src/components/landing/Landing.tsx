import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Headphones,
  FileText,
  Layers,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const handleClick = () => navigate("/login");

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1015] text-zinc-900 dark:text-zinc-100">
      {/* === HERO === */}
      <section className="flex flex-col items-center text-center px-6 py-24 sm:py-32 bg-gradient-to-b from-zinc-50 via-white to-white dark:from-[#0f1015] dark:via-[#111827] dark:to-[#0f1015] relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl relative z-10"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-zinc-800/60 px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300 ring-1 ring-zinc-200 dark:ring-zinc-700 mb-6">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span>AI workspace for your study materials</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-semibold leading-tight mb-6">
            Organize. Understand. Remember.
            <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500">
              Smarter with StudyMate
            </span>
          </h1>

          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-10">
            Upload PDFs or Word documents, ask questions, and generate
            summaries, flashcards, and audio notes — all in one intelligent
            notebook.
          </p>

          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              className="rounded-full px-8"
              onClick={handleClick}
            >
              Open your dashboard
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8"
              onClick={() => navigate("/signup")}
            >
              Create account
            </Button>
          </div>
        </motion.div>

        {/* === HERO VIDEO === */}
        {/* <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-16 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 relative z-10"
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-auto object-cover"
            poster="/images/landing-placeholder.png"
          >
            <source src="/videos/landing-intro.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </motion.div> */}

        <div className="absolute inset-0 bg-gradient-to-t from-white/70 dark:from-[#0f1015]/70 to-transparent pointer-events-none" />
      </section>

      {/* === FEATURE SECTION === */}
      <section className="max-w-6xl mx-auto px-6 py-24 space-y-32">
        {[
          {
            icon: <FileText className="h-6 w-6 text-blue-500" />,
            title: "Your materials, neatly organized",
            text: "Group study files by subject or project. Every upload becomes searchable and chat-ready inside its own session.",
            video: "/Fileupload.mp4",
          },
          {
            icon: <MessageSquare className="h-6 w-6 text-blue-500" />,
            title: "Ask anything – Smart QnA",
            text: "Get precise explanations drawn directly from your documents. No hallucinations, just answers based on what you’ve uploaded.",
            video: "/Smart_QnA.mp4",
          },
          {
            icon: <Layers className="h-6 w-6 text-blue-500" />,
            title: "Summaries & Flashcards in seconds",
            text: "Generate concise study notes or quick-flip flashcards to test yourself. Everything stays linked to the source session.",
            video: "/Flashcards.mp4",
          },
          {
            icon: <Headphones className="h-6 w-6 text-blue-500" />,
            title: "Listen and learn",
            text: "Turn summaries into clear audio overviews for effortless revision on the go.",
            video: "/AudioOverview.mp4",
          },
        ].map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className={`flex flex-col-reverse lg:flex-row ${
              i % 2 === 1 ? "lg:flex-row-reverse" : ""
            } items-center gap-12`}
          >
            {/* Text block */}
            <div className="flex-1 text-center lg:text-left space-y-4">
              <div className="inline-flex items-center gap-2 text-blue-500">
                {f.icon}
                <span className="font-semibold text-sm">Feature {i + 1}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold">{f.title}</h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base">
                {f.text}
              </p>
            </div>

            {/* Media block */}
            <div className="flex-1 flex justify-center">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden w-full max-w-md">
                {f.video ? (
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-auto object-cover"
                    poster="/images/qna-placeholder.png"
                  >
                    <source src={f.video} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <img alt={f.title} className="w-full h-auto object-cover" />
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* === CTA SECTION === */}
      <section className="text-center py-24 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl font-semibold mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-sm opacity-90 mb-8">
            Log in to upload your first session and watch your materials come
            alive.
          </p>
          <Button size="lg" variant="secondary" onClick={handleClick}>
            Go to Login
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
