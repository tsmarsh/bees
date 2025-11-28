mod actions;
mod allergy;
mod collection;
mod components;
mod movement;
mod sneeze;

pub use actions::*;
pub use allergy::*;
pub use collection::*;
pub use components::*;
pub use movement::*;
pub use sneeze::*;

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
                (
                    handle_click_input,
                    handle_wiggle_input,
                    update_wiggle_cooldown,
                    update_wiggling,
                    move_toward_target,
                    collect_pollen,
                    collect_caches,
                    update_allergy_from_proximity,
                    trigger_sneeze,
                    update_sneezing,
                )
                    .chain()
                    .run_if(in_state(GameState::Playing)),
            );
    }
}
