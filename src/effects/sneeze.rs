use bevy::prelude::*;

use crate::bee::{Bee, Sneezing};

/// Event sent when a sneeze happens
#[derive(Event)]
pub struct SneezeEvent {
    pub bee_entity: Entity,
    pub position: Vec2,
}

/// Component for bee expansion/contraction animation during sneeze
#[derive(Component)]
pub struct SneezeAnimation {
    pub timer: Timer,
    pub original_scale: Vec3,
}

impl SneezeAnimation {
    pub fn new(original_scale: Vec3) -> Self {
        Self {
            timer: Timer::from_seconds(0.3, TimerMode::Once),
            original_scale,
        }
    }
}

/// Component for screen shake effect
#[derive(Component)]
pub struct ScreenShake {
    pub timer: Timer,
    pub intensity: f32,
    pub original_translation: Vec3,
}

impl ScreenShake {
    pub fn new(duration: f32, intensity: f32, original_translation: Vec3) -> Self {
        Self {
            timer: Timer::from_seconds(duration, TimerMode::Once),
            intensity,
            original_translation,
        }
    }
}

/// Component for floating ACHOO text
#[derive(Component)]
pub struct AchooText {
    pub timer: Timer,
    pub velocity: Vec2,
}

impl Default for AchooText {
    fn default() -> Self {
        Self {
            timer: Timer::from_seconds(0.8, TimerMode::Once),
            velocity: Vec2::new(0.0, 50.0),
        }
    }
}

/// Component for scattered pollen with velocity
#[derive(Component)]
pub struct ScatteringPollen {
    pub velocity: Vec2,
    pub friction: f32,
}

/// Detect when a bee starts sneezing and send an event
pub fn detect_sneeze_start(
    bees: Query<(Entity, &Transform), Added<Sneezing>>,
    mut sneeze_events: EventWriter<SneezeEvent>,
) {
    for (entity, transform) in &bees {
        sneeze_events.send(SneezeEvent {
            bee_entity: entity,
            position: transform.translation.truncate(),
        });
    }
}

/// Handle sneeze event: add animation, screen shake, and ACHOO text
pub fn handle_sneeze_effects(
    mut commands: Commands,
    mut events: EventReader<SneezeEvent>,
    bees: Query<&Transform, With<Bee>>,
    camera: Query<(Entity, &Transform), With<Camera2d>>,
) {
    for event in events.read() {
        // Add expansion animation to bee
        if let Ok(transform) = bees.get(event.bee_entity) {
            commands
                .entity(event.bee_entity)
                .insert(SneezeAnimation::new(transform.scale));
        }

        // Add screen shake to camera
        if let Ok((camera_entity, camera_transform)) = camera.get_single() {
            commands.entity(camera_entity).insert(ScreenShake::new(
                0.2,
                8.0,
                camera_transform.translation,
            ));
        }

        // Spawn ACHOO text
        commands.spawn((
            AchooText::default(),
            Text2d::new("ACHOO!"),
            TextFont {
                font_size: 32.0,
                ..default()
            },
            TextColor(Color::srgba(1.0, 0.3, 0.3, 1.0)),
            Transform::from_xyz(event.position.x, event.position.y + 40.0, 10.0),
        ));
    }
}

/// Update bee expansion/contraction animation
pub fn update_sneeze_animation(
    mut commands: Commands,
    mut bees: Query<(Entity, &mut Transform, &mut SneezeAnimation), With<Bee>>,
    time: Res<Time>,
) {
    for (entity, mut transform, mut animation) in &mut bees {
        animation.timer.tick(time.delta());

        let progress = animation.timer.fraction();

        // Expand quickly then contract
        let scale_multiplier = if progress < 0.3 {
            // Expand phase
            1.0 + (progress / 0.3) * 0.5
        } else {
            // Contract phase
            1.5 - ((progress - 0.3) / 0.7) * 0.5
        };

        transform.scale = animation.original_scale * scale_multiplier;

        if animation.timer.finished() {
            transform.scale = animation.original_scale;
            commands.entity(entity).remove::<SneezeAnimation>();
        }
    }
}

/// Update screen shake effect
pub fn update_screen_shake(
    mut commands: Commands,
    mut camera: Query<(Entity, &mut Transform, &mut ScreenShake), With<Camera2d>>,
    time: Res<Time>,
) {
    for (entity, mut transform, mut shake) in &mut camera {
        shake.timer.tick(time.delta());

        if shake.timer.finished() {
            transform.translation = shake.original_translation;
            commands.entity(entity).remove::<ScreenShake>();
        } else {
            // Random offset based on intensity, decreasing over time
            let remaining = 1.0 - shake.timer.fraction();
            let offset_x = (time.elapsed_secs() * 100.0).sin() * shake.intensity * remaining;
            let offset_y = (time.elapsed_secs() * 130.0).cos() * shake.intensity * remaining;

            transform.translation = shake.original_translation + Vec3::new(offset_x, offset_y, 0.0);
        }
    }
}

/// Update floating ACHOO text
pub fn update_achoo_text(
    mut commands: Commands,
    mut texts: Query<(Entity, &mut Transform, &mut AchooText, &mut TextColor)>,
    time: Res<Time>,
) {
    let delta = time.delta_secs();

    for (entity, mut transform, mut achoo, mut color) in &mut texts {
        achoo.timer.tick(time.delta());

        if achoo.timer.finished() {
            commands.entity(entity).despawn();
            continue;
        }

        // Float upward
        transform.translation.x += achoo.velocity.x * delta;
        transform.translation.y += achoo.velocity.y * delta;

        // Fade out
        let alpha = 1.0 - achoo.timer.fraction();
        *color = TextColor(Color::srgba(1.0, 0.3, 0.3, alpha));

        // Scale up slightly
        let scale = 1.0 + achoo.timer.fraction() * 0.3;
        transform.scale = Vec3::splat(scale);
    }
}

/// Update scattering pollen (gives them outward velocity)
pub fn update_scattering_pollen(
    mut commands: Commands,
    mut pollen: Query<(Entity, &mut Transform, &mut ScatteringPollen)>,
    time: Res<Time>,
) {
    let delta = time.delta_secs();

    for (entity, mut transform, mut scatter) in &mut pollen {
        transform.translation.x += scatter.velocity.x * delta;
        transform.translation.y += scatter.velocity.y * delta;

        // Apply friction
        let friction_factor = scatter.friction.powf(delta * 10.0);
        scatter.velocity *= friction_factor;

        // Remove component when nearly stopped
        if scatter.velocity.length_squared() < 1.0 {
            commands.entity(entity).remove::<ScatteringPollen>();
        }
    }
}
