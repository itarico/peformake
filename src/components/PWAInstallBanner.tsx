import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    if (standalone) { setIsInstalled(true); return; }

    // Check if already dismissed recently
    const dismissedAt = localStorage.getItem('pwa_banner_dismissed');
    if (dismissedAt) {
      const diff = Date.now() - parseInt(dismissedAt);
      if (diff < 1000 * 60 * 60 * 24 * 3) { // 3 days
        setDismissed(true);
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      navigate('/install');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  if (isInstalled || dismissed || (!deferredPrompt && window.matchMedia('(display-mode: standalone)').matches)) {
    return null;
  }

  // Only show if we have a prompt (Android/desktop Chrome) or on iOS after some time
  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-sidebar text-sidebar-foreground border-t border-sidebar-border shadow-2xl safe-area-inset-bottom">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Instalar Peformake</p>
          <p className="text-xs text-sidebar-foreground/70 leading-tight mt-0.5">
            Acesso rápido pela tela inicial
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleInstall}
          className="shrink-0 text-xs"
        >
          Instalar
        </Button>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-full hover:bg-sidebar-accent transition-colors"
          aria-label="Fechar banner de instalação"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </button>
      </div>
    </div>
  );
}
