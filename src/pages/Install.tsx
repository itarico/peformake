import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Monitor, CheckCircle, Share, Plus } from 'lucide-react';
import logo from '@/assets/logo-pfmk.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const mobile = /android|iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    setIsIOS(ios);
    setIsMobile(mobile);

    const installed = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(installed);

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
        setDeferredPrompt(null);
      }
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">App instalado!</h2>
            <p className="text-muted-foreground text-sm">
              O Peformake já está instalado no seu dispositivo. Abra pelo ícone na sua tela inicial.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-sidebar text-sidebar-foreground py-12 px-4 text-center">
        <img src={logo} alt="Peformake" className="h-16 mx-auto mb-4 object-contain" />
        <h1 className="text-2xl font-bold mb-2">Instalar Peformake</h1>
        <p className="text-sidebar-foreground/70 text-sm max-w-xs mx-auto">
          Instale o app no seu dispositivo para acesso rápido, mesmo sem internet.
        </p>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4 mt-6">
        {/* Android / Desktop install button */}
        {deferredPrompt && (
          <Card className="border-primary">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Download className="h-5 w-5 text-primary" />
                Instalar Agora
              </CardTitle>
              <CardDescription>Clique para instalar diretamente no seu dispositivo</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="h-5 w-5 mr-2" />
                Instalar Peformake
              </Button>
            </CardContent>
          </Card>
        )}

        {/* iOS Instructions */}
        {isIOS && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="h-5 w-5 text-primary" />
                iPhone / iPad
              </CardTitle>
              <CardDescription>Siga os passos para instalar no iOS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <div>
                  <p className="text-sm font-medium">Toque no botão Compartilhar</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    Ícone <Share className="h-3 w-3" /> na barra inferior do Safari
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <div>
                  <p className="text-sm font-medium">Role para baixo e toque em</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Plus className="h-3 w-3" /> "Adicionar à Tela de Início"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <div>
                  <p className="text-sm font-medium">Toque em "Adicionar"</p>
                  <p className="text-xs text-muted-foreground mt-0.5">O ícone aparecerá na sua tela inicial</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android instructions (no prompt available) */}
        {!deferredPrompt && !isIOS && isMobile && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="h-5 w-5 text-primary" />
                Android
              </CardTitle>
              <CardDescription>Instale pelo menu do Chrome</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <p className="text-sm">Toque nos <strong>3 pontos</strong> no canto superior direito do Chrome</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <p className="text-sm">Selecione <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar app"</strong></p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <p className="text-sm">Confirme tocando em <strong>"Instalar"</strong></p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop instructions */}
        {!isMobile && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="h-5 w-5 text-primary" />
                Computador (Chrome / Edge)
              </CardTitle>
              <CardDescription>Instale como aplicativo desktop</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="h-5 w-5 mr-2" />
                  Instalar no Computador
                </Button>
              ) : (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
                    <p className="text-sm">Clique no ícone de <strong>instalar</strong> (⊕) na barra de endereço do Chrome/Edge</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
                    <p className="text-sm">Clique em <strong>"Instalar"</strong> na janela que aparecer</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card className="bg-muted/50 border-0">
          <CardContent className="pt-4 pb-4">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Vantagens do app instalado</h3>
            <div className="space-y-2">
              {[
                'Acesso rápido pela tela inicial',
                'Funciona sem barra do navegador',
                'Carregamento mais rápido',
                'Notificações (em breve)',
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success shrink-0" />
                  <span className="text-sm text-muted-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
