import {
  createContext,
  useState,
  useContext,
  type ReactNode,
  useEffect,
} from "react";
import { BYPASS_AUTH } from "@/config";

interface AuthContextType {
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  logout: () => void;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (BYPASS_AUTH) {
      setAuthTokenState("dev-token");
      setIsReady(true);
      return;
    }

    setAuthTokenState(localStorage.getItem("authToken"));
    setIsReady(true);

    const handleStorageChange = () => {
      setAuthTokenState(localStorage.getItem("authToken"));
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

  const logout = () => {
    if (BYPASS_AUTH) {
      setAuthTokenState(null);
      return;
    }

    setAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ authToken, setAuthToken, logout, isReady }}>
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
