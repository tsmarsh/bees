# Allerbees: game design and production brief

Status: concept brief, preproduction v0.1.
Target: iOS and iPadOS first; a browser/WebGL build for testing and rapid iteration. No Android deliverable.
Engine/framework: Fibber (exact package, renderer, tooling and export support to confirm before implementation).
Genre: cooperative, family-friendly, asynchronous-view arcade RPG; solo collection and 1–5 player encounters.
Art direction: an original 1950s–60s theatrical/TV cartoon sensibility, executed with stylized 3D models, bold ink outlines and limited cel shading. Cuphead is a quality and animation reference, not an instruction to copy its characters or assets.

> **Plants need bees. Bees need plants. Bees need each other. Every bee matters.**

## 1. The promise

Allerbees is a game about teamwork, mutual affection and trying your best. Bees collect nectar from flowers, which absolutely adore the bees and want to cuddle, play with and fuss over them. Unfortunately, the bees suffer from hay fever. Flowers are never malicious. The challenge is managing their attention and pollen while collecting nectar and keeping one another well.

Emotional target: players encourage one another during encounters and want to high-five afterward. Every contribution matters; improvement and effort are celebrated without false praise, player-versus-player ranking or an MVP board. A flower is happy the bees came to visit, regardless of yield, and asks them to return.

Design constraints:

- No combat, villains, violence or death. Being "out" means too unwell or tired to continue.
- No zero-reward wipe: nectar carried home counts, including partial runs. Retreat and illness may reduce yield without erasing effort.
- No role is intrinsically the easy one. Roles offer different kinds of mastery and fun.
- Human friends should feel supported by others' excellence, never displaced by it.
- Good solo and pickup play are first-class, not consolation modes.
- Avoid mandatory individual scoring, shaming feedback, forced level-scaling and punitive grind gates.

## 2. Party format

The aspirational encounter uses five bees: one tank, one healer and three nectar collectors (DPS/foragers), evoking the five-person MMORPG dungeon. The design must remain worthwhile with one forager; additional foragers create more yield, intersecting routes and Red Arrows-like formation opportunities, not an absolute dependency.

Supported populations are one to five humans, with NPC bees occupying empty essential roles. Exact party-fill and scaling policy should be proven in playtests, but a player must be able to enjoy a meaningful encounter without waiting for four other humans.

The three roles intentionally have completely different camera treatments and touch interfaces. They participate in a shared authoritative encounter state rather than a shared visual presentation. Changes to that state should be immediately legible through their own game.

### Tank: the performer

Touch reference: Elite Beat Agents. The tank keeps flowers delighted and interested through dances, belly rubs, petal scratches, attention and joyful routines. The flower's animation branches with performance. Timed taps, holds and traced gestures create an expressive choreography; this is not attacking or taunting in an adversarial sense.

- Consistent performance holds attention and makes forager flight lines wider and safer.
- Faltering attention narrows routes or causes the flower to lean toward nectar collectors.
- Greater affection may also bring more contact and pollen exposure to the tank; tanking is not consequence-free.
- Healer effectiveness can improve timing-window generosity or reduce pollen-related interference in the tank's rhythm sequence.
- Unlockable AoE performances offer support to others; exact abilities and tuning are open.

### Forager (DPS): the flyer

Touch reference: Dancing Line. The line is the bee's actual flight route through the encounter. It winds between petals, stamens, pollen and nectar opportunities. The tank's success changes route thickness; encounter behaviour may change route geometry.

- Collecting nectar increases load, reducing maneuverability and increasing the consequences of extending a run.
- The player decides whether to continue toward a richer harvest or return with what they have.
- Losing the line sends the bee to a safe start, checkpoint or recovery position, with an allergic penalty and some spilled nectar. The bee keeps meaningful collected nectar. Final setback severity requires testing; no total forfeiture.
- Successful foraging reduces the healer's burden; struggling foragers need more salves.
- With three foragers, distinct lines through a shared encounter may enable graceful formation crossings and cooperative AoE moments. Such bonuses are additive, never prerequisites for ordinary nectar.

### Healer: the salve launcher

Touch reference: Angry Birds. The healer aims and launches soothing salves toward bees in distress. Arcs, moving targets, timing, predicted routes and environmental bounce surfaces create a playful physics challenge, not a symptom-clicking panel.

- The tank and up to three foragers are possible targets; direct hits, forgiving splash zones and planned AoE remedies offer varied decisions.
- Good interventions ease the tank's rhythm challenge and keep foragers able to fly.
- When the foragers are flying well, the healer can concentrate on the tank. When routes become dangerous, target prioritization changes.
- Salve types (sticky, bouncing, cloud, preventative) and ammunition economy remain candidates, not locked scope.
- Misses must be recoverable; occasional failure creates a decision, not blame.

## 3. Shared encounter model

Each client renders a role-specific projection of the same encounter simulation. Inputs produce events that update shared state; state drives difficulty, animation and feedback in the other games.

| Source of performance | Shared-state effect | Other players feel |
|---|---|---|
| Tank attention and choreography | Flower affection focus, pollen exposure, route safety | Foragers receive wider or narrower paths; the healer sees changes in care demand |
| Forager route progress and nectar load | Yield, forager exposure, need for care | The healer has more or fewer moving targets; the hive gains nectar |
| Healer salves and preventative care | Allergy recovery, tolerance, protection | The tank gets more forgiving rhythm windows; foragers retain control and harvest |
| Coordinated AoE buffs | Temporary group assistance | All roles receive accessible opportunities to help others |

Illustrative state entities, not a final implementation contract:

- Encounter: id, flower personality, active phase, elapsed time, weather/pollen conditions, social familiarity.
- Flower: animation pose, affection/attention distribution, pollen emissions, exposed nectar paths.
- Bee: role, wellbeing/pollen tolerance, nectar cargo, buffs, gear, recovery status, player/NPC control.
- Tank projection: phrase schedule, gesture windows, flower animation branch, intensity.
- Forager projection: path spline, safe corridor width, hazard markers, cargo and checkpoints.
- Healer projection: target positions in a role-specific 2D playfield, trajectory modifiers, salve inventory and upcoming risks.
- Hive: communal nectar, unlocked abilities/classes, relationships with other hives and access to expeditions.

### Critical stability rule

An interdependent team can form a negative feedback spiral: tank misses → paths narrow → foragers slip → healer overloaded → tank worsens. Keep those causal links (they create cooperation) but provide deliberate recovery opportunities: early-return foragers, simpler stabilizing tank routines, accessible splash and area salves, checkpoints and generous low-level encounters. A struggling team should be able to regroup through decisions and care, not be doomed by compounding difficulty.

Difficulty and resource feedback should be smoothly bounded, telegraphed, and tested against common combinations of novice/expert players and NPCs.

## 4. Encounter outcomes and replay

An encounter ends when the group chooses to return, completes a harvest objective, or becomes too unwell to continue. Its output is the nectar safely brought home, perhaps modified by small explicit losses. No binary success/failure declaration is necessary. The hive's shared pot visibly grows. The flower is pleased with the visit and asks the bees to return.

- Celebrate collective work: "Look what we did together!"
- Celebrate truthful individual improvements privately and gently: "You flew farther than last time!"
- Avoid loot competition and performance rankings.
- A favourite flower may be revisited indefinitely. With skill and gear it will naturally become easier; do not forcibly scale it to erase mastery. An optional voluntary gear-limited challenge may be explored later.
- Relationships can deepen through visits, flavour animation/dialogue and familiarity; they are not conquest milestones.

## 5. Progression and world

### Solo loop

Short solo harvesting sessions provide accessible nectar, mechanical practice and meaningful progress. Nectar supports upgrades and equipment, strengthening the bee and hive and gradually unlocking cooperative encounters. Solo progression must not become a punitive prerequisite preventing a friend from joining a session.

### Cooperative loop

Parties visit affectionate flowers, coordinate roles, bring home nectar and increase the colony's reach. Other hives may teach or unlock new classes and abilities; the candidate progression is forager first, then healer, then tank. This is a narrative and tutorial progression to test, not an insistence that multiplayer remain role-incomplete for long.

### Gear

Equipment can alter handling, carrying capacity, tolerances, range, shot physics, timing forgiveness or available skills. It should be legible on the models (satchels, dance shoes, scarves, healer equipment), funny and expressive. Favour choice, specialization and breadth over orders-of-magnitude power inflation that makes new friends irrelevant.

### Unlockable AoE buffs

Every class may unlock abilities that help the whole group. Creative candidates include a tank group dance that stabilizes flower attention, forager group nectar effects and healer salve bursts. Coordinated "Hive Five" moments are appealing but must never require perfect execution for the entire team to feel useful. Exact cooldowns, names and buff mechanics require playtesting.

## 6. Social features and NPCs

- Pickup matchmaking by encounter and role: 1 tank, 1 healer, 1–3 foragers, backfilled with NPCs as appropriate.
- Private parties and invited friends. One human with NPCs must always be viable.
- NPCs should be dependable and empathetic, with recognizable personalities, not superhuman perfect performers. They should compensate for vacancies without eclipsing human participation.
- Consider mid-encounter substitution of an NPC with a newly joined human after core networking is stable; it is an ambitious stretch goal.
- Design warm nonverbal feedback, accessible encouragement and optional communication appropriate for children. Avoid adversarial ranking and punishment of inexperienced players.
- Child safety, moderation, account management, matchmaking safeguards, privacy compliance and cross-platform identity need dedicated design before public online release.

## 7. Art and presentation

Look: whimsical anthropomorphic flowers and round expressive bees; early/mid-century cartoon timing and rubber-hose-like movement expressed through 3D rigs, squashing, stretching, detachable pose targets and animation exaggeration. Bold variable ink outlines, limited cel-shaded lighting bands, hand-painted palettes and backgrounds, restrained paper-grain overlay. The target is a game-ready 3D interpretation, not raster-video playback or a literal recreation of another game's artwork.

- Strong character silhouettes must be readable on an iPhone.
- The flower's personality is central: delighted eyes, elastic petals, enthusiastic leaning and cuddling, no villain cues.
- Class readability: tank robust and performative; forager nimble and satchel-equipped; healer caring and precise.
- Use hand-authored facial/gesture animation layers over economical reusable rigs.
- Prefer restrained draw calls, simple geometries and shader variants that survive iOS GPU and WebGL constraints.
- Build the ink outline and lighting prototype on target hardware early; WebGL and iOS rendering parity is a risk to validate, not an assumption.
- Sound direction: mid-century swing/jazz, light orchestral cartoon punctuation, pleasing ensemble payoff. Accessibility: don't require hearing rhythmic cues exclusively; provide visual/haptic equivalents.

Two exploratory concept images accompany the working discussion: a character lineup and an affectionate sunflower encounter. They convey mood, not validated 3D asset specs or gameplay UI.

## 8. Technical approach

Architecture proposal: deterministic/replicable encounter rules, authoritative simulation, distinct role clients and a data-driven encounter definition. A concise event protocol should describe inputs (rhythm gestures, path turns, salve launch vectors) and outcomes (flower attention, route geometry, wellbeing and nectar). Server authoritativeness, rollback or lag compensation, tick rate and persistence should be chosen after measuring Fibber's capabilities and the networking budget.

Targets: iOS/iPadOS are primary shipping targets. Web is mandatory for development/test harnesses and playtests. Android is explicitly out of scope. Touch interaction is the native design baseline; mouse can emulate touch for web testing. Support portrait or landscape per role only after interaction mockups on real devices.

Unresolved prerequisite: confirm the exact Fibber runtime/repository and its renderer, iOS packaging and browser/WebGL capabilities. Do not substitute an unrelated similarly named engine without confirmation.

Testing: model-based simulation and deterministic replays; property tests around conserved nectar, recovery thresholds and no impossible encounter cascades; timing/latency tests on real devices; usability tests with mixed skill and age groups. Instrument cooperative sentiment through observation rather than public individual metrics.

## 9. MVP / vertical slice

Goal: prove that three fundamentally different touch games feel like one cooperative encounter and cause players to thank, support and celebrate one another.

1. Simulation sandbox (web): one flower, one tank, one healer, one forager; placeholder geometry, shared state, clear causal feedback; NPC stubs for missing roles.
2. Three playable role prototypes: tank rhythm/touch sequence with branching flower response; forager line with variable width, nectar load and partial-reward recovery; healer salve ballistic aiming at moving targets.
3. Connected encounter: human and NPC clients receiving distinct views of the same deterministic encounter, with graceful reconnect and simple post-encounter shared nectar celebration.
4. Mobile feel: run on physical iPhone/iPad, profile touch latency, shader cost and animation responsiveness.
5. First authored art pass: one beautiful affectionate sunflower, three bees, five essential animations each, simple ink-outline shader, readable UI, jazz/swing sound sketch.
6. Five-player expansion: add two distinct forager lines, optional formation interactions and basic role-based pickup matchmaking only after 3-role fun is demonstrated.
7. Solo and progression slice: a short solo collection route, communal hive nectar bank, one meaningful upgrade and return visit to the same flower.

### Success criteria

- Each role is engaging independently for several minutes.
- Players can accurately describe how teammates changed their play without sharing a camera.
- A weak performance doesn't erase collected nectar or produce unavoidable compounding failure.
- New players can meaningfully participate alongside experienced players and/or NPCs.
- Players spontaneously offer encouragement, celebrate a save, or ask to play another encounter.
- The target iOS device maintains responsive interactions and legible art at the intended performance budget.

## 10. Open questions (do not silently decide)

1. Exact Fibber tooling and deployment architecture.
2. Landscape vs portrait per role; whether orientation may differ across players.
3. Rhythm authoring: fixed songs versus procedural/adaptive phrases, latency calibration, licensed versus original music.
4. Whether forager paths are real-time steering, scripted turns or continuous trace control; exact spill/checkpoint economics.
5. Salve ballistics: target visibility, shot supply, AoE tolerance, cross-role coordinate mapping and latency.
6. How much of the encounter's shared 3D scene each player sees, if any.
7. NPC behaviour, human drop-in/out and matchmaking safety controls.
8. Class acquisition sequencing and whether every class is immediately selectable for co-op.
9. Monetization and publishing path (premium versus Apple Arcade proposal); no ads/IAPs if targeting Arcade.
10. Accessibility provisions for motor, visual, hearing and age differences across three distinct interaction models.

## 11. Guiding product test

After a nectar run, the players should feel that they did their best, that their contribution counted, that the flower enjoyed their visit, and that together they achieved something worth celebrating. They should want to high-five each other and return to play again.

One-line pitch: Five little bees. Three completely different games. One very affectionate garden.
