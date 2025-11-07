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
import { PlusCircle, ChevronDown, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// 🆕 Import StudyMate logos (light + dark)
import logoLight from "@/assets/studymate-logo-black.png";
import logoDark from "@/assets/studymate-logo-white.png";

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
  onShowFilesDrawer?: () => void;
  onShowStudioDrawer?: () => void;
  sessionHasDocuments?: boolean; // 🆕 new prop
}

interface LegacyDashboardHeaderProps {
  onCreateNotebook: () => void;
  createDisabled?: boolean;
  notebooks: NotebookOption[];
  selectedNotebookId: string | null;
  onSelectNotebook: (id: string) => void;
}

type CombinedDashboardHeaderProps =
  | DashboardHeaderProps
  | LegacyDashboardHeaderProps;

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
    (joinedNameParts.length > 0
      ? joinedNameParts
      : normalizedEmail ?? "Your Account");

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

  // ---------- NOTEBOOK MODE ----------
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
      activeNotebook?.title ??
      (notebooks.length > 0 ? "Select notebook" : "No notebooks yet");

    return (
      <header className="sticky top-0 z-40 backdrop-blur bg-[var(--background)] text-[var(--foreground)] border-b border-[var(--border)] transition-colors duration-300">
        <div className="flex h-14 w-full items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer select-none">
            <img
              src={logoLight}
              alt="StudyMate Logo"
              className="h-8 w-auto dark:hidden"
            />
            <img
              src={logoDark}
              alt="StudyMate Logo"
              className="h-8 w-auto hidden dark:block"
            />
            <span className="hidden sm:inline text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
              StudyMate
            </span>
          </div>

          {/* Notebook controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden rounded-full border-zinc-200 px-4 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-100 sm:inline-flex"
                >
                  {dropdownLabel}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="center" forceMount>
                <DropdownMenuLabel className="text-xs uppercase text-zinc-400">
                  Your notebooks
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notebooks.length === 0 ? (
                  <DropdownMenuItem
                    disabled
                    className="text-xs text-muted-foreground"
                  >
                    No notebooks yet
                  </DropdownMenuItem>
                ) : (
                  notebooks.map((nb) => (
                    <DropdownMenuItem
                      key={nb.id}
                      onSelect={() => onSelectNotebook(nb.id)}
                      className={
                        nb.id === selectedNotebookId
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100"
                          : ""
                      }
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{nb.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {nb.subject}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="icon"
              className="rounded-full sm:hidden"
              onClick={onCreateNotebook}
              disabled={createDisabled}
            >
              <Plus className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              className="hidden sm:inline-flex rounded-full"
              onClick={onCreateNotebook}
              disabled={createDisabled}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Notebook
            </Button>

            {/* Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                >
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
                    {displayEmail && (
                      <p className="text-xs leading-none text-muted-foreground">
                        {displayEmail}
                      </p>
                    )}
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

  // ---------- SESSION MODE ----------
  const {
    sessions,
    selectedSessionId,
    onSelectSession,
    onCreateSession,
    createDisabled = false,
    sessionsLoading = false,
    onShowFilesDrawer,
    onShowStudioDrawer,
  } = props;

  const activeSession =
    selectedSessionId == null
      ? null
      : sessions.find((s) => s.id === selectedSessionId) ?? null;

  const dropdownLabel = sessionsLoading
    ? "Loading sessions…"
    : activeSession
    ? activeSession.name
    : sessions.length > 0
    ? "Select session"
    : "No sessions yet";

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-[var(--background)] text-[var(--foreground)] border-b border-[var(--border)] transition-colors duration-300">
      <div className="flex h-14 w-full items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <img
            src={logoLight}
            alt="StudyMate Logo"
            className="h-8 w-auto dark:hidden"
          />
          <img
            src={logoDark}
            alt="StudyMate Logo"
            className="h-8 w-auto hidden dark:block"
          />
          <span className="hidden sm:inline text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
            StudyMate
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink">
          {/* Mobile buttons */}
          <div className="flex items-center gap-2 lg:hidden">
            {/* 📁 Files button stays active */}
            <Button
              size="icon"
              variant="outline"
              className="rounded-full border-zinc-200 dark:border-zinc-700"
              onClick={onShowFilesDrawer}
              title="Files"
            >
              📁
            </Button>

            {/* ⚙️ Studio button disabled if no files */}
            <Button
              size="icon"
              variant="outline"
              disabled={!props.sessionHasDocuments}
              onClick={() => {
                if (!props.sessionHasDocuments) return;
                onShowStudioDrawer?.();
              }}
              className={
                props.sessionHasDocuments
                  ? "rounded-full border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  : "rounded-full border-zinc-200 dark:border-zinc-700 opacity-50 cursor-not-allowed"
              }
              title={
                props.sessionHasDocuments
                  ? "Open Studio"
                  : "Upload a file to unlock Studio tools"
              }
            >
              ⚙️
            </Button>
          </div>

          {/* Session Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-zinc-200 px-3 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-100 sm:px-4 sm:text-sm"
              >
                {dropdownLabel}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="center" forceMount>
              <DropdownMenuLabel className="text-xs uppercase text-zinc-400">
                Your sessions
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sessions.length === 0 ? (
                <DropdownMenuItem
                  disabled
                  className="text-xs text-muted-foreground"
                >
                  No sessions yet
                </DropdownMenuItem>
              ) : (
                sessions.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onSelect={() => onSelectSession(s.id)}
                    className={
                      s.id === selectedSessionId
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100"
                        : ""
                    }
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{s.name}</span>
                      {typeof s.documentCount === "number" && (
                        <span className="text-xs text-muted-foreground">
                          {s.documentCount} file
                          {s.documentCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={createDisabled}
                onSelect={(e) => {
                  if (createDisabled) e.preventDefault();
                  else onCreateSession();
                }}
              >
                + Create new session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create buttons */}
          <Button
            size="icon"
            className="rounded-full sm:hidden"
            onClick={onCreateSession}
            disabled={createDisabled}
            title="Create session"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            className="hidden sm:inline-flex rounded-full"
            onClick={onCreateSession}
            disabled={createDisabled}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Session
          </Button>

          {/* Avatar */}
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
                  {displayEmail && (
                    <p className="text-xs leading-none text-muted-foreground">
                      {displayEmail}
                    </p>
                  )}
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
