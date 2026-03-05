---
name: ui-components
description: Work with UI components — shadcn/ui primitives, shared components, navigation, and styling patterns
allowed-tools: Read, Grep, Glob
---

# UI Components

## shadcn/ui Primitives (`components/ui/`)

Available components:
- `button.tsx` — Button with variants (default, destructive, outline, secondary, ghost, link) and sizes
- `input.tsx` — Styled input field
- `label.tsx` — Form label
- `card.tsx` — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- `dialog.tsx` — Modal dialog (Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter)
- `dropdown-menu.tsx` — Dropdown menu with items, separators, checkboxes
- `tabs.tsx` — Tab navigation (Tabs, TabsList, TabsTrigger, TabsContent)
- `textarea.tsx` — Multi-line text input
- `select.tsx` — Select dropdown (Select, SelectTrigger, SelectValue, SelectContent, SelectItem)
- `checkbox.tsx` — Checkbox input
- `popover.tsx` — Floating popover
- `badge.tsx` — Status badge with variants

**Adding new shadcn/ui components:**
```bash
npx shadcn@latest add <component-name>
```

## Shared Components

### Navigation
- `components/nav-links.tsx` — Client component. Renders navigation links with two variants: `sidebar` (vertical, desktop) and `bottom-tab` (horizontal, mobile). Links: Programs, Stats, Competitions, Profile, Tools.
- `components/mobile-nav.tsx` — Client component. Fixed bottom nav bar for mobile, renders `NavLinks` with `bottom-tab` variant.

### Data Entry
- `components/inline-edit.tsx` — Click-to-edit text field with save on blur/Enter.
- `components/auto-save-input.tsx` — Input with debounced auto-save to Supabase.

## Styling Patterns

### Class Merging
```ts
import { cn } from "@/lib/utils";
<div className={cn("base-class", condition && "conditional-class")} />
```

### Color Tokens (CSS Variables)
- `bg-background` / `text-foreground` — Main surface and text
- `bg-card` / `text-card-foreground` — Card surfaces
- `bg-muted` / `text-muted-foreground` — Secondary surfaces and text
- `bg-primary` / `text-primary-foreground` — Violet primary actions
- `bg-accent` / `text-accent-foreground` — Violet-tinted highlights
- `bg-destructive` / `text-destructive-foreground` — Danger states
- `border-border` — Subtle borders

### Design Guidelines
- **Spacing**: Generous — `p-6`, `gap-4`, `space-y-4` or larger
- **Rounded corners**: `rounded-lg` / `rounded-xl` for containers, `rounded-md` for buttons/inputs
- **Borders**: Subtle with `border-border`, minimal shadows (`shadow-sm` or none)
- **Typography**: `text-sm` secondary, default body, `text-lg`/`text-xl` headings
- **Icons**: Lucide via `lucide-react`, small (`size={16}` or `size={20}`)
- **Mobile first**: All layouts must be responsive
- **Empty states**: Always show a message + CTA
- **Dark only**: Single dark theme, no theme switching

### Layout Patterns
- **Sidebar + Detail**: Programs, Stats, Competitions all use sidebar (desktop) / dropdown (mobile) + main detail area
- **Dashboard layout** (`app/dashboard/layout.tsx`): Sidebar nav on desktop, bottom tab nav on mobile
- **Auth pages**: Centered vertically, no card wrapper, Dumbbell icon header
