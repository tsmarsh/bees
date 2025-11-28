**Acceptance Criteria:**
- `cargo new allerbees` with Bevy dependency
- WASM build target configured
- Basic `index.html` that loads the WASM module
- `trunk serve` produces playable (empty) browser window
- Document build commands in README

**Tech Notes:**
- Use `trunk` for dev server with hot reload
- Bevy 0.14+ has solid WASM support