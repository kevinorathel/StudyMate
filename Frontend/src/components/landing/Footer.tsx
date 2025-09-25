import { Section } from "./Section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer
      id="contact"
      className="border-t border-zinc-200/60 dark:border-zinc-800/60 py-10 mt-6"
    >
      <Section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 via-violet-500 to-emerald-500"
            aria-hidden="true"
          />
          <div>
            <div className="font-semibold">Smart StudyMate</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              © {new Date().getFullYear()} StudyMate Team
            </div>
          </div>
        </div>
        <form className="w-full sm:w-auto flex gap-2">
          <Input
            type="email"
            placeholder="Join the waitlist"
            aria-label="Email"
          />
          <Button type="submit">Notify me</Button>
        </form>
      </Section>
    </footer>
  );
}
