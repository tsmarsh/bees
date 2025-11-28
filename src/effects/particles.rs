use bevy::prelude::*;

use super::CollectionEvent;

#[derive(Component)]
pub struct Particle {
    pub velocity: Vec2,
    pub lifetime: Timer,
}

pub fn spawn_collection_particles(
    mut commands: Commands,
    mut events: EventReader<CollectionEvent>,
) {
    for event in events.read() {
        // Spawn 5 particles in random directions
        for i in 0..5 {
            let angle = (i as f32 / 5.0) * std::f32::consts::TAU + 0.2 * (i as f32);
            let speed = 80.0 + (i as f32 * 10.0);
            let velocity = Vec2::new(angle.cos(), angle.sin()) * speed;

            commands.spawn((
                Particle {
                    velocity,
                    lifetime: Timer::from_seconds(0.3, TimerMode::Once),
                },
                Sprite {
                    color: Color::srgb(1.0, 0.9, 0.3),
                    custom_size: Some(Vec2::splat(6.0)),
                    ..default()
                },
                Transform::from_xyz(event.position.x, event.position.y, 5.0),
            ));
        }
    }
}

pub fn update_particles(
    mut commands: Commands,
    mut particles: Query<(Entity, &mut Transform, &mut Particle, &mut Sprite)>,
    time: Res<Time>,
) {
    let delta = time.delta_secs();

    for (entity, mut transform, mut particle, mut sprite) in &mut particles {
        particle.lifetime.tick(time.delta());

        if particle.lifetime.finished() {
            commands.entity(entity).despawn();
            continue;
        }

        // Move particle
        transform.translation.x += particle.velocity.x * delta;
        transform.translation.y += particle.velocity.y * delta;

        // Slow down
        particle.velocity *= 0.95;

        // Fade out
        let alpha = 1.0 - particle.lifetime.fraction();
        sprite.color = Color::srgba(1.0, 0.9, 0.3, alpha);
    }
}
