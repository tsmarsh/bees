# Allerbees

*Five little bees. Three completely different games. One very affectionate garden.*

A cooperative, family-friendly arcade game. Bees collect nectar from flowers who adore them, and the bees have hay fever.
Nobody is ever hurt, nobody fights, and the nectar you carry home always counts. Each role is a different game:

- **Tank, the performer.** A rhythm routine for Sunny the sunflower: tap, hold and follow in time. Her delight keeps the
  foragers' paths wide.
- **Forager, the flyer.** Fly a winding line through Sunny's petals, tapping to turn. Heavy satchels turn slowly, so take nectar
  home when it feels right.
- **Healer, the salve launcher.** Pull back and lob honey salves at sneezy bees. Salves soothe, protect and speed recovery.

All three play the same visit. NPC bees fill any role nobody takes, so one person can always play.

The design is in [docs/brief.md](docs/brief.md), and how the slice works (including which open questions it answered
provisionally) is in [docs/design/encounter.md](docs/design/encounter.md).

## Play

```
make serve          # then open http://localhost:8080/
```

`make serve` needs only node (22 or later). It also hosts **garden parties**: start one from the hive, and friends on the same
network join with the four-letter code at the address the server prints. Each friend takes a role and plays their own game in
the shared visit.

The `web/` directory is a static site, so any static host can serve solo play. Garden parties need `make serve`.

## Build and test

The simulation is written in [fibber](https://github.com/tailoredshapes/fibber) and compiled to `web/sim.wasm`, which is
committed so that playing needs no fibber toolchain.

```
make wasm           # rebuild web/sim.wasm: needs fibc >= 0.1.17 (FIBC=...) and WASI_SDK (fibber's scripts/fetch-wasm-tools.sh)
make specs          # the simulation's behaviour specs, in fibber
make web-test       # the JavaScript boundary and a two-person party through the real server (node --test)
make test           # both
make balance        # whole NPC visits, one row each: the tuning table
```

Tunable numbers live in `sim/allerbees/tune.fib`.

## Layout

```
sim/allerbees/   the encounter in fibber: model, rules, npc, encounter (the step), abi (the array), tune
sim/wasm.fib     the exports the browser and the server call
sim/specs/       behaviour specs
web/             the game: index.html, css/, js/ (main, views/, game/, sim/, net/, draw/), sim.wasm
server/          static files and garden parties (WebSocket, no dependencies)
tests/           node tests
docs/            the brief and the design notes
```
