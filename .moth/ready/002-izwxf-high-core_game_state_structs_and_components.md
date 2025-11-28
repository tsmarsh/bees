Define core data structures for the game.

**Acceptance Criteria:**
- `Bee` component with role (Gatherer/Diva/Healer enum), allergy_meter, collected_pollen
- `Flower` component
- `FlowerHead` component with movement_pattern, pollen_drop_timer
- `Pollen` component with value
- `GameState` resource enum (Playing, Won, Lost)
- All structs derive necessary Bevy traits (Component, Resource, etc.)