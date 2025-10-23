import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, FileText } from "lucide-react";

interface NotebookCardProps {
  title: string;
  sourceCount: number;
  createdAt: string;
}

export function NotebookCard({
  title,
  sourceCount,
  createdAt,
}: NotebookCardProps) {
  return (
    <Card className="flex flex-col justify-between rounded-2xl border-zinc-200/70 dark:border-zinc-800/70 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg">
          <BookOpen className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <FileText className="h-4 w-4" />
          <span>{sourceCount} source(s)</span>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Created on {createdAt}
        </p>
      </CardFooter>
    </Card>
  );
}
