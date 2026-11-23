// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted artwork, rewritten with basic p5 drawing, arrays, loops and classes.
// The ending adds a generative field of multiplying identity signals to the melting image.
let cartImage, storeBackground, meltPicture, meltSource;
let datamosh = null;
let products = [],
  words = [],
  signals = [];
let state = "intro",
  paused = false,
  collected = 0,
  meltClicks = 0;
let signalFrame = 0,
  signalBeat = 0,
  signalNumber = 0;
let signalStartedAt = 0,
  signalGlitchUntil = 0;
let signalBaseCount;
let returnAt = 0,
  returnEnd = 0;
const SIGNAL_BEATS = [3, 27, 41, 54, 67];
// The original recording's attacks drive the restored melting engine.
const MELT_BEATS = [
  0.025, 0.299, 0.586, 0.874, 1.161, 1.442, 1.729, 2.015, 2.302, 2.589, 2.876, 3.157, 3.444, 3.729,
  4.011,
];
const PRODUCT_NAMES = ["OLD CLOTHES", "SELF HELP BOOK", "SKINCARE", "HEADPHONES", "PLANT"];
const SHIRT_POINTS = [
  [-35, -65],
  [-75, -35],
  [-52, 0],
  [-32, -12],
  [-36, 65],
  [36, 65],
  [32, -12],
  [52, 0],
  [75, -35],
  [35, -65],
];
function preload() {
  cartImage = loadImage("assets/cart_challenge.png");
  loadProjectSounds(["item", "start", "datamosh", "notification", "ok", "transition"]);
}

function setup() {
  const canvas = makeCanvas(
    "Falling products, a melting shopping cart and a generative hexagonal warning field",
  );
  canvas.elt.tabIndex = 0;
  storeBackground = makeStoreBackground(false);
  textFont("Arial");
  frameRate(60);
  document.getElementById("challenge-start").onclick = startChallenge;
  document.getElementById("challenge-start").disabled = false;
  document.getElementById("challenge-start").textContent = "LET'S GO SHOPPING →";
  document.getElementById("challenge-pause").onclick = pauseChallenge;
  document.getElementById("challenge-restart").onclick = restartChallenge;
  document.getElementById("challenge-start").focus();
}

function draw() {
  if (aboutOpen || paused) return;
  if (state === "intro" || state === "collect") drawShopping();
  if (state === "melt" || state === "signals") drawMelting();
  if (state === "signals") drawSignals();
  if (state === "return") drawReturn();
  updateHud();
}

function startChallenge() {
  state = "collect";
  document.getElementById("challenge-intro").hidden = true;
  document.getElementById("challenge-pause").disabled = false;
  document.getElementById("challenge-restart").disabled = false;
  for (let i = 0; i < 3; i++) products.push(new Product(-100 - i * 180));
  playEffect("start", 0.35);
  setStatus("Click falling objects. Enter catches the lowest object.");
  document.querySelector("canvas").focus();
}

function pauseChallenge() {
  paused = !paused;
  if (paused) stopSounds();
  document.getElementById("challenge-pause").textContent = paused ? "RESUME ▶" : "PAUSE";
  document.getElementById("challenge-pause").setAttribute("aria-pressed", String(paused));
}

function restartChallenge() {
  stopSounds();
  products = [];
  words = [];
  datamosh = null;
  meltSource = null;
  signals = [];
  collected = 0;
  meltClicks = 0;
  paused = false;
  returnAt = 0;
  document.getElementById("challenge-stage").classList.remove("is-art-ending");
  document.getElementById("challenge-pause").textContent = "PAUSE";
  document.getElementById("challenge-pause").setAttribute("aria-pressed", "false");
  startChallenge();
}

function drawShopping() {
  image(storeBackground, 0, 0, W, H);
  const cartWidth = (H * cartImage.width) / cartImage.height;
  image(cartImage, (W - cartWidth) / 2, 0, cartWidth, H);
  if (state === "collect" && frameCount % 24 === 0) products.push(new Product(-110));
  for (let i = products.length - 1; i >= 0; i--) {
    products[i].update();
    products[i].show();
    if (products[i].y > H + 200) products.splice(i, 1);
  }
  drawWords();
}

function mousePressed(event) {
  if (event && event.target.tagName !== "CANVAS") return;
  if (aboutOpen || paused || mouseX < 0 || mouseX > W || mouseY < 0 || mouseY > H) return;
  if (state === "collect") catchAt(mouseX, mouseY);
  else if (state === "melt") meltAt(mouseX, mouseY);
  else if (state === "signals") activateSignal(mouseX, mouseY);
}

function keyPressed(event) {
  if (keyCode !== ENTER || aboutOpen || paused) return;
  if (event && (event.repeat || ["BUTTON", "A"].includes(event.target.tagName))) return;
  if (state === "collect") catchLowest();
  else if (state === "melt") meltAt(random(100, W - 100), random(100, H - 100));
  else if (state === "signals") activateSignal();
  return false;
}

function catchAt(x, y) {
  for (let i = products.length - 1; i >= 0; i--) {
    if (!products[i].caught && dist(x, y, products[i].x, products[i].y) < 95) {
      catchProduct(products[i]);
      return;
    }
  }
}

function catchLowest() {
  let lowest = null;
  for (const product of products) {
    if (!product.caught && (!lowest || product.y > lowest.y)) lowest = product;
  }
  if (lowest) catchProduct(lowest);
}

function catchProduct(product) {
  product.caught = true;
  const oldColour = product.colour;
  while (product.colour === oldColour) product.colour = random(PALETTE);
  product.targetX = random(760, 1160);
  product.targetY = random(430, 720);
  addWord(PRODUCT_NAMES[product.kind], product.x, product.y);
  addWord("BETTER YOU?", product.x + 70, product.y + 45);
  collected++;
  playEffect("item", 0.3);
  if (collected === 6) beginMelt(product.x, product.y);
}

function addWord(label, x, y) {
  words.push({ label, x, y, vy: -9, life: 55, colour: random(PALETTE) });
}

function drawWords() {
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i];
    word.y += word.vy;
    word.vy += 0.32;
    word.life--;
    stroke(0);
    strokeWeight(2);
    fill(word.colour);
    textSize(35 + sin(word.life * 0.5) * 5);
    text(word.label, word.x, word.y);
    if (word.life <= 0) words.splice(i, 1);
  }
}

function beginMelt(x, y) {
  drawShopping();
  state = "melt";
  meltSource = get().canvas;
  loopEffect("datamosh", 0.045);
  datamosh = new ChallengeDatamosh(meltSource, { track: new MeltBeatClock() });
  meltAt(x, y);
  setStatus("Each click now melts another area. Click around the picture, or press Enter.");
}

function meltAt(x, y) {
  if (!datamosh) return;
  datamosh.addDamage(x, y, meltSource);
  meltClicks = datamosh.hits;
}

// Keep the original colour processing, feedback and melting ribbons unchanged.
function drawMelting() {
  loopEffect("datamosh", 0.045);
  datamosh.audioTrack.tick(min(deltaTime / 1000, 0.05));
  datamosh.draw(drawingContext, min(deltaTime / 1000, 0.05), meltSource);
  drawWords();
  if (state === "melt" && datamosh.complete) beginSignals();
}

function beginSignals() {
  state = "signals";
  document.getElementById("challenge-stage").classList.add("is-art-ending");
  signalStartedAt = millis();
  signalNumber = 0;
  buildSignals();
  replaySignals();
  setStatus(
    "Touch a red signal, or press Enter. Every attempt to change yourself creates more signals.",
  );
}

// Adapt p5.sound's playhead to the old visual engine's looping beat clock.
class MeltBeatClock {
  constructor() {
    this.beats = MELT_BEATS;
    this.loop = true;
    this.duration = projectSounds.datamosh.isLoaded()
      ? projectSounds.datamosh.duration()
      : 4.280979;
    this.previous = 0;
    this.offset = 0;
    this.silentTime = 0;
  }

  tick(dt) {
    this.silentTime += dt;
  }

  elapsed() {
    const sound = projectSounds.datamosh;
    if (!sound.isLoaded()) return this.silentTime;
    const current = sound.currentTime();
    if (current < this.previous - 0.05) this.offset += this.duration;
    this.previous = current;
    return this.offset + current;
  }
}

function replaySignals() {
  signalFrame = frameCount;
  signalBeat = 0;
  playEffect("notification", 0.35);
}

function drawSignals() {
  drawSignalField();
  addSignalsOnBeat();
  for (const signal of signals) signal.show();
  drawSignalGlitch();
  cursor(signalAt(mouseX, mouseY) ? HAND : ARROW);
  if (returnAt > 0 && millis() >= returnAt) beginReturn();
}

function addSignalsOnBeat() {
  if (signalBeat >= SIGNAL_BEATS.length) return;
  if (frameCount - signalFrame < SIGNAL_BEATS[signalBeat]) return;
  if (signalBeat > 0) addSignalEchoes(2);
  signalBeat++;
}

function signalAt(x, y) {
  for (let i = signals.length - 1; i >= 0; i--) {
    if (signals[i].hit(x, y)) return signals[i];
  }
  return null;
}

function activateSignal(x, y) {
  if (millis() - signalStartedAt < 700) return;
  const signal = x === undefined ? signals[0] : signalAt(x, y);
  if (!signal) return;
  if (returnAt === 0) returnAt = millis() + 12000;
  signal.activeUntil = millis() + 650;
  signalGlitchUntil = millis() + 240;
  meltSignalImage(signal);
  addSignalEchoes(5);
  playEffect("ok", 0.35);
  replaySignals();
}

function beginReturn() {
  state = "return";
  returnEnd = millis() + 1900;
  meltSignalImage(signals[0]);
  datamosh.draw(drawingContext, 0);
  meltPicture = get();
  stopSounds();
  playEffect("transition", 0.4);
  setStatus("Returning to ME-MARRT.");
}

function drawReturn() {
  image(meltPicture, 0, 0, W, H);
  for (let i = 0; i < 18; i++) {
    const y = random(H - 40);
    copy(meltPicture, 0, y, W, 20, random(-150, 150), y, W, random(20, 80));
  }
  fill(random(PALETTE));
  noStroke();
  rect(random(W), random(H), random(100, 600), random(5, 30));
  if (millis() >= returnEnd) {
    stopSounds();
    location.href = "./";
  }
}

function updateHud() {
  document.getElementById("challenge-count").textContent = String(collected).padStart(2, "0");
  document.getElementById("challenge-mode").textContent =
    state === "intro" || state === "collect" ? "CATCH THE NEXT YOU." : "CLICK / LET IT MELT.";
  const stage = document.getElementById("challenge-stage");
  stage.dataset.mode = state;
  stage.dataset.collected = collected;
  stage.dataset.damageHits = meltClicks;
  stage.dataset.signals = signals.length;
  stage.dataset.signalCopies = signalNumber;
  stage.dataset.signalReady = String(state === "signals" && millis() - signalStartedAt >= 700);
  stage.dataset.damageCoverage = datamosh ? datamosh.coverage.toFixed(3) : "0";
  stage.dataset.datamoshBeats = datamosh ? datamosh.beatCount : 0;
}

function setStatus(message) {
  document.getElementById("challenge-art-status").textContent = message;
}

class Product {
  constructor(y) {
    this.x = random(130, W - 130);
    this.y = y;
    this.kind = floor(random(PRODUCT_NAMES.length));
    this.colour = random(PALETTE);
    this.speed = random(5, 8);
    this.angle = random(-0.25, 0.25);
    this.caught = false;
    this.size = random(140, 180);
  }

  update() {
    if (this.caught) {
      this.x += (this.targetX - this.x) * 0.15;
      this.y += (this.targetY - this.y) * 0.15;
      this.size += (110 - this.size) * 0.15;
      this.angle *= 0.9;
    } else {
      this.y += this.speed;
      this.angle += 0.004;
    }
  }

  show() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    scale(this.size / 180);
    stroke("#111111");
    strokeWeight(4);
    fill(this.colour);
    drawProduct(this.kind, this.colour);
    pop();
  }
}

function drawProduct(kind, colour) {
  if (kind === 0) drawShirt();
  if (kind === 1) drawBook();
  if (kind === 2) drawBottle();
  if (kind === 3) drawHeadphones(colour);
  if (kind === 4) drawPlant();
}

function drawShirt() {
  beginShape();
  for (const point of SHIRT_POINTS) vertex(point[0], point[1]);
  endShape(CLOSE);
  line(-20, -60, 20, -60);
  fill("#FFF6DF");
  rect(-20, -15, 40, 30);
}

function drawBook() {
  rect(-55, -70, 110, 140);
  fill("#FFF6DF");
  rect(-45, 50, 110, 20);
  line(-38, -65, -38, 48);
  line(-20, -25, 38, -25);
  line(-20, -5, 25, -5);
}

function drawBottle() {
  rect(-42, -45, 84, 110, 14);
  fill("#FFF6DF");
  rect(-25, -70, 50, 25);
  rect(-35, -5, 70, 35);
  line(-22, 10, 22, 10);
}

function drawHeadphones(colour) {
  noFill();
  strokeWeight(14);
  arc(0, -5, 120, 125, PI, TWO_PI);
  strokeWeight(4);
  fill(colour);
  rect(-75, -10, 35, 65, 8);
  rect(40, -10, 35, 65, 8);
}

function drawPlant() {
  line(0, 35, 0, -65);
  ellipse(-25, -30, 65, 26);
  ellipse(25, -60, 65, 26);
  fill("#EE2724");
  triangle(-50, 20, 50, 20, 0, 90);
  rect(-55, 15, 110, 15);
}
