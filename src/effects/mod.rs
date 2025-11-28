mod particles;

pub use particles::*;

use bevy::prelude::*;

pub struct EffectsPlugin;

impl Plugin for EffectsPlugin {
    fn build(&self, app: &mut App) {
        app.add_event::<CollectionEvent>()
            .add_systems(Update, (spawn_collection_particles, update_particles));
    }
}

#[derive(Event)]
pub struct CollectionEvent {
    pub position: Vec2,
}
