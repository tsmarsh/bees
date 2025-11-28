use bevy::prelude::*;

use crate::bee::{AllergyMeter, Bee, CollectedPollen};

#[derive(Component)]
pub struct AllergyMeterBar;

#[derive(Component)]
pub struct AllergyMeterFill;

#[derive(Component)]
pub struct PollenCounter;

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

        let r = 0.2 + percentage * 0.6;
        let g = 0.8 - percentage * 0.6;
        *color = BackgroundColor(Color::srgb(r, g, 0.2));
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
