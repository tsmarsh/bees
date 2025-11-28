use bevy::prelude::*;

use crate::bee::{AllergyMeter, WiggleCooldown, Wiggling};
use crate::flower::FlowerHead;

const AI_WIGGLE_THRESHOLD: f32 = 50.0;
const AI_MOVE_SPEED: f32 = 100.0;
const SAFE_DISTANCE: f32 = 80.0;
const OPTIMAL_WIGGLE_RANGE: f32 = 100.0;

/// Marker for AI Diva companion
#[derive(Component)]
pub struct AiDiva;

/// Bundle for spawning AI Diva
#[derive(Bundle, Default)]
pub struct AiDivaBundle {
    pub diva: AiDiva,
    pub allergy_meter: AllergyMeter,
    pub wiggle_cooldown: WiggleCooldown,
}

impl Default for AiDiva {
    fn default() -> Self {
        Self
    }
}

/// AI movement - find optimal position to wiggle multiple heads while avoiding them
pub fn ai_diva_movement(
    mut divas: Query<&mut Transform, (With<AiDiva>, Without<Wiggling>)>,
    heads: Query<&GlobalTransform, With<FlowerHead>>,
    time: Res<Time>,
) {
    let delta = time.delta_secs();

    for mut transform in &mut divas {
        let diva_pos = transform.translation.truncate();

        // Calculate target position - center of mass of all heads, but at safe distance
        let head_positions: Vec<Vec2> =
            heads.iter().map(|gt| gt.translation().truncate()).collect();

        if head_positions.is_empty() {
            continue;
        }

        // Find center of mass of heads
        let center = head_positions
            .iter()
            .fold(Vec2::ZERO, |acc, pos| acc + *pos)
            / head_positions.len() as f32;

        // Find direction away from center but within wiggle range
        let to_center = center - diva_pos;
        let distance_to_center = to_center.length();

        // Target: stay at OPTIMAL_WIGGLE_RANGE from center
        let target_pos = if distance_to_center < OPTIMAL_WIGGLE_RANGE {
            // Too close - move away slightly
            diva_pos - to_center.normalize_or_zero() * 20.0
        } else if distance_to_center > OPTIMAL_WIGGLE_RANGE * 1.5 {
            // Too far - move closer
            diva_pos + to_center.normalize_or_zero() * 20.0
        } else {
            // Good range - stay put
            diva_pos
        };

        // Avoid getting too close to any individual head
        let mut avoidance = Vec2::ZERO;
        for head_pos in &head_positions {
            let to_head = *head_pos - diva_pos;
            let dist = to_head.length();
            if dist < SAFE_DISTANCE && dist > 0.0 {
                // Push away from this head
                avoidance -= to_head.normalize() * (SAFE_DISTANCE - dist);
            }
        }

        // Combine target position with avoidance
        let final_target = target_pos + avoidance;
        let direction = (final_target - diva_pos).normalize_or_zero();

        // Move toward target
        transform.translation.x += direction.x * AI_MOVE_SPEED * delta;
        transform.translation.y += direction.y * AI_MOVE_SPEED * delta;
    }
}

/// AI wiggle decision - wiggle when heads need attention
#[allow(clippy::type_complexity)]
pub fn ai_diva_wiggle(
    mut commands: Commands,
    mut divas: Query<
        (
            Entity,
            &GlobalTransform,
            &Transform,
            Option<&WiggleCooldown>,
        ),
        (With<AiDiva>, Without<Wiggling>),
    >,
    heads: Query<(&GlobalTransform, &FlowerHead)>,
) {
    for (entity, global_transform, local_transform, cooldown) in &mut divas {
        // Check cooldown
        if let Some(cd) = cooldown {
            if !cd.is_ready() {
                continue;
            }
        }

        let diva_pos = global_transform.translation().truncate();

        // Check if any head within range needs attention
        let needs_wiggle = heads.iter().any(|(head_gt, head)| {
            let head_pos = head_gt.translation().truncate();
            let distance = diva_pos.distance(head_pos);
            distance <= 150.0 && head.rizz < AI_WIGGLE_THRESHOLD
        });

        if needs_wiggle {
            // Start wiggling
            commands
                .entity(entity)
                .insert(Wiggling::new(local_transform.translation.x));
        }
    }
}
