// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted implementation, revised into named helpers for this project.
// Simple gravity and bounce study inspired by Giang Nguyen's supplied reference:
// https://giangnguyenday.github.io/oart1033-a2-s4135042/

const AREA = { left: 384, right: 1536, top: 216, bottom: 864 };
const YELLOW = { x: 960, y: 555, r: 280 };
const LANDING_FILES = {
  logo: "ME-MARTT_TITLE.png",
  cart: "cart.png",
  body: "body-static.png",
  top1: "body_top_1.png",
  top2: "body_top_2.png",
  top3: "body_top_3.png",
  down1: "body_down_1.png",
  down2: "body_down_2.png",
  down3: "body_down_3.png",
  headphone: "headphone.png",
  hirono: "hirono.png",
  camera: "kodak_camera.png",
  macbook: "macbook.png",
  offer: "offer.png",
  text: "text.png",
  banner: "Group 14.png",
};
// Supplied PNG margins measured once; these rectangles retain every visible pixel.
const LANDING_CROPS = {
  top1: [4, 23, 398, 269],
  top2: [0, 0, 459, 161],
  top3: [9, 1, 479, 162],
  down1: [0, 2, 213, 271],
  down2: [30, 0, 145, 268],
  down3: [10, 0, 279, 269],
  headphone: [41, 40, 132, 131],
  hirono: [13, 16, 199, 157],
  macbook: [13, 16, 199, 157],
  camera: [10, 13, 158, 125],
  text: [0, 0, 313, 80],
  banner: [0, 0, 251, 65],
  offer: [0, 0, 191, 191],
};
const PRODUCT_ROWS = [
  ["text", 530, 280, 125],
  ["offer", 555, 190, 190],
  ["headphone", 525, 200, 200],
  ["macbook", 565, 230, 180],
  ["banner", 1385, 285, 125],
  ["hirono", 1380, 205, 205],
  ["camera", 1370, 205, 205],
];

let pictures = {};
let storeBackground;
let storeItems = [];
let landingArt;
let heldItem = null;
let topNumber = 1;
let downNumber = 1;
let nextLook = 0;
let headPoints = [];
let headColor;
let bodyAngle = 0;
let cartX = -350;
let nextCart = 0;
let cartRunning = false;

function preload() {
  for (let name in LANDING_FILES) pictures[name] = loadImage("assets/" + LANDING_FILES[name]);
  loadProjectSounds(["pop"]);
}

function setup() {
  const canvas = makeCanvas("ME-MARRT. Drag the products; click a message. R resets; S saves.");
  storeBackground = makeStoreBackground();
  resetLandingScene();
  canvas.elt.dataset.sceneReady = "true";
}

function resetLandingScene() {
  for (const item of storeItems) if (item.texture) item.texture.remove();
  storeItems = [];
  heldItem = null;
  for (let i = 0; i < PRODUCT_ROWS.length; i++) addProduct(PRODUCT_ROWS[i], i);
  const barcodeCount = floor(random(3, 6));
  for (let i = 0; i < barcodeCount; i++) addBarcode(i);
  changeOutfit();
  resetLandingArt();
  cartX = -350;
  cartRunning = false;
  nextCart = millis() + random(5000, 8000);
}

// Reuse the original pixel-sampled tracking and side-message artwork unchanged.
function resetLandingArt() {
  const logoBounds = { x: 515, y: 18, w: 890, h: 268 };
  landingArt = new FrameArt(W, H, AREA, logoBounds, {
    onMessageAppear: () => playEffect("pop", 0.12),
    onMessageDismiss: () => playEffect("pop", 0.16),
  });
}

function addProduct(row, index) {
  const crop = LANDING_CROPS[row[0]];
  const scale = min(row[2] / crop[2], row[3] / crop[3]) * 0.8;
  const y = -180 - index * 115;
  storeItems.push(new StoreItem(row[0], row[1], y, crop[2] * scale, crop[3] * scale));
}

function addBarcode(index) {
  const x = index % 3 === 0 ? random(485, 610) : random(1310, 1435);
  const item = new StoreItem("barcode", x, -100 - index * 170, random(150, 195), 50);
  item.barColor = random(["#08BEFF", "#FFFF00"]);
  for (let x = 8; x < 188; x += random(3, 7)) item.bars.push([x, random(1, 3)]);
  item.texture = makeBarcodePicture(item);
  storeItems.push(item);
}

function makeBarcodePicture(item) {
  const picture = createGraphics(200, 70);
  picture.pixelDensity(1);
  picture.background(item.barColor);
  picture.noStroke();
  picture.fill(0);
  for (let bar of item.bars) picture.rect(bar[0], 6, bar[1], 45);
  picture.textSize(9);
  picture.textAlign(CENTER, CENTER);
  picture.text("N o .  0 0 0 0 0 0 1", 100, 61);
  return picture;
}

function draw() {
  if (aboutOpen) return;
  imageMode(CORNER);
  image(storeBackground, 0, 0);
  landingArt.draw(drawingContext, millis());
  drawYellowCircle();
  updateProducts();
  drawCharacter();
  landingArt.drawTrackingLinks(drawingContext);
  drawLandingLogo();
  drawPassingCart();
}

function drawYellowCircle() {
  noStroke();
  fill("#FFFF00");
  circle(YELLOW.x, YELLOW.y, YELLOW.r * 2);
}

function updateProducts() {
  for (let item of storeItems) item.update();
  for (let i = 0; i < storeItems.length; i++) {
    for (let j = i + 1; j < storeItems.length; j++) storeItems[i].bounce(storeItems[j]);
  }
  for (let item of storeItems) {
    item.avoidCircle();
    item.keepInStage();
    item.display();
  }
}

function drawLandingLogo() {
  const logo = pictures.logo;
  const h = (850 * logo.height) / logo.width;
  image(logo, 535, 155 - h / 2, 850, h);
}

// The full static PNG fits by its diagonal, so rotation never cuts its arms or feet.
function drawCharacter() {
  if (millis() > nextLook) changeOutfit();
  bodyAngle += 0.00125;
  drawRotatingBody();
  drawHead();
  drawClothes();
}

function drawRotatingBody() {
  const body = pictures.body;
  const scale = (YELLOW.r * 2 - 24) / sqrt(body.width * body.width + body.height * body.height);
  const w = body.width * scale;
  const h = body.height * scale;
  push();
  translate(YELLOW.x, YELLOW.y);
  rotate(bodyAngle);
  image(body, -w / 2, -h / 2, w, h);
  trackLandingPicture(body, w, h, "rotating-body", null, 3);
  pop();
}

function changeOutfit() {
  topNumber = ((topNumber + floor(random(1, 3)) - 1) % 3) + 1;
  downNumber = ((downNumber + floor(random(1, 3)) - 1) % 3) + 1;
  headColor = random(["#08BEFF", "#FF2396", "#FDCFDE", "#FF6919", "#EE2724"]);
  headPoints = [];
  const sides = floor(random(4, 12));
  for (let i = 0; i < sides; i++) {
    const angle = (i * TWO_PI) / sides;
    headPoints.push([cos(angle) * random(35, 62), sin(angle) * random(38, 60)]);
  }
  nextLook = millis() + 180;
}

// The abstract head has no facial features and sits between body and clothing.
function drawHead() {
  push();
  translate(YELLOW.x, YELLOW.y - 181);
  noStroke();
  fill(headColor);
  rect(-9, 12, 18, 52);
  beginShape();
  for (let point of headPoints) vertex(point[0], point[1]);
  endShape(CLOSE);
  pop();
}

function drawClothes() {
  const down = "down" + downNumber;
  const crop = LANDING_CROPS[down];
  const width = (240 * crop[2]) / crop[3];
  drawGarment(down, width, 240, YELLOW.y - 18);
  const top = "top" + topNumber;
  const topCrop = LANDING_CROPS[top];
  const height = 170;
  const topWidth = (height * topCrop[2]) / topCrop[3];
  drawGarment(top, topWidth, height, YELLOW.y + 4 - height);
}

function drawGarment(name, width, height, top) {
  const c = LANDING_CROPS[name];
  image(pictures[name], YELLOW.x - width / 2, top, width, height, c[0], c[1], c[2], c[3]);
  push();
  translate(YELLOW.x, top + height / 2);
  trackLandingPicture(pictures[name], width, height, "outfit:" + name, c, 2);
  pop();
}

// FrameArt expects a centre-origin image and reads the active canvas transform.
function trackLandingPicture(picture, width, height, id, crop, count = 1) {
  const bounds = crop
    ? { x: crop[0], y: crop[1], w: crop[2], h: crop[3] }
    : { x: 0, y: 0, w: picture.width, h: picture.height };
  landingArt.trackImage(drawingContext, picture.canvas, bounds, width, height, id, count);
}

function drawPassingCart() {
  if (!cartRunning && millis() > nextCart) cartRunning = true;
  if (!cartRunning) return;
  cartX += 7;
  image(pictures.cart, cartX, 815, 265, 253);
  if (cartX > W) {
    cartX = -350;
    cartRunning = false;
    nextCart = millis() + random(5000, 8000);
  }
}

function mousePressed() {
  if (aboutOpen || landingArt.dismissMessageAt({ x: mouseX, y: mouseY }, millis())) return;
  for (let i = storeItems.length - 1; i >= 0; i--) {
    if (storeItems[i].contains(mouseX, mouseY)) {
      heldItem = storeItems[i];
      heldItem.vx = 0;
      heldItem.vy = 0;
      return false;
    }
  }
}

function mouseDragged() {
  if (aboutOpen || !heldItem) return;
  heldItem.vx = constrain(mouseX - pmouseX, -18, 18);
  heldItem.vy = constrain(mouseY - pmouseY, -18, 18);
  heldItem.x = mouseX;
  heldItem.y = mouseY;
  heldItem.entered = true;
  heldItem.keepInStage();
  heldItem.avoidCircle();
  return false;
}

function mouseReleased() {
  heldItem = null;
}

function keyPressed() {
  if (aboutOpen) return;
  if (key === "r" || key === "R") resetLandingScene();
  if (key === "s" || key === "S") saveCanvas("me-marrt", "png");
}

class StoreItem {
  constructor(name, x, y, width, height) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.w = width;
    this.h = height;
    this.vx = random(-1, 1);
    this.vy = random(1, 3);
    this.angle = random(-0.12, 0.12);
    this.entered = false;
    this.bars = [];
    this.id = storeItems.length;
  }

  update() {
    if (this === heldItem) return;
    this.vy += 0.28;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.994;
    this.angle = this.angle * 0.96 + this.vx * 0.003;
    if (this.y - this.h / 2 > AREA.top) this.entered = true;
    this.avoidCircle();
    this.keepInStage();
  }

  keepInStage() {
    if (this.x < AREA.left + this.w / 2 || this.x > AREA.right - this.w / 2) this.vx *= -0.72;
    this.x = constrain(this.x, AREA.left + this.w / 2, AREA.right - this.w / 2);
    if (this.y > AREA.bottom - this.h / 2) {
      this.y = AREA.bottom - this.h / 2;
      this.vy = -abs(this.vy) * 0.62;
    }
    if (this.entered && this.y < AREA.top + this.h / 2) {
      this.y = AREA.top + this.h / 2;
      this.vy = abs(this.vy) * 0.62;
    }
  }

  // The nearest point on a box gives a simple circle collision without a library.
  avoidCircle() {
    const x = constrain(YELLOW.x, this.x - this.w / 2, this.x + this.w / 2);
    const y = constrain(YELLOW.y, this.y - this.h / 2, this.y + this.h / 2);
    const distance = dist(x, y, YELLOW.x, YELLOW.y);
    if (distance === 0) this.escapeCircle();
    if (distance >= YELLOW.r || distance === 0) return;
    const nx = (x - YELLOW.x) / distance;
    const ny = (y - YELLOW.y) / distance;
    this.x += nx * (YELLOW.r - distance + 1);
    this.y += ny * (YELLOW.r - distance + 1);
    this.reflect(nx, ny);
  }

  escapeCircle() {
    const side = this.x < YELLOW.x ? -1 : 1;
    this.x = YELLOW.x + side * (YELLOW.r + this.w / 2 + 1);
    this.vx = side * max(abs(this.vx), 2);
  }

  reflect(nx, ny) {
    const speed = this.vx * nx + this.vy * ny;
    if (speed >= 0) return;
    this.vx -= 1.65 * speed * nx;
    this.vy -= 1.65 * speed * ny;
  }

  bounce(other) {
    if (this.y < AREA.top || other.y < AREA.top) return;
    const overlapX = (this.w + other.w) / 2 - abs(this.x - other.x);
    const overlapY = (this.h + other.h) / 2 - abs(this.y - other.y);
    if (overlapX <= 0 || overlapY <= 0) return;
    if (overlapX < overlapY) this.separate(other, overlapX, true);
    else this.separate(other, overlapY, false);
  }

  separate(other, overlap, horizontal) {
    const sign = horizontal ? (this.x < other.x ? -1 : 1) : this.y < other.y ? -1 : 1;
    const shift = (sign * (overlap + 1)) / 2;
    if (horizontal) {
      if (this !== heldItem) this.x += shift;
      if (other !== heldItem) other.x -= shift;
      this.exchangeSpeed(other, "vx");
    } else {
      if (this !== heldItem) this.y += shift;
      if (other !== heldItem) other.y -= shift;
      this.exchangeSpeed(other, "vy");
    }
  }

  exchangeSpeed(other, axis) {
    const speed = this[axis];
    if (this !== heldItem) this[axis] = other[axis] * 0.75;
    if (other !== heldItem) other[axis] = speed * 0.75;
  }

  contains(x, y) {
    return abs(x - this.x) < this.w / 2 && abs(y - this.y) < this.h / 2;
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    if (this.name === "barcode") this.drawBarcode();
    else {
      const c = LANDING_CROPS[this.name];
      image(pictures[this.name], -this.w / 2, -this.h / 2, this.w, this.h, c[0], c[1], c[2], c[3]);
    }
    this.trackPicture();
    pop();
  }

  drawBarcode() {
    image(this.texture, -this.w / 2, -this.h / 2, this.w, this.h);
  }

  trackPicture() {
    if (!this.entered) return;
    const picture = this.name === "barcode" ? this.texture : pictures[this.name];
    const crop = this.name === "barcode" ? null : LANDING_CROPS[this.name];
    trackLandingPicture(picture, this.w, this.h, "asset:" + this.id, crop);
  }
}
