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
        .add_plugins((
            GamePlugin,
            BeePlugin,
            FlowerPlugin,
            UiPlugin,
            EffectsPlugin,
            AiPlugin,
        ))
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

    // Player Bee (yellow circle placeholder)
    commands.spawn((
        BeeBundle {
            transform: Transform::from_xyz(-200.0, 0.0, 1.0),
            ..default()
        },
        MoveTarget::default(),
        SneezeCount::default(),
        PlayerBee,
        Sprite {
            color: Color::srgb(1.0, 0.9, 0.2),
            custom_size: Some(Vec2::new(30.0, 30.0)),
            ..default()
        },
    ));

    // AI Diva Companion (purple/pink color)
    commands.spawn((
        AiDivaBundle::default(),
        Sprite {
            color: Color::srgb(0.8, 0.4, 0.7),
            custom_size: Some(Vec2::new(28.0, 28.0)),
            ..default()
        },
        Transform::from_xyz(-150.0, 50.0, 1.0),
    ));

    // AI Healer Companion (green color)
    commands.spawn((
        AiHealerBundle::default(),
        Sprite {
            color: Color::srgb(0.3, 0.8, 0.4),
            custom_size: Some(Vec2::new(26.0, 26.0)),
            ..default()
        },
        Transform::from_xyz(-100.0, -50.0, 1.0),
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

    // Stem caches (larger yellow circles with outline effect)
    let cache_positions = [
        Vec3::new(0.0, 30.0, 1.5), // Lower cache
        Vec3::new(0.0, 60.0, 1.5), // Middle cache
        Vec3::new(0.0, 90.0, 1.5), // Upper cache
    ];

    for pos in cache_positions {
        // Cache outline (slightly larger, darker)
        commands
            .spawn((
                Sprite {
                    color: Color::srgb(0.7, 0.5, 0.0),
                    custom_size: Some(Vec2::splat(26.0)),
                    ..default()
                },
                Transform::from_translation(pos - Vec3::Z * 0.01),
            ))
            .set_parent(flower_entity);

        // Cache fill (bright yellow)
        commands
            .spawn((
                CacheSpawnPoint::default(),
                Sprite {
                    color: Color::srgb(1.0, 0.9, 0.2),
                    custom_size: Some(Vec2::splat(22.0)),
                    ..default()
                },
                Transform::from_translation(pos),
                Visibility::Visible,
            ))
            .set_parent(flower_entity);
    }

    // Flower head 1 - center (circular pattern)
    commands
        .spawn((
            FlowerHeadBundle {
                head: FlowerHead {
                    movement_pattern: MovementPattern::circular(40.0, 1.0),
                    ..default()
                },
                transform: Transform::from_xyz(0.0, 120.0, 2.0),
                ..default()
            },
            Sprite {
                color: Color::srgb(1.0, 0.4, 0.6),
                custom_size: Some(Vec2::new(50.0, 50.0)),
                ..default()
            },
        ))
        .set_parent(flower_entity);

    // Flower head 2 - left (sway pattern)
    commands
        .spawn((
            FlowerHeadBundle {
                head: FlowerHead {
                    movement_pattern: MovementPattern::sway(30.0, 1.5),
                    ..default()
                },
                transform: Transform::from_xyz(-60.0, 100.0, 2.0),
                ..default()
            },
            Sprite {
                color: Color::srgb(0.9, 0.5, 0.7),
                custom_size: Some(Vec2::new(40.0, 40.0)),
                ..default()
            },
        ))
        .set_parent(flower_entity);

    // Flower head 3 - right (figure8 pattern)
    commands
        .spawn((
            FlowerHeadBundle {
                head: FlowerHead {
                    movement_pattern: MovementPattern::figure8(35.0, 25.0, 0.8),
                    ..default()
                },
                transform: Transform::from_xyz(60.0, 100.0, 2.0),
                ..default()
            },
            Sprite {
                color: Color::srgb(1.0, 0.6, 0.5),
                custom_size: Some(Vec2::new(45.0, 45.0)),
                ..default()
            },
        ))
        .set_parent(flower_entity);
}
