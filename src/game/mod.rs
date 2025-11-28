mod config;
mod state;

pub use config::*;
pub use state::*;

use bevy::prelude::*;

pub struct GamePlugin;

impl Plugin for GamePlugin {
    fn build(&self, app: &mut App) {
        app.init_state::<GameState>().init_resource::<GameConfig>();
    }
}
