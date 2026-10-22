// The cartoon kit every view draws with: bold ink lines, flat fills, a little paper grain.
// Placeholder art with a point of view: round rubber-hose bees and one very affectionate sunflower.

export const INK = "#221c16";
export const PAPER = "#f3e7cf";
export const CARD = "#fbf4e4";
export const HONEY = "#f0b53a";
export const HONEY_DEEP = "#d98f1c";
export const TOMATO = "#d9573b";
export const TEAL = "#3f8f8a";
export const LEAF = "#6c9a3d";
export const LEAF_DEEP = "#4f7a2a";
export const PETAL = "#f4b322";
export const PETAL_DEEP = "#e08a12";
export const DISC = "#6b4224";
export const BLUSH = "#ef8f84";
export const SKY = "#cfe3e6";
export const POLLEN = "#f6d24a";

export const ROLE_COLOURS = { 0: TOMATO, 1: TEAL, 2: HONEY_DEEP };

// ---------------------------------------------------------------------------------------------------------------
// Painted sprites (web/art, cut from OpenArt sheets by tools/cut-sprites.py; see art/README.md). Until one has
// loaded, or with ?ink in the URL, everything below falls back to the procedural drawing.
const ROLE_NAMES = { 0: "tank", 1: "healer", 2: "forager" };
const SUNNY_MOODS = ["happy", "delighted", "curious", "worried", "sleepy"];
const art = {};
// Sprites in a sheet share one pixel scale: the happy bee is 360px tall and Sunny 701px, matched to r and R.
const BEE_PX = 3.3 / 360;
const SUNNY_PX = 3.3 / 701;

function loadArt() {
  if (typeof Image === "undefined" || new URLSearchParams(location.search).has("ink")) return;
  const names = SUNNY_MOODS.map((m) => `sunny-${m}`);
  for (const role of Object.values(ROLE_NAMES)) for (const s of ["happy", "sneezy", "resting"]) names.push(`bee-${role}-${s}`);
  for (const name of names) {
    const img = new Image();
    img.src = new URL(`../../art/${name}.webp`, import.meta.url).href;
    img.decode().then(() => { art[name] = img; }, () => {});
  }
}
loadArt();

function sprite(ctx, img, k) {
  const w = img.width * k, h = img.height * k;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
}

let grain = null;
function grainPattern(ctx) {
  if (grain) return grain;
  const c = document.createElement("canvas");
  c.width = c.height = 160;
  const g = c.getContext("2d");
  const img = g.createImageData(160, 160);
  let seed = 7;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const v = seed % 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v < 128 ? 60 : 255;
    img.data[i + 3] = (seed >> 8) % 22;
  }
  g.putImageData(img, 0, 0);
  grain = ctx.createPattern(c, "repeat");
  return grain;
}

// A fresh sheet: the paper colour, then grain and a soft vignette over whatever was drawn (call `finishPaper` last).
export function paper(ctx, w, h, colour = PAPER) {
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, w, h);
}

export function finishPaper(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = grainPattern(ctx);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, "rgba(80,50,20,0)");
  v.addColorStop(1, "rgba(80,50,20,0.18)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

export function lineWidthFor(r) { return Math.max(2, r * 0.13); }

export function inked(ctx, fill, lw, draw) {
  ctx.beginPath();
  draw();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(); }
}

export function circle(ctx, x, y, r, fill, lw = lineWidthFor(r)) {
  inked(ctx, fill, lw, () => ctx.arc(x, y, r, 0, Math.PI * 2));
}

export function ellipse(ctx, x, y, rx, ry, rot, fill, lw) {
  inked(ctx, fill, lw, () => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2));
}

// A heart for affection, drawn around (x, y) with radius r.
export function heart(ctx, x, y, r, fill = TOMATO, lw = Math.max(1.5, r * 0.18)) {
  inked(ctx, fill, lw, () => {
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.45);
    ctx.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
    ctx.closePath();
  });
}

export function nectarDrop(ctx, x, y, r, rich = false) {
  const fill = rich ? "#ffcf4a" : HONEY;
  inked(ctx, fill, Math.max(1.5, r * 0.22), () => {
    ctx.moveTo(x, y - r * 1.5);
    ctx.bezierCurveTo(x + r * 0.2, y - r * 0.9, x + r, y - r * 0.2, x + r, y + r * 0.25);
    ctx.arc(x, y + r * 0.25, r, 0, Math.PI);
    ctx.bezierCurveTo(x - r, y - r * 0.2, x - r * 0.2, y - r * 0.9, x, y - r * 1.5);
  });
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y + r * 0.05, r * 0.18, r * 0.32, -0.4, 0, Math.PI * 2);
  ctx.fill();
  if (rich) sparkle(ctx, x + r * 1.1, y - r * 1.1, r * 0.55);
}

export function sparkle(ctx, x, y, r, fill = "#fff6c8") {
  inked(ctx, fill, Math.max(1, r * 0.2), () => {
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const b = a + Math.PI / 4;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.lineTo(x + Math.cos(b) * r * 0.35, y + Math.sin(b) * r * 0.35);
    }
    ctx.closePath();
  });
}

// A pollen puff: a fuzzy yellow cloud with a few specks.
export function pollenPuff(ctx, x, y, r, t = 0, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const lobes = 7;
  inked(ctx, POLLEN, Math.max(1.5, r * 0.08), () => {
    for (let i = 0; i <= lobes; i++) {
      const a = (i / lobes) * Math.PI * 2 + t * 0.4;
      const rr = r * (0.82 + 0.1 * Math.sin(i * 2.3 + t * 2));
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else {
        const am = a - Math.PI / lobes;
        ctx.quadraticCurveTo(x + Math.cos(am) * r * 1.25, y + Math.sin(am) * r * 1.25, px, py);
      }
    }
    ctx.closePath();
  });
  ctx.fillStyle = "rgba(160,110,10,0.55)";
  for (let i = 0; i < 6; i++) {
    const a = i * 1.7 + t * 0.3;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.5, y + Math.sin(a * 1.3) * r * 0.45, Math.max(1, r * 0.07), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------------------------
// A bee. opts: role (0 tank, 1 healer, 2 forager), t (seconds, for wings and wobble), facing (1 right, -1 left),
// squash (-0.3..0.3), sneezy (0..1), soothed (bool), resting (bool), load (0..1 satchel), wave (0..1 arm up),
// look ({x, y} pupils), you (bool: a little star over the player's own bee), alpha.
export function bee(ctx, x, y, r, opts = {}) {
  const { role = 2, t = 0, facing = 1, squash = 0, sneezy = 0, soothed = false, resting = false,
    load = 0, wave = 0, look = { x: 0.3, y: 0 }, you = false, alpha = 1, mouth = "smile" } = opts;
  const lw = lineWidthFor(r);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(facing * (1 + squash), 1 - squash);

  if (soothed) {
    const g = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2);
    g.addColorStop(0, "rgba(255,206,90,0.55)");
    g.addColorStop(1, "rgba(255,206,90,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // wings, behind (a painted bee's head is bigger, so its wings sit further back, over the stripes)
  const painted = art[`bee-${ROLE_NAMES[role]}-happy`];
  const wx = painted ? -r * 0.4 : 0;
  const flap = resting ? 0.2 : Math.sin(t * 38) * 0.5 + 0.5;
  ctx.save();
  ctx.globalAlpha *= 0.85;
  ellipse(ctx, wx - r * 0.25, -r * 0.95, r * 0.55, r * (0.28 + 0.32 * flap), -0.5, "rgba(255,255,255,0.85)", lw * 0.7);
  ellipse(ctx, wx + r * 0.15, -r * 1.05, r * 0.5, r * (0.25 + 0.3 * flap), 0.35, "rgba(255,255,255,0.85)", lw * 0.7);
  ctx.restore();

  if (painted) paintedBee(ctx, r, lw, painted, { role, t, sneezy, resting, load, wave });
  else inkBee(ctx, r, lw, { role, t, sneezy, resting, load, wave, look, mouth });

  ctx.restore();

  if (resting) {
    ctx.save();
    ctx.globalAlpha = alpha * (0.6 + 0.4 * Math.sin(t * 2));
    ctx.fillStyle = INK;
    ctx.font = `700 ${Math.round(r * 0.7)}px Fraunces, Georgia, serif`;
    ctx.fillText("z", x + r * 0.9, y - r * 1.3 - Math.sin(t * 2) * r * 0.2);
    ctx.font = `700 ${Math.round(r * 0.5)}px Fraunces, Georgia, serif`;
    ctx.fillText("z", x + r * 1.35, y - r * 1.8 - Math.sin(t * 2 + 1) * r * 0.2);
    ctx.restore();
  }
  if (you) {
    sparkle(ctx, x, y - r * 2.0 - Math.sin(t * 3) * r * 0.1, r * 0.35, "#fff1a8");
  }
}

// The procedural bee under the wings: legs, arms, satchel, body, face and role props, in the bee's own frame.
function inkBee(ctx, r, lw, { role, t, sneezy, resting, load, wave, look, mouth }) {
  // legs and rubber-hose arms
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  const kick = Math.sin(t * 6) * r * 0.12;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, r * 0.85); ctx.quadraticCurveTo(-r * 0.4, r * 1.25, -r * 0.55 + kick, r * 1.35);
  ctx.moveTo(r * 0.25, r * 0.88); ctx.quadraticCurveTo(r * 0.25, r * 1.25, r * 0.4 - kick, r * 1.38);
  ctx.stroke();
  const armUp = wave * r * 1.2;
  ctx.beginPath();
  ctx.moveTo(r * 0.55, r * 0.15);
  ctx.quadraticCurveTo(r * 1.15, r * 0.25 - armUp * 0.5, r * 1.25, r * 0.45 - armUp);
  ctx.moveTo(-r * 0.7, r * 0.2);
  ctx.quadraticCurveTo(-r * 1.15, r * 0.45, -r * 1.05 + kick, r * 0.75);
  ctx.stroke();
  circle(ctx, r * 1.25, r * 0.45 - armUp, r * 0.2, "#fff", lw * 0.8);
  circle(ctx, -r * 1.05 + kick, r * 0.75, r * 0.2, "#fff", lw * 0.8);

  // satchel for foragers, behind the body
  if (role === 2) {
    const s = 0.35 + 0.35 * load;
    ctx.save();
    inked(ctx, "#a8683a", lw * 0.8, () => ctx.roundRect(-r * 1.05 - r * s * 0.4, r * 0.05, r * s * 1.1, r * s * 1.1, r * 0.15));
    if (load > 0.05) {
      ctx.fillStyle = HONEY;
      ctx.beginPath();
      ctx.ellipse(-r * 1.05 + r * s * 0.15, r * 0.08, r * s * 0.4, r * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // body
  const bodyFill = sneezy > 0.01 ? mix("#f2b62c", "#f08a6a", Math.min(1, sneezy) * 0.45) : "#f2b62c";
  ellipse(ctx, 0, 0, r * 1.12, r, 0, bodyFill, lw);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.12 - lw / 2, r - lw / 2, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = INK;
  ctx.fillRect(-r * 0.55, -r, r * 0.28, r * 2);
  ctx.fillRect(-r * 0.05, -r, r * 0.26, r * 2);
  ctx.restore();
  // stinger, rounded and harmless
  inked(ctx, INK, 0, () => { ctx.moveTo(-r * 1.08, -r * 0.1); ctx.lineTo(-r * 1.4, r * 0.02); ctx.lineTo(-r * 1.08, r * 0.14); });

  // antennae
  const wob = Math.sin(t * 5) * r * 0.08;
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.moveTo(r * 0.55, -r * 0.75); ctx.quadraticCurveTo(r * 0.6, -r * 1.35, r * 0.95 + wob, -r * 1.45);
  ctx.moveTo(r * 0.75, -r * 0.65); ctx.quadraticCurveTo(r * 1.0, -r * 1.15, r * 1.3 + wob, -r * 1.2);
  ctx.stroke();
  circle(ctx, r * 0.95 + wob, -r * 1.45, r * 0.11, INK, 0);
  circle(ctx, r * 1.3 + wob, -r * 1.2, r * 0.11, INK, 0);

  // face
  const fx = r * 0.55;
  const eyeR = r * 0.24;
  if (resting) {
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.arc(fx - r * 0.05, -r * 0.18, eyeR * 0.8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.arc(fx + r * 0.4, -r * 0.2, eyeR * 0.7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (sneezy > 0.75) {
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(fx - r * 0.2, -r * 0.3); ctx.lineTo(fx + r * 0.05, -r * 0.18); ctx.lineTo(fx - r * 0.2, -r * 0.08);
    ctx.moveTo(fx + r * 0.5, -r * 0.32); ctx.lineTo(fx + r * 0.28, -r * 0.2); ctx.lineTo(fx + r * 0.5, -r * 0.1);
    ctx.stroke();
  } else {
    ellipse(ctx, fx - r * 0.05, -r * 0.2, eyeR * 0.8, eyeR, 0, "#fff", lw * 0.7);
    ellipse(ctx, fx + r * 0.4, -r * 0.22, eyeR * 0.72, eyeR * 0.92, 0, "#fff", lw * 0.7);
    const lx = look.x * eyeR * 0.35;
    const ly = look.y * eyeR * 0.35;
    pieEye(ctx, fx - r * 0.02 + lx, -r * 0.17 + ly, eyeR * 0.5);
    pieEye(ctx, fx + r * 0.42 + lx, -r * 0.19 + ly, eyeR * 0.46);
  }
  // cheeks and nose
  ctx.fillStyle = sneezy > 0.4 ? "rgba(214,70,50,0.75)" : "rgba(239,143,132,0.75)";
  ctx.beginPath();
  ctx.ellipse(fx + r * 0.1, r * 0.17, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  if (sneezy > 0.5) circle(ctx, fx + r * 0.62, r * 0.0, r * 0.12, TOMATO, lw * 0.6);
  // mouth
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  if (mouth === "o" || sneezy > 0.9) ctx.ellipse(fx + r * 0.25, r * 0.28, r * 0.1, r * 0.13, 0, 0, Math.PI * 2);
  else if (mouth === "grin") { ctx.arc(fx + r * 0.22, r * 0.12, r * 0.22, 0.1 * Math.PI, 0.9 * Math.PI); ctx.closePath(); ctx.fillStyle = "#7a2a1e"; ctx.fill(); }
  else ctx.arc(fx + r * 0.22, r * 0.14, r * 0.17, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // role props
  if (role === 0) {
    // the performer: a bow tie and a tiny boater
    inked(ctx, TOMATO, lw * 0.7, () => {
      ctx.moveTo(r * 0.55, r * 0.62); ctx.lineTo(r * 0.3, r * 0.45); ctx.lineTo(r * 0.3, r * 0.8); ctx.closePath();
      ctx.moveTo(r * 0.55, r * 0.62); ctx.lineTo(r * 0.8, r * 0.45); ctx.lineTo(r * 0.8, r * 0.8); ctx.closePath();
    });
    inked(ctx, "#f6e2a8", lw * 0.8, () => ctx.ellipse(r * 0.15, -r * 0.92, r * 0.62, r * 0.13, -0.15, 0, Math.PI * 2));
    inked(ctx, "#f6e2a8", lw * 0.8, () => ctx.roundRect(-r * 0.2, -r * 1.3, r * 0.68, r * 0.38, r * 0.06));
    ctx.fillStyle = TOMATO;
    ctx.fillRect(-r * 0.2 + lw / 2, -r * 1.02, r * 0.68 - lw, r * 0.1);
  } else if (role === 1) {
    // the healer: a teal scarf and a honey-drop cap
    inked(ctx, TEAL, lw * 0.7, () => {
      ctx.moveTo(r * 0.05, r * 0.55); ctx.quadraticCurveTo(r * 0.5, r * 0.85, r * 0.95, r * 0.45);
      ctx.lineTo(r * 0.95, r * 0.65); ctx.quadraticCurveTo(r * 0.5, r * 1.05, r * 0.0, r * 0.75); ctx.closePath();
    });
    inked(ctx, "#fff", lw * 0.8, () => ctx.ellipse(r * 0.2, -r * 0.9, r * 0.55, r * 0.26, -0.1, Math.PI, 0));
    nectarDropSmall(ctx, r * 0.2, -r * 1.02, r * 0.11);
  } else {
    // the forager: goggles pushed up
    circle(ctx, r * 0.1, -r * 0.82, r * 0.17, SKY, lw * 0.7);
    circle(ctx, r * 0.48, -r * 0.82, r * 0.17, SKY, lw * 0.7);
  }

}

// The painted bee: the role's sprite, cross-faded to its sneezy pose as allergy rises, or resting. Arms only appear
// for a wave (the high-five), and a forager's satchel shows its load as a drop of honey.
function paintedBee(ctx, r, lw, happy, { role, t, sneezy, resting, load, wave }) {
  const k = r * BEE_PX;
  const name = ROLE_NAMES[role];
  if (resting && art[`bee-${name}-resting`]) {
    sprite(ctx, art[`bee-${name}-resting`], k);
    return;
  }
  sprite(ctx, happy, k);
  const fade = Math.min(1, Math.max(0, (sneezy - 0.2) / 0.5));
  if (fade > 0 && art[`bee-${name}-sneezy`]) {
    ctx.save();
    ctx.globalAlpha *= fade;
    sprite(ctx, art[`bee-${name}-sneezy`], k);
    ctx.restore();
  }
  if (role === 2 && load > 0.05) nectarDrop(ctx, -r * 0.5, r * 0.62 - r * 0.1 * load, r * (0.12 + 0.12 * load), load > 0.95);
  if (wave > 0) {
    const armUp = wave * r * 1.2;
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(r * 0.3, r * 0.75);
    ctx.quadraticCurveTo(r * 1.5, r * 0.85, r * 1.4, r * 0.45 - armUp);
    ctx.stroke();
    circle(ctx, r * 1.4, r * 0.45 - armUp, r * 0.2, "#fff", lw * 0.8);
  }
}

function nectarDropSmall(ctx, x, y, r) {
  ctx.fillStyle = HONEY;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.4);
  ctx.quadraticCurveTo(x + r, y, x, y + r);
  ctx.quadraticCurveTo(x - r, y, x, y - r * 1.4);
  ctx.fill();
}

// The 1930s pie-cut pupil: black with a wedge of light.
function pieEye(ctx, x, y, r) {
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.8, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r * 0.75, -Math.PI * 0.62, -Math.PI * 0.38);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------------------------------------------
// Sunny. (x, y) is the centre of her face; R its radius. opts: t, lean (-1..1, rotates the head toward the foragers),
// delight (0..1), look ({x, y}), mood ("happy" | "curious" | "worried" | "sleepy" | "bubbly"), stem (length below),
// blink (bool), hug (0..1 petals curl in), sneeze (0..1 a puff of pollen from her centre), noStem.
export function sunflower(ctx, x, y, R, opts = {}) {
  const { t = 0, lean = 0, delight = 0, look = { x: 0, y: 0.2 }, mood = "happy", stem = R * 3, blink = false, hug = 0, noStem = false, leaves = true } = opts;
  const lw = Math.max(2.5, R * 0.06);
  ctx.save();
  if (!noStem) {
    // stem with two leaves, swaying
    const sway = Math.sin(t * 0.9) * R * 0.08 + lean * R * 0.3;
    inked(ctx, null, 0, () => {});
    ctx.lineCap = "round";
    ctx.strokeStyle = INK;
    ctx.lineWidth = R * 0.26 + lw * 2;
    ctx.beginPath();
    ctx.moveTo(x, y + stem);
    ctx.quadraticCurveTo(x - sway * 0.4, y + stem * 0.5, x + sway * 0.2, y + R * 0.3);
    ctx.stroke();
    ctx.strokeStyle = LEAF;
    ctx.lineWidth = R * 0.26;
    ctx.stroke();
    if (leaves) {
      leaf(ctx, x - sway * 0.25, y + stem * 0.62, R * 0.95, -0.55 + Math.sin(t * 1.3) * 0.08, lw);
      leaf(ctx, x - sway * 0.3, y + stem * 0.4, R * 0.8, Math.PI + 0.5 - Math.sin(t * 1.1) * 0.08, lw);
    }
  }

  ctx.translate(x, y);
  ctx.rotate(lean * 0.35 + Math.sin(t * 0.9) * 0.03);
  const bounce = 1 + delight * 0.06 * Math.sin(t * 18);
  ctx.scale(bounce, 1 / bounce);

  // painted head: one sprite per mood, with a delighted wiggle and a hug that draws the petals in
  const face = art[`sunny-${sunnyMood(mood, delight, blink)}`];
  if (face) {
    ctx.rotate(delight * 0.05 * Math.sin(t * 9));
    sprite(ctx, face, R * SUNNY_PX * (1 - hug * 0.12));
    ctx.restore();
    return;
  }

  // petals: two rings
  const n = 18;
  for (let ring = 0; ring < 2; ring++) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * (Math.PI / n) + Math.sin(t * 0.6) * 0.03;
      const flutter = 1 + (delight * 0.12 + 0.03) * Math.sin(t * 9 + i * 1.7);
      const len = R * (ring ? 0.82 : 0.95) * flutter * (1 - hug * 0.25);
      const px = Math.cos(a) * (R * 0.78 + len * 0.45);
      const py = Math.sin(a) * (R * 0.78 + len * 0.45);
      ellipse(ctx, px, py, len * 0.55, R * 0.2, a + hug * 0.4, ring ? PETAL_DEEP : PETAL, lw * 0.8);
    }
  }
  // disc
  circle(ctx, 0, 0, R * 0.86, DISC, lw);
  ctx.fillStyle = "rgba(255,220,160,0.18)";
  for (let i = 0; i < 40; i++) {
    const a = i * 2.399963;
    const d = Math.sqrt(i / 40) * R * 0.78;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, R * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }

  // face
  const ex = R * 0.3;
  const ey = -R * 0.12;
  if (blink || mood === "sleepy") {
    ctx.strokeStyle = "#fff4dc";
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(-ex, ey, R * 0.13, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.moveTo(ex + R * 0.13, ey);
    ctx.arc(ex, ey, R * 0.13, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  } else if (delight > 0.6 || mood === "bubbly") {
    // happy upturned crescents
    ctx.strokeStyle = "#fff4dc";
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    ctx.arc(-ex, ey + R * 0.05, R * 0.14, 1.1 * Math.PI, 1.9 * Math.PI);
    ctx.moveTo(ex + R * 0.14 * Math.cos(1.1 * Math.PI), ey + R * 0.05 + R * 0.14 * Math.sin(1.1 * Math.PI));
    ctx.arc(ex, ey + R * 0.05, R * 0.14, 1.1 * Math.PI, 1.9 * Math.PI);
    ctx.stroke();
  } else {
    for (const sx of [-1, 1]) {
      ellipse(ctx, sx * ex, ey, R * 0.15, R * 0.19, 0, "#fff8ea", lw * 0.7);
      pieEye(ctx, sx * ex + look.x * R * 0.06, ey + look.y * R * 0.06, R * 0.09);
      // lashes
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.moveTo(sx * ex + sx * R * 0.12, ey - R * 0.14);
      ctx.lineTo(sx * ex + sx * R * 0.2, ey - R * 0.22);
      ctx.stroke();
    }
  }
  // cheeks
  ctx.fillStyle = `rgba(239,120,110,${0.5 + delight * 0.4})`;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * R * 0.5, R * 0.14, R * 0.14, R * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // mouth
  ctx.strokeStyle = "#fff4dc";
  ctx.fillStyle = "#4a1d12";
  ctx.lineWidth = lw;
  ctx.beginPath();
  if (mood === "curious" || mood === "worried") {
    ctx.ellipse(R * 0.04, R * 0.32, R * 0.09, R * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (delight > 0.3 || mood === "bubbly") {
    ctx.moveTo(-R * 0.26, R * 0.22);
    ctx.quadraticCurveTo(0, R * 0.62, R * 0.26, R * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.arc(0, R * 0.2, R * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  if (mood === "worried") {
    ctx.strokeStyle = "#fff4dc";
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(-ex - R * 0.14, ey - R * 0.3); ctx.lineTo(-ex + R * 0.1, ey - R * 0.24);
    ctx.moveTo(ex + R * 0.14, ey - R * 0.3); ctx.lineTo(ex - R * 0.1, ey - R * 0.24);
    ctx.stroke();
  }
  ctx.restore();
}

function sunnyMood(mood, delight, blink) {
  if (blink || mood === "sleepy") return "sleepy";
  if (delight > 0.6 || mood === "bubbly") return "delighted";
  if (mood === "worried" || mood === "curious") return mood;
  return "happy";
}

export function leaf(ctx, x, y, len, angle, lw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  inked(ctx, LEAF, lw, () => {
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.38, len, 0);
    ctx.quadraticCurveTo(len * 0.5, len * 0.38, 0, 0);
  });
  ctx.strokeStyle = LEAF_DEEP;
  ctx.lineWidth = lw * 0.6;
  ctx.beginPath();
  ctx.moveTo(len * 0.1, 0);
  ctx.lineTo(len * 0.85, 0);
  ctx.stroke();
  ctx.restore();
}

// Big decorative petal shapes for the forager's world.
export function petalShape(ctx, x, y, len, wid, angle, fill, lw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  inked(ctx, fill, lw, () => {
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(wid, -len * 0.25, wid * 0.8, -len * 0.85, 0, -len);
    ctx.bezierCurveTo(-wid * 0.8, -len * 0.85, -wid, -len * 0.25, 0, 0);
  });
  ctx.restore();
}

// Text with an ink outline, cartoon-title style.
export function label(ctx, text, x, y, size, fill = "#fff6dc", align = "center", weight = 800) {
  ctx.save();
  ctx.font = `${weight} ${Math.round(size)}px Fraunces, "Cooper Black", Georgia, serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, size * 0.18);
  ctx.strokeStyle = INK;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const m = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * k);
  return `rgb(${m(16)},${m(8)},${m(0)})`;
}

// Size a canvas to its box at the device's pixel ratio; returns the CSS size the views draw in.
export function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height, dpr };
}

// Particles: little bits of joy (hearts, honey, pollen specks) that every view can scatter.
export class Particles {
  constructor() { this.items = []; }
  burst(x, y, n, kind, opts = {}) {
    const { speed = 140, spread = Math.PI * 2, dir = -Math.PI / 2, life = 0.9, size = 6, gravity = 260 } = opts;
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() - 0.5) * spread;
      const s = speed * (0.5 + Math.random() * 0.7);
      this.items.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, age: 0, kind, size: size * (0.7 + Math.random() * 0.6), gravity, spin: Math.random() * 6 });
    }
  }
  update(dt) {
    for (const p of this.items) {
      p.age += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - dt * 1.5;
    }
    this.items = this.items.filter((p) => p.age < p.life);
  }
  draw(ctx) {
    for (const p of this.items) {
      const k = 1 - p.age / p.life;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 1.6);
      if (p.kind === "heart") heart(ctx, p.x, p.y, p.size * (0.6 + 0.4 * k));
      else if (p.kind === "honey") nectarDrop(ctx, p.x, p.y, p.size * 0.6);
      else if (p.kind === "sparkle") sparkle(ctx, p.x, p.y, p.size, "#fff1a8");
      else if (p.kind === "pollen") { ctx.fillStyle = POLLEN; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2); ctx.fill(); }
      else if (p.kind === "salve") circle(ctx, p.x, p.y, p.size * 0.5, "#ffd56a", 1.5);
      else if (p.kind === "confetti") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin + p.age * 8);
        ctx.fillStyle = [TOMATO, TEAL, HONEY, LEAF, "#8a4f7d"][Math.floor(p.spin * 10) % 5];
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    }
  }
}
