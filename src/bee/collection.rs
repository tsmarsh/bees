use bevy::prelude::*;

use super::{Bee, CollectedPollen};
use crate::effects::CollectionEvent;
use crate::flower::Pollen;

const COLLECTION_RADIUS: f32 = 25.0;

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
