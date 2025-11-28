use bevy::prelude::*;

use crate::bee::AllergyMeter;
use crate::flower::FlowerHead;

const HEAL_THRESHOLD: f32 = 60.0;
const HEAL_RATE: f32 = 20.0;
const HEAL_RANGE: f32 = 40.0;
const AI_MOVE_SPEED: f32 = 120.0;
const HEALER_ALLERGY_MULTIPLIER: f32 = 2.0;

/// Marker for AI Healer companion
#[derive(Component)]
pub struct AiHealer {
    /// Allergy sensitivity multiplier (2x for healer)
    pub sensitivity: f32,
}

impl Default for AiHealer {
    fn default() -> Self {
        Self {
            sensitivity: HEALER_ALLERGY_MULTIPLIER,
        }
    }
}

/// Bundle for spawning AI Healer
#[derive(Bundle, Default)]
pub struct AiHealerBundle {
    pub healer: AiHealer,
    pub allergy_meter: AllergyMeter,
}

/// Marker for the player bee (to distinguish from AI)
#[derive(Component)]
pub struct PlayerBee;

/// AI Healer movement - move toward player when their allergy is high
#[allow(clippy::type_complexity)]
pub fn ai_healer_movement(
    mut healers: Query<&mut Transform, With<AiHealer>>,
    players: Query<(&Transform, &AllergyMeter), (With<PlayerBee>, Without<AiHealer>)>,
    time: Res<Time>,
) {
    let delta = time.delta_secs();

    let Some((player_transform, player_allergy)) = players.iter().next() else {
        return;
    };

    // Only move toward player if their allergy is high
    if player_allergy.percentage() < HEAL_THRESHOLD / 100.0 {
        return;
    }

    let player_pos = player_transform.translation.truncate();

    for mut healer_transform in &mut healers {
        let healer_pos = healer_transform.translation.truncate();
        let to_player = player_pos - healer_pos;
        let distance = to_player.length();

        // Already close enough
        if distance <= HEAL_RANGE {
            continue;
        }

        // Move toward player
        let direction = to_player.normalize_or_zero();
        healer_transform.translation.x += direction.x * AI_MOVE_SPEED * delta;
        healer_transform.translation.y += direction.y * AI_MOVE_SPEED * delta;
    }
}

/// AI Healer healing - reduce player allergy when adjacent
#[allow(clippy::type_complexity)]
pub fn ai_healer_heal(
    healers: Query<&Transform, With<AiHealer>>,
    mut players: Query<(&Transform, &mut AllergyMeter), (With<PlayerBee>, Without<AiHealer>)>,
    time: Res<Time>,
) {
    let delta = time.delta_secs();

    for (player_transform, mut player_allergy) in &mut players {
        let player_pos = player_transform.translation.truncate();

        // Check if any healer is close enough
        let healer_nearby = healers.iter().any(|healer_transform| {
            let healer_pos = healer_transform.translation.truncate();
            player_pos.distance(healer_pos) <= HEAL_RANGE
        });

        if healer_nearby && player_allergy.value > 0.0 {
            player_allergy.value = (player_allergy.value - HEAL_RATE * delta).max(0.0);
        }
    }
}

/// Update healer allergy with 2x sensitivity
pub fn update_healer_allergy(
    mut healers: Query<(&Transform, &mut AllergyMeter, &AiHealer)>,
    heads: Query<&GlobalTransform, With<FlowerHead>>,
    time: Res<Time>,
) {
    let delta = time.delta_secs();

    for (transform, mut meter, healer) in &mut healers {
        let healer_pos = transform.translation.truncate();

        // Find nearest head
        let nearest_distance = heads
            .iter()
            .map(|head_gt| head_gt.translation().truncate().distance(healer_pos))
            .min_by(|a, b| a.partial_cmp(b).unwrap())
            .unwrap_or(f32::MAX);

        // Allergy builds up based on proximity (with 2x sensitivity)
        let proximity_threshold = 200.0;
        if nearest_distance < proximity_threshold {
            let buildup_rate = (1.0 - nearest_distance / proximity_threshold) * 50.0;
            meter.value = (meter.value + buildup_rate * healer.sensitivity * delta).min(meter.max);
        } else {
            // Decay when far
            meter.value = (meter.value - 5.0 * delta).max(0.0);
        }
    }
}
