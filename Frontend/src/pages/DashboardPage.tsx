import * as React from "react";
import { Navbar } from "@/components/landing/Navbar";
import { NotebookMock } from "@/components/landing/NotebookMock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";

export function DashboardPage() {
  // State to manage the list of uploaded source files for a study pack
  const [sources, setSources] = React.useState<string[]>([
    "UNEP_Montreal_Protocol_summary.pdf",
    "NOAA_Ozone_watch_notes.md",
  ]);

  const handleFileSelected = (file: File | null) => {
    if (file) {
      setSources((prev) => [file.name, ...prev]);
      // TODO: Add logic here to actually upload the file to your backend
      console.log("Uploading file:", file.name);
    }
  };

  return (
    <div>
      {/* You'll likely want to use the same Navbar */}
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Your Dashboard</h1>
          <p className="text-muted-foreground">
            Upload documents to create new study packs.
          </p>
        </div>

        {/* File Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Create a New Study Pack
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex w-full max-w-md items-center gap-2">
              <Input
                type="file"
                className="cursor-pointer"
                onChange={(e) =>
                  handleFileSelected(e.target.files?.[0] || null)
                }
              />
              <Button>Process</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Supported files: PDF, DOCX, TXT. [cite: 82]
            </p>
          </CardContent>
        </Card>

        {/* Display Area for the User's Study Packs */}
        <div>
          <h2 className="mb-4 text-2xl font-bold tracking-tight">
            Current Study Pack
          </h2>
          {/* We reuse NotebookMock to display the content */}
          <NotebookMock sources={sources} />
          {/* In a real app, you would map over a list of notebooks here */}
        </div>
      </main>
    </div>
  );
}
