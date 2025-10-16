import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type NotebookOption = {
  id: string;
  title: string;
  subject: string;
};

interface DashboardHeaderProps {
  onCreateNotebook: () => void;
  createDisabled?: boolean;
  notebooks: NotebookOption[];
  selectedNotebookId: string | null;
  onSelectNotebook: (id: string) => void;
}

export function DashboardHeader({
  onCreateNotebook,
  createDisabled = false,
  notebooks,
  selectedNotebookId,
  onSelectNotebook,
}: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const activeNotebook = useMemo(() => {
    if (!selectedNotebookId) return null;
    return notebooks.find((item) => item.id === selectedNotebookId) ?? null;
  }, [notebooks, selectedNotebookId]);

  return (
    <header className="sticky top-0 z-40 bg-[#f5f7fb]/95 backdrop-blur dark:bg-[#0f1015]/95">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-emerald-500 shadow"
            aria-hidden="true"
          />
          <span className="text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-100">
            Smart StudyMate
          </span>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="hidden rounded-full border-zinc-200 px-4 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-100 sm:inline-flex"
              >
                {activeNotebook ? activeNotebook.title : "Select notebook"}
                <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="center" forceMount>
              <DropdownMenuLabel className="text-xs uppercase text-zinc-400">
                Your notebooks
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notebooks.map((notebook) => (
                <DropdownMenuItem
                  key={notebook.id}
                  onSelect={() => onSelectNotebook(notebook.id)}
                  className={notebook.id === selectedNotebookId ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100" : ""}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{notebook.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {notebook.subject}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            className="rounded-full"
            onClick={onCreateNotebook}
            disabled={createDisabled}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Notebook
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/avatars/01.png" alt="@user" />
                  <AvatarFallback>VF</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Vikas Falke
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    vikas@clarku.edu
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
