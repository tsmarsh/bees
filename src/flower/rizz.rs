use bevy::prelude::*;

use super::FlowerHead;
use crate::bee::Bee;

const RIZZ_DECAY_RATE: f32 = 5.0;
const LOW_RIZZ_THRESHOLD: f32 = 30.0;
const HIGH_RIZZ_THRESHOLD: f32 = 70.0;
const PURSUIT_SPEED: f32 = 80.0;
const TICKLE_RIZZ_DROP: f32 = 30.0;
const ATTENTION_SNAP_DURATION: f32 = 1.0;
const ATTENTION_SNAP_SPEED: f32 = 150.0;

/// Event sent when a cache is collected (tickle)
#[derive(Event)]
pub struct TickleEvent {
    pub cache_position: Vec2,
}

/// Component for attention snap - head moves to tickle location
#[derive(Component)]
pub struct AttentionSnap {
    pub target: Vec2,
    pub timer: Timer,
}

/// Component to track a flower head's current behavior state
#[derive(Component, Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum RizzBehavior {
    #[default]
    Normal, // Default movement pattern
    Pursuing, // Low rizz, chasing bee
    Blissed,  // High rizz, lazy predictable movement
}

/// Marker for rizz meter UI element
#[derive(Component)]
pub struct RizzMeterUI {
    pub head_entity: Entity,
}

/// Marker for rizz meter fill
#[derive(Component)]
pub struct RizzMeterFill {
    pub head_entity: Entity,
}

/// System to decay rizz over time
pub fn decay_rizz(mut heads: Query<&mut FlowerHead>, time: Res<Time>) {
    let delta = time.delta_secs();

    for mut head in &mut heads {
        head.rizz = (head.rizz - RIZZ_DECAY_RATE * delta).max(0.0);
    }
}

/// System to update head behavior based on rizz level
pub fn update_rizz_behavior(
    mut commands: Commands,
    heads: Query<(Entity, &FlowerHead, Option<&RizzBehavior>)>,
) {
    for (entity, head, current_behavior) in &heads {
        let new_behavior = if head.rizz < LOW_RIZZ_THRESHOLD {
            RizzBehavior::Pursuing
        } else if head.rizz > HIGH_RIZZ_THRESHOLD {
            RizzBehavior::Blissed
        } else {
            RizzBehavior::Normal
        };

        // Only update if behavior changed or not set
        if current_behavior != Some(&new_behavior) {
            commands.entity(entity).insert(new_behavior);
        }
    }
}

/// System to make low-rizz heads pursue the nearest bee
pub fn pursue_bee(
    mut heads: Query<(&GlobalTransform, &mut Transform, &RizzBehavior, &Parent), With<FlowerHead>>,
    bees: Query<&GlobalTransform, With<Bee>>,
    time: Res<Time>,
) {
    let delta = time.delta_secs();

    for (global_transform, mut local_transform, behavior, _parent) in &mut heads {
        if *behavior != RizzBehavior::Pursuing {
            continue;
        }

        // Find nearest bee
        let head_pos = global_transform.translation().truncate();
        let nearest_bee = bees
            .iter()
            .map(|bee_gt| bee_gt.translation().truncate())
            .min_by(|a, b| {
                let dist_a = head_pos.distance_squared(*a);
                let dist_b = head_pos.distance_squared(*b);
                dist_a.partial_cmp(&dist_b).unwrap()
            });

        if let Some(bee_pos) = nearest_bee {
            // Calculate direction to bee (in local space relative to parent)
            let direction = (bee_pos - head_pos).normalize_or_zero();
            let movement = direction * PURSUIT_SPEED * delta;

            local_transform.translation.x += movement.x;
            local_transform.translation.y += movement.y;
        }
    }
}

/// Setup rizz meter UI for each flower head
pub fn setup_rizz_meters(mut commands: Commands, heads: Query<Entity, Added<FlowerHead>>) {
    for head_entity in &heads {
        // Spawn rizz meter as child of flower head
        commands.entity(head_entity).with_children(|parent| {
            // Background bar
            parent
                .spawn((
                    RizzMeterUI { head_entity },
                    Sprite {
                        color: Color::srgba(0.2, 0.2, 0.2, 0.7),
                        custom_size: Some(Vec2::new(40.0, 6.0)),
                        ..default()
                    },
                    Transform::from_xyz(0.0, -35.0, 5.0),
                ))
                .with_children(|meter_bg| {
                    // Fill bar
                    meter_bg.spawn((
                        RizzMeterFill { head_entity },
                        Sprite {
                            color: Color::srgb(0.9, 0.3, 0.6),
                            custom_size: Some(Vec2::new(0.0, 4.0)),
                            anchor: bevy::sprite::Anchor::CenterLeft,
                            ..default()
                        },
                        Transform::from_xyz(-19.0, 0.0, 0.1),
                    ));
                });
        });
    }
}

/// Update rizz meter display
pub fn update_rizz_meters(
    heads: Query<&FlowerHead>,
    mut fills: Query<(&RizzMeterFill, &mut Sprite)>,
) {
    for (fill, mut sprite) in &mut fills {
        if let Ok(head) = heads.get(fill.head_entity) {
            let percentage = head.rizz / 100.0;
            let width = 38.0 * percentage;
            sprite.custom_size = Some(Vec2::new(width, 4.0));

            // Color based on level
            let color = if percentage < 0.3 {
                Color::srgb(0.9, 0.2, 0.2) // Red - pursuing
            } else if percentage > 0.7 {
                Color::srgb(0.2, 0.9, 0.4) // Green - blissed
            } else {
                Color::srgb(0.9, 0.6, 0.2) // Orange - normal
            };
            sprite.color = color;
        }
    }
}

/// Handle tickle events - drop rizz on nearest head and trigger attention snap
pub fn handle_tickle_event(
    mut commands: Commands,
    mut events: EventReader<TickleEvent>,
    mut heads: Query<(Entity, &GlobalTransform, &mut FlowerHead)>,
) {
    for event in events.read() {
        // Find nearest head to cache
        let nearest_head = heads
            .iter_mut()
            .map(|(entity, gt, head)| {
                let dist = gt.translation().truncate().distance(event.cache_position);
                (entity, dist, head)
            })
            .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap());

        if let Some((entity, _dist, mut head)) = nearest_head {
            // Drop rizz
            head.rizz = (head.rizz - TICKLE_RIZZ_DROP).max(0.0);

            // Add attention snap
            commands.entity(entity).insert(AttentionSnap {
                target: event.cache_position,
                timer: Timer::from_seconds(ATTENTION_SNAP_DURATION, TimerMode::Once),
            });
        }
    }
}

/// Update attention snap - move head toward tickle location
pub fn update_attention_snap(
    mut commands: Commands,
    mut heads: Query<
        (Entity, &GlobalTransform, &mut Transform, &mut AttentionSnap),
        With<FlowerHead>,
    >,
    time: Res<Time>,
) {
    let delta = time.delta_secs();

    for (entity, global_transform, mut local_transform, mut snap) in &mut heads {
        snap.timer.tick(time.delta());

        if snap.timer.finished() {
            commands.entity(entity).remove::<AttentionSnap>();
            continue;
        }

        // Move toward target location
        let current_pos = global_transform.translation().truncate();
        let direction = (snap.target - current_pos).normalize_or_zero();
        let movement = direction * ATTENTION_SNAP_SPEED * delta;

        local_transform.translation.x += movement.x;
        local_transform.translation.y += movement.y;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rizz_behavior_default_is_normal() {
        assert_eq!(RizzBehavior::default(), RizzBehavior::Normal);
    }
}
