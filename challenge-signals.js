// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted, revised for ME-MARRT: generative identity warnings over the original melt.
// The supplied reference guides the red hexagons and hazard stripes; all labels are project-specific.
const SIGNAL_WORDS = ["MORE", "AGAIN", "NEW ME", "WANT", "NEED", "NOT YET"];
const ALERT_MESSAGE = "ALERT / CLICK A HEXAGON / TRY ANOTHER YOU / ";
const LOOP_MESSAGE = "WANT > NEED > WANT / THE NEXT YOU IS NEVER THE LAST / ";

function buildSignals() {
  signals = [];
  addGeneratedSignal("ME?", true);
  for (let i = 0; i < 8; i++) addGeneratedSignal(random(SIGNAL_WORDS), i % 3 === 0);
  signalBaseCount = signals.length;
}

function addGeneratedSignal(word, solid = false) {
  const w = random(200, 370);
  const h = random(125, 215);
  const x = random(w / 2 + 40, W - w / 2 - 40);
  const y = random(h / 2 + 80, H - h / 2 - 100);
  signals.push(new WarningSignal(x, y, w, h, word, solid, random(-0.18, 0.18)));
}

function addSignalEchoes(count) {
  for (let i = 0; i < count; i++) addGeneratedSignal(random(SIGNAL_WORDS), random() < 0.25);
  while (signals.length > 32) signals.splice(signalBaseCount, 1);
}

class WarningSignal {
  constructor(x, y, w, h, word, solid, angle) {
    this.number = ++signalNumber;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.word = word;
    this.solid = solid;
    this.angle = angle;
    this.born = millis() + (this.number % 6) * 35;
    this.activeUntil = 0;
    this.initMotion();
  }

  initMotion() {
    this.changeEvery = floor(random(65, 145));
    this.scatter();
  }

  // Each signal has its own rhythm. Ordinary position updates move it toward a new random point.
  scatter() {
    this.targetX = random(this.w / 2 + 40, W - this.w / 2 - 40);
    this.targetY = random(this.h / 2 + 80, H - this.h / 2 - 100);
    this.targetAngle = random(-0.2, 0.2);
  }

  update() {
    // Hold a hovered sign still so the visitor can click its visible shape.
    if (this.hit(mouseX, mouseY)) return;
    if (frameCount % this.changeEvery === 0) this.scatter();
    this.x += (this.targetX - this.x) * 0.035;
    this.y += (this.targetY - this.y) * 0.035;
    this.angle += (this.targetAngle - this.angle) * 0.05;
  }

  show() {
    const age = millis() - this.born;
    if (age < 0 || (age < 180 && floor(age / 45) % 2 === 0)) return;
    this.update();
    const jitter = millis() < this.activeUntil ? 15 : 1.5;
    push();
    translate(this.x + random(-jitter, jitter), this.y);
    rotate(this.angle);
    this.drawClickRing();
    this.drawPanel();
    this.drawLabel();
    pop();
  }

  // A slow pulse suggests an active control even before the visitor hovers.
  drawClickRing() {
    const hovered = this.hit(mouseX, mouseY);
    noFill();
    stroke(255, 255, 0, hovered ? 255 : 90 + 55 * sin(frameCount * 0.06 + this.number));
    strokeWeight(hovered ? 3 : 1);
    this.hexagon(hovered ? 1.08 : 1.04);
  }

  drawPanel() {
    const selected = this.hit(mouseX, mouseY) || millis() < this.activeUntil;
    stroke(selected ? "#FFFF00" : "#EE2724");
    strokeWeight(3);
    fill(selected ? "#FFFF00" : this.solid ? "#EE2724" : "#090203");
    this.hexagon(1);
    noFill();
    stroke(this.solid || selected ? "#450707" : "#EE2724");
    strokeWeight(1.5);
    this.hexagon(0.92);
    if (this.number % 3 === 0) {
      drawHazardBar(-this.w * 0.32, -this.h / 2 - 20, this.w * 0.64);
      drawHazardBar(-this.w * 0.32, this.h / 2 + 4, this.w * 0.64);
    }
  }

  hexagon(amount) {
    const w = this.w * amount;
    const h = this.h * amount;
    beginShape();
    vertex(-w / 2, 0);
    vertex(-w * 0.34, -h / 2);
    vertex(w * 0.34, -h / 2);
    vertex(w / 2, 0);
    vertex(w * 0.34, h / 2);
    vertex(-w * 0.34, h / 2);
    endShape(CLOSE);
  }

  drawLabel() {
    noStroke();
    fill(
      this.solid || this.hit(mouseX, mouseY) || millis() < this.activeUntil ? "#180003" : "#EE2724",
    );
    textAlign(CENTER, CENTER);
    textFont("Impact");
    textStyle(NORMAL);
    textSize(this.h * 0.25);
    if (textWidth(this.word) > this.w * 0.72)
      textSize((textSize() * this.w * 0.72) / textWidth(this.word));
    text(this.word, 0, 0);
    this.drawDetails();
  }

  drawDetails() {
    textFont("monospace");
    textSize(max(10, this.h * 0.055));
    text("SELF / " + String(this.number).padStart(3, "0"), 0, -this.h * 0.3);
    const y = -this.h * 0.16;
    triangle(-5, y, 5, y, 0, y - 8);
    this.drawClickHint();
  }

  drawClickHint() {
    fill("#FFFF00");
    noStroke();
    rect(-this.w * 0.34, this.h * 0.23, this.w * 0.68, 25, 3);
    fill("#090203");
    textStyle(BOLD);
    textSize(14);
    text("CLICK TO CHANGE", 0, this.h * 0.23 + 12.5);
  }

  // Rotate the mouse back into the panel's coordinates, then test the six-sided outline.
  hit(x, y) {
    if (millis() < this.born) return false;
    const dx = x - this.x;
    const dy = y - this.y;
    const localX = abs(dx * cos(this.angle) + dy * sin(this.angle));
    const localY = abs(-dx * sin(this.angle) + dy * cos(this.angle));
    return localY <= this.h / 2 && localX <= this.w / 2 - (localY * this.w * 0.32) / this.h;
  }
}

function drawSignalConnections() {
  stroke(238, 39, 36, 100);
  strokeWeight(1);
  for (let i = 0; i < signals.length; i += 2) {
    const other = signals[(i + 3) % signals.length];
    line(signals[i].x, signals[i].y, other.x, other.y);
  }
}

function drawHazardBar(x, y, w) {
  noStroke();
  fill("#FFFF00");
  rect(x, y, w, 16);
  fill(0);
  for (let offset = 0; offset < w - 16; offset += 28) {
    quad(x + offset, y + 16, x + offset + 14, y + 16, x + offset + 30, y, x + offset + 16, y);
  }
}

// Draw two narrow alert ribbons above the signs, leaving the melt visible between them.
function drawSignalTickers() {
  drawAlertTicker(ALERT_MESSAGE, 48, 92, "#FFFF00", "#090203");
  drawAlertTicker(LOOP_MESSAGE, 1000, -72, "#EE2724", "#090203");
}

// Repeat one measured phrase: modulo wraps it smoothly without a blank gap.
function drawAlertTicker(message, y, speed, paperColour, inkColour) {
  push();
  noStroke();
  fill(paperColour);
  rect(0, y, W, 48);
  fill(inkColour);
  textFont("Impact");
  textStyle(NORMAL);
  textSize(30);
  textAlign(LEFT, CENTER);
  const step = textWidth(message);
  const offset = (((millis() - signalStartedAt) / 1000) * speed) % step;
  for (let x = -step - offset; x < W + step; x += step) text(message, x, y + 24);
  pop();
}

// A short click tears the signals themselves; the original melt continues underneath.
function drawSignalGlitch() {
  if (millis() >= signalGlitchUntil) return;
  for (let i = 0; i < 12; i++) {
    const y = random(150, 1000);
    copy(0, y, W, 10, random(-70, 70), y + random(-14, 14), W, 10);
  }
}

function meltSignalImage(signal) {
  const x = constrain(floor(signal.x - signal.w / 2 - 12), 0, W - 1);
  const y = constrain(floor(signal.y - signal.h / 2 - 12), 0, H - 1);
  const w = min(signal.w + 24, W - x);
  const h = min(signal.h + 24, H - y);
  const fragment = get(x, y, w, h).canvas;
  datamosh.fieldCtx.drawImage(fragment, x / 2, y / 2, w / 2, h / 2);
  datamosh.textureCtx.drawImage(datamosh.field, 0, 0);
  datamosh.addRegion(
    { x: (x + w / 2) / 2, y: (y + h / 2) / 2, radius: w * 0.4, born: datamosh.time },
    70,
  );
}
