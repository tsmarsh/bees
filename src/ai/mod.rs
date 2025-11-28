mod diva;

pub use diva::*;

use bevy::prelude::*;

use crate::game::GameState;

pub struct AiPlugin;

impl Plugin for AiPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(
            Update,
            (ai_diva_movement, ai_diva_wiggle).run_if(in_state(GameState::Playing)),
        );
    }
}
