import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CVProvider } from "@/contexts/CVContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ShopProvider } from "@/contexts/ShopContext";
import CookieConsent from "@/components/CookieConsent";
import InstallPWA from "@/components/InstallPWA";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const PRESENCE_HEARTBEAT_MS = 30000;
const VISITOR_ID_KEY = "site-visitor-id";

const getVisitorId = () => {
  const existing = localStorage.getItem(VISITOR_ID_KEY);
  if (existing) return existing;
  const created = `visitor-${crypto.randomUUID()}`;
  localStorage.setItem(VISITOR_ID_KEY, created);
  return created;
};

const VisitorPresenceTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const visitorId = getVisitorId();

    const sendHeartbeat = async () => {
      try {
        await setDoc(
          doc(db, "presence", visitorId),
          {
            visitorId,
            currentPath: location.pathname,
            userAgent: navigator.userAgent,
            language: navigator.language,
            screen: `${window.screen.width}x${window.screen.height}`,
            lastSeenAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch {
        // Presence tracking is non-blocking.
      }
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, PRESENCE_HEARTBEAT_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [location.pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CVProvider>
        <ShopProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <VisitorPresenceTracker />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin-panel-secret" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            <CookieConsent />
            <InstallPWA />
          </TooltipProvider>
        </ShopProvider>
      </CVProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
