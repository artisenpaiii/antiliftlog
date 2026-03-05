---
name: new-page
description: Guide for adding a new page/route to the LiftLog dashboard
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash
argument-hint: [page-name]
---

# Adding a New Page: $ARGUMENTS

## Steps

### 1. Create the Route
Create `app/dashboard/$ARGUMENTS/page.tsx` as a **Server Component**:

```tsx
import { createClient } from "@/lib/supabase/server";
import { createTables } from "@/lib/db";
import { redirect } from "next/navigation";
import { YourPageComponent } from "@/components/your-page";

export default async function YourPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  const tables = createTables(supabase);
  // Fetch data...

  return <YourPageComponent /* pass data as props */ />;
}
```

### 2. Create the Client Component
Create `components/$ARGUMENTS-page.tsx` with `"use client"`:

```tsx
"use client";

import { useState } from "react";

interface YourPageProps {
  // Props from server component
}

export function YourPage({ ...props }: YourPageProps) {
  // Client-side state and UI
}
```

### 3. Add Navigation Link
Edit `components/nav-links.tsx` to add the new page:
- Add to the `links` array with `href`, `label`, and Lucide `icon`
- This automatically appears in both desktop sidebar and mobile bottom tabs

### 4. Existing Dashboard Layout
The page automatically inherits `app/dashboard/layout.tsx` which provides:
- Desktop: Sidebar navigation on the left
- Mobile: Bottom tab navigation
- No need to add layout wrapping yourself

## Conventions
- Page files are Server Components (no `"use client"`)
- The corresponding UI component is a Client Component
- Page fetches data and passes it down as props
- Auth check with redirect at the top of every page
- File naming: kebab-case for routes and files
