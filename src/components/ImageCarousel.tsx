import { useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ImageCarouselProps {
  images: string[];
  onImageClick?: (imageUrl: string) => void;
  className?: string;
  showCounter?: boolean;
  aspectRatio?: 'square' | 'video';
}

export function ImageCarousel({
  images,
  onImageClick,
  className,
  showCounter = true,
  aspectRatio = 'square',
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    return (
      <div className={cn('relative', aspectRatio === 'square' ? 'aspect-square' : 'aspect-video', className)}>
        <img
          src={images[0]}
          alt={className?.includes('client-logo') ? "Logo do cliente" : "Imagem da arte"}
          className={cn(
            'w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity',
            onImageClick && 'cursor-pointer'
          )}
          onClick={() => onImageClick?.(images[0])}
        />
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <Carousel
        opts={{ loop: true }}
        className="w-full"
        setApi={(api) => {
          api?.on('select', () => {
            setCurrentIndex(api.selectedScrollSnap());
          });
        }}
      >
        <CarouselContent className="-ml-0">
          {images.map((imageUrl, index) => (
            <CarouselItem key={imageUrl} className="pl-0">
              <div className={aspectRatio === 'square' ? 'aspect-square' : 'aspect-video'}>
                <img
                  src={imageUrl}
                  alt={`Imagem ${index + 1} do carrossel`}
                  className={cn(
                    'w-full h-full object-cover',
                    onImageClick && 'cursor-pointer hover:opacity-90 transition-opacity'
                  )}
                  onClick={() => onImageClick?.(imageUrl)}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        <CarouselPrevious className="left-2 h-8 w-8 bg-background/80 hover:bg-background" />
        <CarouselNext className="right-2 h-8 w-8 bg-background/80 hover:bg-background" />
      </Carousel>

      {/* Image Counter */}
      {showCounter && images.length > 1 && (
        <Badge 
          variant="secondary" 
          className="absolute bottom-2 right-2 text-xs bg-background/80"
        >
          {currentIndex + 1} / {images.length}
        </Badge>
      )}

      {/* Dot Indicators */}
      {images.length > 1 && images.length <= 10 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {images.map((_, index) => (
            <div
              key={index}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                index === currentIndex ? 'bg-primary' : 'bg-muted-foreground/50'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
