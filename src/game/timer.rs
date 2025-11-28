use bevy::prelude::*;

use super::GameState;

/// Resource to track session time
#[derive(Resource, Default)]
pub struct SessionTimer {
    pub elapsed: f32,
    pub running: bool,
}

impl SessionTimer {
    pub fn reset(&mut self) {
        self.elapsed = 0.0;
        self.running = true;
    }

    pub fn stop(&mut self) {
        self.running = false;
    }

    pub fn formatted(&self) -> String {
        let minutes = (self.elapsed / 60.0) as u32;
        let seconds = (self.elapsed % 60.0) as u32;
        let millis = ((self.elapsed * 10.0) as u32) % 10;
        format!("{:02}:{:02}.{}", minutes, seconds, millis)
    }
}

/// Marker for timer display
#[derive(Component)]
pub struct TimerDisplay;

/// Setup timer UI
pub fn setup_timer_ui(mut commands: Commands) {
    commands.spawn((
        TimerDisplay,
        Text::new("00:00.0"),
        TextFont {
            font_size: 20.0,
            ..default()
        },
        TextColor(Color::srgba(1.0, 1.0, 1.0, 0.7)),
        Node {
            position_type: PositionType::Absolute,
            left: Val::Px(20.0),
            bottom: Val::Px(20.0),
            ..default()
        },
    ));
}

/// Update timer during play
pub fn update_timer(
    mut timer: ResMut<SessionTimer>,
    time: Res<Time>,
    state: Res<State<GameState>>,
) {
    if *state.get() == GameState::Playing && timer.running {
        timer.elapsed += time.delta_secs();
    }
}

/// Update timer display
pub fn update_timer_display(
    timer: Res<SessionTimer>,
    mut displays: Query<&mut Text, With<TimerDisplay>>,
) {
    for mut text in &mut displays {
        **text = timer.formatted();
    }
}

/// Reset timer when entering playing state
pub fn reset_timer_on_play(mut timer: ResMut<SessionTimer>) {
    timer.reset();
}

/// Stop timer and log balance data when game ends
pub fn stop_timer_on_end(mut timer: ResMut<SessionTimer>, state: Res<State<GameState>>) {
    if !timer.running {
        return;
    }

    match state.get() {
        GameState::Won => {
            timer.stop();
            // Log balance data for testing
            #[cfg(target_arch = "wasm32")]
            web_sys::console::log_1(
                &format!(
                    "🎉 WIN - Session time: {} ({:.2}s)",
                    timer.formatted(),
                    timer.elapsed
                )
                .into(),
            );

            #[cfg(not(target_arch = "wasm32"))]
            info!(
                "🎉 WIN - Session time: {} ({:.2}s)",
                timer.formatted(),
                timer.elapsed
            );
        }
        GameState::Lost => {
            timer.stop();
            #[cfg(target_arch = "wasm32")]
            web_sys::console::log_1(
                &format!(
                    "💀 LOSE - Session time: {} ({:.2}s)",
                    timer.formatted(),
                    timer.elapsed
                )
                .into(),
            );

            #[cfg(not(target_arch = "wasm32"))]
            info!(
                "💀 LOSE - Session time: {} ({:.2}s)",
                timer.formatted(),
                timer.elapsed
            );
        }
        GameState::Playing => {}
    }
}
