use bevy::prelude::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "Allerbees".to_string(),
                resolution: (800., 600.).into(),
                canvas: Some("#bevy-canvas".to_string()),
                prevent_default_event_handling: false,
                ..default()
            }),
            ..default()
        }))
        .insert_resource(ClearColor(Color::srgb(0.4, 0.6, 0.4)))
        .run();
}
