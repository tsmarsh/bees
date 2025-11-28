use bevy::prelude::*;

use crate::bee::{AllergyMeter, Bee, CollectedPollen, MoveTarget, SneezeCount, Sneezing};
use crate::flower::Pollen;

#[allow(clippy::type_complexity)]
pub fn reset_game_on_restart(
    mut commands: Commands,
    mut bees: Query<
        (
            Entity,
            &mut Transform,
            &mut AllergyMeter,
            &mut CollectedPollen,
            &mut MoveTarget,
            Option<&mut SneezeCount>,
        ),
        With<Bee>,
    >,
    pollen: Query<Entity, With<Pollen>>,
) {
    // Reset bee state
    for (entity, mut transform, mut meter, mut collected, mut target, sneeze_count) in &mut bees {
        transform.translation = Vec3::new(-200.0, 0.0, 1.0);
        meter.value = 0.0;
        collected.count = 0;
        target.clear();

        if let Some(mut count) = sneeze_count {
            count.count = 0;
        }

        // Remove sneezing state if present
        commands.entity(entity).remove::<Sneezing>();
    }

    // Despawn all pollen
    for entity in &pollen {
        commands.entity(entity).despawn();
    }
}

#[allow(clippy::type_complexity)]
pub fn on_enter_playing(
    mut commands: Commands,
    mut bees: Query<
        (
            Entity,
            &mut Transform,
            &mut AllergyMeter,
            &mut CollectedPollen,
            &mut MoveTarget,
            Option<&mut SneezeCount>,
        ),
        With<Bee>,
    >,
    pollen: Query<Entity, With<Pollen>>,
) {
    // Reset bee state
    for (entity, mut transform, mut meter, mut collected, mut target, sneeze_count) in &mut bees {
        transform.translation = Vec3::new(-200.0, 0.0, 1.0);
        meter.value = 0.0;
        collected.count = 0;
        target.clear();

        if let Some(mut count) = sneeze_count {
            count.count = 0;
        }

        commands.entity(entity).remove::<Sneezing>();
    }

    // Despawn all pollen
    for entity in &pollen {
        commands.entity(entity).despawn();
    }
}
