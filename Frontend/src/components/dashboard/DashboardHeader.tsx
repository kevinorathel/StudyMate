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

type SessionOption = {
  id: number;
  name: string;
  documentCount?: number;
};

type NotebookOption = {
  id: string;
  title: string;
  subject: string;
};

interface DashboardHeaderProps {
  onCreateSession: () => void;
  createDisabled?: boolean;
  sessions: SessionOption[];
  selectedSessionId: number | null;
  onSelectSession: (id: number) => void;
  sessionsLoading?: boolean;
}

interface LegacyDashboardHeaderProps {
  onCreateNotebook: () => void;
  createDisabled?: boolean;
  notebooks: NotebookOption[];
  selectedNotebookId: string | null;
  onSelectNotebook: (id: string) => void;
}

type CombinedDashboardHeaderProps = DashboardHeaderProps | LegacyDashboardHeaderProps;

function isSessionMode(
  props: CombinedDashboardHeaderProps
): props is DashboardHeaderProps {
  return "sessions" in props;
}

export function DashboardHeader(props: CombinedDashboardHeaderProps) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const safeValue = (value?: string | null) =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

  const normalizedFullName = safeValue(user?.fullName);
  const normalizedFirstName = safeValue(user?.firstName);
  const normalizedLastName = safeValue(user?.lastName);
  const normalizedEmail = safeValue(user?.email);

  const joinedNameParts = [normalizedFirstName, normalizedLastName]
    .filter((part): part is string => Boolean(part))
    .join(" ");

  const displayName =
    normalizedFullName ??
    (joinedNameParts.length > 0 ? joinedNameParts : normalizedEmail ?? "Your Account");

  const displayEmail = normalizedEmail;

  const initialsSource =
    normalizedFullName ??
    (joinedNameParts.length > 0 ? joinedNameParts : normalizedEmail ?? "User");

  const avatarFallback =
    initialsSource
      .split(/\s+/)
      .filter((part) => part.length > 0)
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2) || "U";

  if (!isSessionMode(props)) {
    const {
      notebooks,
      selectedNotebookId,
      onSelectNotebook,
      onCreateNotebook,
      createDisabled = false,
    } = props;

    const activeNotebook =
      selectedNotebookId == null
        ? null
        : notebooks.find((item) => item.id === selectedNotebookId) ?? null;

    const dropdownLabel =
      activeNotebook?.title ?? (notebooks.length > 0 ? "Select notebook" : "No notebooks yet");

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
                  {dropdownLabel}
                  <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="center" forceMount>
                <DropdownMenuLabel className="text-xs uppercase text-zinc-400">
                  Your notebooks
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notebooks.length === 0 ? (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    No notebooks yet
                  </DropdownMenuItem>
                ) : (
                  notebooks.map((notebook) => (
                    <DropdownMenuItem
                      key={notebook.id}
                      onSelect={() => onSelectNotebook(notebook.id)}
                      className={
                        notebook.id === selectedNotebookId
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100"
                          : ""
                      }
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{notebook.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {notebook.subject}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
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
                    <AvatarImage src="/avatars/01.png" alt={displayName} />
                    <AvatarFallback>{avatarFallback}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {displayName}
                    </p>
                    {displayEmail ? (
                      <p className="text-xs leading-none text-muted-foreground">
                        {displayEmail}
                      </p>
                    ) : null}
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

  const {
    sessions,
    selectedSessionId,
    onSelectSession,
    onCreateSession,
    createDisabled = false,
    sessionsLoading = false,
  } = props;

  const activeSession =
    selectedSessionId == null
      ? null
      : sessions.find((item) => item.id === selectedSessionId) ?? null;

  const dropdownLabel = sessionsLoading
    ? "Loading sessions…"
    : activeSession
    ? activeSession.name
    : sessions.length > 0
    ? "Select session"
    : "No sessions yet";

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
                {dropdownLabel}
                <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="center" forceMount>
              <DropdownMenuLabel className="text-xs uppercase text-zinc-400">
                Your sessions
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sessions.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  No sessions yet
                </DropdownMenuItem>
              ) : (
                sessions.map((session) => (
                  <DropdownMenuItem
                    key={session.id}
                    onSelect={() => onSelectSession(session.id)}
                    className={
                      session.id === selectedSessionId
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100"
                        : ""
                    }
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{session.name}</span>
                      {typeof session.documentCount === "number" ? (
                        <span className="text-xs text-muted-foreground">
                          {session.documentCount} file
                          {session.documentCount === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={createDisabled}
                onSelect={(event) => {
                  if (createDisabled) {
                    event.preventDefault();
                    return;
                  }
                  onCreateSession();
                }}
              >
                + Create new session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            className="rounded-full"
            onClick={onCreateSession}
            disabled={createDisabled}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Session
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/avatars/01.png" alt={displayName} />
                  <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {displayName}
                  </p>
                  {displayEmail ? (
                    <p className="text-xs leading-none text-muted-foreground">
                      {displayEmail}
                    </p>
                  ) : null}
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
