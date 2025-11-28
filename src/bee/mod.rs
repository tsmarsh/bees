mod components;
mod movement;

pub use components::*;
pub use movement::*;

use bevy::prelude::*;

use crate::game::GameState;

pub struct BeePlugin;

impl Plugin for BeePlugin {
    fn build(&self, app: &mut App) {
        app.register_type::<Bee>()
            .register_type::<Role>()
            .register_type::<AllergyMeter>()
            .register_type::<CollectedPollen>()
            .register_type::<MoveTarget>()
            .add_systems(
                Update,
                (handle_click_input, move_toward_target)
                    .chain()
                    .run_if(in_state(GameState::Playing)),
            );
    }
}
