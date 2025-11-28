use allerbees::prelude::*;
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
        .add_plugins((GamePlugin, BeePlugin, FlowerPlugin))
        .insert_resource(ClearColor(Color::srgb(0.4, 0.6, 0.4)))
        .add_systems(Startup, setup_scene)
        .run();
}

fn setup_scene(mut commands: Commands) {
    // 2D Camera
    commands.spawn(Camera2d);

    // Play area background
    commands.spawn((
        Sprite {
            color: Color::srgb(0.3, 0.5, 0.3),
            custom_size: Some(Vec2::new(700.0, 500.0)),
            ..default()
        },
        Transform::from_xyz(0.0, 0.0, 0.0),
    ));

    // Bee (yellow circle placeholder)
    commands.spawn((
        BeeBundle {
            transform: Transform::from_xyz(-200.0, 0.0, 1.0),
            ..default()
        },
        Sprite {
            color: Color::srgb(1.0, 0.9, 0.2),
            custom_size: Some(Vec2::new(30.0, 30.0)),
            ..default()
        },
    ));

    // Flower stem (green rectangle)
    let flower_entity = commands
        .spawn((
            FlowerBundle {
                transform: Transform::from_xyz(150.0, -100.0, 1.0),
                ..default()
            },
            Sprite {
                color: Color::srgb(0.2, 0.6, 0.2),
                custom_size: Some(Vec2::new(10.0, 200.0)),
                ..default()
            },
        ))
        .id();

    // Flower head (pink circle placeholder)
    commands
        .spawn((
            FlowerHeadBundle {
                transform: Transform::from_xyz(0.0, 120.0, 2.0),
                ..default()
            },
            Sprite {
                color: Color::srgb(1.0, 0.4, 0.6),
                custom_size: Some(Vec2::new(60.0, 60.0)),
                ..default()
            },
        ))
        .set_parent(flower_entity);
}
