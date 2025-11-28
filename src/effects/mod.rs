mod particles;
mod sneeze;

pub use particles::*;
pub use sneeze::*;

use bevy::prelude::*;

pub struct EffectsPlugin;

impl Plugin for EffectsPlugin {
    fn build(&self, app: &mut App) {
        app.add_event::<CollectionEvent>()
            .add_event::<SneezeEvent>()
            .add_systems(
                Update,
                (
                    spawn_collection_particles,
                    update_particles,
                    detect_sneeze_start,
                    handle_sneeze_effects,
                    update_sneeze_animation,
                    update_screen_shake,
                    update_achoo_text,
                    update_scattering_pollen,
                ),
            );
    }
}

#[derive(Event)]
pub struct CollectionEvent {
    pub position: Vec2,
}
