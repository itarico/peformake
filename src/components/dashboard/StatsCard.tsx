import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  className?: string;
  iconClassName?: string;
  delay?: number;
}

export const StatsCard = ({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  onClick,
  className,
  iconClassName,
  delay = 0
}: StatsCardProps) => {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={cn(
          "relative overflow-hidden border-none shadow-sm transition-all duration-300",
          onClick && "cursor-pointer hover:shadow-md hover:-translate-y-1 active:scale-95",
          className
        )}
        onClick={onClick}
      >
        <CardContent className="p-5">
          <div className="flex justify-between items-start">
            <div className={cn(
              "p-2.5 rounded-xl transition-colors",
              iconClassName || "bg-primary/10 text-primary"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            {trend && (
              <div className={cn(
                "flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-bold",
                trend.isPositive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
              )}>
                {trend.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trend.value}%
              </div>
            )}
          </div>

          <div className="mt-4 space-y-1">
            <h3 className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {value}
            </h3>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {label}
              </p>
              {sub && (
                <p className="text-[10px] text-muted-foreground/60 font-medium">
                  {sub}
                </p>
              )}
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none">
            <Icon size={100} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
