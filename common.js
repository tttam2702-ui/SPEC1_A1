// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted code, simplified and commented for the course's p5.js topics.
// Both pages use the same canvas, colours, background and basic sound functions.
const W = 1920;
const H = 1080;
const PALETTE = ["#087CFF", "#FF2396", "#FFFF00", "#EE2724", "#00E000", "#FFF6DF"];
const SOUND_PATHS = {
  pop: "sounds/pop.wav",
  item: "sounds/challenge_click.wav",
  start: "sounds/game-start.ogg",
  datamosh: "sounds/datamosh.wav",
  notification: "sounds/notification_end.wav",
  ok: "sounds/ok_click.ogg",
  transition: "sounds/transition.wav",
};
let aboutOpen = false;
let soundReady = false;
let projectSounds = {};
let soundNames = [];

function makeCanvas(label) {
  pixelDensity(1);
  let canvas = createCanvas(W, H);
  canvas.parent(document.querySelector("main"));
  canvas.elt.setAttribute("role", "img");
  canvas.elt.setAttribute("aria-label", label);
  frameRate(60);
  textFont("Arial");
  return canvas;
}

// Draw the nested colour rectangles once, then reuse them as a photograph.
function makeStoreBackground(pinkArea = true) {
  background(255, 35, 150);
  noStroke();
  for (let i = 0; i <= 60; i++) {
    let amount = i / 60;
    fill(255, 35 + 220 * amount, 150 * (1 - amount));
    rect(i * 6.4, i * 3.6, W - i * 12.8, H - i * 7.2);
  }
  if (pinkArea) {
    fill(253, 207, 222);
    rect(384, 216, 1152, 648);
  }
  return get();
}

// preload() waits for these local files before setup() begins.
function loadProjectSounds(names) {
  soundNames = names;
  for (let i = 0; i < names.length; i++) {
    let name = names[i];
    projectSounds[name] = loadSound(SOUND_PATHS[name], soundLoaded, soundMissing);
  }
}

function soundLoaded() {
  // No action is needed: p5 automatically continues when preload is finished.
}

function soundMissing() {
  console.log("A sound could not load. The drawing can still run without it.");
}

function playEffect(name, volume = 0.4) {
  let sound = projectSounds[name];
  if (!soundReady || !sound || !sound.isLoaded()) return;
  sound.setVolume(volume);
  if (name === "notification") sound.stop();
  sound.play();
}

function loopEffect(name, volume = 0.07) {
  let sound = projectSounds[name];
  if (!soundReady || !sound || !sound.isLoaded() || sound.isPlaying()) return;
  sound.setVolume(volume);
  sound.loop();
}

function stopSounds() {
  soundNames.forEach((name) => projectSounds[name].stop());
}

// Only a real input starts audio, so waiting on the landing page never queues pops.
function enableSounds() {
  if (soundReady) return;
  userStartAudio();
  soundReady = true;
}

window.addEventListener("pointerdown", enableSounds);
window.addEventListener("keydown", enableSounds);

// Navigation ends a page's sounds, including the quiet datamosh loop.
window.addEventListener("pagehide", stopSounds);
