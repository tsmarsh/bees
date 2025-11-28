use bevy::prelude::*;

use super::{AllergyMeter, Bee};
use crate::flower::FlowerHead;
use crate::game::GameConfig;

pub fn update_allergy_from_proximity(
    mut bees: Query<(&Transform, &mut AllergyMeter), With<Bee>>,
    heads: Query<&GlobalTransform, With<FlowerHead>>,
    config: Res<GameConfig>,
    time: Res<Time>,
) {
    let delta = time.delta_secs();

    for (bee_transform, mut meter) in &mut bees {
        let bee_pos = bee_transform.translation.truncate();

        // Find nearest flower head
        let nearest_distance = heads
            .iter()
            .map(|h| bee_pos.distance(h.translation().truncate()))
            .min_by(|a, b| a.partial_cmp(b).unwrap())
            .unwrap_or(f32::MAX);

        if nearest_distance < config.allergy.proximity_threshold {
            // Build up allergy based on proximity
            let proximity_factor = 1.0 - (nearest_distance / config.allergy.proximity_threshold);
            let buildup = config.allergy.proximity_multiplier * proximity_factor * delta;
            meter.value = (meter.value + buildup).min(meter.max);
        } else {
            // Decay allergy when far from flowers
            let decay = config.allergy.base_decay_rate * delta;
            meter.value = (meter.value - decay).max(0.0);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allergy_meter_clamps_to_max() {
        let mut meter = AllergyMeter::new(100.0);
        meter.value = 99.0;

        // Simulate adding more than max
        meter.value = (meter.value + 10.0).min(meter.max);
        assert_eq!(meter.value, 100.0);
    }

    #[test]
    fn allergy_meter_clamps_to_zero() {
        let mut meter = AllergyMeter::new(100.0);
        meter.value = 5.0;

        // Simulate decaying below zero
        meter.value = (meter.value - 10.0).max(0.0);
        assert_eq!(meter.value, 0.0);
    }
}
