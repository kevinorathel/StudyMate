import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Icon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

export function FeatureCard({
  icon: IconCmp,
  title,
  desc,
}: {
  icon: Icon;
  title: string;
  desc: string;
}) {
  return (
    <Card className="backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800">
            <IconCmp className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-zinc-600 dark:text-zinc-300">
        {desc}
      </CardContent>
    </Card>
  );
}
