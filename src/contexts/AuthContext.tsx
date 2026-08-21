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
    // Admin email fallback — works even without Firestore admins collection
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || "";

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          // Primary check: Firestore admins collection
          const adminDoc = await getDoc(doc(db, "admins", u.uid));
          if (adminDoc.exists() && adminDoc.data()?.isAdmin === true) {
            setIsAdmin(true);
          } else if (adminEmail && u.email?.toLowerCase() === adminEmail.toLowerCase()) {
            // Fallback: check against configured admin email
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch {
          // If Firestore is unreachable, fall back to email check
          if (adminEmail && u.email?.toLowerCase() === adminEmail.toLowerCase()) {
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
