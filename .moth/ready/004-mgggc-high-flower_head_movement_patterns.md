### 004 - Bee Movement Input
**Severity:** high

Player can move the bee.

**Acceptance Criteria:**
- Click/tap to set destination
- Bee moves toward destination at constant speed
- Bee stops when reaching destination
- Smooth movement (not teleport)

**Tech Notes:**
- Use Bevy's input system
- Touch and mouse should both work for WASM