// Meet attempt selection logic.
// Coaching rules:
//   Opener:  93–95% of training max — must be tripleable, walk-in confidence
//   2nd:     97–100% — planned training max, "day" lift
//   3rd:     101–104% — only if 2nd felt good, PR territory
// Attempts must increment by at least 2.5kg.

export type AttemptScenario = "conservative" | "standard" | "aggressive";

export interface AttemptSet {
  opener: number;
  second: number;
  third: number;
}

export interface AttemptSuggestion {
  scenario: AttemptScenario;
  squat: AttemptSet;
  bench: AttemptSet;
  deadlift: AttemptSet;
  projectedTotal: number;
}

export interface TrainingMaxes {
  squat: number;
  bench: number;
  deadlift: number;
}

const SCENARIO_MULTIPLIERS: Record<AttemptScenario, { opener: number; second: number; third: number }> = {
  conservative: { opener: 0.93, second: 0.97, third: 1.01 },
  standard: { opener: 0.94, second: 0.985, third: 1.025 },
  aggressive: { opener: 0.95, second: 1.0, third: 1.04 },
};

function roundToIncrement(weight: number, increment: number = 2.5): number {
  return Math.round(weight / increment) * increment;
}

function suggestAttemptsForLift(trainingMax: number, scenario: AttemptScenario): AttemptSet {
  const m = SCENARIO_MULTIPLIERS[scenario];
  const opener = roundToIncrement(trainingMax * m.opener);
  const second = Math.max(roundToIncrement(trainingMax * m.second), opener + 2.5);
  const third = Math.max(roundToIncrement(trainingMax * m.third), second + 2.5);
  return { opener, second, third };
}

export function suggestAllAttempts(trainingMaxes: TrainingMaxes): AttemptSuggestion[] {
  const scenarios: AttemptScenario[] = ["conservative", "standard", "aggressive"];
  return scenarios.map((scenario) => {
    const squat = suggestAttemptsForLift(trainingMaxes.squat, scenario);
    const bench = suggestAttemptsForLift(trainingMaxes.bench, scenario);
    const deadlift = suggestAttemptsForLift(trainingMaxes.deadlift, scenario);
    const projectedTotal = squat.third + bench.third + deadlift.third;
    return { scenario, squat, bench, deadlift, projectedTotal };
  });
}
