use bevy::prelude::*;

use super::{Bee, CollectedPollen};
use crate::effects::CollectionEvent;
use crate::flower::{CacheSpawnPoint, Pollen, TickleEvent};

const COLLECTION_RADIUS: f32 = 25.0;
const CACHE_COLLECTION_RADIUS: f32 = 30.0;

pub fn collect_pollen(
    mut commands: Commands,
    mut bees: Query<(&Transform, &mut CollectedPollen), With<Bee>>,
    pollen: Query<(Entity, &Transform, &Pollen)>,
    mut collection_events: EventWriter<CollectionEvent>,
) {
    for (bee_transform, mut collected) in &mut bees {
        let bee_pos = bee_transform.translation.truncate();

        for (pollen_entity, pollen_transform, pollen) in &pollen {
            let pollen_pos = pollen_transform.translation.truncate();
            let distance = bee_pos.distance(pollen_pos);

            if distance <= COLLECTION_RADIUS {
                collected.add(pollen.value);
                commands.entity(pollen_entity).despawn();

                // Send collection event for effects
                collection_events.send(CollectionEvent {
                    position: pollen_pos,
                });
            }
        }
    }
}

/// Collect from stem caches (larger radius, triggers respawn timer and tickle)
pub fn collect_caches(
    mut bees: Query<(&Transform, &mut CollectedPollen), With<Bee>>,
    mut caches: Query<(&GlobalTransform, &mut CacheSpawnPoint, &mut Visibility)>,
    mut collection_events: EventWriter<CollectionEvent>,
    mut tickle_events: EventWriter<TickleEvent>,
) {
    for (bee_transform, mut collected) in &mut bees {
        let bee_pos = bee_transform.translation.truncate();

        for (cache_transform, mut cache, mut visibility) in &mut caches {
            if !cache.is_active {
                continue;
            }

            let cache_pos = cache_transform.translation().truncate();
            let distance = bee_pos.distance(cache_pos);

            if distance <= CACHE_COLLECTION_RADIUS {
                collected.add(cache.value);
                cache.is_active = false;
                cache.respawn_timer.reset();
                *visibility = Visibility::Hidden;

                // Send collection event for effect particles
                collection_events.send(CollectionEvent {
                    position: cache_pos,
                });

                // Send tickle event - alerts nearby flower heads!
                tickle_events.send(TickleEvent {
                    cache_position: cache_pos,
                });
            }
        }
    }
}
