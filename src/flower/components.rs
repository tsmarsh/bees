use bevy::prelude::*;

#[derive(Component, Debug, Clone, Default, Reflect)]
#[reflect(Component)]
pub struct Flower;

#[derive(Component, Debug, Clone, Reflect)]
#[reflect(Component)]
pub struct FlowerHead {
    pub movement_pattern: MovementPattern,
    pub pollen_drop_timer: Timer,
    pub rizz: f32,
}

impl Default for FlowerHead {
    fn default() -> Self {
        Self {
            movement_pattern: MovementPattern::default(),
            pollen_drop_timer: Timer::from_seconds(2.0, TimerMode::Repeating),
            rizz: 0.0,
        }
    }
}

#[derive(Debug, Clone, Reflect)]
pub enum MovementPattern {
    Circular {
        radius: f32,
        speed: f32,
        angle: f32,
    },
    Figure8 {
        width: f32,
        height: f32,
        speed: f32,
        t: f32,
    },
    Sway {
        amplitude: f32,
        speed: f32,
        offset: f32,
    },
}

impl Default for MovementPattern {
    fn default() -> Self {
        Self::Circular {
            radius: 50.0,
            speed: 1.0,
            angle: 0.0,
        }
    }
}

impl MovementPattern {
    pub fn circular(radius: f32, speed: f32) -> Self {
        Self::Circular {
            radius,
            speed,
            angle: 0.0,
        }
    }

    pub fn figure8(width: f32, height: f32, speed: f32) -> Self {
        Self::Figure8 {
            width,
            height,
            speed,
            t: 0.0,
        }
    }

    pub fn sway(amplitude: f32, speed: f32) -> Self {
        Self::Sway {
            amplitude,
            speed,
            offset: 0.0,
        }
    }
}

#[derive(Component, Debug, Clone, Reflect)]
#[reflect(Component)]
pub struct Pollen {
    pub value: u32,
}

impl Default for Pollen {
    fn default() -> Self {
        Self { value: 1 }
    }
}

#[derive(Component, Debug, Clone, Reflect)]
#[reflect(Component)]
pub struct PollenCache {
    pub value: u32,
}

impl Default for PollenCache {
    fn default() -> Self {
        Self { value: 5 }
    }
}

/// Marker for cache spawn points on the stem
#[derive(Component, Debug, Clone)]
pub struct CacheSpawnPoint {
    pub respawn_timer: Timer,
    pub is_active: bool,
    pub value: u32,
}

impl Default for CacheSpawnPoint {
    fn default() -> Self {
        Self {
            respawn_timer: Timer::from_seconds(10.0, TimerMode::Once),
            is_active: true,
            value: 5,
        }
    }
}

#[derive(Bundle, Default)]
pub struct FlowerBundle {
    pub flower: Flower,
    pub transform: Transform,
    pub global_transform: GlobalTransform,
}

#[derive(Bundle, Default)]
pub struct FlowerHeadBundle {
    pub head: FlowerHead,
    pub transform: Transform,
    pub global_transform: GlobalTransform,
}

#[derive(Bundle, Default)]
pub struct PollenBundle {
    pub pollen: Pollen,
    pub transform: Transform,
    pub global_transform: GlobalTransform,
}
