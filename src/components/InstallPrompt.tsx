import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import shieldLogo from "@/assets/images/shield_logo_1782228638116.jpg";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "edvora-install-prompt-dismissed";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(STORAGE_KEY) === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    if ("getInstalledRelatedApps" in navigator) {
      (navigator as unknown as { getInstalledRelatedApps: () => Promise<unknown[]> })
        .getInstalledRelatedApps()
        .then((apps) => {
          if (apps.length > 0) setVisible(false);
        })
        .catch(() => {
          // ignore
        });
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    } else {
      dismiss();
    }
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-4 left-4 right-4 z-50 sm:bottom-6 sm:left-6 sm:right-auto sm:w-[380px]"
        >
          <div className="glass-card rounded-2xl p-4 shadow-elegant border border-border/80">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0 grid place-items-center">
                <img src={shieldLogo} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Install EDVORA COLLEGE</h3>
                  <button
                    onClick={dismiss}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Dismiss install prompt"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Add this app to your home screen for quick access to attendance, students, and reports.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-xs"
                onClick={dismiss}
              >
                Not now
              </Button>
              <Button
                size="sm"
                className="flex-1 h-9 text-xs gradient-primary text-primary-foreground"
                onClick={install}
              >
                <Download size={14} className="mr-1.5" />
                Install app
              </Button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
              <Smartphone size={12} />
              <span>Works on Android and Chrome desktop</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
