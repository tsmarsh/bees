mod conditions;
mod config;
mod reset;
mod state;
mod timer;

pub use conditions::*;
pub use config::*;
pub use reset::*;
pub use state::*;
pub use timer::*;

use bevy::prelude::*;

pub struct GamePlugin;

impl Plugin for GamePlugin {
    fn build(&self, app: &mut App) {
        app.init_state::<GameState>()
            .init_resource::<GameConfig>()
            .init_resource::<SessionTimer>()
            .add_systems(Startup, setup_timer_ui)
            .add_systems(
                Update,
                (
                    check_win_condition,
                    check_lose_condition,
                    handle_restart_input,
                    update_timer,
                    update_timer_display,
                    stop_timer_on_end,
                ),
            )
            .add_systems(
                OnEnter(GameState::Playing),
                (on_enter_playing, reset_timer_on_play),
            );
    }
}
