import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LiftLog",
    short_name: "LiftLog",
    description: "Track your training programs, workouts, and progress",
    start_url: "/dashboard/programs",
    display: "standalone",
    background_color: "#0f0f11",
    theme_color: "#7c3aed",
    scope: "/",
    icons: [],
  };
}
