import {
  createContext,
  useState,
  useContext,
  type ReactNode,
  useEffect,
} from "react";
import { BYPASS_AUTH } from "@/config";

export interface AuthUser {
  id: number | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}

interface AuthContextType {
  authToken: string | null;
  user: AuthUser | null;
  setAuthToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (BYPASS_AUTH) {
      setAuthTokenState("dev-token");
      setUserState({
        id: null,
        fullName: "Developer",
        email: "dev@example.com",
      });
      setIsReady(true);
      return;
    }

    const storedToken = localStorage.getItem("authToken");
    setAuthTokenState(storedToken);

    const loadStoredUser = (): AuthUser | null => {
      const raw = localStorage.getItem("authUser");
      if (!raw) {
        return null;
      }
      try {
        return JSON.parse(raw) as AuthUser;
      } catch {
        return null;
      }
    };

    setUserState(loadStoredUser());
    setIsReady(true);

    const handleStorageChange = () => {
      setAuthTokenState(localStorage.getItem("authToken"));
      setUserState(loadStoredUser());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const setAuthToken = (token: string | null) => {
    if (BYPASS_AUTH) {
      setAuthTokenState(token);
      return;
    }

    if (token) {
      localStorage.setItem("authToken", token);
    } else {
      localStorage.removeItem("authToken");
    }
    setAuthTokenState(token);
  };

  const setUser = (nextUser: AuthUser | null) => {
    if (BYPASS_AUTH) {
      setUserState(nextUser);
      return;
    }

    if (nextUser) {
      try {
        localStorage.setItem("authUser", JSON.stringify(nextUser));
      } catch {
        // ignore storage errors
      }
    } else {
      localStorage.removeItem("authUser");
    }
    setUserState(nextUser);
  };

  const logout = () => {
    if (BYPASS_AUTH) {
      setAuthTokenState(null);
      setUserState(null);
      return;
    }

    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ authToken, user, setAuthToken, setUser, logout, isReady }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
