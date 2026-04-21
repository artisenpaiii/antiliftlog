import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CoachInsightCardProps {
  title: string;
  insight: string;
  rule: string;
  supportLabel?: string;
}

export function CoachInsightCard({ title, insight, rule, supportLabel }: CoachInsightCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {supportLabel && <Badge variant="secondary">{supportLabel}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm">{insight}</p>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info size={12} className="mt-0.5 shrink-0" />
          <span>{rule}</span>
        </p>
      </CardContent>
    </Card>
  );
}
