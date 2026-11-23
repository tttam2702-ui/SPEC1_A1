// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted, revised for ME-MARRT: an abstract room of repeating identity warnings.
// The supplied reference guides the red hexagons and hazard stripes; all labels are project-specific.
const SIGNAL_WORDS = ["MORE", "AGAIN", "NEW ME", "WANT", "NEED", "NOT YET"];

function buildSignalRoom() {
  signals = [];
  for (let i = 0; i < 3; i++) {
    addRoomSignal(60 + (i % 2) * 140, 270 + i * 220, 350, 255, "MORE", true, -0.08);
    addRoomSignal(1860 - (i % 2) * 140, 270 + i * 220, 350, 255, "AGAIN", true, 0.08);
  }
  addRoomSignal(735, 600, 250, 205, "NEW ME", true);
  addRoomSignal(1185, 600, 250, 205, "MORE", true);
  addRoomSignal(960, 765, 250, 205, "ME?", true);
  addRoomSignal(960, 365, 710, 165, "NO FINAL SELF", true);
  addRoomSignal(485, 565, 230, 180, "WANT");
  addRoomSignal(1435, 565, 230, 180, "NEED");
  signalBaseCount = signals.length;
}

function addRoomSignal(x, y, w, h, word, solid = false, angle = 0) {
  signals.push(new WarningSignal(x, y, w, h, word, solid, angle));
}

function addSignalEchoes(count) {
  for (let i = 0; i < count; i++) {
    const side = signalNumber % 2 === 0;
    const x = side ? random(290, 610) : random(1310, 1630);
    const h = random(75, 135);
    const word = random(SIGNAL_WORDS);
    addRoomSignal(x, random(160, 910), h * 1.5, h, word, false, random(-0.14, 0.14));
  }
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
  }

  show() {
    const age = millis() - this.born;
    if (age < 0 || (age < 180 && floor(age / 45) % 2 === 0)) return;
    const jitter = millis() < this.activeUntil ? 15 : 1.5;
    push();
    translate(this.x + random(-jitter, jitter), this.y);
    rotate(this.angle);
    this.drawPanel();
    this.drawLabel();
    pop();
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
    text(this.word === "ME?" ? "TOUCH TO REPEAT" : "WANT > NEED > WANT", 0, this.h * 0.29);
    const y = -this.h * 0.16;
    triangle(-5, y, 5, y, 0, y - 8);
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

function drawSignalRoom() {
  noStroke();
  fill(0, 238);
  rect(0, 0, W, H);
  drawSignalConnections();
  drawSignalFragments();
  drawWarningTag(540, 240, "SELF");
  drawWarningTag(1380, 240, "LOST");
  drawWarningTag(525, 800, "MORE");
  drawWarningTag(1395, 800, "AGAIN");
  drawSignalCaption();
}

function drawSignalConnections() {
  stroke("#601015");
  strokeWeight(1);
  for (let i = 0; i < 6; i++) {
    line(960, 365, i < 3 ? 0 : W, 180 + (i % 3) * 300);
    line(960, H, i * 384, 680);
  }
}

function drawWarningTag(x, y, word) {
  push();
  translate(x, y);
  drawHazardBar(-90, -65, 180);
  drawHazardBar(-90, 57, 180);
  noStroke();
  fill("#EE2724");
  textAlign(CENTER, CENTER);
  textFont("Impact");
  textSize(62);
  text(word, 0, -4);
  textFont("monospace");
  textSize(12);
  text("IDENTITY / OVERLOAD", 0, 38);
  pop();
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

function drawSignalFragments() {
  for (let i = 0; i < 8; i++) {
    const x = i < 4 ? 50 + i * 180 : 1330 + (i - 4) * 180;
    push();
    translate(x, 990 - abs(x - 960) * 0.13);
    rotate(x < 960 ? -0.12 : 0.12);
    stroke("#EE2724");
    strokeWeight(2);
    image(signalTexture, 0, 0, 150, 92, (i * 230) % 1600, 400, 280, 170);
    noFill();
    rect(0, 0, 150, 92);
    drawHazardBar(0, -20, 150);
    pop();
  }
}

function drawSignalCaption() {
  noStroke();
  fill("#EE2724");
  textFont("monospace");
  textStyle(NORMAL);
  textSize(16);
  textAlign(CENTER, CENTER);
  text("ME-MARRT / SELF OPTIMISATION LOOP", 960, 100);
  fill("#FFFF00");
  text("YOU ARE STILL HERE.          WHAT ARE YOU TRYING TO REPLACE?", 960, 1035);
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
