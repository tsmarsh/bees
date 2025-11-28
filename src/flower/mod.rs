mod components;
mod movement;
mod pollen;
mod rizz;

pub use components::*;
pub use movement::*;
pub use pollen::*;
pub use rizz::*;

use bevy::prelude::*;

use crate::game::GameState;

pub struct FlowerPlugin;

impl Plugin for FlowerPlugin {
    fn build(&self, app: &mut App) {
        app.register_type::<Flower>()
            .register_type::<FlowerHead>()
            .register_type::<MovementPattern>()
            .register_type::<Pollen>()
            .register_type::<PollenCache>()
            .add_event::<TickleEvent>()
            .add_systems(
                Update,
                (
                    decay_rizz,
                    update_rizz_behavior,
                    handle_tickle_event,
                    update_attention_snap,
                    update_flower_head_movement,
                    pursue_bee,
                    spawn_pollen_from_heads,
                    respawn_caches,
                    setup_rizz_meters,
                    update_rizz_meters,
                )
                    .chain()
                    .run_if(in_state(GameState::Playing)),
            );
    }
}
