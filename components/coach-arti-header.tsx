import { Card, CardContent } from "@/components/ui/card";

export function CoachArtiHeader() {
  return (
    <Card className="bg-gradient-to-r from-accent/30 to-background border-border">
      <CardContent className="flex items-start gap-4 p-6">
        <div className="flex items-center justify-center rounded-full bg-primary text-primary-foreground w-10 h-10 shrink-0 text-sm font-semibold">
          AR
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-foreground">Arti Ramirez</span>
            <span className="text-xs text-muted-foreground">Pattern Recognition Coach</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            I look for patterns in your training that correlate with your best results. Everything I
            tell you is based on your own data.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
