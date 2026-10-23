# Allerbees

A cooperative, family-friendly arcade game: five little bees, three completely different games, one very affectionate garden.
The design brief is [docs/brief.md](docs/brief.md); read it before changing anything about play. How the current slice works,
and which of the brief's open questions it answered provisionally, is in [docs/design/encounter.md](docs/design/encounter.md).

## Non-negotiables (from the brief)

- **No combat, villains, violence or death.** Being "out" means resting on a leaf. Flowers adore the bees.
- **No zero-reward wipe.** Nectar carried home always counts, including partial runs and visits that end early.
- **No role is the easy one.** Tank, healer and forager are different kinds of mastery.
- **Solo and pickup play are first-class.** NPC bees fill every empty role; one person can always play.
- **No rankings, no shaming.** Celebrate the team publicly ("Look what we did together!"); note personal improvement privately
  and only when it is true.
- **Every causal link between roles stays, and every spiral has a way back** (the stability rule, brief §3).
- **Brief §10's open questions are not to be decided silently.** If a change settles one, say so in docs/design/encounter.md.

## Architecture

```
sim/allerbees/*.fib   the encounter simulation in fibber: the only place game rules live
sim/wasm.fib          its exports (doubles only), built to web/sim.wasm by `make wasm`
web/                  the game: vanilla ES modules, canvas 2D, no build step
  art/                painted sprites for the bees and Sunny (see art/README.md)
  js/sim/             the wasm loader, a WASI shim, layout.js (the state array, slot by slot)
  js/views/           one file per role's game, plus the celebration
  js/game/            event diffing, toasts (voice.js), HUD, audio, the hive's saved state
  js/net/party.js     garden parties: PartyClient and RemoteSim (same interface as Sim)
server/               static files + garden parties over a hand-written WebSocket (no dependencies)
tools/cut-sprites.fib cuts a generated sprite sheet into web/art sprites (`make tools/cut-sprites`)
tests/                node --test: the wasm boundary and a two-person party
```

- **Rules belong in the sim, play belongs in the views.** A view runs its own moment-to-moment game (turning, note timing,
  projectile flight) and reports *decisions* as events (`tankMove`, `foragerCollect`, `salveHit`, ...). Never compute a
  shared consequence (allergy, affection, nectar) in JavaScript.
- **The state array is a contract.** `sim/allerbees/abi.fib` and `web/js/sim/layout.js` must agree slot for slot;
  `tests/sim.test.mjs` checks the layout. Adding a field means: model.fib, abi.fib (`state-size` too), layout.js.
- **New input → new event.** Add the rule to rules.fib, an export to sim/wasm.fib and the Makefile's EXPORTS, a method to
  `Sim` and `RemoteSim`, and a seat check to `EVENTS` in server/party.mjs.
- **What happened is a diff.** The sim keeps counters; `web/js/game/events.js` compares snapshots. Feedback text for each
  role lives in `web/js/game/voice.js`.
- **Tuning lives in `sim/allerbees/tune.fib`.** Run `make balance` before and after changing a number.
- Deterministic: the sim draws chance only from the encounter's seeded generator.

## Working on it

```
make serve                    # play at http://localhost:8080/ (and host garden parties)
make test                     # fibber specs + node tests; both must pass before a commit (the pre-commit hook runs them)
make wasm                     # after any change under sim/: rebuild and commit web/sim.wasm
make balance                  # the tuning table
```

- fibber: `fibc` 0.1.18 or later (`FIBC=...`), and `WASI_SDK` for wasm builds (fibber's `scripts/fetch-wasm-tools.sh`).
  Read the fibber skill or the fibber repo's docs before writing fibber; `fibc test -I sim sim/specs` runs specs.
- Specs are behaviour: `feature` / `scenario` / `given` / `upon` / `then`, and `prop` for properties over random play. A test
  that cannot fail is worse than none: plant the fault, watch it fail, take it out.
- In the browser, `window.__autoplay()` runs the current role's autopilot and `?fast=N` speeds up the garden.

## Frontend conventions

Follow the user's global rules (vanilla, accessible, responsive, paperlike semantic CSS). In this project that means:

- Screens are `<section class="screen">` toggled with `hidden`; `show()` in main.js moves focus to the new screen's heading or
  canvas and sets `document.title`.
- Changes the player should hear about go through `Hud.toast` (an `aria-live` region). Keep them short, kind and specific
  about *who* caused what.
- Every role is playable by keyboard; every sound has a visual twin.
- Art is drawn with `web/js/draw/ink.js`: bold ink outlines, flat fills, paper grain. Bees and Sunny are painted sprites
  (`web/art/`, made and cut as [art/README.md](art/README.md) describes) with procedural fallbacks; `?ink` shows the fallbacks.
- Colours are CSS custom properties in `web/css/style.css`; canvas colours are the constants at the top of ink.js.

## Commit hygiene

When working on a moth issue: `moth start {id}`, prefix every commit with `[{id}]`, small focused commits, `moth done` at the end.

# Moth Agent Guide

This guide helps LLM agents work effectively with moth, a git-based file issue tracker.

## Overview

Moth stores issues as markdown files in `.moth/` directories organized by status (ready, doing, done). Each issue has a unique ID, severity, and slug derived from the title.

## File Structure

```
.moth/
├── config.yml          # Project configuration
├── .current            # Current issue ID (when working on an issue)
├── ready/              # Issues ready to start
│   └── {id}-{severity}-{slug}.md
├── doing/              # Issues in progress
│   └── {id}-{severity}-{slug}.md
└── done/               # Completed issues
    └── {id}-{severity}-{slug}.md
```

Prioritized issues have a numeric prefix: `001-{id}-{severity}-{slug}.md`

## Workflow Commands

### Viewing Issues

```bash
# List all active issues (excludes done)
moth ls

# List issues in specific status
moth ls -t ready
moth ls -t doing

# List all issues including done
moth ls -a

# Filter by severity
moth ls -s high
moth ls -s crit

# Show current issue details
moth show

# Show specific issue
moth show {id}
```

### Working on Issues

```bash
# Start working on an issue (moves to doing, sets as current)
moth start {id}

# Mark issue as done
moth done {id}

# Mark current issue as done
moth done

# Move issue to any status
moth mv {id} {status}
```

### Creating Issues

```bash
# Create new issue (opens editor)
moth new "Fix login bug"

# Create with severity
moth new "Critical security fix" -s crit

# Create without opening editor
moth new "Quick fix" --no-edit

# Create and immediately start working
moth new "Urgent task" --start
```

### Issue Management

```bash
# Edit issue content
moth edit {id}

# Delete issue
moth rm {id}

# Change severity
moth severity {id} high
```

### Priority Management

```bash
# Set priority number
moth priority {id} 1

# Move to top priority
moth priority {id} top

# Move to bottom (removes priority)
moth priority {id} bottom

# Position relative to another issue
moth priority {id} above {other_id}
moth priority {id} below {other_id}

# Renumber priorities sequentially
moth compact
moth compact ready
```

## Severity Levels

From highest to lowest:
- `crit` - Critical, must fix immediately
- `high` - High priority
- `med` - Medium priority (default)
- `low` - Low priority

## Partial ID Matching

All commands accept partial IDs. If you have issue `abc12`, you can use:
- `moth show abc12` (full)
- `moth show abc1` (partial)
- `moth show a` (if unambiguous)

## Git Integration

### Commit Hook

Moth can auto-prefix commit messages with the current issue ID:

```bash
# Install the hook
moth hook install

# With existing hook
moth hook install --append

# Remove hook
moth hook uninstall
```

When active, commits are prefixed: `[abc12] Your commit message`

### Commit Message Format

When committing changes related to an issue, prefix with the issue ID:

```bash
git commit -m "[abc12] Fix authentication bypass"
```

This links commits to issues in the report.

## Generating Reports

```bash
# Full history as CSV
moth report

# From specific commit
moth report --since abc123

# Between commits
moth report --since abc123 --until def456
```

Output includes: commit info, story changes (created, moved, edited, deleted), and code commits referencing issues.

## Agent Best Practices

### Starting Work

1. Check current issues: `moth ls`
2. Find issue to work on or check current: `moth show`
3. Start working: `moth start {id}` and then commit

### During Development

1. Make changes and commit frequently
2. Prefix commits with issue ID: `[{id}] description`
3. Keep issue content updated if requirements change

### Completing Work

1. Ensure all changes committed
2. Mark issue done: `moth done`
3. The `.current` file is automatically cleared

### Creating New Issues

When user requests new work:
1. Create issue: `moth new "Title" -s {severity} --no-edit`
2. Optionally start immediately with `--start` flag
3. Update issue file with detailed requirements if needed

### Checking Status

```bash
# Quick status check
moth ls

# What am I working on?
moth show

# Full project state
moth ls -a
```

## Configuration Reference

`.moth/config.yml`:

```yaml
statuses:
  - name: ready
    dir: ready
    prioritized: true    # Enable priority ordering
  - name: doing
    dir: doing
  - name: done
    dir: done

default_severity: med    # Default for new issues
editor: vi               # Editor for moth edit
id_length: 5             # Length of generated IDs
no_edit: false           # Skip editor on moth new

priority:
  auto_compact: false    # Auto-renumber after priority changes
```

## Common Patterns

### Pick up next priority issue
```bash
moth ls -t ready
moth start {first-id}
```

### Quick bug fix
```bash
moth new "Fix typo in header" -s low --no-edit --start
# make fix
git commit -m "[{id}] Fix typo"
moth done
```

### Triage incoming work
```bash
moth new "Investigate performance issue" -s med --no-edit
moth priority {id} top
```

### Review what was done
```bash
moth ls -t done
moth report --since HEAD~10
```
