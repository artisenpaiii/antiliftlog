// IPF GL (Good Lift Points) — official IPF scoring system since 2019.
// GL Score = 100 × Total / f(BW), where f(BW) = A − B × e^(−C × BW)
// Coefficients verified against goodlift.info.

export type Sex = "male" | "female";
export type Equipment = "raw" | "equipped";

interface IPFCoefficients {
  A: number;
  B: number;
  C: number;
}

const IPF_COEFFICIENTS: Record<Sex, Record<Equipment, IPFCoefficients>> = {
  male: {
    raw: { A: 1199.72839, B: 1025.18162, C: 0.00921 },
    equipped: { A: 1236.25115, B: 1449.21864, C: 0.01644 },
  },
  female: {
    raw: { A: 610.32796, B: 1045.59282, C: 0.03048 },
    equipped: { A: 758.11666, B: 949.31382, C: 0.02435 },
  },
};

export function calculateIPFGL(
  totalKg: number,
  bodyweightKg: number,
  sex: Sex,
  equipment: Equipment,
): number | null {
  if (totalKg <= 0 || bodyweightKg <= 0) return null;
  const { A, B, C } = IPF_COEFFICIENTS[sex][equipment];
  const denominator = A - B * Math.exp(-C * bodyweightKg);
  if (denominator <= 0) return null;
  return (100 * totalKg) / denominator;
}

export function getGLBenchmark(score: number): { label: string; color: string } {
  if (score >= 140) return { label: "World-class", color: "text-violet-400" };
  if (score >= 120) return { label: "Elite national", color: "text-cyan-400" };
  if (score >= 100) return { label: "National competitive", color: "text-emerald-400" };
  if (score >= 85) return { label: "Club competitive", color: "text-amber-400" };
  return { label: "Developing", color: "text-muted-foreground" };
}
