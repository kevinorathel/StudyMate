export function Step({
  n,
  title,
  desc,
}: {
  n: number;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="h-9 w-9 shrink-0 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 grid place-items-center font-semibold">
        {n}
      </div>
      <div>
        <h4 className="font-semibold mb-1">{title}</h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{desc}</p>
      </div>
    </div>
  );
}
