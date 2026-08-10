import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallback?: React.ReactNode;
  className?: string;
  width?: number;
  height?: number;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, 
  alt = "Imagem", 
  fallback, 
  className, 
  width, 
  height, 
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // If no src, show fallback immediately
  if (!src || hasError) {
    return (
      <div className={cn("bg-muted flex items-center justify-center overflow-hidden", className)}>
        {fallback}
      </div>
    );
  }

  // Optimized URL with transformations (if using Supabase Storage)
  const optimizedUrl = src.includes('storage/v1/object/public') 
    ? `${src}?width=${width || 800}&quality=80`
    : src;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!isLoaded && <Skeleton className="absolute inset-0 z-0" />}
      <img
        src={optimizedUrl}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
        {...props}
      />
    </div>
  );
};
