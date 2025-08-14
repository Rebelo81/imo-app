import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: 
    | "primary" 
    | "secondary" 
    | "accent" 
    | "success" 
    | "warning" 
    | "danger";
  isLoading?: boolean;
  trend?: string;
  trendValue?: string;
  trendDirection?: "up" | "down" | "neutral";
}

export default function StatCard({ 
  title, 
  value, 
  icon: Icon,
  iconColor = "primary",
  isLoading = false,
  trend,
  trendValue,
  trendDirection
}: StatCardProps) {
  const colorClasses = {
    primary: "text-blue-500 bg-blue-50",
    secondary: "text-purple-500 bg-purple-50",
    accent: "text-indigo-500 bg-indigo-50",
    success: "text-emerald-500 bg-emerald-50",
    warning: "text-amber-500 bg-amber-50",
    danger: "text-rose-500 bg-rose-50",
  };
  
  const trendColorClasses = {
    up: "text-emerald-600",
    down: "text-rose-600",
    neutral: "text-slate-600"
  };

  return (
    <Card className="border overflow-hidden">
      <CardContent className="p-4 md:p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-xs md:text-sm text-slate-500 font-medium">{title}</p>
            {isLoading ? (
              <div className="h-6 w-16 md:h-8 md:w-24 bg-slate-100 animate-pulse rounded"></div>
            ) : (
              <p className="text-xl md:text-2xl font-semibold">{value}</p>
            )}
            
            {trend && trendValue && trendDirection && (
              <div className={cn("text-xs flex items-center mt-2 gap-1", 
                   trendColorClasses[trendDirection])}>
                <span>{trend}</span>
                <span className="font-medium">{trendValue}</span>
              </div>
            )}
          </div>
          
          <div className={cn("rounded-full p-1.5 md:p-2", colorClasses[iconColor])}>
            <Icon className="h-4 w-4 md:h-5 md:w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
