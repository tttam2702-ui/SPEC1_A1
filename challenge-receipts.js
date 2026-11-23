// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted, revised for ME-MARRT: the shopper receives a receipt for their time.
// Every line refers to an object actually caught during this round.
const RECEIPT_WIDTH = 640;
const RECEIPT_HEIGHT = 940;
const RECEIPT_ACTION = { x: 40, y: 798, w: 560, h: 60 };

function receiptTime(seconds) {
  const tenths = max(0, floor(seconds * 10));
  const minutes = floor(tenths / 600);
  const remainder = ((tenths % 600) / 10).toFixed(1).padStart(4, "0");
  return String(minutes).padStart(2, "0") + ":" + remainder;
}

class Receipt {
  constructor(number, echo = false) {
    this.number = number;
    this.echo = echo;
    this.paid = false;
    this.seconds = (millis() - sessionStartedAt) / 1000;
    this.born = millis();
    this.x = (W - RECEIPT_WIDTH) / 2;
    this.y = -RECEIPT_HEIGHT;
    this.scale = 1;
    this.angle = 0;
    this.place(echo);
    this.makeBarcode();
  }

  place(echo) {
    this.targetX = (W - RECEIPT_WIDTH) / 2;
    this.targetY = 66;
    this.targetScale = 1;
    this.targetAngle = 0;
    if (echo) this.moveAside();
    else this.y = this.targetY;
  }

  moveAside() {
    this.echo = true;
    const left = this.number % 2 === 0;
    this.targetX = left ? random(25, 250) : random(1250, 1450);
    this.targetY = random(75, 480);
    this.targetScale = random(0.56, 0.68);
    this.targetAngle = left ? random(-0.1, -0.025) : random(0.025, 0.1);
  }

  makeBarcode() {
    this.bars = [];
    for (let x = 0; x < 360; x += random(4, 9)) {
      this.bars.push({ x, w: random(1, 4) });
    }
  }

  update() {
    this.x += (this.targetX - this.x) * 0.16;
    this.y += (this.targetY - this.y) * 0.16;
    this.scale += (this.targetScale - this.scale) * 0.12;
    this.angle += (this.targetAngle - this.angle) * 0.12;
  }

  show() {
    this.update();
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    scale(this.scale);
    this.clipPrintedPaper();
    this.drawPaper();
    this.drawHeader();
    this.drawItems();
    this.drawTotal();
    this.drawAction();
    this.drawBarcode();
    if (this.paid) this.drawStamp();
    pop();
  }

  // Reveal the top of a new receipt first, like paper feeding from a printer.
  clipPrintedPaper() {
    const progress = this.echo ? 1 : constrain((millis() - this.born) / 700, 0, 1);
    drawingContext.beginPath();
    drawingContext.rect(-15, -15, RECEIPT_WIDTH + 30, (RECEIPT_HEIGHT + 30) * progress);
    drawingContext.clip();
  }

  drawPaper() {
    noStroke();
    fill(0, 90);
    rect(12, 12, RECEIPT_WIDTH, RECEIPT_HEIGHT);
    fill("#FFF9E8");
    beginShape();
    vertex(0, 0);
    vertex(RECEIPT_WIDTH, 0);
    for (let i = 0; i <= 40; i++) vertex(RECEIPT_WIDTH - i * 16, RECEIPT_HEIGHT - (i % 2) * 10);
    endShape(CLOSE);
  }

  ink(size, bold = false) {
    noStroke();
    fill("#17202A");
    textFont("monospace");
    textStyle(bold ? BOLD : NORMAL);
    textSize(size);
    textLeading(size * 1.3);
    textAlign(LEFT, TOP);
  }

  drawHeader() {
    this.ink(28, true);
    textAlign(CENTER, TOP);
    text("ME-MARRT", 320, 27);
    textSize(13);
    text("IDENTITY SUPERSTORE / AFTER THE OFFER", 320, 65);
    this.ink(15);
    text("YOU / COPY " + String(this.number).padStart(3, "0"), 40, 99);
    textAlign(RIGHT, TOP);
    text("06 ITEMS", 600, 99);
    this.rule(127);
    this.drawHeadline();
  }

  drawHeadline() {
    noStroke();
    fill("#EE2724");
    textFont("Arial Black");
    textStyle(BOLD);
    textSize(64);
    if (textWidth("THE PAYMENT.") > 562) textSize((64 * 562) / textWidth("THE PAYMENT."));
    textAlign(LEFT, TOP);
    textLeading(69);
    text("YOU WERE\nTHE PAYMENT.", 37, 151);
    this.ink(17);
    text("Your cart was full.\nWhat did it cost you?", 40, 314);
  }

  rule(y) {
    stroke("#17202A");
    strokeWeight(1);
    for (let x = 40; x < 600; x += 13) line(x, y, x + 7, y);
  }

  drawItems() {
    this.ink(14, true);
    text("ITEM", 40, 375);
    textAlign(RIGHT, TOP);
    text("TIME TAKEN", 600, 375);
    this.rule(399);
    let itemTime = 0;
    for (let i = 0; i < basket.length; i++) {
      this.itemRow(PRODUCT_NAMES[basket[i].kind], basket[i].seconds, 417 + i * 35);
      itemTime += basket[i].seconds;
    }
    this.itemRow("KEEP LOOKING", max(0, this.seconds - itemTime), 627);
    this.rule(669);
  }

  itemRow(label, seconds, y) {
    this.ink(19);
    text(label, 40, y);
    textAlign(RIGHT, TOP);
    text(receiptTime(seconds), 600, y);
  }

  drawTotal() {
    this.ink(20);
    text("PRICE", 40, 688);
    textAlign(RIGHT, TOP);
    text("$0.00", 600, 688);
    this.ink(28, true);
    text("YOU PAID", 40, 724);
    textAlign(RIGHT, TOP);
    text(receiptTime(this.seconds), 600, 724);
    this.ink(13);
    text("NO REFUNDS ON TIME SPENT.", 40, 771);
  }

  drawAction() {
    const button = RECEIPT_ACTION;
    stroke("#17202A");
    strokeWeight(2);
    fill(this.echo ? "#FFF9E8" : "#FFFF00");
    rect(button.x, button.y, button.w, button.h);
    this.ink(23, true);
    textAlign(CENTER, CENTER);
    text(this.echo ? "ANOTHER COPY OF YOU" : "PRINT ANOTHER ME", 320, button.y + button.h / 2);
  }

  drawBarcode() {
    noStroke();
    fill("#17202A");
    for (const bar of this.bars) rect(140 + bar.x, 878, bar.w, 26);
    this.ink(11);
    textAlign(CENTER, TOP);
    text("THANK YOU FOR YOUR TIME.", 320, 914);
  }

  drawStamp() {
    push();
    translate(465, 720);
    rotate(-0.18);
    noFill();
    stroke("#EE2724");
    strokeWeight(4);
    rect(-86, -33, 172, 66);
    fill("#EE2724");
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(42);
    textStyle(BOLD);
    text("PAID", 0, -2);
    pop();
  }

  ready() {
    return !this.echo && millis() - this.born > 750 && abs(this.y - this.targetY) < 30;
  }

  hit(x, y) {
    const button = RECEIPT_ACTION;
    return (
      this.ready() &&
      x > this.x + button.x &&
      x < this.x + button.x + button.w &&
      y > this.y + button.y &&
      y < this.y + button.y + button.h
    );
  }
}

// Feed the actual printed paper into the old datamosh engine, not an error-window template.
function meltReceiptImage(receipt) {
  const x = constrain(floor(receipt.x), 0, W - 1);
  const y = constrain(floor(receipt.y), 0, H - 1);
  const w = min(RECEIPT_WIDTH, W - x);
  const h = min(RECEIPT_HEIGHT, H - y);
  const paper = get(x, y, w, h).canvas;
  datamosh.fieldCtx.drawImage(paper, x / 2, y / 2, w / 2, h / 2);
  datamosh.textureCtx.drawImage(datamosh.field, 0, 0);
  datamosh.addRegion(
    { x: (x + w / 2) / 2, y: (y + h / 2) / 2, radius: w * 0.28, born: datamosh.time },
    70,
  );
}
