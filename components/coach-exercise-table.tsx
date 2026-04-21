"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CoachAnalysis, ExerciseImpactResult, AccessoryImpactResult } from "@/lib/coach/types";

interface CoachExerciseTableProps {
  exerciseImpact: CoachAnalysis["exerciseImpact"];
}

function AccessoryRows({ exercises }: { exercises: AccessoryImpactResult[] }) {
  if (exercises.length === 0) {
    return (
      <tr>
        <td colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
          No accessory exercises found
        </td>
      </tr>
    );
  }

  return (
    <>
      {exercises.map((ex) => (
        <tr key={ex.exerciseName} className="border-b border-border last:border-0">
          <td className="py-3 pr-4 text-sm">
            <div className="flex items-center gap-2">
              {ex.isHighImpact ? (
                <Badge variant="default" className="text-xs">High Impact</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Low Impact</Badge>
              )}
              <span className="font-medium">{ex.exerciseName}</span>
            </div>
          </td>
          <td className="py-3 pr-4 text-sm text-right tabular-nums">{ex.score}%</td>
          <td className="py-3 text-xs text-muted-foreground text-right">
            {ex.positiveAppearances}/{ex.totalPositiveSegments}
          </td>
        </tr>
      ))}
    </>
  );
}

function ExerciseRows({ exercises }: { exercises: ExerciseImpactResult[] }) {
  if (exercises.length === 0) {
    return (
      <tr>
        <td colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
          No exercises found
        </td>
      </tr>
    );
  }

  return (
    <>
      {exercises.map((ex) => (
        <tr key={ex.exerciseKey} className="border-b border-border last:border-0">
          <td className="py-3 pr-4 text-sm">
            <div className="flex items-center gap-2">
              {ex.isHighImpact ? (
                <Badge variant="default" className="text-xs">High Impact</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Low Impact</Badge>
              )}
              <span className="font-medium">{ex.exerciseLabel}</span>
            </div>
          </td>
          <td className="py-3 pr-4 text-sm text-right tabular-nums">{ex.score}%</td>
          <td className="py-3 text-xs text-muted-foreground text-right">
            {ex.positiveAppearances}/{ex.totalPositiveSegments}
          </td>
        </tr>
      ))}
    </>
  );
}

export function CoachExerciseTable({ exerciseImpact }: CoachExerciseTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Exercise Impact</CardTitle>
        <p className="text-xs text-muted-foreground">
          How often each exercise appeared in your best prep blocks
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overall">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="overall">Overall</TabsTrigger>
            <TabsTrigger value="squat">Squat</TabsTrigger>
            <TabsTrigger value="bench">Bench</TabsTrigger>
            <TabsTrigger value="deadlift">Deadlift</TabsTrigger>
            <TabsTrigger value="accessories">Accessories</TabsTrigger>
          </TabsList>

          {(["overall", "squat", "bench", "deadlift"] as const).map((tab) => {
            const exercises =
              tab === "overall" ? exerciseImpact.overall : exerciseImpact.perLift[tab];
            return (
              <TabsContent key={tab} value={tab}>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 text-xs font-medium text-muted-foreground">Exercise</th>
                      <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Score</th>
                      <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Blocks</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ExerciseRows exercises={exercises} />
                  </tbody>
                </table>
              </TabsContent>
            );
          })}

          <TabsContent value="accessories">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Exercise</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Score</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground text-right">Blocks</th>
                </tr>
              </thead>
              <tbody>
                <AccessoryRows exercises={exerciseImpact.accessories} />
              </tbody>
            </table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
