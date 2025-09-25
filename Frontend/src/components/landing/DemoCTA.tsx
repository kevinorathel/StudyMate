import { Section } from "./Section";
import { NotebookMock } from "./NotebookMock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export function DemoCTA({
  sources,
  onFileSelected,
}: {
  sources: string[];
  onFileSelected: (file: File) => void;
}) {
  return (
    <Section id="demo" className="pb-6 md:pb-12">
      <Card className="rounded-2xl border-zinc-200/70 dark:border-zinc-800/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Try it on your file
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <NotebookMock sources={sources} />
          </div>
          <div className="space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Upload a sample chapter or notes to see instant insights.
            </p>
            <Input
              type="file"
              className="cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileSelected(file);
              }}
            />
            <Button className="w-full">Process sample</Button>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              We don’t store your files. Processing happens securely.
            </div>
          </div>
        </CardContent>
      </Card>
    </Section>
  );
}
