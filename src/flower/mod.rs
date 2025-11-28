mod components;

pub use components::*;

use bevy::prelude::*;

pub struct FlowerPlugin;

impl Plugin for FlowerPlugin {
    fn build(&self, app: &mut App) {
        app.register_type::<Flower>()
            .register_type::<FlowerHead>()
            .register_type::<MovementPattern>()
            .register_type::<Pollen>()
            .register_type::<PollenCache>();
    }
}
