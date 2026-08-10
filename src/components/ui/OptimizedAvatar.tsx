import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface OptimizedAvatarProps {
  src?: string | null;
  fallback: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function OptimizedAvatar({ src, fallback, className, size = 'md' }: OptimizedAvatarProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  };

  // Supabase Image Transformation (if available/configured)
  // We can append transformation params to the URL if it's a supabase URL
  const getOptimizedUrl = (url: string) => {
    if (!url) return url;
    if (url.includes('supabase.co/storage/v1/object/public/')) {
      // Basic optimization: width and quality
      const width = size === 'sm' ? 64 : size === 'md' ? 128 : size === 'lg' ? 256 : 512;
      return `${url}?width=${width}&quality=80`;
    }
    return url;
  };

  return (
    <Avatar className={cn(sizeClasses[size], "transition-all duration-300", !isLoaded && src && "bg-muted", className)}>
      {src && !error && (
        <AvatarImage 
          src={getOptimizedUrl(src)} 
          alt={fallback} 
          className={cn("object-cover transition-opacity duration-300", isLoaded ? "opacity-100" : "opacity-0")}
          onLoadingStatusChange={(status) => {
            if (status === 'loaded') setIsLoaded(true);
            if (status === 'error') setError(true);
          }}
          loading="lazy"
        />
      )}
      <AvatarFallback className="font-bold bg-primary/10 text-primary">
        {fallback.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
