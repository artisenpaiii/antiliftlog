export interface E1RMDetails {
  weight: number;
  reps: number;
  rpe: number;
}

export interface E1RMDataPoint {
  label: string;
  squat: number | null;
  bench: number | null;
  deadlift: number | null;
  squatSmoothed: number | null;
  benchSmoothed: number | null;
  deadliftSmoothed: number | null;
  squatDetails: E1RMDetails | null;
  benchDetails: E1RMDetails | null;
  deadliftDetails: E1RMDetails | null;
}
