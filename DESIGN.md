# FitTrack — Design Document (v0.2)

## 1. Summary

FitTrack is a minimal, fast-entry workout logging app for weightlifters, built in
React Native. The single design principle that overrides all others:

> **Logging a set should take less time and thought than resting between sets.**

Everything below is in service of that. No social feed, no onboarding quizzes,
no mandatory account creation, no bloated analytics — just a fast, pleasant way
to record what you lifted, and look back at it later.

---

## 2. Core Concepts & Data Model

Three nested entities, matching how a lifter actually thinks about a workout:

```
WorkoutDay
 └── Exercise (e.g. "Bench Press")
      └── Set (weight × reps)
```

### 2.1 WorkoutDay

| Field       | Type              | Notes                                                        |
|-------------|-------------------|---------------------------------------------------------------|
| `id`        | uuid              |                                                                |
| `date`      | date              | Defaults to today. **Not unique** — see below                 |
| `startTime` | time (optional)   | Used only to order/label same-day workouts (e.g. "7:15 AM")   |
| `label`     | string            | "Push", "Pull", "Legs", "Upper", or free text. Chip-selectable |
| `location`  | string (optional) | "Home Gym", "Planet Fitness"... chip-selectable from recents  |
| `notes`     | string (optional) | Freeform, collapsed by default                                |
| `exercises` | Exercise[]        | Ordered                                                        |

**Multiple workouts per day:** `date` is a plain attribute, not a unique key —
a user can log an AM and PM session (or two different splits) on the same
calendar date, each as its own independent `WorkoutDay` row with its own
label/location/exercises. The History list (§5.1) simply renders every
`WorkoutDay` in reverse-chronological order (`date`, then `startTime` if set);
same-day entries naturally stack together under one date heading. No special
casing needed elsewhere in the model.

### 2.2 Exercise (within a WorkoutDay)

| Field   | Type      | Notes                                                     |
|---------|-----------|------------------------------------------------------------|
| `id`    | uuid      |                                                              |
| `name`  | string    | "Bench Press" — autocompletes from an `ExerciseCatalog`     |
| `order` | int       | Position within the workout                                 |
| `sets`  | Set[]     | Ordered                                                      |

### 2.3 Set

| Field     | Type   | Notes                                                  |
|-----------|--------|----------------------------------------------------------|
| `id`      | uuid   |                                                            |
| `index`   | int    | 1, 2, 3...                                                |
| `weight`  | number | In user's preferred unit                                  |
| `reps`    | number |                                                            |
| `unit`    | enum   | `lbs` \| `kg`, stored per-set so imported/mixed data is safe |
| `rpe`     | number (optional) | Phase 2 — perceived effort, 1-10                |
| `isWarmup`| bool (optional)   | Excluded from volume/PR calculations             |

### 2.4 ExerciseCatalog (supporting entity)

A small local table of exercise names, seeded with ~50 common barbell/
dumbbell/machine/bodyweight lifts (Bench Press, Incline DB Press, Back Squat,
Front Squat, Deadlift, RDL, OHP, Barbell Row, Lat Pulldown, Pull-up, Bicep
Curl, Tricep Pushdown, Leg Press, Leg Curl, etc.), plus anything the user has
typed before. Purely there to power autocomplete + "recently used" — never a
blocker. Typing a brand-new name and hitting "done" just creates it inline and
adds it to the catalog for next time.

**Typeahead behavior:** as the user types into the exercise field, show a
ranked, filterable list of matching catalog entries below/above the keyboard:

1. **Prefix match first** ("ben" → "Bench Press", "Bench Press (Incline)").
2. **Fuzzy/substring match next** ("press" → anything containing "press",
   including seeded and user-created entries).
3. **Recency + frequency boost** — exercises the user logs often (and
   recently) rank above rarely-used ones with a similar text match, so "Bench
   Press" surfaces before "Bench Press (Machine)" if that's what's actually
   used week to week.
4. If nothing matches, the top row is always **"Add '{typed text}' as new
   exercise"** — so an unrecognized name is never a dead end, just one tap
   from being added and used immediately.
5. Selecting a result (tap) or hitting "done" with free text both immediately
   drop into that exercise's set-entry rows — no separate confirmation step.

### 2.5 Why this shape

- Flat enough to serialize trivially (JSON blob per workout day) but relational
  enough to query for progress later (e.g. "all sets of Bench Press, ever").
- Every entity has exactly the fields needed to answer "what did I lift" — no
  required metadata that isn't core to that question.

---

## 3. Guiding UX Principles

1. **Log while resting, not after.** Design for one-handed use, thumb-reachable
   targets, and inputs that survive being set down mid-set.
2. **Numeric keypad by default.** Weight and reps fields open directly to a
   numeric pad — no keyboard-type switching.
3. **Smart defaults over empty fields.** New set → pre-filled with the previous
   set's weight/reps (lifters usually repeat or make small jumps). New workout
   with the same label → pre-fill last used location.
4. **Shorthand entry.** Typing `225x5` (or `225*5`, `225 5`) into a single set
   field auto-splits into weight=225, reps=5. This matches how the user
   described their own workouts and should be the fastest path, with separate
   weight/rep fields as a fallback/accessible alternative.
5. **Nothing is required except a label.** Location, notes, RPE — all optional,
   all skippable, never blocking save.
6. **Editable history, not just an append log.** Tapping any past set/exercise/day
   opens it for editing inline — mistakes are common mid-workout.
7. **No modals for the core loop.** Adding an exercise or a set should never
   require a full-screen dialog with a "Save" button to leave. Inline, always.

---

## 4. Visual Design — "Paper" Aesthetic

Direct inspiration: the [AstroPaper](https://astro-paper.pages.dev) Astro blog
theme — minimal, high-contrast, editorial, flat (no shadows/gradients), warm
off-white paper tones, restrained single-accent color, dividers instead of
cards. We're translating that from a reading-focused blog to a data-entry
fitness app, so we keep the calm/paper visual language but make touch targets
larger and information density tuned for glanceable numbers.

### 4.1 Design tokens

```
Light (default)
--background:        #FAF7F0   // warm paper, not pure white
--surface:            #FDFCF9   // slightly lighter, for rows/inputs
--foreground:         #22221F   // near-black ink
--muted:              #EFEAE0   // dividers, tags, disabled states
--muted-foreground:   #7A7568   // secondary text, timestamps
--accent:             #B5502D   // terracotta/rust — used sparingly (CTAs, PRs)
--accent-foreground:  #FFFFFF
--border:             #E4DECF

Dark (optional, phase 2)
--background:         #1C1B18
--surface:            #242320
--foreground:         #EDE8DC
--muted:              #35332C
--muted-foreground:   #A39C8B
--accent:             #E08A5D
--accent-foreground:  #1C1B18
--border:             #3A382F
```

### 4.2 Typography

- **Headings / labels:** A clean serif or slab-serif (e.g. "Lora", "Source
  Serif 4") for that editorial/paper feel — used for workout labels, dates,
  exercise names.
- **Numbers (weight, reps, sets):** A monospace or tabular-figure font (e.g.
  "IBM Plex Mono", "JetBrains Mono") for anything numeric. Monospace numbers
  read like a ledger and align cleanly in columns — this matters a lot for a
  weight-lifting log.
- **Body/UI text:** A simple humanist sans (e.g. "Inter") for buttons, nav,
  helper text.
- Generally larger base sizes than a typical blog (16–18pt body) since this is
  used at-a-glance mid-workout, often not looking closely.

### 4.3 Layout language

- Flat, no drop shadows. Separation via 1px hairline borders/dividers
  (`--border`) and whitespace, not elevation.
- No card chrome around every element — a workout day is a stack of rows
  separated by thin rules, like a printed ledger page.
- Chips (pill buttons) for label/location/exercise selection — soft `--muted`
  background, `--accent` when selected.
- Generous vertical rhythm (16–24px between sections) so the screen never
  feels cramped despite dense numeric data.
- One accent color used deliberately: primary CTA buttons, the "PR" badge, and
  active/selected states. Everything else stays ink-on-paper.

---

## 5. Screens & Navigation

Minimal nav — **a single screen (History) with a floating action button**,
rather than a multi-tab layout. There's only one primary destination in this
app, so a tab bar would just be visual overhead; a FAB keeps the whole app
feeling like "one page" you scroll through, with logging a new workout as the
one unmissable action layered on top.

```
┌────────────────────────────────────┐
│  History                           │
│  ...                               │
│                                     │
│                                     │
│                              ┌───┐  │
│                              │ + │  │  ← FAB, always reachable, bottom-right
│                              └───┘  │
└────────────────────────────────────┘
```

Tapping the FAB pushes the New Workout screen (§5.2). Settings is reached via
a small icon in the History header, not a tab — it's low-frequency.

### 5.1 History (Home)

Reverse-chronological list of WorkoutDays, grouped by month.

```
┌────────────────────────────────────┐
│  September 2026                    │
│  ──────────────────────────────    │
│  Wed 3   PUSH        Planet Fitness│
│          Bench, OHP, Dips  · 9 sets│
│  ──────────────────────────────    │
│  Wed 3   LEGS          Home Gym    │  ← same date, second session
│  6:15 AM Squat, RDL        · 12 sets│
│  ──────────────────────────────    │
│  Mon 1   PULL         Planet Fitness│
│          Row, Curl         · 8 sets │
└────────────────────────────────────┘
```

- Rows are ordered by `date` then `startTime`; when two workouts share a date,
  the second row shows its `startTime` in place of the weekday label so
  they're visually distinguishable at a glance.
- Tapping a row opens that WorkoutDay in edit mode.
- Simple text search / filter by label or exercise name (phase 2).

### 5.2 New / Edit Workout Day

```
┌────────────────────────────────────┐
│  ← Today, Sep 4                    │
│                                     │
│  [ Push ] [ Pull ] [ Legs ] [ + ]  │  ← label chips, tap to select/create
│                                     │
│  📍 [ Planet Fitness ▾ ]           │  ← location, recent chips in dropdown
│                                     │
│  ──────────────────────────────    │
│  Bench Press                    ✕  │
│    1   135 × 8                     │
│    2   185 × 5                     │
│    3   225 × 3            [+ Set]  │
│  ──────────────────────────────    │
│  [ + Add Exercise ]                │
│                                     │
│  ▾ Notes (optional)                │
└────────────────────────────────────┘
```

- Everything on this screen auto-saves as you go (no explicit "Save" button
  needed for the happy path) — reduces this to zero friction.
- `+ Add Exercise` opens an inline autocomplete (not a modal) — type or tap a
  recent/common exercise chip, press done, row appears immediately with one
  empty set ready to fill.
- `+ Set` appends a new set row pre-filled with the prior set's weight/reps,
  cursor focused on weight, numeric pad open.
- Tapping any existing set number opens it for quick edit in place.

### 5.3 Quick Set Entry (the core interaction, zoomed in)

```
  1   [ 135 ] × [ 8 ]        ✓
  2   [ 185 ] × [ 5 ]        ✓
  3   [ 225 ] × [ 3 ]   ← editing, numeric keypad open
      [ + Add Set ]
```

- Single-row shorthand alternative: one field, type `225x3`, auto-parses on
  space/submit.
- Swipe-to-delete on a set row (standard iOS/Android pattern, no confirm
  dialog needed for something this reversible — maybe a brief "undo" toast).

### 5.4 Settings (minimal)

- **Units: lbs / kg** — user picks explicitly on first launch (a single,
  two-button choice screen, no locale-guessing), stored as the global default
  and changeable anytime from Settings. Every weight field in the app
  (including shorthand `225x5` parsing) uses this unit unless a specific set
  was logged in the other unit, in which case that set displays its own
  stored unit (see §2.3) with an inline label so mixed history stays honest
  rather than silently converted.
- Theme: Light / Dark / System
- Export data (CSV/JSON) — important for a local-first app so users trust
  their data isn't trapped
- Manage exercise catalog (rename/merge duplicates)

---

## 6. MVP Scope vs. Later Phases

### Phase 1 (MVP — described above)
- Create/edit/delete WorkoutDay with label + optional location, multiple per
  calendar date supported
- Add/edit/delete exercises (with seeded + typeahead catalog) and sets with
  weight × reps
- Local persistent storage, works fully offline
- History list grouped by date, basic edit-in-place
- First-launch unit picker (lbs/kg) + Settings toggle

### Phase 2 (fast follow)
- Per-exercise history view ("show me every Bench Press set ever") with a
  simple line chart of top weight/est. 1RM over time
- Automatic PR detection + the small accent-colored "PR" badge
- Workout templates ("repeat last Push day" as a starting point)
- Rest timer (optional, dismissible, not in the critical path)
- Dark mode
- Search/filter history

### Phase 3 (nice to have, not core to the thesis)
- Cloud backup/sync (multi-device)
- Body weight tracking log
- Plate-math calculator
- CSV import from other apps (Strong, Hevy, etc.)

Explicitly **out of scope** for a long while: social features, feeds, workout
"programs"/coaching content, gamification/streaks-as-pressure mechanics. These
all pull against the core simplicity goal.

---

## 7. Tech Stack Recommendation

- **Framework:** React Native via **Expo** (managed workflow) — fastest path
  to iOS + Android from one codebase, good DX, easy OTA updates later.
- **Navigation:** `react-navigation` (native-stack + bottom-tabs).
- **Local storage:** `expo-sqlite` with a thin query layer (or Drizzle ORM for
  type-safe schema/migrations) — relational storage matters once Phase 2
  wants "all sets for Bench Press across all time." Plain AsyncStorage/JSON
  would work for a throwaway prototype but will hurt as soon as querying by
  exercise matters.
- **State management:** React Context + hooks for UI state; SQLite is the
  source of truth for persisted data (no need for Redux/Zustand at this
  scale).
- **Styling:** Plain `StyleSheet` + a small shared `theme.ts` exporting the
  design tokens from §4.1, or `nativewind` (Tailwind for RN) if Shane prefers
  utility classes — either maps cleanly onto the token system above.
- **Fonts:** `expo-font` to load the serif/mono/sans trio.
- **No backend required for MVP.** Everything is local-first; this both
  simplifies v1 dramatically and matches the "lightweight" goal.

---

## 8. Decisions Log

Resolved from the original open questions:

1. **Platforms:** iOS and Android both, via Expo, from day one.
2. **Primary nav:** Single History screen + floating action button for
   "+ Workout" (no tab bar) — see §5.
3. **Multiple workouts per date:** Supported. `date` is not a unique key on
   `WorkoutDay`; an optional `startTime` disambiguates same-day entries in the
   UI — see §2.1.
4. **Units:** User-selectable (lbs/kg), chosen explicitly on first launch and
   changeable in Settings at any time; not inferred from device locale — see
   §5.4.
5. **Exercise catalog:** Seeded with a starter list of common lifts, with
   typeahead/fuzzy matching as the user types (prefix + substring + recency
   ranking, always with an "add as new" fallback) — see §2.4.

---

## 9. Next Steps

Scaffold is in place (Expo + nav + SQLite + theme + unit picker + exercise
typeahead shell). Remaining build order:

1. Quick Set Entry component (§5.3) — highest-value input surface; wire into
   Workout screen under each exercise.
2. Auto-save polish for label/location/notes + delete workout/exercise/set.
3. History same-day display polish + empty/error states.
4. Phase 2 items when MVP logging loop feels frictionless.
