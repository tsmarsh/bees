use bevy::prelude::*;

use crate::game::GameState;

#[derive(Component)]
pub struct GameOverlay;

#[derive(Component)]
pub struct OverlayText;

pub fn setup_overlay(mut commands: Commands) {
    commands
        .spawn((
            GameOverlay,
            Node {
                position_type: PositionType::Absolute,
                width: Val::Percent(100.0),
                height: Val::Percent(100.0),
                justify_content: JustifyContent::Center,
                align_items: AlignItems::Center,
                ..default()
            },
            BackgroundColor(Color::srgba(0.0, 0.0, 0.0, 0.7)),
            Visibility::Hidden,
        ))
        .with_children(|parent| {
            parent.spawn((
                OverlayText,
                Text::new(""),
                TextFont {
                    font_size: 48.0,
                    ..default()
                },
                TextColor(Color::WHITE),
            ));
        });
}

pub fn update_overlay_visibility(
    state: Res<State<GameState>>,
    mut overlay: Query<&mut Visibility, With<GameOverlay>>,
    mut text: Query<&mut Text, With<OverlayText>>,
) {
    let Ok(mut visibility) = overlay.get_single_mut() else {
        return;
    };

    let Ok(mut text) = text.get_single_mut() else {
        return;
    };

    match state.get() {
        GameState::Playing => {
            *visibility = Visibility::Hidden;
        }
        GameState::Won => {
            *visibility = Visibility::Visible;
            **text = "You Win!\n\nClick to restart".to_string();
        }
        GameState::Lost => {
            *visibility = Visibility::Visible;
            **text = "Game Over!\n\nClick to restart".to_string();
        }
    }
}
