use bevy::prelude::*;

use crate::bee::{AllergyMeter, Bee, CollectedPollen};

#[derive(Component)]
pub struct AllergyMeterBar;

#[derive(Component)]
pub struct AllergyMeterFill;

#[derive(Component)]
pub struct PollenCounter;

#[derive(Component)]
pub struct DangerVignette;

pub fn setup_ui(mut commands: Commands) {
    // Allergy meter background
    commands
        .spawn((
            AllergyMeterBar,
            Node {
                position_type: PositionType::Absolute,
                left: Val::Px(20.0),
                top: Val::Px(20.0),
                width: Val::Px(200.0),
                height: Val::Px(20.0),
                ..default()
            },
            BackgroundColor(Color::srgba(0.2, 0.2, 0.2, 0.8)),
        ))
        .with_children(|parent| {
            // Allergy meter fill
            parent.spawn((
                AllergyMeterFill,
                Node {
                    width: Val::Percent(0.0),
                    height: Val::Percent(100.0),
                    ..default()
                },
                BackgroundColor(Color::srgb(0.8, 0.2, 0.2)),
            ));
        });

    // Pollen counter
    commands.spawn((
        PollenCounter,
        Text::new("Pollen: 0"),
        TextFont {
            font_size: 24.0,
            ..default()
        },
        TextColor(Color::srgb(1.0, 0.9, 0.2)),
        Node {
            position_type: PositionType::Absolute,
            right: Val::Px(20.0),
            top: Val::Px(20.0),
            ..default()
        },
    ));

    // Danger vignette (screen border overlay)
    commands.spawn((
        DangerVignette,
        Node {
            position_type: PositionType::Absolute,
            left: Val::Px(0.0),
            top: Val::Px(0.0),
            width: Val::Percent(100.0),
            height: Val::Percent(100.0),
            border: UiRect::all(Val::Px(20.0)),
            ..default()
        },
        BorderColor(Color::srgba(0.9, 0.1, 0.1, 0.0)),
    ));
}

pub fn update_allergy_meter_display(
    bees: Query<&AllergyMeter, With<Bee>>,
    mut fills: Query<(&mut Node, &mut BackgroundColor), With<AllergyMeterFill>>,
) {
    let Some(meter) = bees.iter().next() else {
        return;
    };

    for (mut node, mut color) in &mut fills {
        let percentage = meter.percentage();
        node.width = Val::Percent(percentage * 100.0);

        // Discrete color bands: green (0-40%), yellow (40-70%), red (70%+)
        let bar_color = if percentage < 0.4 {
            Color::srgb(0.2, 0.8, 0.2) // Green
        } else if percentage < 0.7 {
            Color::srgb(0.9, 0.8, 0.1) // Yellow
        } else {
            Color::srgb(0.9, 0.2, 0.2) // Red
        };
        *color = BackgroundColor(bar_color);
    }
}

/// System to tint bee red at high allergy levels
pub fn update_bee_allergy_tint(mut bees: Query<(&AllergyMeter, &mut Sprite), With<Bee>>) {
    for (meter, mut sprite) in &mut bees {
        let percentage = meter.percentage();

        // Start tinting red above 50% allergy
        if percentage > 0.5 {
            let tint_amount = (percentage - 0.5) * 2.0; // 0.0 to 1.0
                                                        // Blend from yellow (1.0, 0.9, 0.2) toward red (1.0, 0.4, 0.2)
            let g = 0.9 - tint_amount * 0.5;
            sprite.color = Color::srgb(1.0, g, 0.2);
        } else {
            // Normal yellow color
            sprite.color = Color::srgb(1.0, 0.9, 0.2);
        }
    }
}

pub fn update_pollen_counter(
    bees: Query<&CollectedPollen, With<Bee>>,
    mut counter: Query<&mut Text, With<PollenCounter>>,
) {
    let Some(collected) = bees.iter().next() else {
        return;
    };

    for mut text in &mut counter {
        **text = format!("Pollen: {}", collected.count);
    }
}

/// System to update danger vignette opacity based on allergy level
pub fn update_danger_vignette(
    bees: Query<&AllergyMeter, With<Bee>>,
    mut vignettes: Query<&mut BorderColor, With<DangerVignette>>,
) {
    let Some(meter) = bees.iter().next() else {
        return;
    };

    let percentage = meter.percentage();

    for mut border_color in &mut vignettes {
        // Start showing vignette above 60%, fully visible at 100%
        let alpha = if percentage > 0.6 {
            ((percentage - 0.6) / 0.4) * 0.5 // Max alpha 0.5
        } else {
            0.0
        };
        *border_color = BorderColor(Color::srgba(0.9, 0.1, 0.1, alpha));
    }
}
