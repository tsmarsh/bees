# The encounter: one simulation, three games

Status: built for the web vertical slice (MVP steps 1, 2, 3 and 7 of [the brief](../brief.md); 4 and 5 not started).

## Shape

```
            ┌──────────────── sim/ (fibber) ────────────────┐
 inputs ──▶ │ rules: events → Encounter → Encounter          │ ──▶ state: 110 doubles
 (events)   │ advance: time → Encounter                      │     (web/js/sim/layout.js)
            │ npc: the bees nobody plays, through the events │
            └───────────────────────────────────────────────┘
                 compiled once to web/sim.wasm, run by:
         the browser (solo: web/js/sim/sim.js)   the party server (server/party.mjs)
                                   │                          │ 20 states/s, binary
                                   ▼                          ▼
             web/js/main.js: fixed 60 Hz step, diff snapshots → events → views, HUD, toasts
                  │                  │                   │
          views/tank.js      views/forager.js     views/healer.js
          rhythm stage       flight line          salve sling
```

- **The sim is the only place rules live.** Every function in `sim/allerbees/*.fib` takes an `Encounter` and returns the next
  one; nothing reads a clock or a random source except through the encounter's own seeded generator. A visit is replayable
  from its seed and its events (`tests/sim.test.mjs`, "the same seed and the same inputs give the same visit").
- **The views own their moment-to-moment play.** The forager's turning circle, the tank's note timing and the healer's
  projectile physics run in JavaScript. What they *decide* (a nectar drop collected, a beat landed with quality 0.6, a salve
  hit bee 3 with potency 1) goes to the sim as an event. This is the brief's "concise event protocol".
- **Each role sees its own projection.** No player sees another's game. The forager sees path width, Sunny peeking in and
  formation companions; the tank sees Sunny's face, a honey timing band and a tiny window onto the foragers' path; the healer
  sees every bee as a moving target with a sneeze ring. Cross-role effects reach each game through its own mechanics, and
  `web/js/game/voice.js` names the cause in role-specific words ("Bumble has Sunny delighted. Your path is wide open!").
- **Counters, not logs.** The sim keeps counters (soothes, slips, deliveries, showstoppers…). `web/js/game/events.js`
  compares two snapshots to know what happened, whoever caused it, so the same code serves a solo visit and a party.

## The causal loop

| Who | Event | What changes | Who feels it, in their own game |
|---|---|---|---|
| Tank | `tank-move kind quality` | Sunny's affection → focus → path width (eased, floor 0.45) | Foragers: path width. Healer: forager flights wobble less. Tank: Sunny's face, hearts, the path gauge |
| Tank | being adored | Tank pollen exposure rises with focus | Tank: haze over the notes. Healer: Bumble's ring fills |
| Forager | `forager-collect / slip / puff / home` | cargo, spills, allergy; a generous delivery (≥ 20) sends the healer +2 salves | Healer: "+2 honey!". Everyone: the pot |
| Healer | `salve-throw`, `salve-hit i potency`, `salve-cloud` | allergy −34 × potency, soothed for 6 s (60% less pollen), resting cut by 2 s | Tank: wider timing band, "Easier timing!". Forager: honey splat, haze clears |
| Sunny | phases | calm / bubbly (more pollen, faster fading attention) / sleepy (a breather) / golden hour | Everyone: the phase chip, a three-second warning before bubbly |

## The stability rule, as built

The brief's spiral (tank misses → paths narrow → foragers slip → healer overloaded → tank worsens) keeps every causal link,
and each is bounded or given a way back:

- Paths never narrow below 0.45 of full width (`corridor-floor`), and ease toward the flower's focus rather than snap.
- When Sunny's attention is slipping (affection < 32) the tank's next phrase is a big, forgiving **steadying hold**.
- Affection fades faster the higher it is (`decay-floor`), so delight is a balance to hold, not a meter to max.
- Slips spill a fifth of the satchel, rounded down, and return you to the last leaf; tapping out spills 15% and rests 5 s.
  A forager can always go home early: banked nectar is safe at once.
- Salves refill by themselves; a near miss still splashes 40%; the honey cloud soothes everyone.
- When the party's average allergy passes 60, Sunny notices and **holds her breath**: pollen × 0.7.
- The sleepy phase is a scheduled regroup.
- Every visit ends with nectar home. "Too unwell" (tank and every forager resting at once) ends the visit kindly and still
  banks every satchel; the specs check an NPC party never reaches it.

`make balance` prints whole NPC visits, including the worst cases (a human tank who never plays, a healer who never throws).
At the time of writing: an all-NPC party of five brings home ≈ 350 nectar; with no tank play ≈ 270 (paths at the floor, no
wipe); with no healer the tank averages 60% allergy and taps out twice.

## Garden parties

`make serve` hosts parties at `/party` (WebSocket, `server/ws.mjs`, no dependencies). The server runs one `Sim` per room on
the same `sim.wasm`, steps it at 60 Hz and sends the 880-byte state 20 times a second. Clients send events; the server checks
each against the sender's seat (a healer cannot dance, a forager can only report its own flight) and clamps its arguments.
`set-human` hands a seat between a person and its NPC at any moment, which gives drop-in, drop-out and reconnect (a token held
in `sessionStorage` restores the seat for a minute). The browser plays its seat through `RemoteSim`, which has `Sim`'s interface,
smooths continuous values between states and spends salves optimistically.

No free text crosses the wire: bees keep their game names (Bumble, Hazel, Pip, Clover, Dot), party codes use no vowels, and
the only message between players is a wordless cheer. This is a playtest tool for people on one network, not an online
service: the brief's child-safety, moderation and identity work comes before anything public.

## Decisions taken provisionally (brief §10 says "do not silently decide": these are flagged, not settled)

| Open question | What the slice does, and why | To revisit |
|---|---|---|
| 1. Fibber tooling | Fibber is the authoritative simulation, compiled to `wasm32-wasi` with exports; the renderer is vanilla JS + canvas 2D, because fibber has no renderer and its iOS target only emits objects. The same wasm runs in the browser and on the node server. | An iOS shell (Swift + Metal, or a web view) linking fibber's arm64 object; a 3D ink shader prototype. |
| 2. Orientation | Every role lays itself out for any aspect ratio; the forager is tuned for portrait, the healer reads best landscape. | Real-device mockups. |
| 3. Rhythm authoring | Procedural phrases chosen by Sunny's phase, at 104 BPM, over an original synthesized swing loop. The music clock compensates output latency; no calibration screen yet. | A latency calibration step; authored songs. |
| 4. Forager control | Dancing Line taps (swap diagonals), turn rate falling with load; arrows choose a side directly. Spill 20% rounded down; checkpoints every ~650 units. | Continuous steering as an option; spill economics in playtests. |
| 5. Salve ballistics | Drag back anywhere; a short dotted preview of the first moments of flight; three bounces off Sunny's petals and springy leaves; splash 40% within ~3 bee radii; five salves, one every 1.7 s. | Target visibility at phone size; salve types. |
| 6. Shared scene | None shared. Each game shows only its projection plus small windows (the tank's path gauge, the forager's peeking flower and companions, the healer's whole garden). | — |
| 7. NPCs, drop-in | NPCs are in the sim (deterministic, seeded), fallible by design, and take over any seat at any moment. Party play is LAN-only with codes. | Matchmaking and safety design. |
| 8. Class acquisition | All three roles are selectable from the start (the brief's forager → healer → tank sequence is not implemented). | Tutorial progression. |
| 9. Monetization | Untouched. | — |
| 10. Accessibility | Keyboard play for every role (Space/arrows, J/K/D/F, arrows + Space + C); every audio cue has a visual one; haptics where available; reduced motion honoured in the page chrome; live-region toasts; focus moves to each new screen's heading; `document.title` names the view. | Motor-accessibility options (hold-free taps, wider windows as a setting), colour-blind checks, screen-reader play. |

## Testing

- `make specs`: behaviour specs in fibber (`sim/specs/encounter-spec.fib`), including properties over random play: nectar is
  conserved, every meter stays in bounds, an NPC party never ends a visit unwell, the same seed gives the same visit.
- `node --test tests/`: the JavaScript boundary (layout, determinism, conservation across the wasm calls) and a two-person party
  through the real server.
- In the browser, `window.__autoplay()` drives the current role's autopilot and `?fast=N` runs the garden N times faster
  (the tank's rhythm is real-time, so `fast` is for watching a visit end, not for playing it).
