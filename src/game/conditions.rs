use bevy::prelude::*;

use super::GameState;
use crate::bee::{AllergyMeter, Bee, CollectedPollen, SneezeCount};

const WIN_POLLEN_THRESHOLD: u32 = 20;
const MAX_SNEEZES: u32 = 3;

pub fn check_win_condition(
    bees: Query<&CollectedPollen, With<Bee>>,
    current_state: Res<State<GameState>>,
    mut next_state: ResMut<NextState<GameState>>,
) {
    if *current_state.get() != GameState::Playing {
        return;
    }

    for collected in &bees {
        if collected.count >= WIN_POLLEN_THRESHOLD {
            next_state.set(GameState::Won);
            return;
        }
    }
}

pub fn check_lose_condition(
    bees: Query<(&AllergyMeter, Option<&SneezeCount>), With<Bee>>,
    current_state: Res<State<GameState>>,
    mut next_state: ResMut<NextState<GameState>>,
) {
    if *current_state.get() != GameState::Playing {
        return;
    }

    for (meter, sneeze_count) in &bees {
        // Lose if allergy hits max
        if meter.value >= meter.max {
            next_state.set(GameState::Lost);
            return;
        }

        // Lose if sneezed too many times
        if let Some(count) = sneeze_count {
            if count.count >= MAX_SNEEZES {
                next_state.set(GameState::Lost);
                return;
            }
        }
    }
}

pub fn handle_restart_input(
    mouse_button: Res<ButtonInput<MouseButton>>,
    touches: Res<Touches>,
    current_state: Res<State<GameState>>,
    mut next_state: ResMut<NextState<GameState>>,
) {
    if *current_state.get() == GameState::Playing {
        return;
    }

    if mouse_button.just_pressed(MouseButton::Left) || touches.iter_just_pressed().next().is_some()
    {
        next_state.set(GameState::Playing);
    }
}
