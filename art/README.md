# Art

The painted characters in `web/art/` are cut from sprite sheets generated on OpenArt (project "Allerbees"), in the
picture-book ink style chosen on 2026-10-22: bold black outlines, flat warm gouache fills, cream paper. The sheets
themselves stay on OpenArt (they are ~5 MB each); this file records how to get them back and how they were made.

`web/js/draw/ink.js` draws a sprite when it has loaded and the procedural drawing otherwise; `?ink` in the URL forces
the procedural drawing, for comparison. Wings, squash, facing, the soothed glow, the "you" sparkle, a forager's honey,
a high-five arm and Sunny's stem and leaves are still drawn procedurally on top of or behind the sprites.

## Sheets

| Sheet | OpenArt history id | Model | Made from |
|---|---|---|---|
| Style candidate A (the reference) | `a9pmHiH3Y9IRN00E59ed` | Nano Banana 2, text to image | prompt only |
| Healer bee: happy, sneezy, resting | `DXi6HEFdlGofiY7Z4IKX` | Nano Banana 2, image to image | candidate A |
| Tank bee: happy, sneezy, resting | `kdSpuelMCp120rVQw9hW` | Nano Banana 2, image to image | the healer sheet |
| Forager bee: happy, sneezy, resting | `2vVQFvH0AjGc3A5iRkjA` | Nano Banana 2, image to image | the healer sheet |
| Sunny: happy, delighted, curious, worried, sleepy | `Rxic3oAC4ORCHoUR9mvu` | Nano Banana 2, image to image | candidate A |

The tank and forager sheets are redraws of the healer sheet with only the costume changed, so all three bees share one
body. (Drawing them straight from candidate A pulled stray flowers and bees from the reference into the sheet.) Bees are
drawn without wings, because the game animates its own. Every prompt ends with "pure flat white background, no
shadows, no other objects, no text", which is what the cutter needs.

## Cutting a sheet

```
python3 -I tools/cut-sprites.py SHEET.png web/art/bee-healer happy sneezy resting --size 360
python3 -I tools/cut-sprites.py SHEET.png web/art/sunny happy delighted curious worried sleepy --size 720
```

Figures are read in rows, left to right, and named in that order. One scale applies to the whole sheet, so a character
keeps its size between poses; `ink.js` relies on that (`BEE_PX`: the happy bee is 360px tall, `SUNNY_PX`: Sunny is
701px), so re-cut at the same `--size` or update those constants.

Costume signals match the HUD's role colours: the tank wears a red bow tie and boater, the healer a teal scarf and a
cap with a honey drop, the forager sky-blue goggles and a satchel.
