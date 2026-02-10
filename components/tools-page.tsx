"use client";

import { useState } from "react";
import { Calculator, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RpeCalculator } from "@/components/rpe-calculator";
import type { UserMetadata } from "@/lib/types/database";

interface ToolsPageProps {
  initialMetadata: UserMetadata;
}

export function ToolsPage({ initialMetadata }: ToolsPageProps) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  if (selectedTool === "rpe-calculator") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTool(null)}
            className="mb-2 -ml-2 text-muted-foreground"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Tools
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">RPE Calculator</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Calculate working weights based on your 1RM, reps, and RPE.
          </p>
        </div>
        <RpeCalculator initialMetadata={initialMetadata} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="text-muted-foreground text-sm mt-1">Training utilities and calculators.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setSelectedTool("rpe-calculator")}
        >
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="rounded-md bg-primary/10 p-2.5">
              <Calculator size={20} className="text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle>RPE Calculator</CardTitle>
              <CardDescription>
                Find working weights from your 1RM using the RPE scale.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
