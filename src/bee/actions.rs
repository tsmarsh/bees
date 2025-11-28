use bevy::prelude::*;

use super::Bee;
use crate::flower::FlowerHead;

const WIGGLE_DURATION: f32 = 0.5;
const WIGGLE_COOLDOWN: f32 = 2.0;
const WIGGLE_RANGE: f32 = 150.0;
const WIGGLE_RIZZ_BASE: f32 = 20.0;
const WIGGLE_FREQUENCY: f32 = 20.0;
const WIGGLE_AMPLITUDE: f32 = 10.0;

/// Component for wiggle state
#[derive(Component)]
pub struct Wiggling {
    pub timer: Timer,
    pub original_x: f32,
}

impl Wiggling {
    pub fn new(original_x: f32) -> Self {
        Self {
            timer: Timer::from_seconds(WIGGLE_DURATION, TimerMode::Once),
            original_x,
        }
    }
}

/// Component for wiggle cooldown
#[derive(Component, Default)]
pub struct WiggleCooldown {
    pub timer: Timer,
}

impl WiggleCooldown {
    pub fn start(&mut self) {
        self.timer = Timer::from_seconds(WIGGLE_COOLDOWN, TimerMode::Once);
    }

    pub fn is_ready(&self) -> bool {
        self.timer.finished() || self.timer.remaining_secs() == 0.0
    }
}

/// System to handle wiggle input
#[allow(clippy::type_complexity)]
pub fn handle_wiggle_input(
    mut commands: Commands,
    keyboard: Res<ButtonInput<KeyCode>>,
    mouse: Res<ButtonInput<MouseButton>>,
    mut bees: Query<
        (Entity, &Transform, Option<&mut WiggleCooldown>),
        (With<Bee>, Without<Wiggling>),
    >,
) {
    // Check for spacebar or right-click (mobile can use double-tap handled differently)
    let wiggle_pressed =
        keyboard.just_pressed(KeyCode::Space) || mouse.just_pressed(MouseButton::Right);

    if !wiggle_pressed {
        return;
    }

    for (entity, transform, cooldown) in &mut bees {
        // Check cooldown
        if let Some(cd) = cooldown {
            if !cd.is_ready() {
                continue;
            }
        }

        // Start wiggling
        commands
            .entity(entity)
            .insert(Wiggling::new(transform.translation.x));
    }
}

/// System to update wiggle animation and apply rizz
pub fn update_wiggling(
    mut commands: Commands,
    mut bees: Query<(Entity, &GlobalTransform, &mut Transform, &mut Wiggling), With<Bee>>,
    mut heads: Query<(&GlobalTransform, &mut FlowerHead)>,
    time: Res<Time>,
) {
    for (entity, global_transform, mut transform, mut wiggling) in &mut bees {
        wiggling.timer.tick(time.delta());

        if wiggling.timer.finished() {
            // Reset position and remove wiggling
            transform.translation.x = wiggling.original_x;
            commands.entity(entity).remove::<Wiggling>();

            // Apply cooldown
            commands.entity(entity).insert(WiggleCooldown {
                timer: Timer::from_seconds(WIGGLE_COOLDOWN, TimerMode::Once),
            });

            // Apply rizz to nearby heads
            let bee_pos = global_transform.translation().truncate();
            for (head_transform, mut head) in &mut heads {
                let head_pos = head_transform.translation().truncate();
                let distance = bee_pos.distance(head_pos);

                if distance <= WIGGLE_RANGE {
                    // Rizz scaled by distance (more at close range)
                    let distance_factor = 1.0 - (distance / WIGGLE_RANGE);
                    let rizz_gain = WIGGLE_RIZZ_BASE * distance_factor;
                    head.rizz = (head.rizz + rizz_gain).min(100.0);
                }
            }
        } else {
            // Oscillate side-to-side
            let progress = wiggling.timer.elapsed_secs();
            let offset = (progress * WIGGLE_FREQUENCY).sin() * WIGGLE_AMPLITUDE;
            transform.translation.x = wiggling.original_x + offset;
        }
    }
}

/// System to update wiggle cooldown
pub fn update_wiggle_cooldown(mut cooldowns: Query<&mut WiggleCooldown>, time: Res<Time>) {
    for mut cooldown in &mut cooldowns {
        cooldown.timer.tick(time.delta());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wiggle_cooldown_starts_not_ready_after_start() {
        let mut cooldown = WiggleCooldown::default();
        assert!(cooldown.is_ready()); // Initially ready

        cooldown.start();
        assert!(!cooldown.is_ready()); // Not ready after starting
    }
}
