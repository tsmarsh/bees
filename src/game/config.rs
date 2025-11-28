use bevy::prelude::*;

#[derive(Resource, Default)]
pub struct GameConfig {
    pub allergy: AllergyConfig,
    pub sneeze: SneezeConfig,
    pub pollen: PollenConfig,
    pub movement: MovementConfig,
}

#[derive(Clone)]
pub struct AllergyConfig {
    pub max_value: f32,
    pub base_decay_rate: f32,
    pub proximity_multiplier: f32,
    pub proximity_threshold: f32,
}

impl Default for AllergyConfig {
    fn default() -> Self {
        Self {
            max_value: 100.0,
            base_decay_rate: 5.0,
            proximity_multiplier: 100.0,
            proximity_threshold: 200.0,
        }
    }
}

#[derive(Clone)]
pub struct SneezeConfig {
    pub threshold: f32,
    pub drop_percent: f32,
    pub post_sneeze_value: f32,
}

impl Default for SneezeConfig {
    fn default() -> Self {
        Self {
            threshold: 80.0,
            drop_percent: 0.25,
            post_sneeze_value: 20.0,
        }
    }
}

#[derive(Clone)]
pub struct PollenConfig {
    pub base_value: u32,
    pub cache_value: u32,
    pub win_threshold: u32,
}

impl Default for PollenConfig {
    fn default() -> Self {
        Self {
            base_value: 1,
            cache_value: 5,
            win_threshold: 50,
        }
    }
}

#[derive(Clone)]
pub struct MovementConfig {
    pub bee_speed: f32,
    pub flower_head_speed: f32,
}

impl Default for MovementConfig {
    fn default() -> Self {
        Self {
            bee_speed: 150.0,
            flower_head_speed: 50.0,
        }
    }
}
