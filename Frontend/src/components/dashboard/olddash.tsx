// // This is the Old Dashboard Page so don't touch this code, this is just for my reference

// import * as React from "react";
// import { DashboardHeader } from "./DashboardHeader";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card, CardContent, CardHeader } from "@/components/ui/card";
// import { cn, ACCEPTED_FILE_ACCEPT, isAcceptedUpload } from "@/lib/utils";
// import {
//   Sparkles,
//   Send,
//   MessageSquare,
//   CheckCircle2,
//   ListChecks,
//   BookOpen,
// } from "lucide-react";

// type Notebook = {
//   id: string;
//   title: string;
//   subject: string;
//   sourceCount: number;
//   createdAt: string;
//   lastUpdated: string;
// };

// type Message = {
//   id: string;
//   sender: "user" | "assistant";
//   text: string;
// };

// type SourceStatus = "Indexed" | "Processing" | "Queued";
// type SourceTag = "Lecture" | "Article" | "Notes" | "Practice" | "Reference";
// type SourceType = "PDF" | "DOCX" | "Link";

// type SourceItem = {
//   id: string;
//   title: string;
//   type: SourceType;
//   tag: SourceTag;
//   status: SourceStatus;
//   pages?: number;
//   addedOn: string;
//   lastIndexed?: string;
//   snippet?: string;
//   citeLabel: string;
// };

// type ViewKey = "summary" | "outline" | "flashcards";

// type NotebookCitation = {
//   id: string;
//   sourceId: string;
//   label: string;
//   snippet: string;
// };

// type BulletPoint = {
//   id: string;
//   text: string;
//   cite?: string;
// };

// type GlossaryEntry = {
//   id: string;
//   term: string;
//   definition: string;
//   cite?: string;
// };

// type ChecklistItem = {
//   id: string;
//   label: string;
//   cite?: string;
// };

// type Flashcard = {
//   id: string;
//   front: string;
//   back: string;
//   cite?: string;
// };

// type BulletModule = {
//   kind: "bullets";
//   id: string;
//   title: string;
//   description?: string;
//   bullets: BulletPoint[];
// };

// type GlossaryModule = {
//   kind: "glossary";
//   id: string;
//   title: string;
//   terms: GlossaryEntry[];
// };

// type ChecklistModule = {
//   kind: "checklist";
//   id: string;
//   title: string;
//   items: ChecklistItem[];
// };

// type FlashcardModule = {
//   kind: "flashcards";
//   id: string;
//   title: string;
//   cards: Flashcard[];
// };

// type ModuleContent =
//   | BulletModule
//   | GlossaryModule
//   | ChecklistModule
//   | FlashcardModule;

// type ViewContent = {
//   helperText?: string;
//   modules: ModuleContent[];
// };

// type NotebookContent = {
//   views: Record<ViewKey, ViewContent>;
//   citations: Record<string, NotebookCitation>;
// };

// type FileUploadTarget =
//   | { mode: "new" }
//   | { mode: "existing"; notebookId: string }
//   | null;

// const defaultPrompts = [
//   "Summarize the key ideas",
//   "Help me plan my next study session",
//   "What should I study next?",
// ];

// const promptsByNotebook: Record<string, string[]> = {
//   "1": [
//     "Explain how the Montreal Protocol works",
//     "What drives seasonal ozone depletion?",
//     "List three key takeaways I should review",
//   ],
//   "2": [
//     "Walk me through big-O for stacks vs queues",
//     "Compare AVL trees and red-black trees",
//     "Compare recursion and iteration for tree traversal",
//   ],
//   "3": [
//     "Highlight challenging GRE vocabulary",
//     "Summarize the key reading strategies",
//     "Suggest a warm-up exercise for verbal reasoning",
//   ],
// };

// const mockNotebooks: Notebook[] = [
//   {
//     id: "1",
//     title: "Environmental Science 101",
//     subject: "Climate systems",
//     sourceCount: 3,
//     createdAt: "Sep 20, 2025",
//     lastUpdated: "2 hours ago",
//   },
//   {
//     id: "2",
//     title: "Algorithms & Data Structures",
//     subject: "CS prep",
//     sourceCount: 5,
//     createdAt: "Sep 18, 2025",
//     lastUpdated: "Yesterday",
//   },
//   {
//     id: "3",
//     title: "GRE Verbal Booster",
//     subject: "Test prep",
//     sourceCount: 2,
//     createdAt: "Sep 16, 2025",
//     lastUpdated: "Mon",
//   },
// ];

// const initialSourcesByNotebook: Record<string, SourceItem[]> = {
//   "1": [
//     {
//       id: "env-source-1",
//       title: "UNEP Montreal Protocol summary.pdf",
//       type: "PDF",
//       tag: "Lecture",
//       status: "Indexed",
//       pages: 24,
//       addedOn: "Sep 17",
//       lastIndexed: "2h ago",
//       snippet:
//         "Highlights the phasedown of ozone-depleting substances and compliance milestones.",
//       citeLabel: "PDF · pg 12",
//     },
//     {
//       id: "env-source-2",
//       title: "NOAA Ozone watch notes.md",
//       type: "Link",
//       tag: "Notes",
//       status: "Indexed",
//       pages: 8,
//       addedOn: "Sep 15",
//       lastIndexed: "1d ago",
//       snippet:
//         "Daily readings with focus on polar stratospheric cloud formation.",
//       citeLabel: "Notes · sec 2",
//     },
//     {
//       id: "env-source-3",
//       title: "NASA Ozone 2023 brief.pdf",
//       type: "PDF",
//       tag: "Article",
//       status: "Indexed",
//       pages: 12,
//       addedOn: "Sep 12",
//       lastIndexed: "3d ago",
//       snippet:
//         "Satellite imagery summary of the 2023 ozone hole area and depth.",
//       citeLabel: "PDF · pg 4",
//     },
//   ],
//   "2": [
//     {
//       id: "algo-source-1",
//       title: "CLRS Chapter 1.pdf",
//       type: "PDF",
//       tag: "Lecture",
//       status: "Indexed",
//       pages: 32,
//       addedOn: "Sep 14",
//       lastIndexed: "4h ago",
//       snippet:
//         "Introduces algorithmic foundations, growth of functions, and analysis.",
//       citeLabel: "PDF · pg 5",
//     },
//     {
//       id: "algo-source-2",
//       title: "Tutor session recap.docx",
//       type: "DOCX",
//       tag: "Notes",
//       status: "Indexed",
//       pages: 5,
//       addedOn: "Sep 13",
//       lastIndexed: "Yesterday",
//       snippet:
//         "Explains tree rotations plus practice prompts for AVL balancing.",
//       citeLabel: "DOCX · pg 2",
//     },
//     {
//       id: "algo-source-3",
//       title: "Stanford CS lecture 2 outline.pdf",
//       type: "PDF",
//       tag: "Lecture",
//       status: "Indexed",
//       pages: 18,
//       addedOn: "Sep 10",
//       lastIndexed: "Sun",
//       snippet:
//         "Covers asymptotic notation, stack/queue trade-offs, and amortized cost.",
//       citeLabel: "PDF · pg 9",
//     },
//     {
//       id: "algo-source-4",
//       title: "Practice set — amortized analysis.pdf",
//       type: "PDF",
//       tag: "Practice",
//       status: "Indexed",
//       pages: 6,
//       addedOn: "Sep 09",
//       lastIndexed: "Sat",
//       snippet: "Includes banker's method walkthrough and potential functions.",
//       citeLabel: "PDF · pg 3",
//     },
//     {
//       id: "algo-source-5",
//       title: "Reference cheat sheet.png",
//       type: "Link",
//       tag: "Reference",
//       status: "Indexed",
//       pages: 1,
//       addedOn: "Sep 07",
//       lastIndexed: "Fri",
//       snippet: "Big-O quick reference for common data structures.",
//       citeLabel: "Reference · quick",
//     },
//   ],
//   "3": [
//     {
//       id: "gre-source-1",
//       title: "ETS verbal strategies.pdf",
//       type: "PDF",
//       tag: "Article",
//       status: "Indexed",
//       pages: 20,
//       addedOn: "Sep 16",
//       lastIndexed: "Mon",
//       snippet:
//         "Covers pacing, elimination strategies, and question family checklists.",
//       citeLabel: "PDF · pg 6",
//     },
//     {
//       id: "gre-source-2",
//       title: "Word list — session 4.docx",
//       type: "DOCX",
//       tag: "Notes",
//       status: "Indexed",
//       pages: 9,
//       addedOn: "Sep 15",
//       lastIndexed: "Mon",
//       snippet:
//         "Fifty high-frequency vocabulary terms with contextual sentences.",
//       citeLabel: "DOCX · pg 4",
//     },
//   ],
// };

// const initialContentByNotebook: Record<string, NotebookContent> = {
//   "1": {
//     citations: {
//       "cite-env-1": {
//         id: "cite-env-1",
//         sourceId: "env-source-1",
//         label: "PDF · pg 12",
//         snippet:
//           "UNEP summary highlights the chlorine/bromine catalytic cycle that erodes ozone.",
//       },
//       "cite-env-2": {
//         id: "cite-env-2",
//         sourceId: "env-source-2",
//         label: "Notes · sec 2",
//         snippet:
//           "NOAA log discusses polar stratospheric clouds and sunrise-driven reactions.",
//       },
//       "cite-env-3": {
//         id: "cite-env-3",
//         sourceId: "env-source-3",
//         label: "PDF · pg 4",
//         snippet:
//           "NASA brief tracks the 2023 ozone hole extent with satellite imagery.",
//       },
//     },
//     views: {
//       summary: {
//         modules: [
//           {
//             kind: "bullets",
//             id: "env-summary",
//             title: "Key takeaways",
//             bullets: [
//               {
//                 id: "env-summary-b1",
//                 text: "The stratospheric ozone layer shields life from harmful UV-B radiation, and depletion spikes when PSCs activate halogens.",
//                 cite: "cite-env-1",
//               },
//               {
//                 id: "env-summary-b2",
//                 text: "The 2023 Antarctic ozone hole averaged 8.9 million sq mi with a 10 million sq mi peak as cold vortex patterns persisted.",
//                 cite: "cite-env-3",
//               },
//               {
//                 id: "env-summary-b3",
//                 text: "Montreal Protocol enforcement keeps halogen loading trending down, supporting gradual atmospheric recovery.",
//                 cite: "cite-env-1",
//               },
//               {
//                 id: "env-summary-b4",
//                 text: "Daily NOAA field notes flag PSC formation and sunrise return as leading indicators for rapid depletion.",
//                 cite: "cite-env-2",
//               },
//             ],
//           },
//           {
//             kind: "checklist",
//             id: "env-actions",
//             title: "Next actions",
//             items: [
//               {
//                 id: "env-action-1",
//                 label:
//                   "Contrast PSC formation pathways with catalytic reaction steps.",
//                 cite: "cite-env-2",
//               },
//               {
//                 id: "env-action-2",
//                 label:
//                   "Map Montreal Protocol milestones to observed ozone recovery.",
//                 cite: "cite-env-1",
//               },
//               {
//                 id: "env-action-3",
//                 label: "Review NASA visuals for September peak anomalies.",
//                 cite: "cite-env-3",
//               },
//             ],
//           },
//           {
//             kind: "glossary",
//             id: "env-glossary",
//             title: "Glossary",
//             terms: [
//               {
//                 id: "env-glossary-1",
//                 term: "Polar Stratospheric Cloud",
//                 definition:
//                   "High-altitude ice particles that enable chlorine activation leading to rapid ozone loss.",
//                 cite: "cite-env-2",
//               },
//               {
//                 id: "env-glossary-2",
//                 term: "Dobson Unit",
//                 definition:
//                   "Measurement of ozone column thickness; baseline for comparing depletion events.",
//                 cite: "cite-env-3",
//               },
//               {
//                 id: "env-glossary-3",
//                 term: "Halogen Loading",
//                 definition:
//                   "Total chlorine and bromine concentration indicating depletion potential.",
//                 cite: "cite-env-1",
//               },
//             ],
//           },
//         ],
//       },
//       outline: {
//         helperText: "Lecture-ready outline based on your readings.",
//         modules: [
//           {
//             kind: "bullets",
//             id: "env-outline",
//             title: "Session flow",
//             bullets: [
//               {
//                 id: "env-outline-1",
//                 text: "Review ozone chemistry fundamentals and protective role.",
//                 cite: "cite-env-1",
//               },
//               {
//                 id: "env-outline-2",
//                 text: "Walk through seasonal dynamics and PSC triggers.",
//                 cite: "cite-env-2",
//               },
//               {
//                 id: "env-outline-3",
//                 text: "Discuss 2023 case study with NASA imagery and metrics.",
//                 cite: "cite-env-3",
//               },
//             ],
//           },
//           {
//             kind: "bullets",
//             id: "env-outline-insights",
//             title: "Why it matters",
//             bullets: [
//               {
//                 id: "env-outline-4",
//                 text: "Connect regulatory milestones to modeled recovery timelines.",
//                 cite: "cite-env-1",
//               },
//               {
//                 id: "env-outline-5",
//                 text: "Identify observational gaps flagged in NOAA daily notes.",
//                 cite: "cite-env-2",
//               },
//             ],
//           },
//         ],
//       },
//       flashcards: {
//         helperText: "Quick flashcards ready for a 5-minute drill.",
//         modules: [
//           {
//             kind: "flashcards",
//             id: "env-flashcards",
//             title: "Rapid review",
//             cards: [
//               {
//                 id: "env-card-1",
//                 front: "What triggers peak ozone depletion over Antarctica?",
//                 back: "Cold PSCs activate chlorine and bromine, which rapidly destroy ozone when sunlight returns.",
//                 cite: "cite-env-2",
//               },
//               {
//                 id: "env-card-2",
//                 front: "How large was the 2023 ozone hole?",
//                 back: "It averaged about 8.9 million sq mi in Sept–Oct with a 10 million sq mi peak.",
//                 cite: "cite-env-3",
//               },
//               {
//                 id: "env-card-3",
//                 front: "Why is the Montreal Protocol pivotal?",
//                 back: "It phased out ozone-depleting substances, supporting long-term recovery.",
//                 cite: "cite-env-1",
//               },
//             ],
//           },
//         ],
//       },
//     },
//   },
//   "2": {
//     citations: {
//       "cite-algo-1": {
//         id: "cite-algo-1",
//         sourceId: "algo-source-1",
//         label: "PDF · pg 5",
//         snippet:
//           "CLRS introduction compares growth rates and algorithm analysis patterns.",
//       },
//       "cite-algo-2": {
//         id: "cite-algo-2",
//         sourceId: "algo-source-2",
//         label: "DOCX · pg 2",
//         snippet:
//           "Recap doc outlines AVL rotations and when to rebalance nodes.",
//       },
//       "cite-algo-3": {
//         id: "cite-algo-3",
//         sourceId: "algo-source-3",
//         label: "PDF · pg 9",
//         snippet:
//           "Lecture outline dives into queue amortized analysis and scheduling CS examples.",
//       },
//       "cite-algo-4": {
//         id: "cite-algo-4",
//         sourceId: "algo-source-4",
//         label: "PDF · pg 3",
//         snippet:
//           "Practice set demonstrates banker’s method for dynamic array pushes.",
//       },
//       "cite-algo-5": {
//         id: "cite-algo-5",
//         sourceId: "algo-source-5",
//         label: "Reference · quick",
//         snippet: "One-page Big-O cheat sheet for core data structures.",
//       },
//     },
//     views: {
//       summary: {
//         helperText:
//           "Synthesized from CLRS, tutoring notes, and lecture outlines.",
//         modules: [
//           {
//             kind: "bullets",
//             id: "algo-summary",
//             title: "Key takeaways",
//             bullets: [
//               {
//                 id: "algo-summary-b1",
//                 text: "Asymptotic notation captures growth trends; prioritize dominant terms when summarizing complexity.",
//                 cite: "cite-algo-1",
//               },
//               {
//                 id: "algo-summary-b2",
//                 text: "AVL rotations restore balance by adjusting four core patterns (LL, RR, LR, RL).",
//                 cite: "cite-algo-2",
//               },
//               {
//                 id: "algo-summary-b3",
//                 text: "Amortized analysis smooths expensive operations by attributing potential to cheap steps.",
//                 cite: "cite-algo-4",
//               },
//               {
//                 id: "algo-summary-b4",
//                 text: "Stacks vs queues trade LIFO vs FIFO semantics—use amortized tables to justify design choices.",
//                 cite: "cite-algo-3",
//               },
//             ],
//           },
//           {
//             kind: "checklist",
//             id: "algo-actions",
//             title: "Practice plan",
//             items: [
//               {
//                 id: "algo-action-1",
//                 label: "Re-derive big-O for combined stack/queue workloads.",
//                 cite: "cite-algo-3",
//               },
//               {
//                 id: "algo-action-2",
//                 label:
//                   "Code AVL rotations from memory and verify balance factors.",
//                 cite: "cite-algo-2",
//               },
//               {
//                 id: "algo-action-3",
//                 label:
//                   "Explain banker’s method using the dynamic array example.",
//                 cite: "cite-algo-4",
//               },
//             ],
//           },
//           {
//             kind: "glossary",
//             id: "algo-glossary",
//             title: "Glossary",
//             terms: [
//               {
//                 id: "algo-glossary-1",
//                 term: "Asymptotic Upper Bound",
//                 definition:
//                   "A function g(n) that bounds f(n) from above for sufficiently large n.",
//                 cite: "cite-algo-1",
//               },
//               {
//                 id: "algo-glossary-2",
//                 term: "Rotation",
//                 definition:
//                   "Tree restructuring operation that restores balance without violating BST order.",
//                 cite: "cite-algo-2",
//               },
//               {
//                 id: "algo-glossary-3",
//                 term: "Potential Function",
//                 definition:
//                   "An accounting tool that tracks stored work to analyze amortized cost.",
//                 cite: "cite-algo-4",
//               },
//             ],
//           },
//         ],
//       },
//       outline: {
//         helperText: "Use this pathway to explain the topic on a whiteboard.",
//         modules: [
//           {
//             kind: "bullets",
//             id: "algo-outline",
//             title: "Session outline",
//             bullets: [
//               {
//                 id: "algo-outline-1",
//                 text: "Define growth of functions and key asymptotic symbols.",
//                 cite: "cite-algo-1",
//               },
//               {
//                 id: "algo-outline-2",
//                 text: "Illustrate stack vs queue performance using amortized reasoning.",
//                 cite: "cite-algo-3",
//               },
//               {
//                 id: "algo-outline-3",
//                 text: "Walk through AVL balancing with rotation diagrams.",
//                 cite: "cite-algo-2",
//               },
//             ],
//           },
//           {
//             kind: "bullets",
//             id: "algo-outline-drill",
//             title: "Deep-dive prompts",
//             bullets: [
//               {
//                 id: "algo-outline-4",
//                 text: "Compare aggregate vs banker’s method on dynamic arrays.",
//                 cite: "cite-algo-4",
//               },
//               {
//                 id: "algo-outline-5",
//                 text: "Tie cheat sheet formulas back to derived proofs.",
//                 cite: "cite-algo-5",
//               },
//             ],
//           },
//         ],
//       },
//       flashcards: {
//         helperText: "Cycle through until you can answer each in under 10s.",
//         modules: [
//           {
//             kind: "flashcards",
//             id: "algo-flashcards",
//             title: "Spot checks",
//             cards: [
//               {
//                 id: "algo-card-1",
//                 front: "Why do we focus on the highest-order term in big-O?",
//                 back: "Because lower-order terms vanish relative to the dominant term as input size grows.",
//                 cite: "cite-algo-1",
//               },
//               {
//                 id: "algo-card-2",
//                 front: "When do you perform a double rotation in AVL trees?",
//                 back: "When a child subtree is heavy on the opposite side (LR or RL cases).",
//                 cite: "cite-algo-2",
//               },
//               {
//                 id: "algo-card-3",
//                 front:
//                   "How does the banker’s method prove amortized O(1) for dynamic array push?",
//                 back: "It deposits potential each push so occasional resize withdrawals stay covered.",
//                 cite: "cite-algo-4",
//               },
//             ],
//           },
//         ],
//       },
//     },
//   },
//   "3": {
//     citations: {
//       "cite-gre-1": {
//         id: "cite-gre-1",
//         sourceId: "gre-source-1",
//         label: "PDF · pg 6",
//         snippet:
//           "ETS guide covers pacing, elimination strategies, and answer patterns.",
//       },
//       "cite-gre-2": {
//         id: "cite-gre-2",
//         sourceId: "gre-source-2",
//         label: "DOCX · pg 4",
//         snippet:
//           "Vocabulary list includes usage sentences and synonym clusters.",
//       },
//     },
//     views: {
//       summary: {
//         helperText: "Blending ETS strategy guide with vocabulary drills.",
//         modules: [
//           {
//             kind: "bullets",
//             id: "gre-summary",
//             title: "Key takeaways",
//             bullets: [
//               {
//                 id: "gre-summary-b1",
//                 text: "Use pacing checkpoints every 10 questions to stay aligned with target time.",
//                 cite: "cite-gre-1",
//               },
//               {
//                 id: "gre-summary-b2",
//                 text: "Eliminate extreme answer choices first, then compare nuance between remaining options.",
//                 cite: "cite-gre-1",
//               },
//               {
//                 id: "gre-summary-b3",
//                 text: "Batch vocabulary by roots and connotation to lock in contextual meaning.",
//                 cite: "cite-gre-2",
//               },
//             ],
//           },
//           {
//             kind: "checklist",
//             id: "gre-actions",
//             title: "Warm-up checklist",
//             items: [
//               {
//                 id: "gre-action-1",
//                 label: "Quiz yourself on 10 mixed vocab terms with sentences.",
//                 cite: "cite-gre-2",
//               },
//               {
//                 id: "gre-action-2",
//                 label:
//                   "Review pacing table and mark checkpoints on scratch pad.",
//                 cite: "cite-gre-1",
//               },
//               {
//                 id: "gre-action-3",
//                 label: "Write one sentence using 3 new words to cement nuance.",
//                 cite: "cite-gre-2",
//               },
//             ],
//           },
//           {
//             kind: "glossary",
//             id: "gre-glossary",
//             title: "Vocabulary spotlight",
//             terms: [
//               {
//                 id: "gre-glossary-1",
//                 term: "Insouciant",
//                 definition:
//                   "Carefree; light-hearted in a situation requiring seriousness.",
//                 cite: "cite-gre-2",
//               },
//               {
//                 id: "gre-glossary-2",
//                 term: "Intransigent",
//                 definition: "Refusing to compromise; stubborn.",
//                 cite: "cite-gre-2",
//               },
//               {
//                 id: "gre-glossary-3",
//                 term: "Obviate",
//                 definition:
//                   "To anticipate and prevent; to remove the need for something.",
//                 cite: "cite-gre-2",
//               },
//             ],
//           },
//         ],
//       },
//       outline: {
//         helperText: "Follow this sequence for each verbal practice block.",
//         modules: [
//           {
//             kind: "bullets",
//             id: "gre-outline",
//             title: "30-minute block",
//             bullets: [
//               {
//                 id: "gre-outline-1",
//                 text: "5 min: vocab quick drill and pacing review.",
//                 cite: "cite-gre-1",
//               },
//               {
//                 id: "gre-outline-2",
//                 text: "20 min: timed set (2 RC passages + sentence equivalence).",
//                 cite: "cite-gre-1",
//               },
//               {
//                 id: "gre-outline-3",
//                 text: "5 min: error log and recap new vocabulary.",
//                 cite: "cite-gre-2",
//               },
//             ],
//           },
//           {
//             kind: "bullets",
//             id: "gre-outline-focus",
//             title: "Focus cues",
//             bullets: [
//               {
//                 id: "gre-outline-4",
//                 text: "Look for tonal shifts and extreme adjectives in answer choices.",
//                 cite: "cite-gre-1",
//               },
//               {
//                 id: "gre-outline-5",
//                 text: "Bind new words to personal experiences for better recall.",
//                 cite: "cite-gre-2",
//               },
//             ],
//           },
//         ],
//       },
//       flashcards: {
//         helperText: "Tap through twice before your next timed attempt.",
//         modules: [
//           {
//             kind: "flashcards",
//             id: "gre-flashcards",
//             title: "Verbal flashcards",
//             cards: [
//               {
//                 id: "gre-card-1",
//                 front:
//                   "What is the best first move if two GRE answers feel similar?",
//                 back: "Re-read for tone/degree and eliminate the option that overstates the author’s claim.",
//                 cite: "cite-gre-1",
//               },
//               {
//                 id: "gre-card-2",
//                 front: "Provide a synonym for “insouciant.”",
//                 back: "Carefree; nonchalant.",
//                 cite: "cite-gre-2",
//               },
//               {
//                 id: "gre-card-3",
//                 front: "How do you reinforce new words after drills?",
//                 back: "Write a short sentence pairing 2–3 new terms with vivid contexts.",
//                 cite: "cite-gre-2",
//               },
//             ],
//           },
//         ],
//       },
//     },
//   },
// };

// const STORAGE_KEY = "studymate-dashboard-notes";

// const initialMessagesByNotebook = createInitialMessages(mockNotebooks);

// export default function Dashboard() {
//   const [notebooks, setNotebooks] = React.useState<Notebook[]>(mockNotebooks);
//   const [selectedNotebookId, setSelectedNotebookId] = React.useState<
//     string | null
//   >(mockNotebooks[0]?.id ?? null);
//   const [sourcesByNotebook, setSourcesByNotebook] = React.useState<
//     Record<string, SourceItem[]>
//   >(initialSourcesByNotebook);
//   const [contentByNotebook, setContentByNotebook] = React.useState<
//     Record<string, NotebookContent>
//   >(initialContentByNotebook);
//   const [messagesByNotebook, setMessagesByNotebook] = React.useState<
//     Record<string, Message[]>
//   >(initialMessagesByNotebook);
//   const [notesByNotebook, setNotesByNotebook] = React.useState<
//     Record<string, string>
//   >(() => {
//     if (typeof window === "undefined") return {};
//     try {
//       const stored = window.localStorage.getItem(STORAGE_KEY);
//       if (!stored) return {};
//       const parsed = JSON.parse(stored);
//       if (parsed && typeof parsed === "object") {
//         return parsed as Record<string, string>;
//       }
//     } catch (error) {
//       console.warn("Unable to load saved notes", error);
//     }
//     return {};
//   });
//   const [chatInput, setChatInput] = React.useState("");
//   const [pendingNotebookId, setPendingNotebookId] = React.useState<
//     string | null
//   >(null);
//   const [fileUploadTarget, setFileUploadTarget] =
//     React.useState<FileUploadTarget>(null);
//   const [viewByNotebook, setViewByNotebook] = React.useState<
//     Record<string, ViewKey>
//   >({});

//   const chatContainerRef = React.useRef<HTMLDivElement | null>(null);
//   const fileInputRef = React.useRef<HTMLInputElement | null>(null);
//   const replyTimeoutRef = React.useRef<Record<string, number>>({});

//   const isThinking = pendingNotebookId === selectedNotebookId;

//   const selectedNotebook = React.useMemo(
//     () =>
//       notebooks.find((notebook) => notebook.id === selectedNotebookId) ?? null,
//     [notebooks, selectedNotebookId]
//   );

//   const prompts = React.useMemo(() => {
//     if (!selectedNotebookId) return defaultPrompts;
//     return promptsByNotebook[selectedNotebookId] ?? defaultPrompts;
//   }, [selectedNotebookId]);

//   const currentMessages = React.useMemo(() => {
//     if (!selectedNotebookId) return [] as Message[];
//     return messagesByNotebook[selectedNotebookId] ?? [];
//   }, [messagesByNotebook, selectedNotebookId]);

//   const currentSources = React.useMemo(() => {
//     if (!selectedNotebookId) return [] as SourceItem[];
//     return sourcesByNotebook[selectedNotebookId] ?? [];
//   }, [selectedNotebookId, sourcesByNotebook]);

//   const sourceMap = React.useMemo(() => {
//     const map: Record<string, SourceItem> = {};
//     currentSources.forEach((source) => {
//       map[source.id] = source;
//     });
//     return map;
//   }, [currentSources]);

//   const activeView: ViewKey = React.useMemo(() => {
//     if (!selectedNotebookId) return "summary";
//     return viewByNotebook[selectedNotebookId] ?? "summary";
//   }, [selectedNotebookId, viewByNotebook]);

//   const currentContent = React.useMemo(() => {
//     if (!selectedNotebookId) return undefined;
//     return contentByNotebook[selectedNotebookId];
//   }, [contentByNotebook, selectedNotebookId]);

//   const scrollToBottom = React.useCallback(() => {
//     if (chatContainerRef.current) {
//       chatContainerRef.current.scrollTo({
//         top: chatContainerRef.current.scrollHeight,
//         behavior: "smooth",
//       });
//     }
//   }, []);

//   React.useEffect(() => {
//     if (!selectedNotebookId) return;
//     setViewByNotebook((prev) => {
//       if (prev[selectedNotebookId]) {
//         return prev;
//       }
//       return { ...prev, [selectedNotebookId]: "summary" };
//     });
//   }, [selectedNotebookId]);

//   React.useEffect(() => {
//     scrollToBottom();
//   }, [currentMessages, scrollToBottom, selectedNotebookId]);

//   React.useEffect(() => {
//     return () => {
//       Object.values(replyTimeoutRef.current).forEach((timeoutId) =>
//         window.clearTimeout(timeoutId)
//       );
//     };
//   }, []);

//   React.useEffect(() => {
//     setChatInput("");
//   }, [selectedNotebookId]);

//   React.useEffect(() => {
//     if (typeof window === "undefined") return;
//     window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notesByNotebook));
//   }, [notesByNotebook]);

//   const sendMessage = React.useCallback(
//     (rawInput: string) => {
//       if (!selectedNotebookId) return;

//       const trimmed = rawInput.trim();
//       if (!trimmed) return;

//       const notebookId = selectedNotebookId;
//       const notebook = notebooks.find((item) => item.id === notebookId);
//       const content = contentByNotebook[notebookId];
//       const view = viewByNotebook[notebookId] ?? "summary";

//       const userMessage: Message = {
//         id: `user-${notebookId}-${Date.now()}`,
//         sender: "user",
//         text: trimmed,
//       };

//       setMessagesByNotebook((prev) => {
//         const history = prev[notebookId] ?? [];
//         return {
//           ...prev,
//           [notebookId]: [...history, userMessage],
//         };
//       });
//       setChatInput("");
//       setPendingNotebookId(notebookId);

//       const existingTimeout = replyTimeoutRef.current[notebookId];
//       if (existingTimeout) {
//         window.clearTimeout(existingTimeout);
//       }

//       const replyText = buildMockResponse({
//         notebook,
//         question: trimmed,
//         content,
//         activeView: view,
//         sources: sourcesByNotebook[notebookId] ?? [],
//       });

//       const timeoutId = window.setTimeout(() => {
//         setMessagesByNotebook((prev) => {
//           const history = prev[notebookId] ?? [];
//           return {
//             ...prev,
//             [notebookId]: [
//               ...history,
//               {
//                 id: `assistant-${notebookId}-${Date.now()}`,
//                 sender: "assistant",
//                 text: replyText,
//               },
//             ],
//           };
//         });
//         setPendingNotebookId((current) =>
//           current === notebookId ? null : current
//         );
//         delete replyTimeoutRef.current[notebookId];
//       }, 600 + Math.random() * 400);

//       replyTimeoutRef.current[notebookId] = timeoutId;
//     },
//     [
//       contentByNotebook,
//       notebooks,
//       selectedNotebookId,
//       sourcesByNotebook,
//       viewByNotebook,
//     ]
//   );

//   const handleSubmit = React.useCallback(
//     (event: React.FormEvent<HTMLFormElement>) => {
//       event.preventDefault();
//       if (isThinking) return;
//       sendMessage(chatInput);
//     },
//     [chatInput, isThinking, sendMessage]
//   );

//   const handlePromptClick = React.useCallback(
//     (prompt: string) => {
//       if (isThinking) return;
//       sendMessage(prompt);
//     },
//     [isThinking, sendMessage]
//   );

//   const triggerNewNotebookUpload = React.useCallback(() => {
//     if (isThinking) return;
//     setFileUploadTarget({ mode: "new" });
//     fileInputRef.current?.click();
//   }, [isThinking]);

//   const handleFileSelected = React.useCallback(
//     (file: File | null) => {
//       if (!file) {
//         setFileUploadTarget(null);
//         return;
//       }

//       if (!isAcceptedUpload(file)) {
//         window.alert("Please upload a PDF or DOCX file.");
//         setFileUploadTarget(null);
//         return;
//       }

//       const now = new Date();
//       const target = fileUploadTarget ?? { mode: "new" };
//       const newSource = createSourceFromFile(file, "Processing", now);

//       if (target.mode === "existing") {
//         const targetNotebookId = target.notebookId;
//         const currentCount = (sourcesByNotebook[targetNotebookId] ?? []).length;
//         const notebook = notebooks.find((item) => item.id === targetNotebookId);

//         setSourcesByNotebook((prev) => {
//           const existing = prev[targetNotebookId] ?? [];
//           return {
//             ...prev,
//             [targetNotebookId]: [newSource, ...existing],
//           };
//         });

//         setContentByNotebook((prev) => {
//           const existing = prev[targetNotebookId];
//           const title = notebook?.title ?? file.name;
//           const updated = augmentContentWithSource(existing, newSource, title);
//           return {
//             ...prev,
//             [targetNotebookId]: updated,
//           };
//         });

//         setNotebooks((prev) =>
//           prev.map((item) =>
//             item.id === targetNotebookId
//               ? {
//                   ...item,
//                   sourceCount: currentCount + 1,
//                   lastUpdated: "Just now",
//                 }
//               : item
//           )
//         );

//         setMessagesByNotebook((prev) => {
//           const history = prev[targetNotebookId] ?? [];
//           return {
//             ...prev,
//             [targetNotebookId]: [
//               ...history,
//               {
//                 id: `assistant-${targetNotebookId}-upload-${Date.now()}`,
//                 sender: "assistant",
//                 text: `Got it—${file.name} is being indexed. I’ll blend it into the ${activeView} view once it finishes.`,
//               },
//             ],
//           };
//         });

//         setPendingNotebookId(null);
//         setSelectedNotebookId(targetNotebookId);
//       } else {
//         const notebookId = `${Date.now()}`;
//         const baseTitle =
//           file.name.replace(/\.[^/.]+$/, "") || "Untitled Notebook";
//         const readableDate = formatDate(now);
//         const newNotebook: Notebook = {
//           id: notebookId,
//           title: baseTitle,
//           subject: "Uploaded file",
//           sourceCount: 1,
//           createdAt: readableDate,
//           lastUpdated: "Just now",
//         };

//         setNotebooks((prev) => [newNotebook, ...prev]);

//         setSourcesByNotebook((prev) => ({
//           ...prev,
//           [notebookId]: [newSource],
//         }));

//         setContentByNotebook((prev) => ({
//           ...prev,
//           [notebookId]: createContentForUpload(baseTitle, newSource),
//         }));

//         setMessagesByNotebook((prev) => ({
//           ...prev,
//           [notebookId]: [
//             {
//               id: `${notebookId}-assistant-welcome`,
//               sender: "assistant",
//               text: `Thanks for uploading ${file.name}. Ask me anything about it and I’ll build a focus summary on the fly.`,
//             },
//           ],
//         }));

//         setNotesByNotebook((prev) => ({ ...prev, [notebookId]: "" }));
//         setViewByNotebook((prev) => ({ ...prev, [notebookId]: "summary" }));
//         setSelectedNotebookId(notebookId);
//         setPendingNotebookId(null);
//       }

//       setFileUploadTarget(null);
//     },
//     [
//       activeView,
//       contentByNotebook,
//       fileUploadTarget,
//       notebooks,
//       sourcesByNotebook,
//     ]
//   );

//   const handlePinMessage = React.useCallback(
//     (message: Message) => {
//       if (!selectedNotebookId) return;

//       setNotesByNotebook((prev) => {
//         const existing = prev[selectedNotebookId] ?? "";
//         const appended = existing
//           ? `${existing}\n\nPinned insight:\n${message.text}`
//           : `Pinned insight:\n${message.text}`;
//         return {
//           ...prev,
//           [selectedNotebookId]: appended,
//         };
//       });
//     },
//     [selectedNotebookId]
//   );

//   const handleQuickAction = React.useCallback((action: string) => {
//     window.alert(`${action} — this will hook into automation soon.`);
//   }, []);

//   const onQuickAction = handleQuickAction;

//   return (
//     <div
//       className={`min-h-screen bg-[#f5f7fb] text-zinc-900 dark:bg-[#0f1015] dark:text-zinc-100 antialiased`}
//     >
//       <DashboardHeader
//         onCreateNotebook={triggerNewNotebookUpload}
//         createDisabled={isThinking}
//         notebooks={notebooks.map((item) => ({
//           id: item.id,
//           title: item.title,
//           subject: item.subject,
//         }))}
//         selectedNotebookId={selectedNotebookId}
//         onSelectNotebook={setSelectedNotebookId}
//       />

//       <main className="flex h-[calc(100vh-64px)] w-full flex-col px-4 sm:px-6 lg:px-8 py-3">
//         <input
//           ref={fileInputRef}
//           type="file"
//           accept={ACCEPTED_FILE_ACCEPT}
//           className="hidden"
//           onChange={(event) => {
//             handleFileSelected(event.target.files?.[0] ?? null);
//             event.target.value = "";
//           }}
//         />

//         {/* ===== NotebookLM-style layout (3 independent sections; no floating header) ===== */}
//         <div className="mt-2 flex flex-col flex-1 min-h-0 items-center">
//           {/* --- Main three-column content grid --- */}
//           <div className="grid flex-1 min-h-0 grid-cols-[260px_minmax(0,1fr)_400px] gap-7">
//             {/* LEFT: Quick Actions + Focus */}
//             <div className="flex flex-col min-h-0">
//               {/* Quick Actions */}
//               <Card className="rounded-2xl border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
//                 {/* NEW: header lives inside the card */}
//                 <CardHeader className="h-11 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
//                   <div className="flex items-baseline gap-2">
//                     <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
//                       Quick actions
//                     </h2>
//                   </div>
//                 </CardHeader>

//                 <CardContent className="space-y-2 px-3 pb-4 pt-3">
//                   {[
//                     "Summarize notebook",
//                     "Suggest focus areas",
//                     "Create flashcards",
//                   ].map((action) => (
//                     <Button
//                       key={action}
//                       variant="outline"
//                       className="w-full justify-start rounded-2xl border border-zinc-200/70 bg-white py-2.5 px-3 text-left text-sm font-medium text-zinc-700 
//                     hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 
//                     dark:text-zinc-200 dark:hover:border-blue-400/60 dark:hover:bg-blue-500/10 transition"
//                       onClick={() => onQuickAction(action)}
//                     >
//                       <Sparkles className="mr-2 h-4 w-4 text-blue-500 shrink-0" />
//                       <span className="truncate">{action}</span>
//                     </Button>
//                   ))}
//                 </CardContent>
//               </Card>

//               {/* Focus */}
//               <Card className="mt-4 rounded-2xl border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
//                 {/* NEW: header inside the card */}
//                 <CardHeader className="h-11 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
//                   <div className="flex items-baseline gap-2">
//                     <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
//                       Focus
//                     </h2>
//                     <span className="text-xs text-zinc-500 dark:text-zinc-400">
//                       Study roadmap
//                     </span>
//                   </div>
//                 </CardHeader>

//                 <CardContent className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300 px-3 pb-4 pt-3">
//                   <div>
//                     <p className="font-medium">Today</p>
//                     <p>
//                       Review yesterday&apos;s highlights and jot down follow-up
//                       questions.
//                     </p>
//                   </div>
//                   <div>
//                     <p className="font-medium">Next</p>
//                     <p>
//                       Run a flashcard drill and mark tough concepts for deeper
//                       review.
//                     </p>
//                   </div>
//                 </CardContent>
//               </Card>
//             </div>

//             {/* CENTER: Smart Q&A Chat (unchanged; already has its own header inside) */}
//             <div className="flex flex-col min-h-0">
//               <ChatPanel
//                 notebook={selectedNotebook}
//                 messages={currentMessages}
//                 chatContainerRef={chatContainerRef}
//                 isThinking={isThinking}
//                 prompts={prompts}
//                 onPromptClick={handlePromptClick}
//                 chatInput={chatInput}
//                 onChatInputChange={setChatInput}
//                 onSubmit={handleSubmit}
//                 onPinMessage={handlePinMessage}
//               />
//             </div>

//             {/* RIGHT: Notebook Canvas (unchanged; its header is inside NotebookCanvas) */}
//             <div className="flex flex-col min-h-0">
//               <NotebookCanvas
//                 notebook={selectedNotebook}
//                 content={currentContent}
//                 sourceMap={sourceMap}
//                 activeView={activeView}
//                 onViewChange={(view) =>
//                   setViewByNotebook((prev) => {
//                     if (!selectedNotebookId) return prev;
//                     return { ...prev, [selectedNotebookId]: view };
//                   })
//                 }
//                 isThinking={isThinking}
//               />
//             </div>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }

// type NotebookCanvasProps = {
//   notebook: Notebook | null;
//   content: NotebookContent | undefined;
//   sourceMap: Record<string, SourceItem>;
//   activeView: ViewKey;
//   onViewChange: (view: ViewKey) => void;
//   isThinking: boolean;
//   showHeader?: boolean;
// };

// const viewOptions: { key: ViewKey; label: string }[] = [
//   { key: "summary", label: "Summary" },
//   { key: "outline", label: "Outline" },
//   { key: "flashcards", label: "Flashcards" },
// ];

// function NotebookCanvas({
//   notebook,
//   content,
//   sourceMap,
//   activeView,
//   onViewChange,
//   isThinking,
//   showHeader = true,
// }: NotebookCanvasProps) {
//   const viewContent = content?.views[activeView];

//   return (
//     <Card className="flex h-full flex-col rounded-[24px] border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
//       {showHeader ? (
//         <CardHeader className="space-y-4 border-b border-zinc-100 px-5 py-5 dark:border-zinc-800">
//           <div className="flex flex-wrap items-center justify-between gap-3">
//             <div className="flex flex-wrap gap-2">
//               {viewOptions.map((option) => (
//                 <Button
//                   key={option.key}
//                   type="button"
//                   size="sm"
//                   variant={option.key === activeView ? "default" : "outline"}
//                   className="rounded-full"
//                   onClick={() => onViewChange(option.key)}
//                   disabled={!notebook}
//                 >
//                   {option.label}
//                 </Button>
//               ))}
//             </div>
//           </div>
//           {viewContent?.helperText ? (
//             <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/60 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300">
//               <Sparkles className="h-3.5 w-3.5" />
//               {viewContent.helperText}
//             </div>
//           ) : null}
//           {isThinking ? (
//             <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50/60 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200">
//               <MessageSquare className="h-3.5 w-3.5" />
//               Updating with your latest question…
//             </div>
//           ) : null}
//         </CardHeader>
//       ) : null}
//       <CardContent
//         className={cn(
//           "flex-1 overflow-y-auto space-y-5 px-5 pb-6",
//           showHeader ? "pt-5" : "pt-4"
//         )}
//       >
//         {!showHeader && viewContent?.helperText ? (
//           <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/60 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300">
//             <Sparkles className="h-3.5 w-3.5" />
//             {viewContent.helperText}
//           </div>
//         ) : null}
//         {!showHeader && isThinking ? (
//           <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50/60 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200">
//             <MessageSquare className="h-3.5 w-3.5" />
//             Updating with your latest question…
//           </div>
//         ) : null}
//         {!notebook ? (
//           <p className="text-sm text-zinc-500 dark:text-zinc-400">
//             Select a notebook to see NotebookLM-style modules.
//           </p>
//         ) : !viewContent ? (
//           <p className="text-sm text-zinc-500 dark:text-zinc-400">
//             We&rsquo;re still preparing this view. Upload another source or ask
//             a question to populate it.
//           </p>
//         ) : (
//           viewContent.modules.map((module) => (
//             <ModuleRenderer
//               key={module.id}
//               module={module}
//               citations={content?.citations ?? {}}
//               sourceMap={sourceMap}
//             />
//           ))
//         )}
//       </CardContent>
//     </Card>
//   );
// }

// type ModuleRendererProps = {
//   module: ModuleContent;
//   citations: Record<string, NotebookCitation>;
//   sourceMap: Record<string, SourceItem>;
// };

// function isFlashcardModule(module: ModuleContent): module is FlashcardModule {
//   return module.kind === "flashcards";
// }

// function ModuleRenderer({ module, citations, sourceMap }: ModuleRendererProps) {
//   if (module.kind === "bullets") {
//     return (
//       <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
//         <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800 dark:border-zinc-800 dark:text-zinc-100">
//           <Sparkles className="h-4 w-4 text-blue-500" />
//           {module.title}
//         </div>
//         <div className="space-y-3 px-4 py-4">
//           {module.description ? (
//             <p className="text-sm text-zinc-500 dark:text-zinc-400">
//               {module.description}
//             </p>
//           ) : null}
//           <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
//             {module.bullets.map((bullet) => (
//               <li key={bullet.id} className="flex gap-2">
//                 <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500/80" />
//                 <div>
//                   <p>{bullet.text}</p>
//                   {bullet.cite ? (
//                     <CitationPill
//                       citation={citations[bullet.cite]}
//                       source={sourceMap[citations[bullet.cite]?.sourceId ?? ""]}
//                     />
//                   ) : null}
//                 </div>
//               </li>
//             ))}
//           </ul>
//         </div>
//       </div>
//     );
//   }

//   if (module.kind === "checklist") {
//     return (
//       <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
//         <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800 dark:border-zinc-800 dark:text-zinc-100">
//           <ListChecks className="h-4 w-4 text-emerald-500" />
//           {module.title}
//         </div>
//         <ul className="space-y-3 px-4 py-4 text-sm text-zinc-700 dark:text-zinc-300">
//           {module.items.map((item) => (
//             <li key={item.id} className="flex gap-2">
//               <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
//               <div>
//                 <p>{item.label}</p>
//                 {item.cite ? (
//                   <CitationPill
//                     citation={citations[item.cite]}
//                     source={sourceMap[citations[item.cite]?.sourceId ?? ""]}
//                   />
//                 ) : null}
//               </div>
//             </li>
//           ))}
//         </ul>
//       </div>
//     );
//   }

//   if (module.kind === "glossary") {
//     return (
//       <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
//         <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800 dark:border-zinc-800 dark:text-zinc-100">
//           <BookOpen className="h-4 w-4 text-violet-500" />
//           {module.title}
//         </div>
//         <div className="space-y-3 px-4 py-4 text-sm text-zinc-700 dark:text-zinc-300">
//           {module.terms.map((term) => (
//             <div key={term.id}>
//               <div className="font-semibold">{term.term}</div>
//               <p className="text-zinc-500 dark:text-zinc-400">
//                 {term.definition}
//               </p>
//               {term.cite ? (
//                 <CitationPill
//                   citation={citations[term.cite]}
//                   source={sourceMap[citations[term.cite]?.sourceId ?? ""]}
//                 />
//               ) : null}
//             </div>
//           ))}
//         </div>
//       </div>
//     );
//   }

//   if (module.kind === "flashcards") {
//     return (
//       <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
//         <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800 dark:border-zinc-800 dark:text-zinc-100">
//           <MessageSquare className="h-4 w-4 text-amber-500" />
//           {module.title}
//         </div>
//         <div className="grid gap-3 px-4 py-4 md:grid-cols-2">
//           {module.cards.map((card) => (
//             <div
//               key={card.id}
//               className="rounded-2xl border border-dashed border-amber-200/70 bg-amber-50/50 p-3 text-sm text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100"
//             >
//               <div className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-300">
//                 Prompt
//               </div>
//               <p className="mt-1 font-medium">{card.front}</p>
//               <div className="mt-3 text-xs uppercase tracking-wide text-amber-600 dark:text-amber-300">
//                 Answer
//               </div>
//               <p className="mt-1 text-amber-800 dark:text-amber-100">
//                 {card.back}
//               </p>
//               {card.cite ? (
//                 <CitationPill
//                   citation={citations[card.cite]}
//                   source={sourceMap[citations[card.cite]?.sourceId ?? ""]}
//                 />
//               ) : null}
//             </div>
//           ))}
//         </div>
//       </div>
//     );
//   }

//   return null;
// }

// type CitationPillProps = {
//   citation?: NotebookCitation;
//   source?: SourceItem;
// };

// function CitationPill({ citation, source }: CitationPillProps) {
//   if (!citation || !source) {
//     return null;
//   }

//   return (
//     <span
//       className="mt-2 inline-flex items-center rounded-full border border-blue-200/60 bg-blue-50/60 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200"
//       title={`${source.title} — ${citation.snippet}`}
//     >
//       {citation.label}
//     </span>
//   );
// }

// type ChatPanelProps = {
//   notebook: Notebook | null;
//   messages: Message[];
//   chatContainerRef: React.RefObject<HTMLDivElement | null>;
//   isThinking: boolean;
//   prompts: string[];
//   onPromptClick: (prompt: string) => void;
//   chatInput: string;
//   onChatInputChange: (value: string) => void;
//   onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
//   onPinMessage: (message: Message) => void;
// };

// function ChatPanel({
//   notebook,
//   messages,
//   chatContainerRef,
//   isThinking,
//   prompts,
//   onPromptClick,
//   chatInput,
//   onChatInputChange,
//   onSubmit,
//   onPinMessage,
// }: ChatPanelProps) {
//   return (
//     <Card className="flex h-full flex-col rounded-[24px] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
//       <CardHeader className="space-y-1 border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
//         <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
//           <MessageSquare className="h-4 w-4 text-blue-500" aria-hidden="true" />
//           Smart Q&A
//         </div>
//       </CardHeader>
//       <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-6 pb-6 pt-5">
//         <div
//           ref={chatContainerRef}
//           className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-zinc-200 bg-[#f7f8fc] p-4 dark:border-zinc-800 dark:bg-[#161821]"
//         >
//           {messages.map((message) => (
//             <ChatMessage
//               key={message.id}
//               message={message}
//               align={message.sender === "user" ? "end" : "start"}
//               onPin={
//                 message.sender === "assistant"
//                   ? () => onPinMessage(message)
//                   : undefined
//               }
//             />
//           ))}
//           {isThinking ? (
//             <div className="flex flex-col items-start gap-1">
//               <span className="text-xs uppercase tracking-wide text-zinc-400">
//                 Smart StudyMate
//               </span>
//               <div className="max-w-[85%] rounded-2xl bg-white/80 px-4 py-3 text-sm text-zinc-500 shadow-sm dark:bg-zinc-800/80 dark:text-zinc-300">
//                 Thinking…
//               </div>
//             </div>
//           ) : null}
//         </div>

//         <div className="flex flex-wrap gap-2">
//           {prompts.map((prompt) => (
//             <Button
//               key={prompt}
//               type="button"
//               variant="outline"
//               size="sm"
//               className="rounded-full border-zinc-200/60 bg-white/60 text-xs dark:border-zinc-700/60 dark:bg-zinc-900/60"
//               onClick={() => onPromptClick(prompt)}
//               disabled={isThinking}
//             >
//               {prompt}
//             </Button>
//           ))}
//         </div>

//         <form onSubmit={onSubmit} className="mt-auto flex items-end gap-3">
//           <Input
//             value={chatInput}
//             onChange={(event) => onChatInputChange(event.target.value)}
//             placeholder={
//               notebook
//                 ? `Ask about ${notebook.title}`
//                 : "Select a notebook to start chatting"
//             }
//             className="flex-1 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/70"
//             disabled={isThinking || !notebook}
//           />
//           <Button
//             type="submit"
//             size="icon"
//             className="rounded-full"
//             disabled={isThinking || !chatInput.trim() || !notebook}
//           >
//             <Send className="h-4 w-4" />
//           </Button>
//         </form>
//       </CardContent>
//     </Card>
//   );
// }

// type ChatMessageProps = {
//   message: Message;
//   align: "start" | "end";
//   onPin?: () => void;
// };

// function ChatMessage({ message, align, onPin }: ChatMessageProps) {
//   const isUser = align === "end";

//   return (
//     <div
//       className={cn(
//         "flex flex-col gap-1",
//         isUser ? "items-end" : "items-start"
//       )}
//     >
//       <span className="text-xs uppercase tracking-wide text-zinc-400">
//         {isUser ? "You" : "Smart StudyMate"}
//       </span>
//       <div
//         className={cn(
//           "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm border",
//           isUser
//             ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-100"
//             : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200"
//         )}
//       >
//         {message.text}
//       </div>
//       {onPin ? (
//         <Button
//           type="button"
//           variant="ghost"
//           size="sm"
//           className="h-7 rounded-full px-2 text-xs text-blue-600 dark:text-blue-300"
//           onClick={onPin}
//         >
//           Pin to notes
//         </Button>
//       ) : null}
//     </div>
//   );
// }

// type BuildMockResponseArgs = {
//   notebook: Notebook | undefined;
//   question: string;
//   content: NotebookContent | undefined;
//   activeView: ViewKey;
//   sources: SourceItem[];
// };

// function buildMockResponse({
//   notebook,
//   question,
//   content,
//   activeView,
//   sources,
// }: BuildMockResponseArgs): string {
//   const baseName = notebook?.title ?? "this notebook";
//   if (!content) {
//     return `I'm still indexing your sources. Ask me again in a moment and I'll have more on ${baseName}.`;
//   }

//   const viewContent = content.views[activeView];
//   const firstModule = viewContent.modules[0];
//   let highlight = "";
//   let citeLabel = "";

//   if (firstModule) {
//     if (firstModule.kind === "bullets" && firstModule.bullets.length > 0) {
//       const bullet = firstModule.bullets[0];
//       highlight = bullet.text;
//       citeLabel = bullet.cite
//         ? content.citations[bullet.cite]?.label ?? ""
//         : "";
//     } else if (
//       firstModule.kind === "glossary" &&
//       firstModule.terms.length > 0
//     ) {
//       const term = firstModule.terms[0];
//       highlight = `${term.term}: ${term.definition}`;
//       citeLabel = term.cite ? content.citations[term.cite]?.label ?? "" : "";
//     } else if (
//       firstModule.kind === "checklist" &&
//       firstModule.items.length > 0
//     ) {
//       const item = firstModule.items[0];
//       highlight = item.label;
//       citeLabel = item.cite ? content.citations[item.cite]?.label ?? "" : "";
//     } else if (
//       firstModule.kind === "flashcards" &&
//       firstModule.cards.length > 0
//     ) {
//       const card = firstModule.cards[0];
//       highlight = card.back;
//       citeLabel = card.cite ? content.citations[card.cite]?.label ?? "" : "";
//     }
//   }

//   if (!highlight) {
//     highlight = "I’ll dig deeper as soon as more context is available.";
//   }

//   const sourceLabel = citeLabel || (sources[0]?.citeLabel ?? "your uploads");

//   return `Here’s what stands out for “${question}” using the ${activeView} view of ${baseName}: ${highlight} (${sourceLabel}). Ask for more detail or switch views for a different angle.`;
// }

// function createInitialMessages(
//   notebooks: Notebook[]
// ): Record<string, Message[]> {
//   return notebooks.reduce<Record<string, Message[]>>((acc, notebook, index) => {
//     acc[notebook.id] = [
//       {
//         id: `${notebook.id}-assistant-${index}-welcome`,
//         sender: "assistant",
//         text: `Welcome back! I’m ready to help with ${notebook.title}. Open the summary view or ask me anything.`,
//       },
//       {
//         id: `${notebook.id}-user-${index}-prompt`,
//         sender: "user",
//         text: `What's new in ${notebook.subject}?`,
//       },
//       {
//         id: `${notebook.id}-assistant-${index}-reply`,
//         sender: "assistant",
//         text: "I highlighted the freshest points in the Summary tab—use the follow-up prompts for deeper dives.",
//       },
//     ];
//     return acc;
//   }, {});
// }

// function determineSourceType(fileName: string): SourceType {
//   const lower = fileName.toLowerCase();
//   if (lower.endsWith(".pdf")) return "PDF";
//   if (lower.endsWith(".docx")) return "DOCX";
//   return "Link";
// }

// function deriveSourceTag(fileName: string): SourceTag {
//   const lower = fileName.toLowerCase();
//   if (lower.includes("lecture") || lower.includes("slides")) {
//     return "Lecture";
//   }
//   if (lower.includes("practice") || lower.includes("quiz")) {
//     return "Practice";
//   }
//   if (
//     lower.includes("ref") ||
//     lower.includes("guide") ||
//     lower.includes("cheat")
//   ) {
//     return "Reference";
//   }
//   if (lower.includes("note") || lower.includes("recap")) {
//     return "Notes";
//   }
//   return "Article";
// }

// function createSourceFromFile(
//   file: File,
//   status: SourceStatus,
//   now: Date
// ): SourceItem {
//   const type = determineSourceType(file.name);
//   const tag = deriveSourceTag(file.name);
//   const addedOn = now.toLocaleDateString("en-US", {
//     month: "short",
//     day: "numeric",
//   });

//   return {
//     id: `upload-${now.getTime()}`,
//     title: file.name,
//     type,
//     tag,
//     status,
//     pages: undefined,
//     addedOn,
//     lastIndexed: status === "Indexed" ? "Just now" : undefined,
//     snippet: `Preview will be available soon for ${file.name}.`,
//     citeLabel: `${type} · new`,
//   };
// }

// function createContentForUpload(
//   notebookTitle: string,
//   source: SourceItem
// ): NotebookContent {
//   const citeId = `${source.id}-cite`;

//   return {
//     citations: {
//       [citeId]: {
//         id: citeId,
//         sourceId: source.id,
//         label: source.citeLabel,
//         snippet: source.snippet ?? `Highlights from ${source.title}.`,
//       },
//     },
//     views: {
//       summary: {
//         helperText: `We're skimming ${source.title} to seed the notebook.`,
//         modules: [
//           {
//             kind: "bullets",
//             id: `${source.id}-summary`,
//             title: "Key takeaways (in progress)",
//             bullets: [
//               {
//                 id: `${source.id}-summary-1`,
//                 text: `I’ll surface main ideas from ${source.title} as soon as indexing finishes.`,
//                 cite: citeId,
//               },
//               {
//                 id: `${source.id}-summary-2`,
//                 text: "Ask a question now and I’ll respond with the best available context.",
//                 cite: citeId,
//               },
//             ],
//           },
//           {
//             kind: "checklist",
//             id: `${source.id}-checklist`,
//             title: "While you wait",
//             items: [
//               {
//                 id: `${source.id}-check-1`,
//                 label: `Skim ${source.title} for sections you care about most.`,
//                 cite: citeId,
//               },
//               {
//                 id: `${source.id}-check-2`,
//                 label: "Drop a follow-up question to pin a future summary.",
//                 cite: citeId,
//               },
//             ],
//           },
//           {
//             kind: "glossary",
//             id: `${source.id}-glossary`,
//             title: "Glossary seeds",
//             terms: [
//               {
//                 id: `${source.id}-glossary-1`,
//                 term: "Indexing",
//                 definition:
//                   "We’re chunking and embedding your document before responding in detail.",
//                 cite: citeId,
//               },
//               {
//                 id: `${source.id}-glossary-2`,
//                 term: "Pinned insight",
//                 definition:
//                   "Use the chat pin button to copy answers into your notes instantly.",
//                 cite: citeId,
//               },
//             ],
//           },
//         ],
//       },
//       outline: {
//         helperText: `Outline will auto-populate once ${source.title} is indexed.`,
//         modules: [
//           {
//             kind: "bullets",
//             id: `${source.id}-outline`,
//             title: "Upcoming structure",
//             bullets: [
//               {
//                 id: `${source.id}-outline-1`,
//                 text: `Intro: Core themes detected in ${source.title}.`,
//                 cite: citeId,
//               },
//               {
//                 id: `${source.id}-outline-2`,
//                 text: "Body: Section-by-section breakdown with citations.",
//                 cite: citeId,
//               },
//               {
//                 id: `${source.id}-outline-3`,
//                 text: "Wrap-up: Action items & drills tailored to your question.",
//                 cite: citeId,
//               },
//             ],
//           },
//         ],
//       },
//       flashcards: {
//         helperText: "Flashcards will unlock once key concepts are extracted.",
//         modules: [
//           {
//             kind: "flashcards",
//             id: `${source.id}-flashcards`,
//             title: "Warm-up",
//             cards: [
//               {
//                 id: `${source.id}-flashcard-1`,
//                 front: `What should I keep in mind about ${notebookTitle}?`,
//                 back: `I’ll highlight the top insights from ${source.title} once processing wraps up.`,
//                 cite: citeId,
//               },
//             ],
//           },
//         ],
//       },
//     },
//   };
// }

// function augmentContentWithSource(
//   content: NotebookContent | undefined,
//   source: SourceItem,
//   notebookTitle: string
// ): NotebookContent {
//   if (!content) {
//     return createContentForUpload(notebookTitle, source);
//   }

//   const citeId = `${source.id}-cite`;
//   const newCitation: NotebookCitation = {
//     id: citeId,
//     sourceId: source.id,
//     label: source.citeLabel,
//     snippet: source.snippet ?? `Highlights from ${source.title}.`,
//   };

//   let summaryBulletInjected = false;
//   let summaryChecklistInjected = false;
//   const summaryModules = content.views.summary.modules.map((module) => {
//     if (module.kind === "bullets" && !summaryBulletInjected) {
//       summaryBulletInjected = true;
//       return {
//         ...module,
//         bullets: [
//           {
//             id: `${source.id}-summary-bullet`,
//             text: `${source.title} is processing—expect fresh insights within a minute.`,
//             cite: citeId,
//           },
//           ...module.bullets,
//         ],
//       };
//     }
//     if (module.kind === "checklist" && !summaryChecklistInjected) {
//       summaryChecklistInjected = true;
//       return {
//         ...module,
//         items: [
//           {
//             id: `${source.id}-checklist-item`,
//             label: `Skim ${source.title} once indexing completes.`,
//             cite: citeId,
//           },
//           ...module.items,
//         ],
//       };
//     }
//     return module;
//   });

//   if (!summaryBulletInjected) {
//     summaryModules.unshift({
//       kind: "bullets",
//       id: `${source.id}-summary-injected`,
//       title: "Fresh upload",
//       bullets: [
//         {
//           id: `${source.id}-injected-bullet`,
//           text: `${source.title} is being indexed. I’ll pull highlights shortly.`,
//           cite: citeId,
//         },
//       ],
//     });
//   }

//   if (!summaryChecklistInjected) {
//     summaryModules.push({
//       kind: "checklist",
//       id: `${source.id}-checklist-injected`,
//       title: "Next steps",
//       items: [
//         {
//           id: `${source.id}-checklist-injected-item`,
//           label: "Ask for a summary once the upload finishes processing.",
//           cite: citeId,
//         },
//       ],
//     });
//   }

//   let outlineInjected = false;
//   const outlineModules = content.views.outline.modules.map((module) => {
//     if (module.kind === "bullets" && !outlineInjected) {
//       outlineInjected = true;
//       return {
//         ...module,
//         bullets: [
//           {
//             id: `${source.id}-outline-bullet`,
//             text: `Pending section from ${source.title} will slot here soon.`,
//             cite: citeId,
//           },
//           ...module.bullets,
//         ],
//       };
//     }
//     return module;
//   });

//   if (!outlineInjected) {
//     outlineModules.push({
//       kind: "bullets",
//       id: `${source.id}-outline-injected`,
//       title: "Upcoming section",
//       bullets: [
//         {
//           id: `${source.id}-outline-injected-bullet`,
//           text: `${source.title} outline material will appear here after indexing.`,
//           cite: citeId,
//         },
//       ],
//     });
//   }

//   let flashcardsInjected = false;
//   const flashcardModules = content.views.flashcards.modules.map((module) => {
//     if (isFlashcardModule(module) && !flashcardsInjected) {
//       flashcardsInjected = true;
//       const enhancedModule: FlashcardModule = {
//         ...module,
//         cards: [
//           {
//             id: `${source.id}-flashcards-card`,
//             front: `What should I remember from ${source.title}?`,
//             back: `I’ll surface the main takeaways from ${source.title} once processing is complete.`,
//             cite: citeId,
//           },
//           ...module.cards,
//         ],
//       };
//       return enhancedModule;
//     }
//     return module;
//   });

//   const finalFlashcardModules: ModuleContent[] = flashcardsInjected
//     ? flashcardModules
//     : [
//         ...flashcardModules,
//         {
//           kind: "flashcards",
//           id: `${source.id}-flashcards-injected`,
//           title: "Fresh content incoming",
//           cards: [
//             {
//               id: `${source.id}-flashcards-injected-card`,
//               front: `How will ${source.title} change this notebook?`,
//               back: `Once indexing finishes, I’ll merge its concepts into every view.`,
//               cite: citeId,
//             },
//           ],
//         } as FlashcardModule,
//       ];

//   return {
//     citations: {
//       ...content.citations,
//       [citeId]: newCitation,
//     },
//     views: {
//       summary: {
//         ...content.views.summary,
//         modules: summaryModules,
//       },
//       outline: {
//         ...content.views.outline,
//         modules: outlineModules,
//       },
//       flashcards: {
//         ...content.views.flashcards,
//         modules: finalFlashcardModules,
//       },
//     },
//   };
// }

// function formatDate(date: Date) {
//   return date.toLocaleDateString("en-US", {
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   });
// }
