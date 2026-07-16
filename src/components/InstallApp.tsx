import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsVisible(false);
        toast.success("App instalada com sucesso!");
      }
    } else {
      toast.info("Para instalar a App: Clique nas opções do navegador e selecione 'Adicionar ao Ecrã Principal' ou 'Instalar'.");
    }
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={handleInstallClick}
      title="Instalar App no Dispositivo"
      className="fixed bottom-6 right-6 z-50 glass-btn-3d flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-white/60 text-xs font-bold uppercase tracking-wider shadow-2xl hover:scale-105 transition-transform duration-300 no-print"
    >
      <Download size={14} className="text-amber-600 animate-bounce" />
      <span>Instalar App</span>
    </button>
  );
}
