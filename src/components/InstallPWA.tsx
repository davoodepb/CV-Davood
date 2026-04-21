import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __pwaPrompt?: BeforeInstallPromptEvent;
  }
}

const InstallPWA = () => {
  const [promptInstall, setPromptInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      setPromptInstall(prompt);
      // Store globally so hero button can also use it
      window.__pwaPrompt = prompt;
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const onClick = async () => {
    if (promptInstall) {
      promptInstall.prompt();
      const { outcome } = await promptInstall.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
    }
  };

  // Don't show if install prompt is not available, already installed, or dismissed.
  if (isInstalled || dismissed || !promptInstall) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div className="relative">
        <Button
          onClick={onClick}
          className="shadow-xl flex items-center gap-2 rounded-full px-5 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm"
          size="lg"
        >
          <Smartphone size={20} />
          Baixar App
        </Button>
        <button
          onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-foreground/80 text-background flex items-center justify-center hover:bg-foreground transition-colors shadow-md"
          aria-label="Fechar"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

export default InstallPWA;
