mod meters;
mod overlay;

pub use meters::*;
pub use overlay::*;

use bevy::prelude::*;

pub struct UiPlugin;

impl Plugin for UiPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, (setup_ui, setup_overlay))
            .add_systems(
                Update,
                (
                    update_allergy_meter_display,
                    update_pollen_counter,
                    update_overlay_visibility,
                ),
            );
    }
}
