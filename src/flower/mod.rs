mod components;
mod movement;
mod pollen;

pub use components::*;
pub use movement::*;
pub use pollen::*;

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
            .add_systems(
                Update,
                (
                    update_flower_head_movement,
                    spawn_pollen_from_heads,
                    respawn_caches,
                )
                    .chain()
                    .run_if(in_state(GameState::Playing)),
            );
    }
}
