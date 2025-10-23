import { Section } from "./Section";
import { NotebookMock } from "./NotebookMock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { ACCEPTED_FILE_ACCEPT, isAcceptedUpload } from "@/lib/utils";

export function DemoCTA({
  sources,
  onFileSelected,
  isUploading = false,
}: {
  sources: string[];
  onFileSelected: (file: File) => void;
  isUploading?: boolean;
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
              accept={ACCEPTED_FILE_ACCEPT}
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  return;
                }

                if (!isAcceptedUpload(file)) {
                  window.alert("Please upload a PDF or DOCX file.");
                  e.target.value = "";
                  return;
                }

                onFileSelected(file);
              }}
            />
            <Button className="w-full" disabled={isUploading}>
              {isUploading ? "Uploading…" : "Process sample"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Section>
  );
}
