import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  type AuthUser,
  configureAuthPersistence,
  getStoredAuthRole,
  loginWithEmail,
  logoutUser,
  signupWithEmail,
  subscribeToAuthState,
  type LocalAuthRole,
} from "@/features/auth/services/auth.service";

type AuthRole = LocalAuthRole;

type AuthContextType = {
  user: AuthUser | null;
  authRole: AuthRole | null;
  loading: boolean;
  signUp: (payload: { role: AuthRole; email: string; password: string; name: string }) => Promise<void>;
  signIn: (payload: { role: AuthRole; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function formatAuthError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return error instanceof Error && error.message ? error.message : "Authentication failed. Please try again.";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authRole, setAuthRole] = useState<AuthRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configureAuthPersistence().catch(() => undefined);

    const unsubscribe = subscribeToAuthState((nextUser) => {
      setUser(nextUser);
      setAuthRole(nextUser ? getStoredAuthRole(nextUser.uid) ?? "student" : null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    authRole,
    loading,
    async signUp({ role, email, password, name }) {
      try {
        await signupWithEmail({ role, email, password, name });
        setAuthRole(role);
      } catch (error) {
        throw new Error(formatAuthError(error));
      }
    },
    async signIn({ role, email, password }) {
      try {
        await loginWithEmail({ role, email, password });
        setAuthRole(role);
      } catch (error) {
        throw new Error(formatAuthError(error));
      }
    },
    async logout() {
      await logoutUser();
      setAuthRole(null);
    },
  }), [authRole, loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
