import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Known admin emails — Firestore `admins/{uid}` doc is the primary check,
    // these serve as a bootstrap fallback when the doc doesn't exist yet.
    const ADMIN_EMAILS = [
      (import.meta.env.VITE_ADMIN_EMAIL || "").trim().toLowerCase(),
      "davood123@gmail.com",
      "davood00351@gmail.com",
    ].filter(Boolean);

    const isAdminEmail = (email: string | null) =>
      !!email && ADMIN_EMAILS.includes(email.toLowerCase());

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          // Primary check: Firestore admins collection
          const adminDoc = await getDoc(doc(db, "admins", u.uid));
          if (adminDoc.exists() && adminDoc.data()?.isAdmin === true) {
            setIsAdmin(true);
          } else if (isAdminEmail(u.email)) {
            // Fallback: check against configured admin emails
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch {
          // If Firestore is unreachable, fall back to email check
          if (isAdminEmail(u.email)) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

