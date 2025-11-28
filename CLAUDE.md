# Allerbees

A non-violent, cozy MMO-lite where bees collect pollen from flowers who love them too much.

## Concept

In the not-too-distant future, pollution has made your hive allergic to pollen—but it's still the only protein source. Bees must work together to collect pollen while managing their allergies.

This is an allegory for social anarchism: strong individuals who understand that society needs to function together. Nobody is self-sufficient, and that's the point.

## Core Design Principles

### Theme
- **Nobody dies.** Ever. Fail states are "tap outs" where bees retreat. Flowers are sad when this happens—they love bees and didn't mean to hurt them.
- **No enemies.** Flowers aren't adversaries. The "conflict" is environmental (pollution/allergies), not combat.
- **Interdependence is strength.** The tank can't collect, the healer can't survive exposure alone, the DPS can't operate without cover.
- **The honey is still delicious.** Life is harder than previous generations had it, but joy, creativity, and community remain.

### Audience
- Target: 51%+ women players
- Cute AF aesthetic (papercraft style in final version)
- Depth hidden beneath accessibility—WoW raiders will recognize the mechanics, casual players just see cute bees collecting pollen

### Monetization
- Apple Arcade or $3 premium purchase
- No predatory mechanics, no artificial friction, no FOMO
- The anarcho-socialist theme must stay intact—you can't preach mutual aid while running a gacha

## The Trinity (Renamed)

| Role | Name | Function |
|------|------|----------|
| Tank | **Diva** | Attracts flower attention through performance (wiggling, singing, compliments). Manages "rizz" to keep flowers focused on them. |
| Healer | **Healer** | Applies honey salves, calls on queen's power. Most allergic—must stay at range. |
| DPS | **Gatherer** | Collects pollen while flowers are distracted. Trail collectors (fast, follow dropped pollen) or cache raiders (slower, hit stem caches). |

### Vocabulary
- **Rizz** not "aggro"—flower's affection/attention toward a bee
- **Cuteness metrics** (fluffiness, brightness, etc.)—different flowers value different traits
- **Tap out** not "death"—bee retreats due to allergies
- **Blissed out**—flower in a happy daze, moves predictably (CC equivalent)

## Flower Mechanics

Flowers are like raid bosses:
- **Multiple heads** (1-N) that move independently and drop pollen
- **Stem caches**—stationary high-value pollen, but collecting "tickles" and grabs attention
- **Attention hierarchy**: Being tickled > Highest cuteness accumulator > Default behavior
- **Collision**—physical damage if bee and flower head collide

### Rizz System
- Each head tracks rizz (0-100)
- Rizz decays over time
- Low rizz: head notices and pursues gatherers
- High rizz: head is blissed out, moves lazily and predictably
- Divas build rizz through cuteness actions (wiggle, sing, compliments)
- Cache collection causes rizz snap—head suddenly interested in that location

## Progression

### Role Emergence
- Everyone starts as a Gatherer
- No class selection screen—you discover your role through play
- Kit toward Diva (invest in fluffiness, brightness) or Healer (honey salves, queen connection)
- Flexibility: respec by changing gear, not a permanent choice

### Difficulty Tiers
1. **Solo Gatherer**—simple flowers, no companions needed
2. **AI Companions**—multi-head flowers, AI Diva and Healer support you
3. **Coordination Required**—complex flowers where AI can't adapt fast enough
4. **Full Squad**—raid-equivalent, all human team

Casual players live happily in Tier 1-2 forever. Depth-seekers push into 3-4.

### Session Design
- 2-5 minute encounters
- Pick-up-and-play mobile sessions
- No 24/7 addiction loops—enduring love, not compulsion

## The Hive

- Shared space (not individual bases)—guild-like, collaborative
- Crafting: trade pollen for gear, supplies
- Hive mates make each other sweaters, masks, salves
- The Queen represents the aged/weak—worthy of respect and care, not a ruler
- Elder bees teach recipes, share wisdom—contribution doesn't require foraging

## MVP Scope

### Target Platform
- **WASM** (web browser)
- 2D top-down
- Rust + Bevy
- Ugly placeholder graphics—prove the fun first

### MVP Features
1. Single gatherer bee, click-to-move
2. Single flower with moving head that drops pollen
3. Pollen collection with collision detection
4. Allergy meter (proximity-based)
5. Sneeze mechanic (drops collected pollen)
6. Win/lose conditions
7. Basic juice (particles, screen shake)
8. Multi-head flowers
9. Rizz system foundation
10. AI Diva and Healer companions

### Out of MVP
- Real art (papercraft aesthetic)
- Crafting system
- Hive base building
- Multiplayer
- Multiple bee types
- Sound/music

---

## Development Guidelines

### Architecture

**Modular design is mandatory.** This codebase should be:
- Easy for LLMs to navigate and modify
- Easy to test in isolation
- Easy to extend without touching unrelated code

Structure code into focused modules:
```
src/
├── main.rs              # App entry, plugin registration
├── lib.rs               # Re-exports for testing
├── game/
│   ├── mod.rs
│   ├── state.rs         # GameState resource, state transitions
│   └── config.rs        # All tunable constants
├── bee/
│   ├── mod.rs
│   ├── components.rs    # Bee, Role, AllergyMeter
│   ├── movement.rs      # Movement systems
│   ├── allergy.rs       # Allergy buildup/decay, sneeze
│   └── actions.rs       # Wiggle, collect, etc.
├── flower/
│   ├── mod.rs
│   ├── components.rs    # Flower, FlowerHead, PollenCache
│   ├── movement.rs      # Head movement patterns
│   ├── pollen.rs        # Pollen spawning, collection
│   └── rizz.rs          # Rizz meter, attention behavior
├── ai/
│   ├── mod.rs
│   ├── diva.rs          # Diva AI behavior
│   └── healer.rs        # Healer AI behavior
├── ui/
│   ├── mod.rs
│   ├── meters.rs        # Allergy bar, rizz displays
│   └── hud.rs           # Score, timer, game state overlays
└── effects/
    ├── mod.rs
    ├── particles.rs
    └── juice.rs         # Screen shake, animations
```

Each module should:
- Expose a Bevy `Plugin` that registers its systems
- Keep components and systems together
- Have clear boundaries—flower code doesn't reach into bee internals

### Testing Strategy

#### Unit Tests
Every module should have unit tests for pure logic:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allergy_increases_with_proximity() {
        let mut meter = AllergyMeter::new(100.0);
        let distance = 50.0;
        let delta = 1.0;
        
        meter.update(distance, delta, &AllergyConfig::default());
        
        assert!(meter.value > 0.0);
    }

    #[test]
    fn sneeze_triggers_at_threshold() {
        let mut meter = AllergyMeter::new(100.0);
        meter.value = 80.0;
        
        assert!(meter.should_sneeze(80.0));
    }
}
```

Test what's testable without Bevy's ECS:
- Meter math (allergy buildup, rizz decay)
- Movement pattern calculations
- Collision detection geometry
- State transitions
- AI decision logic

#### BDD for Game Behavior

Use behavior-driven tests for game rules. Create a `tests/` directory with integration tests that describe behavior in plain language:

```rust
// tests/pollen_collection.rs

use allerbees::prelude::*;
use bevy::prelude::*;

mod pollen_collection {
    use super::*;

    #[test]
    fn given_bee_near_pollen_when_they_collide_then_pollen_is_collected() {
        // Given
        let mut app = App::new();
        app.add_plugins(MinimalPlugins)
           .add_plugins(AllerbeesTestPlugin);
        
        let bee = app.world.spawn(BeeBundle::gatherer_at(Vec2::ZERO)).id();
        let pollen = app.world.spawn(PollenBundle::at(Vec2::new(5.0, 0.0))).id();
        
        // When
        move_bee_to(&mut app, bee, Vec2::new(5.0, 0.0));
        app.update();
        
        // Then
        assert!(app.world.get_entity(pollen).is_none(), "pollen should be despawned");
        assert_eq!(get_collected_pollen(&app, bee), 1);
    }

    #[test]
    fn given_bee_with_full_inventory_when_sneeze_then_drops_25_percent() {
        // Given
        let mut app = setup_test_app();
        let bee = spawn_bee_with_pollen(&mut app, 20);
        
        // When
        trigger_sneeze(&mut app, bee);
        
        // Then
        assert_eq!(get_collected_pollen(&app, bee), 15);
        assert_eq!(count_dropped_pollen(&app), 5);
    }
}
```

```rust
// tests/rizz_system.rs

mod rizz_management {
    use super::*;

    #[test]
    fn given_low_rizz_when_head_updates_then_it_pursues_nearest_gatherer() {
        // Given
        let mut app = setup_test_app();
        let head = spawn_flower_head_with_rizz(&mut app, 20.0); // Low rizz
        let gatherer = spawn_gatherer_at(&mut app, Vec2::new(100.0, 0.0));
        
        // When
        app.update(); // Run movement systems
        
        // Then
        let head_pos = get_position(&app, head);
        assert!(head_pos.x > 0.0, "head should move toward gatherer");
    }

    #[test]
    fn given_diva_wiggles_when_in_range_then_rizz_increases() {
        // Given
        let mut app = setup_test_app();
        let head = spawn_flower_head_with_rizz(&mut app, 50.0);
        let diva = spawn_diva_at(&mut app, Vec2::new(30.0, 0.0)); // In range
        
        // When
        perform_wiggle(&mut app, diva);
        app.update();
        
        // Then
        let rizz = get_rizz(&app, head);
        assert!(rizz > 50.0, "rizz should increase from wiggle");
    }
    
    #[test]
    fn given_cache_collected_when_tickle_fires_then_nearest_head_snaps_attention() {
        // Given
        let mut app = setup_test_app();
        let head = spawn_flower_head_with_rizz(&mut app, 80.0); // High rizz, blissed
        let cache = spawn_cache_at(&mut app, Vec2::new(50.0, 50.0));
        let gatherer = spawn_gatherer_at(&mut app, Vec2::new(50.0, 50.0));
        
        // When
        collect_cache(&mut app, gatherer, cache);
        app.update();
        
        // Then
        let rizz = get_rizz(&app, head);
        assert!(rizz < 80.0, "rizz should drop from tickle");
        // Head should be moving toward cache location
    }
}
```

#### Test Helpers

Create a test utilities module:

```rust
// src/testing.rs (or tests/common/mod.rs)

pub struct AllerbeesTestPlugin;

impl Plugin for AllerbeesTestPlugin {
    fn build(&self, app: &mut App) {
        app.add_plugins(BeePlugin)
           .add_plugins(FlowerPlugin)
           .add_plugins(PollenPlugin)
           // ... but NOT rendering, audio, etc.
           .init_resource::<GameConfig>();
    }
}

pub fn setup_test_app() -> App {
    let mut app = App::new();
    app.add_plugins(MinimalPlugins)
       .add_plugins(AllerbeesTestPlugin);
    app
}

pub fn spawn_gatherer_at(app: &mut App, pos: Vec2) -> Entity {
    app.world.spawn(BeeBundle {
        bee: Bee { role: Role::Gatherer, ..default() },
        transform: Transform::from_translation(pos.extend(0.0)),
        ..default()
    }).id()
}

// ... more helpers
```

### Code Style

#### Prefer Explicit Over Clever
```rust
// Good: Clear what's happening
if meter.value >= config.sneeze_threshold {
    trigger_sneeze(bee, &mut commands);
    meter.value = config.post_sneeze_value;
}

// Avoid: Clever but obscure
meter.maybe_sneeze(config).map(|_| commands.sneeze(bee));
```

#### Systems Should Be Small and Focused
```rust
// Good: One responsibility
fn update_allergy_from_proximity(
    mut bees: Query<(&Transform, &mut AllergyMeter), With<Bee>>,
    heads: Query<&Transform, With<FlowerHead>>,
    config: Res<AllergyConfig>,
    time: Res<Time>,
) {
    for (bee_transform, mut meter) in &mut bees {
        let nearest_distance = heads.iter()
            .map(|h| bee_transform.translation.distance(h.translation))
            .min_by(|a, b| a.partial_cmp(b).unwrap())
            .unwrap_or(f32::MAX);
        
        meter.update_from_proximity(nearest_distance, time.delta_seconds(), &config);
    }
}

// Separate system for sneeze trigger
fn check_sneeze_trigger(
    mut bees: Query<(Entity, &mut AllergyMeter, &mut CollectedPollen)>,
    mut commands: Commands,
    config: Res<SneezeConfig>,
) {
    for (entity, mut meter, mut pollen) in &mut bees {
        if meter.should_sneeze(config.threshold) {
            commands.entity(entity).insert(Sneezing);
            let dropped = pollen.drop_percentage(config.drop_percent);
            meter.reset_to(config.post_sneeze_value);
            // Spawn dropped pollen handled by another system reacting to Sneezing
        }
    }
}
```

#### Config Is Centralized
```rust
// src/game/config.rs

#[derive(Resource)]
pub struct GameConfig {
    pub allergy: AllergyConfig,
    pub sneeze: SneezeConfig,
    pub rizz: RizzConfig,
    pub pollen: PollenConfig,
    pub movement: MovementConfig,
}

#[derive(Clone)]
pub struct AllergyConfig {
    pub max_value: f32,              // 100.0
    pub base_decay_rate: f32,        // 5.0 per second when safe
    pub proximity_multiplier: f32,   // Scales buildup by 1/distance
    pub proximity_threshold: f32,    // 200.0 - beyond this, no buildup
}

impl Default for AllergyConfig {
    fn default() -> Self {
        Self {
            max_value: 100.0,
            base_decay_rate: 5.0,
            proximity_multiplier: 100.0,
            proximity_threshold: 200.0,
        }
    }
}
```

### Commit Hygiene

When working on a moth issue:
1. `moth start {id}` to begin
2. Prefix all commits with `[{id}]`
3. Small, focused commits—one logical change each
4. `moth done` when complete

Example:
```
[a1b2c] Add AllergyMeter component with basic fields
[a1b2c] Implement proximity-based allergy buildup system
[a1b2c] Add unit tests for allergy math
[a1b2c] Wire up allergy system in BeePlugin
```

### When You're Stuck

1. **Check the backlog**—`moth show` for current issue details
2. **Run tests**—`cargo test` should always pass before moving on
3. **Keep it ugly**—placeholder graphics are fine, fun gameplay is mandatory
4. **Ask for smaller scope**—if an issue feels too big, it probably is

---

## Quick Reference

### Build & Run
```bash
# Development (requires trunk: cargo install trunk)
trunk serve

# Tests
cargo test

# Check WASM builds
trunk build
```

### Key Files
- `BACKLOG.md`—Full issue descriptions and context
- `src/game/config.rs`—All tunable values
- `tests/`—BDD-style integration tests

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
