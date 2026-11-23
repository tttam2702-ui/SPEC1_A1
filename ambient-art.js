// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted implementation, revised into named helpers for this project.
// This decoration follows the products visually; it never changes their movement.

const MESSAGE_WORDS = [
  "I love this!",
  "this is so me",
  "new me?",
  "try me on",
  "100% you",
  "one more version",
  "me, again.",
  "same me. new look.",
];

class SceneAmbient {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.phrases = MESSAGE_WORDS;
    this.messages = [];
    this.points = [];
    this.reset();
  }

  reset() {
    this.messages = [];
    for (let i = 0; i < 12; i++) this.messages.push(new StoreMessage(i, random(this.phrases)));
  }

  drawMessages() {
    this.drawGreenBits();
    for (let i = 0; i < this.messages.length; i++) {
      const message = this.messages[i];
      message.update();
      message.display();
      if (message.age > message.life) this.messages[i] = new StoreMessage(i, random(this.phrases));
    }
  }

  // Small stepped fragments stay in the side margins and leave the CTA area clear.
  drawGreenBits() {
    noStroke();
    fill("#00E000");
    for (let i = 0; i < 18; i++) {
      if ((frameCount + i * 7) % 19 < 4) continue;
      const side = i % 2;
      const x = side === 0 ? 40 + ((i * 13) % 245) : 1580 + ((i * 29) % 245);
      const y = 120 + floor(i / 2) * 82 + random(-4, 4);
      const w = i % 3 === 0 ? 100 : 28;
      rect(x + random(-7, 7), y, w, 27);
      if (i % 5 === 0) rect(x + 22, y - 18, 26, 64);
    }
  }

  drawTracking(items) {
    this.points = [];
    strokeWeight(1);
    noFill();
    for (let item of items) {
      if (item.y - item.h / 2 > 240) this.trackBox(item.x, item.y, item.w, item.h);
    }
    this.trackBox(960, 400, 90, 110);
    this.trackBox(960, 535, 210, 210);
    this.drawWeb();
  }

  trackBox(x, y, width, height) {
    if (frameCount % 13 < 2) return;
    const w = min(width * 0.55, 105);
    const h = min(height * 0.5, 90);
    x += random(-12, 12);
    y += random(-10, 10);
    stroke("#FFFFFF");
    rect(x - w / 2, y - h / 2, w, h);
    line(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    this.points.push([x, y]);
    this.drawTrackLabel(x, y, w);
  }

  drawTrackLabel(x, y, width) {
    noStroke();
    fill("#FFFFFF");
    textAlign(LEFT, BOTTOM);
    textSize(11);
    text(nf((frameCount % 1000) / 1000, 1, 3), x - width / 2, y - 5);
    noFill();
  }

  drawWeb() {
    stroke(255, 190);
    for (let i = 0; i < this.points.length; i++) {
      const a = this.points[i];
      const b = this.points[(i + 3) % this.points.length];
      if ((frameCount + i) % 7 !== 0) line(a[0], a[1], b[0], b[1]);
      if (i > 0) line(a[0], a[1], this.points[i - 1][0], this.points[i - 1][1]);
    }
  }

  click(x, y) {
    for (let message of this.messages) {
      if (message.contains(x, y)) {
        message.dismissed = 1;
        playEffect("pop", 0.16);
        return true;
      }
    }
    return false;
  }
}

class StoreMessage {
  constructor(index, words) {
    this.words = words;
    this.w = min(300, words.length * 13 + 30);
    this.h = 54;
    this.x = index % 2 === 0 ? random(30, 354 - this.w) : random(1570, 1890 - this.w);
    this.y = 110 + floor(index / 2) * 118 + random(-18, 18);
    this.age = -index * 25 - floor(random(20));
    this.life = floor(random(480, 800));
    this.dismissed = 0;
    this.colour = random(["#087CFF", "#087CFF", "#087CFF", "#EE2724"]);
  }

  update() {
    this.age++;
    if (this.age === 1) playEffect("pop", 0.12);
    if (this.dismissed > 0) this.dismissed++;
    if (this.dismissed > 12) this.age = this.life + 1;
  }

  display() {
    if (this.age < 0) return;
    const amount = min(this.age / 16, 1);
    const bounce = amount + sin(amount * PI) * 0.22;
    push();
    translate(this.x + this.w / 2, this.y + this.h / 2);
    scale(bounce);
    if (this.dismissed > 0) this.drawGlitch();
    this.drawBubble();
    pop();
  }

  drawBubble() {
    noStroke();
    fill(this.colour);
    rect(-this.w / 2, -this.h / 2, this.w, this.h, 22);
    triangle(this.w / 2 - 20, 14, this.w / 2 + 7, 31, this.w / 2 - 28, 22);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(24);
    text(this.words, 0, -1);
  }

  drawGlitch() {
    translate(random(-12, 12), random(-5, 5));
    scale(1 + this.dismissed * 0.025, 1 - this.dismissed * 0.05);
    noStroke();
    for (let i = 0; i < 5; i++) {
      fill(random(["#08BEFF", "#FF2396", "#FFFF00"]));
      rect(random(-this.w / 2, this.w / 3), random(-25, 25), random(20, 100), random(2, 6));
    }
  }

  contains(x, y) {
    return (
      this.age > 0 &&
      this.dismissed === 0 &&
      x > this.x &&
      x < this.x + this.w &&
      y > this.y &&
      y < this.y + this.h
    );
  }
}
