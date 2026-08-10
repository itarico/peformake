import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Video, Palette, Share2, Target, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ContentCategory = 'video' | 'artes' | 'social_media' | 'trafego' | 'todos';

interface ContentCategorySelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (category: ContentCategory) => void;
  isLoading?: boolean;
}

const categories: { id: ContentCategory; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    id: 'video',
    label: 'Conteúdo em Vídeo',
    description: 'Reels, TikToks, YouTube Shorts, Lives, Vídeos longos',
    icon: <Video className="h-6 w-6" />,
    color: 'text-red-500 bg-red-500/10 border-red-500/30',
  },
  {
    id: 'artes',
    label: 'Conteúdo de Artes',
    description: 'Carrosséis, posts únicos, stories estáticos, banners',
    icon: <Palette className="h-6 w-6" />,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
  },
  {
    id: 'social_media',
    label: 'Social Media',
    description: 'Mix para Instagram, TikTok, LinkedIn, Facebook',
    icon: <Share2 className="h-6 w-6" />,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  },
  {
    id: 'trafego',
    label: 'Tráfego Pago',
    description: 'Copies e criativos para Meta Ads, Google Ads',
    icon: <Target className="h-6 w-6" />,
    color: 'text-green-500 bg-green-500/10 border-green-500/30',
  },
  {
    id: 'todos',
    label: 'Todos os Formatos',
    description: 'Gerar ideias para todos os tipos de conteúdo',
    icon: <Sparkles className="h-6 w-6" />,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  },
];

export function ContentCategorySelector({
  open,
  onOpenChange,
  onSelect,
  isLoading = false,
}: ContentCategorySelectorProps) {
  const [selected, setSelected] = useState<ContentCategory | null>(null);

  const handleSelect = (category: ContentCategory) => {
    setSelected(category);
  };

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Escolha o Tipo de Conteúdo
          </DialogTitle>
          <DialogDescription>
            Selecione a categoria para gerar ideias de conteúdo personalizadas
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {categories.map((category) => (
            <Card
              key={category.id}
              className={cn(
                "cursor-pointer transition-all hover:scale-[1.02]",
                selected === category.id
                  ? `border-2 ${category.color}`
                  : "hover:border-primary/30"
              )}
              onClick={() => handleSelect(category.id)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className={cn(
                  "p-3 rounded-lg",
                  category.color.split(' ').slice(0, 2).join(' ')
                )}>
                  {category.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{category.label}</h3>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
                {selected === category.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected || isLoading}
          >
            {isLoading ? (
              <>Gerando...</>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Ideias
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
