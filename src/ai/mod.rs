mod diva;
mod healer;

pub use diva::*;
pub use healer::*;

use bevy::prelude::*;

use crate::game::GameState;

pub struct AiPlugin;

impl Plugin for AiPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(
            Update,
            (
                ai_diva_movement,
                ai_diva_wiggle,
                ai_healer_movement,
                ai_healer_heal,
                update_healer_allergy,
            )
                .run_if(in_state(GameState::Playing)),
        );
    }
}
