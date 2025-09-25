import { Link } from "react-router-dom";
import { Section } from "./Section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Github } from "lucide-react";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Section className="flex h-16 items-center justify-between">
        {/* Logo now links to the homepage */}
        <Link to="/" className="flex items-center gap-2 text-lg font-bold">
          <Badge variant="premium">Beta</Badge>
          <h1 className="text-gradient">Smart StudyMate</h1>
        </Link>

        {/* Action buttons on the right */}
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/your-repo" // Replace with your actual GitHub repo link
            target="_blank"
            rel="noopener noreferrer"
            title="Source Code"
          >
            <Button variant="outline" size="icon">
              <Github className="h-5 w-5" />
            </Button>
          </a>

          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Login</Link>
          </Button>

          <Button size="sm" className="rounded-full" asChild>
            <Link to="/signup">Sign Up</Link>
          </Button>
        </div>
      </Section>
    </nav>
  );
}
