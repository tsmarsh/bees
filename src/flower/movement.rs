use bevy::prelude::*;

use super::{FlowerHead, MovementPattern};

pub fn update_flower_head_movement(
    mut heads: Query<(&mut Transform, &mut FlowerHead)>,
    time: Res<Time>,
) {
    for (mut transform, mut head) in &mut heads {
        let delta = time.delta_secs();
        let offset = calculate_pattern_offset(&mut head.movement_pattern, delta);

        // Apply offset relative to local position (head is parented to flower stem)
        transform.translation.x = offset.x;
        transform.translation.y = offset.y;
    }
}

fn calculate_pattern_offset(pattern: &mut MovementPattern, delta: f32) -> Vec2 {
    match pattern {
        MovementPattern::Circular {
            radius,
            speed,
            angle,
        } => {
            *angle += *speed * delta;
            if *angle > std::f32::consts::TAU {
                *angle -= std::f32::consts::TAU;
            }
            Vec2::new(angle.cos() * *radius, angle.sin() * *radius + 120.0)
        }
        MovementPattern::Figure8 {
            width,
            height,
            speed,
            t,
        } => {
            *t += *speed * delta;
            if *t > std::f32::consts::TAU {
                *t -= std::f32::consts::TAU;
            }
            // Lissajous curve for figure-8
            Vec2::new(t.sin() * *width, (2.0 * *t).sin() * *height + 120.0)
        }
        MovementPattern::Sway {
            amplitude,
            speed,
            offset,
        } => {
            *offset += *speed * delta;
            if *offset > std::f32::consts::TAU {
                *offset -= std::f32::consts::TAU;
            }
            Vec2::new(offset.sin() * *amplitude, 120.0)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn circular_pattern_produces_expected_range() {
        let mut pattern = MovementPattern::Circular {
            radius: 50.0,
            speed: 1.0,
            angle: 0.0,
        };

        // At angle 0, should be at (radius, base_height)
        let offset = calculate_pattern_offset(&mut pattern, 0.0);
        assert!((offset.x - 50.0).abs() < 0.01);
        assert!((offset.y - 120.0).abs() < 0.01);
    }

    #[test]
    fn sway_pattern_oscillates_horizontally() {
        let mut pattern = MovementPattern::Sway {
            amplitude: 30.0,
            speed: 1.0,
            offset: 0.0,
        };

        let offset1 = calculate_pattern_offset(&mut pattern, 0.0);
        assert!((offset1.x).abs() < 0.01); // sin(0) = 0

        // Move forward in time to get positive x
        let offset2 = calculate_pattern_offset(&mut pattern, std::f32::consts::FRAC_PI_2);
        assert!(offset2.x > 0.0); // sin(pi/2) = 1
    }
}
