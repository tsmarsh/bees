use bevy::prelude::*;

#[derive(Component, Debug, Clone, Reflect)]
#[reflect(Component)]
pub struct Bee {
    pub role: Role,
}

impl Default for Bee {
    fn default() -> Self {
        Self {
            role: Role::Gatherer,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Reflect)]
pub enum Role {
    #[default]
    Gatherer,
    Diva,
    Healer,
}

#[derive(Component, Debug, Clone, Reflect)]
#[reflect(Component)]
pub struct AllergyMeter {
    pub value: f32,
    pub max: f32,
}

impl AllergyMeter {
    pub fn new(max: f32) -> Self {
        Self { value: 0.0, max }
    }

    pub fn percentage(&self) -> f32 {
        self.value / self.max
    }

    pub fn should_sneeze(&self, threshold: f32) -> bool {
        self.value >= threshold
    }
}

impl Default for AllergyMeter {
    fn default() -> Self {
        Self::new(100.0)
    }
}

#[derive(Component, Debug, Clone, Default, Reflect)]
#[reflect(Component)]
pub struct CollectedPollen {
    pub count: u32,
}

impl CollectedPollen {
    pub fn add(&mut self, amount: u32) {
        self.count += amount;
    }

    pub fn drop_percentage(&mut self, percent: f32) -> u32 {
        let dropped = (self.count as f32 * percent).ceil() as u32;
        self.count = self.count.saturating_sub(dropped);
        dropped
    }
}

#[derive(Bundle, Default)]
pub struct BeeBundle {
    pub bee: Bee,
    pub allergy_meter: AllergyMeter,
    pub collected_pollen: CollectedPollen,
    pub transform: Transform,
    pub global_transform: GlobalTransform,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allergy_meter_percentage() {
        let mut meter = AllergyMeter::new(100.0);
        meter.value = 50.0;
        assert!((meter.percentage() - 0.5).abs() < f32::EPSILON);
    }

    #[test]
    fn allergy_meter_should_sneeze() {
        let mut meter = AllergyMeter::new(100.0);
        meter.value = 79.0;
        assert!(!meter.should_sneeze(80.0));

        meter.value = 80.0;
        assert!(meter.should_sneeze(80.0));

        meter.value = 81.0;
        assert!(meter.should_sneeze(80.0));
    }

    #[test]
    fn collected_pollen_drop_percentage() {
        let mut pollen = CollectedPollen { count: 20 };
        let dropped = pollen.drop_percentage(0.25);
        assert_eq!(dropped, 5);
        assert_eq!(pollen.count, 15);
    }

    #[test]
    fn collected_pollen_drop_rounds_up() {
        let mut pollen = CollectedPollen { count: 10 };
        let dropped = pollen.drop_percentage(0.25);
        assert_eq!(dropped, 3); // ceil(2.5) = 3
        assert_eq!(pollen.count, 7);
    }
}
