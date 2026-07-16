import { useRef, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Volume2, VolumeX } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CVProvider } from "@/contexts/CVContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ShopProvider } from "@/contexts/ShopContext";
import CookieConsent from "@/components/CookieConsent";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Navbar from "@/components/Navbar";
import InstallApp from "@/components/InstallApp";

const queryClient = new QueryClient();

const SecretAdminRoute = () => {
  const isUnlocked = typeof window !== "undefined"
    && window.sessionStorage.getItem("secret_admin_unlocked") === "true";

  return isUnlocked ? <Admin /> : <NotFound />;
};

const AppContent = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    // Keep video speed constant and smooth
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.95;
    }
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Global Fixed Fullscreen Background Video */}
      <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none no-print">
        <video
          ref={videoRef}
          src="/hero-video.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover opacity-100 scale-105"
        />
        {/* Light overlay for slight contrast control without affecting real colors */}
        <div className="absolute inset-0 bg-black/5 z-10" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/dashboard-interno" element={<SecretAdminRoute />} />
            <Route path="/admin" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <CookieConsent />
        <InstallApp />

        {/* Floating Audio Controls */}
        <button
          onClick={toggleMute}
          title={isMuted ? "Unmute Background Video Audio" : "Mute Background Video Audio"}
          className="fixed bottom-6 left-6 z-50 glass-btn-3d flex items-center justify-center w-11 h-11 rounded-full border border-white/60 shadow-2xl hover:scale-105 transition-transform duration-300 no-print"
        >
          {isMuted ? (
            <VolumeX size={15} className="text-amber-600" />
          ) : (
            <Volume2 size={15} className="text-amber-600 animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CVProvider>
        <ShopProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </ShopProvider>
      </CVProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
