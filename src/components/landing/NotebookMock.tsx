import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, Sparkles, Film, MessageSquare } from "lucide-react";

export function NotebookMock({ sources }: { sources: string[] }) {
  return (
    <div className="relative rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/80 dark:bg-zinc-900/60 backdrop-blur p-3 md:p-4 shadow-sm">
      {/* Title bar */}
      <div className="flex items-center gap-2 pb-3 border-b border-zinc-200/70 dark:border-zinc-800/70">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/90" />
        </div>
        <div className="ml-3 text-sm font-medium">
          Demo Notebook · Environmental Science 101
        </div>
        <div className="ml-auto">
          <Badge variant="secondary" className="rounded-full">
            Preview
          </Badge>
        </div>
      </div>

      {/* Split layout */}
      <div className="grid md:grid-cols-5 gap-3 pt-3">
        {/* Left: sources */}
        <div className="md:col-span-2 space-y-3">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Sources
          </div>
          {sources.map((s) => (
            <div
              key={s}
              className="flex items-center gap-2 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm truncate">{s}</span>
            </div>
          ))}
          <Button variant="outline" className="w-full justify-start gap-2">
            <Upload className="h-4 w-4" /> Add source
          </Button>
        </div>

        {/* Right: generated */}
        <div className="md:col-span-3 space-y-3">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Generated
          </div>

          {/* 5-point summary */}
          <Card className="rounded-2xl border-zinc-200/70 dark:border-zinc-800/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Ozone Layer — 5-point Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-sm list-disc pl-5 space-y-1 text-zinc-700 dark:text-zinc-300">
                <li>
                  The stratospheric ozone layer absorbs biologically harmful
                  UV-B radiation.
                </li>
                <li>
                  Each Antarctic spring, cold polar stratospheric clouds +
                  sunlight activate chlorine/bromine that destroy O<sub>3</sub>.
                </li>
                <li>
                  In 2023, the ozone hole **peaked ≈10 million sq mi** and
                  **averaged ≈8.9 million sq mi** during Sept–Oct.
                </li>
                <li>
                  The **Montreal Protocol** is phasing down ozone-depleting
                  substances; recovery is expected over coming decades.
                </li>
                <li>
                  Monitoring uses satellite and balloon observations to track
                  annual size and depth.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Explainer Video (30s) */}
          <Card className="rounded-2xl border-zinc-200/70 dark:border-zinc-800/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Film className="h-4 w-4" /> Explainer Video: Ozone Hole 2023
                (30s)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <video
                  className="h-full w-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                  poster="/media/ozone-30s-poster.jpg"
                  controlsList="nodownload"
                >
                  {/* Local MP4 (H.264) */}
                  <source src="/media/ozone-30s.mp4" type="video/mp4" />
                  {/* Fallback: original NASA WebM on Commons */}
                  <source
                    src="https://upload.wikimedia.org/wikipedia/commons/5/56/2023_Ozone_Hole_Update.webm"
                    type="video/webm"
                  />
                  <track
                    kind="captions"
                    src="/media/ozone-30s.vtt"
                    srcLang="en"
                    label="English"
                    default
                  />
                  Your browser does not support the video tag.
                </video>
              </div>
            </CardContent>
          </Card>

          {/* Q&A */}
          <Card className="rounded-2xl border-zinc-200/70 dark:border-zinc-800/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Q&amp;A
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="text-sm">
                <span className="font-medium">Q:</span> What mainly causes the
                Antarctic ozone hole?
              </div>
              <div className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-medium">A:</span> Chlorine and bromine
                from human-made CFCs/halons become reactive on cold polar clouds
                and catalytically destroy O<sub>3</sub> when sunlight returns in
                spring.
              </div>

              <div className="text-sm">
                <span className="font-medium">Q:</span> Why is it largest in
                Southern Hemisphere spring?
              </div>
              <div className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-medium">A:</span> Winter creates polar
                stratospheric clouds; spring sunlight kicks off reactions that
                rapidly deplete ozone.
              </div>

              <div className="text-sm">
                <span className="font-medium">Q:</span> What did the Montreal
                Protocol change?
              </div>
              <div className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-medium">A:</span> It phased out
                ozone-depleting substances globally, putting the ozone layer on
                a long-term path to recovery.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
