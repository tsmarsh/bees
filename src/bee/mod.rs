mod components;

pub use components::*;

use bevy::prelude::*;

pub struct BeePlugin;

impl Plugin for BeePlugin {
    fn build(&self, app: &mut App) {
        app.register_type::<Bee>()
            .register_type::<Role>()
            .register_type::<AllergyMeter>()
            .register_type::<CollectedPollen>();
    }
}
