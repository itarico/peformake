import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface InsightSectionProps {
  title: string;
  description?: string;
  icon: ReactNode;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
    icon?: ReactNode;
    className?: string;
  };
  children: ReactNode;
  className?: string;
  accentColor?: 'blue' | 'purple' | 'green' | 'yellow' | 'orange' | 'cyan' | 'pink';
}

const ACCENT_COLORS = {
  blue: 'border-l-blue-500',
  purple: 'border-l-purple-500',
  green: 'border-l-green-500',
  yellow: 'border-l-yellow-500',
  orange: 'border-l-orange-500',
  cyan: 'border-l-cyan-500',
  pink: 'border-l-pink-500',
};

export function InsightSection({ 
  title, 
  description, 
  icon, 
  badge,
  children, 
  className,
  accentColor = 'blue'
}: InsightSectionProps) {
  return (
    <Card className={cn('border-l-4', ACCENT_COLORS[accentColor], className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
          {badge && (
            <Badge 
              variant={badge.variant || 'outline'} 
              className={cn('gap-1', badge.className)}
            >
              {badge.icon}
              {badge.text}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}
