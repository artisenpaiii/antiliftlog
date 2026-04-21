# Graph Report - .  (2026-04-19)

## Corpus Check
- Corpus is ~42,096 words - fits in a single context window. You may not need a graph.

## Summary
- 444 nodes · 610 edges · 68 communities detected
- Extraction: 69% EXTRACTED · 31% INFERRED · 0% AMBIGUOUS · INFERRED: 192 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Dashboard Pages & DB Layer|Dashboard Pages & DB Layer]]
- [[_COMMUNITY_Database Access Layer|Database Access Layer]]
- [[_COMMUNITY_Project Documentation|Project Documentation]]
- [[_COMMUNITY_Stats Computations|Stats Computations]]
- [[_COMMUNITY_Block Store Core|Block Store Core]]
- [[_COMMUNITY_Cell Mutation Batcher|Cell Mutation Batcher]]
- [[_COMMUNITY_Import Dialogs|Import Dialogs]]
- [[_COMMUNITY_Day Creation Dialog|Day Creation Dialog]]
- [[_COMMUNITY_Clipboard Engine|Clipboard Engine]]
- [[_COMMUNITY_Competition Detail Form|Competition Detail Form]]
- [[_COMMUNITY_Day Grid & Selection|Day Grid & Selection]]
- [[_COMMUNITY_Profile Page|Profile Page]]
- [[_COMMUNITY_Select UI Component|Select UI Component]]
- [[_COMMUNITY_Auth Pages|Auth Pages]]
- [[_COMMUNITY_RPE Calculator|RPE Calculator]]
- [[_COMMUNITY_Competition Stats|Competition Stats]]
- [[_COMMUNITY_Block Cache & Prediction Contexts|Block Cache & Prediction Contexts]]
- [[_COMMUNITY_Competitions List Page|Competitions List Page]]
- [[_COMMUNITY_Weekly Load Table|Weekly Load Table]]
- [[_COMMUNITY_Attempt Selection Logic|Attempt Selection Logic]]
- [[_COMMUNITY_Supabase Middleware|Supabase Middleware]]
- [[_COMMUNITY_Attempt Selection UI|Attempt Selection UI]]
- [[_COMMUNITY_Inline Edit Component|Inline Edit Component]]
- [[_COMMUNITY_IPF GL Calculator|IPF GL Calculator]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_App Manifest|App Manifest]]
- [[_COMMUNITY_Dashboard Layout|Dashboard Layout]]
- [[_COMMUNITY_Dashboard Home Page|Dashboard Home Page]]
- [[_COMMUNITY_Attempts Table|Attempts Table]]
- [[_COMMUNITY_E1RM Chart|E1RM Chart]]
- [[_COMMUNITY_Fatigue Chart|Fatigue Chart]]
- [[_COMMUNITY_Intensity Chart|Intensity Chart]]
- [[_COMMUNITY_IPF GL Calculator UI|IPF GL Calculator UI]]
- [[_COMMUNITY_Logout Button|Logout Button]]
- [[_COMMUNITY_Mobile Cell Panel|Mobile Cell Panel]]
- [[_COMMUNITY_Mobile Nav|Mobile Nav]]
- [[_COMMUNITY_Nav Links|Nav Links]]
- [[_COMMUNITY_Sign Up Form|Sign Up Form]]
- [[_COMMUNITY_Sortable Column Header|Sortable Column Header]]
- [[_COMMUNITY_Sortable Row|Sortable Row]]
- [[_COMMUNITY_Tools Page|Tools Page]]
- [[_COMMUNITY_Week Content|Week Content]]
- [[_COMMUNITY_Badge UI|Badge UI]]
- [[_COMMUNITY_Popover UI|Popover UI]]
- [[_COMMUNITY_Tabs UI|Tabs UI]]
- [[_COMMUNITY_Textarea UI|Textarea UI]]
- [[_COMMUNITY_Utility Functions|Utility Functions]]
- [[_COMMUNITY_Supabase Client|Supabase Client]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_Block Detail|Block Detail]]
- [[_COMMUNITY_Stats Page|Stats Page]]
- [[_COMMUNITY_Stats Sidebar|Stats Sidebar]]
- [[_COMMUNITY_Volume Chart|Volume Chart]]
- [[_COMMUNITY_Button UI|Button UI]]
- [[_COMMUNITY_Card UI|Card UI]]
- [[_COMMUNITY_Checkbox UI|Checkbox UI]]
- [[_COMMUNITY_Dialog UI|Dialog UI]]
- [[_COMMUNITY_Dropdown Menu UI|Dropdown Menu UI]]
- [[_COMMUNITY_Input UI|Input UI]]
- [[_COMMUNITY_Label UI|Label UI]]
- [[_COMMUNITY_Stats Index|Stats Index]]
- [[_COMMUNITY_Stats Types|Stats Types]]
- [[_COMMUNITY_Database Types|Database Types]]
- [[_COMMUNITY_Import Types|Import Types]]
- [[_COMMUNITY_RPE Types|RPE Types]]

## God Nodes (most connected - your core abstractions)
1. `GET()` - 25 edges
2. `BlockStore` - 25 edges
3. `createClient()` - 25 edges
4. `toError()` - 19 edges
5. `createTables()` - 18 edges
6. `SelectionEngine` - 15 edges
7. `create()` - 14 edges
8. `LiftLog Application` - 13 edges
9. `StatsEngine` - 12 edges
10. `delete()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `supabase-ssr Package` --semantically_similar_to--> `@supabase/ssr`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `HomeContent()` --calls--> `createClient()`  [INFERRED]
  app\page.tsx → lib\supabase\server.ts
- `GET()` --calls--> `createClient()`  [INFERRED]
  app\auth\confirm\route.ts → lib\supabase\server.ts
- `computeBlockResidualFatigue()` --calls--> `GET()`  [INFERRED]
  lib\weight-prediction.ts → app\auth\confirm\route.ts
- `buildDayIndex()` --calls--> `GET()`  [INFERRED]
  lib\stats\computations.ts → app\auth\confirm\route.ts

## Hyperedges (group relationships)
- **Core Tech Stack** — claudemd_nextjs, claudemd_typescript, claudemd_tailwindcss, claudemd_shadcnui, claudemd_supabase [EXTRACTED 1.00]
- **Supabase Client Implementations** — claudemd_lib_supabase_client, claudemd_lib_supabase_server, claudemd_lib_supabase_proxy [EXTRACTED 1.00]
- **Authentication Flow** — claudemd_proxy_ts, claudemd_app_auth, claudemd_app_protected, claudemd_supabase_ssr [EXTRACTED 1.00]
- **Styling System** — claudemd_tailwindcss, claudemd_cn_helper, claudemd_clsx, claudemd_tailwind_merge, claudemd_dark_theme [EXTRACTED 1.00]

## Communities

### Community 0 - "Dashboard Pages & DB Layer"
Cohesion: 0.05
Nodes (23): delete(), BlockCacheProvider(), handleCreate(), handleDelete(), handleRename(), handleCreate(), handleDelete(), handleExport() (+15 more)

### Community 1 - "Database Access Layer"
Cohesion: 0.07
Nodes (12): createMany(), findById(), toError(), update(), BlockTable, CompetitionTable, DayColumnTable, DayRowTable (+4 more)

### Community 2 - "Project Documentation"
Cohesion: 0.06
Nodes (42): app/auth/ (Authentication Routes), app/ Directory (Next.js App Router), app/layout.tsx (Root Layout), app/protected/ (Authenticated Routes), Client Components (use client directive), clsx, cn() Helper Utility, components/ Directory (+34 more)

### Community 3 - "Stats Computations"
Cohesion: 0.08
Nodes (22): buildDayIndex(), computeFatigueData(), computeIntensityDistribution(), computeVolumeData(), computeWeeklyLoadSummary(), makeDayLabel(), makeWeekLabel(), parseNumber() (+14 more)

### Community 4 - "Block Store Core"
Cohesion: 0.1
Nodes (16): BlockStore, remapCellKeys(), async(), decimalToTimeStr(), handleAddColumn(), handleAddDataRow(), handleAddSeparatorRow(), handleColumnDeleted() (+8 more)

### Community 5 - "Cell Mutation Batcher"
Cohesion: 0.1
Nodes (5): cellKey(), CellMutationBatcher, cellKey(), computeRect(), SelectionEngine

### Community 6 - "Import Dialogs"
Cohesion: 0.14
Nodes (10): handleImport(), handleOpenChange(), handleImport(), handleOpenChange(), handleImport(), handleOpenChange(), isObject(), parseBlockImport() (+2 more)

### Community 7 - "Day Creation Dialog"
Cohesion: 0.18
Nodes (6): create(), addColumn(), handleColumnKeyDown(), handleCreate(), handleOpenChange(), ImportEngine

### Community 8 - "Clipboard Engine"
Cohesion: 0.33
Nodes (3): ClipboardEngine, getBoundingBox(), parseCellKey()

### Community 9 - "Competition Detail Form"
Cohesion: 0.29
Nodes (5): buildDraft(), handleSave(), numToStr(), parseFloatOrNull(), parseIntOrNull()

### Community 10 - "Day Grid & Selection"
Cohesion: 0.33
Nodes (3): DayGrid(), useIsTouchDevice(), useGridSelection()

### Community 11 - "Profile Page"
Cohesion: 0.38
Nodes (4): buildDraft(), handleSave(), numToStr(), parseFloatOrNull()

### Community 12 - "Select UI Component"
Cohesion: 0.29
Nodes (0): 

### Community 13 - "Auth Pages"
Cohesion: 0.33
Nodes (1): Page()

### Community 14 - "RPE Calculator"
Cohesion: 0.47
Nodes (4): confirmEdit(), convertWeight(), handleSaveOneRm(), startEdit()

### Community 15 - "Competition Stats"
Cohesion: 0.4
Nodes (0): 

### Community 16 - "Block Cache & Prediction Contexts"
Cohesion: 0.4
Nodes (2): useBlockCache(), PredictionProvider()

### Community 17 - "Competitions List Page"
Cohesion: 0.5
Nodes (0): 

### Community 18 - "Weekly Load Table"
Cohesion: 0.5
Nodes (0): 

### Community 19 - "Attempt Selection Logic"
Cohesion: 0.67
Nodes (2): roundToIncrement(), suggestAttemptsForLift()

### Community 20 - "Supabase Middleware"
Cohesion: 0.5
Nodes (2): proxy(), updateSession()

### Community 21 - "Attempt Selection UI"
Cohesion: 0.67
Nodes (0): 

### Community 22 - "Inline Edit Component"
Cohesion: 1.0
Nodes (2): handleKeyDown(), handleSave()

### Community 23 - "IPF GL Calculator"
Cohesion: 0.67
Nodes (0): 

### Community 24 - "Root Layout"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "App Manifest"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Dashboard Layout"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Dashboard Home Page"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Attempts Table"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "E1RM Chart"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Fatigue Chart"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Intensity Chart"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "IPF GL Calculator UI"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Logout Button"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Mobile Cell Panel"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Mobile Nav"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Nav Links"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Sign Up Form"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Sortable Column Header"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Sortable Row"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Tools Page"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Week Content"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Badge UI"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Popover UI"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Tabs UI"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Textarea UI"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Utility Functions"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Supabase Client"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "ESLint Config"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Next.js Config"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "PostCSS Config"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Tailwind Config"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Block Detail"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Stats Page"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Stats Sidebar"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Volume Chart"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Button UI"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Card UI"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Checkbox UI"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Dialog UI"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Dropdown Menu UI"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Input UI"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Label UI"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Stats Index"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Stats Types"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Database Types"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Import Types"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "RPE Types"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **18 isolated node(s):** `TypeScript (strict mode)`, `Radix UI`, `clsx`, `tailwind-merge`, `app/auth/ (Authentication Routes)` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Root Layout`** (2 nodes): `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Manifest`** (2 nodes): `manifest.ts`, `manifest()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Layout`** (2 nodes): `layout.tsx`, `DashboardLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Home Page`** (2 nodes): `page.tsx`, `DashboardPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Attempts Table`** (2 nodes): `GoodBadToggle()`, `attempts-table.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `E1RM Chart`** (2 nodes): `e1rm-chart.tsx`, `E1RMTooltip()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Fatigue Chart`** (2 nodes): `fatigue-chart.tsx`, `FatigueTooltip()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Intensity Chart`** (2 nodes): `intensity-chart.tsx`, `IntensityChart()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `IPF GL Calculator UI`** (2 nodes): `ipf-gl-calculator.tsx`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Logout Button`** (2 nodes): `logout-button.tsx`, `LogoutButton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mobile Cell Panel`** (2 nodes): `mobile-cell-panel.tsx`, `MobileCellPanel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mobile Nav`** (2 nodes): `mobile-nav.tsx`, `MobileNav()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Nav Links`** (2 nodes): `nav-links.tsx`, `NavLinks()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sign Up Form`** (2 nodes): `sign-up-form.tsx`, `SignUpForm()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sortable Column Header`** (2 nodes): `sortable-column-header.tsx`, `SortableColumnHeader()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sortable Row`** (2 nodes): `sortable-row.tsx`, `SortableRow()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tools Page`** (2 nodes): `tools-page.tsx`, `ToolsPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Week Content`** (2 nodes): `week-content.tsx`, `handleOpenCreateDialog()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Badge UI`** (2 nodes): `Badge()`, `badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Popover UI`** (2 nodes): `popover.tsx`, `PopoverDescription()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tabs UI`** (2 nodes): `tabs.tsx`, `Tabs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Textarea UI`** (2 nodes): `textarea.tsx`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Utility Functions`** (2 nodes): `utils.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supabase Client`** (2 nodes): `createClient()`, `client.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ESLint Config`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Config`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostCSS Config`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind Config`** (1 nodes): `tailwind.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Block Detail`** (1 nodes): `block-detail.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stats Page`** (1 nodes): `stats-page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stats Sidebar`** (1 nodes): `stats-sidebar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Volume Chart`** (1 nodes): `volume-chart.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Button UI`** (1 nodes): `button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Card UI`** (1 nodes): `card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Checkbox UI`** (1 nodes): `checkbox.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dialog UI`** (1 nodes): `dialog.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dropdown Menu UI`** (1 nodes): `dropdown-menu.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Input UI`** (1 nodes): `input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Label UI`** (1 nodes): `label.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stats Index`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stats Types`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Database Types`** (1 nodes): `database.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Import Types`** (1 nodes): `import.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `RPE Types`** (1 nodes): `rpe.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Dashboard Pages & DB Layer` to `Block Store Core`, `Import Dialogs`, `Day Creation Dialog`, `Competition Detail Form`, `Profile Page`, `RPE Calculator`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Why does `GET()` connect `Block Store Core` to `Dashboard Pages & DB Layer`, `Database Access Layer`, `Stats Computations`, `Cell Mutation Batcher`, `Import Dialogs`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `create()` connect `Day Creation Dialog` to `Dashboard Pages & DB Layer`, `Database Access Layer`, `Block Store Core`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 24 inferred relationships involving `GET()` (e.g. with `createClient()` and `computeBlockResidualFatigue()`) actually correct?**
  _`GET()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `createClient()` (e.g. with `HomeContent()` and `GET()`) actually correct?**
  _`createClient()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `toError()` (e.g. with `.findByProgramId()` and `.findByUserId()`) actually correct?**
  _`toError()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `createTables()` (e.g. with `ProfileContent()` and `ProgramsContent()`) actually correct?**
  _`createTables()` has 17 INFERRED edges - model-reasoned connections that need verification._