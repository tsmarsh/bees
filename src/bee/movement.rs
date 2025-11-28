use bevy::prelude::*;
use bevy::window::PrimaryWindow;

use super::Bee;
use crate::game::GameConfig;

#[derive(Component, Debug, Clone, Default, Reflect)]
#[reflect(Component)]
pub struct MoveTarget {
    pub destination: Option<Vec2>,
}

impl MoveTarget {
    pub fn set(&mut self, pos: Vec2) {
        self.destination = Some(pos);
    }

    pub fn clear(&mut self) {
        self.destination = None;
    }
}

pub fn handle_click_input(
    mouse_button: Res<ButtonInput<MouseButton>>,
    touches: Res<Touches>,
    windows: Query<&Window, With<PrimaryWindow>>,
    camera_query: Query<(&Camera, &GlobalTransform)>,
    mut bees: Query<&mut MoveTarget, With<Bee>>,
) {
    let Some(world_pos) =
        get_click_world_position(&mouse_button, &touches, &windows, &camera_query)
    else {
        return;
    };

    for mut target in &mut bees {
        target.set(world_pos);
    }
}

fn get_click_world_position(
    mouse_button: &ButtonInput<MouseButton>,
    touches: &Touches,
    windows: &Query<&Window, With<PrimaryWindow>>,
    camera_query: &Query<(&Camera, &GlobalTransform)>,
) -> Option<Vec2> {
    let Ok(window) = windows.get_single() else {
        return None;
    };

    let Ok((camera, camera_transform)) = camera_query.get_single() else {
        return None;
    };

    // Check for mouse click or touch
    let cursor_pos = if mouse_button.just_pressed(MouseButton::Left) {
        window.cursor_position()
    } else {
        touches
            .iter_just_pressed()
            .next()
            .map(|touch| touch.position())
    };

    cursor_pos.and_then(|pos| camera.viewport_to_world_2d(camera_transform, pos).ok())
}

pub fn move_toward_target(
    mut bees: Query<(&mut Transform, &mut MoveTarget), With<Bee>>,
    config: Res<GameConfig>,
    time: Res<Time>,
) {
    for (mut transform, mut target) in &mut bees {
        let Some(destination) = target.destination else {
            continue;
        };

        let current_pos = transform.translation.truncate();
        let direction = destination - current_pos;
        let distance = direction.length();

        let move_distance = config.movement.bee_speed * time.delta_secs();

        if distance <= move_distance {
            // Arrived at destination
            transform.translation.x = destination.x;
            transform.translation.y = destination.y;
            target.clear();
        } else {
            // Move toward destination
            let normalized = direction.normalize();
            transform.translation.x += normalized.x * move_distance;
            transform.translation.y += normalized.y * move_distance;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn move_target_set_and_clear() {
        let mut target = MoveTarget::default();
        assert!(target.destination.is_none());

        target.set(Vec2::new(100.0, 50.0));
        assert_eq!(target.destination, Some(Vec2::new(100.0, 50.0)));

        target.clear();
        assert!(target.destination.is_none());
    }
}
