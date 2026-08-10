import { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, Copy, Check, Download, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from './types';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isResearching: boolean;
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  onExportPDF: (message: ChatMessage) => void;
  scrollRef: RefObject<HTMLDivElement>;
}

export function ChatMessages({
  messages, isLoading, isResearching, copiedId, onCopy, onExportPDF, scrollRef,
}: ChatMessagesProps) {
  return (
    <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex gap-3", message.role === 'user' && "flex-row-reverse")}
          >
            <div className={cn(
              "p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0",
              message.role === 'assistant' ? "bg-primary/10 text-primary" : "bg-muted"
            )}>
              {message.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>

            <div className={cn("flex-1 space-y-2", message.role === 'user' && "text-right")}>
              <div className={cn(
                "inline-block p-3 rounded-lg max-w-[90%]",
                message.role === 'assistant' ? "bg-muted text-left" : "bg-primary text-primary-foreground"
              )}>
                {message.role === 'assistant' && (message.aiProvider || message.hasResearch) && (
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    {message.aiProvider && (
                      <Badge variant={message.aiProvider === 'openrouter' ? 'secondary' : 'outline'} className="text-xs">
                        {message.aiProvider === 'openrouter' ? '🔄 FreeFlow' : '⚡ Lovable AI'}
                      </Badge>
                    )}
                    {message.hasResearch && (
                      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-600">
                        🔍 Com pesquisa de mercado
                      </Badge>
                    )}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>

              {message.role === 'assistant' && message.id !== 'initial' && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 px-2"
                    onClick={() => onCopy(message.content, message.id)}>
                    {copiedId === message.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  {message.content.length > 200 && (
                    <Button variant="ghost" size="sm" className="h-7 px-2"
                      onClick={() => onExportPDF(message)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="p-2 rounded-full h-8 w-8 flex items-center justify-center bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2">
                {isResearching ? (
                  <>
                    <Search className="h-4 w-4 animate-pulse text-primary" />
                    <span className="text-sm text-muted-foreground">Pesquisando mercado e analisando dados...</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Pensando...</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
