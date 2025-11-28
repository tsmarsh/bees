use bevy::prelude::*;

use super::{FlowerHead, Pollen, PollenBundle};

const MAX_POLLEN_COUNT: usize = 100;
const POLLEN_SIZE: f32 = 10.0;

pub fn spawn_pollen_from_heads(
    mut commands: Commands,
    mut heads: Query<(&GlobalTransform, &mut FlowerHead)>,
    pollen_query: Query<&Pollen>,
    time: Res<Time>,
) {
    // Check pollen cap
    let current_pollen_count = pollen_query.iter().count();
    if current_pollen_count >= MAX_POLLEN_COUNT {
        return;
    }

    for (global_transform, mut head) in &mut heads {
        head.pollen_drop_timer.tick(time.delta());

        if head.pollen_drop_timer.just_finished() {
            // Spawn pollen at head's world position
            let pos = global_transform.translation();

            commands.spawn((
                PollenBundle {
                    pollen: Pollen::default(),
                    transform: Transform::from_xyz(pos.x, pos.y, 0.5),
                    ..default()
                },
                Sprite {
                    color: Color::srgb(1.0, 0.85, 0.0),
                    custom_size: Some(Vec2::splat(POLLEN_SIZE)),
                    ..default()
                },
            ));
        }
    }
}
