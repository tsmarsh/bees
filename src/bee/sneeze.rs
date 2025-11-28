use bevy::prelude::*;

use super::{AllergyMeter, Bee, CollectedPollen, MoveTarget};
use crate::flower::PollenBundle;
use crate::game::GameConfig;

#[derive(Component, Debug)]
pub struct Sneezing {
    pub timer: Timer,
}

impl Default for Sneezing {
    fn default() -> Self {
        Self {
            timer: Timer::from_seconds(0.5, TimerMode::Once),
        }
    }
}

#[derive(Component, Debug, Default)]
pub struct SneezeCount {
    pub count: u32,
}

#[allow(clippy::type_complexity)]
pub fn trigger_sneeze(
    mut commands: Commands,
    mut bees: Query<
        (
            Entity,
            &Transform,
            &mut AllergyMeter,
            &mut CollectedPollen,
            Option<&mut SneezeCount>,
        ),
        (With<Bee>, Without<Sneezing>),
    >,
    config: Res<GameConfig>,
) {
    for (entity, transform, mut meter, mut collected, sneeze_count) in &mut bees {
        if meter.should_sneeze(config.sneeze.threshold) {
            // Drop pollen
            let dropped_count = collected.drop_percentage(config.sneeze.drop_percent);

            // Spawn dropped pollen around the bee
            let bee_pos = transform.translation.truncate();
            for i in 0..dropped_count {
                let angle = (i as f32 / dropped_count as f32) * std::f32::consts::TAU;
                let offset = Vec2::new(angle.cos(), angle.sin()) * 30.0;
                let pos = bee_pos + offset;

                commands.spawn((
                    PollenBundle {
                        transform: Transform::from_xyz(pos.x, pos.y, 0.5),
                        ..default()
                    },
                    Sprite {
                        color: Color::srgb(1.0, 0.85, 0.0),
                        custom_size: Some(Vec2::splat(10.0)),
                        ..default()
                    },
                ));
            }

            // Reset meter
            meter.value = config.sneeze.post_sneeze_value;

            // Add sneezing state (stagger)
            commands.entity(entity).insert(Sneezing::default());

            // Increment sneeze count
            if let Some(mut count) = sneeze_count {
                count.count += 1;
            }
        }
    }
}

pub fn update_sneezing(
    mut commands: Commands,
    mut bees: Query<(Entity, &mut Sneezing, &mut MoveTarget), With<Bee>>,
    time: Res<Time>,
) {
    for (entity, mut sneezing, mut target) in &mut bees {
        // Clear movement target during sneeze
        target.clear();

        sneezing.timer.tick(time.delta());

        if sneezing.timer.finished() {
            commands.entity(entity).remove::<Sneezing>();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sneezing_timer_defaults_to_half_second() {
        let sneezing = Sneezing::default();
        assert!((sneezing.timer.duration().as_secs_f32() - 0.5).abs() < 0.01);
    }
}
