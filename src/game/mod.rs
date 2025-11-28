mod conditions;
mod config;
mod reset;
mod state;

pub use conditions::*;
pub use config::*;
pub use reset::*;
pub use state::*;

use bevy::prelude::*;

pub struct GamePlugin;

impl Plugin for GamePlugin {
    fn build(&self, app: &mut App) {
        app.init_state::<GameState>()
            .init_resource::<GameConfig>()
            .add_systems(
                Update,
                (
                    check_win_condition,
                    check_lose_condition,
                    handle_restart_input,
                ),
            )
            .add_systems(OnEnter(GameState::Playing), on_enter_playing);
    }
}
