import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Ops! Algo deu errado.</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ocorreu um erro inesperado na interface. Nossa equipe foi notificada (log interno).
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg text-left overflow-auto max-h-32">
              <code className="text-[10px] text-muted-foreground whitespace-pre-wrap">
                {this.state.error?.message || 'Erro desconhecido'}
              </code>
            </div>

            <Button 
              className="w-full gap-2" 
              onClick={() => window.location.reload()}
            >
              <RefreshCcw className="h-4 w-4" /> Recarregar página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
