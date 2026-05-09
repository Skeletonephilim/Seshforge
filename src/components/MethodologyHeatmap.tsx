import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDrillSessionStore, type PentestingPhase } from '@/store/drill-session-store';

interface MethodologyHeatmapProps {
  className?: string;
}

export function MethodologyHeatmap({ className }: MethodologyHeatmapProps) {
  const heatmap = useDrillSessionStore((state) => state.getWeaknessHeatmap());

  // Get color and icon based on score
  const getPhaseStyle = (score: number) => {
    if (score >= 75) {
      return {
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        icon: CheckCircle2,
        label: 'Strong',
        barColor: 'bg-green-500',
      };
    } else if (score >= 50) {
      return {
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
        icon: AlertCircle,
        label: 'Adequate',
        barColor: 'bg-yellow-500',
      };
    } else {
      return {
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive/20',
        icon: AlertTriangle,
        label: 'Needs Practice',
        barColor: 'bg-destructive',
      };
    }
  };

  return (
    <Card className={`p-6 bg-card border-border ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Methodology Heatmap</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Identify pentesting phases that need more practice
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {heatmap.map((item, index) => {
            const style = getPhaseStyle(item.score);
            const Icon = style.icon;

            return (
              <div key={item.phase} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${style.color}`} />
                    <span className="text-sm font-medium text-foreground">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`${style.bgColor} ${style.borderColor} ${style.color}`}
                    >
                      {style.label}
                    </Badge>
                    <span className={`text-sm font-semibold ${style.color}`}>
                      {item.score}%
                    </span>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="relative w-full h-2 bg-muted/20 rounded-full overflow-hidden">
                  <div 
                    className={`absolute top-0 left-0 h-full ${style.barColor} transition-all duration-500 ease-out`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Focus on phases below 50% for targeted improvement
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
