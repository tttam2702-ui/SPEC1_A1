// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted artwork, rewritten with basic p5 drawing, arrays, loops and classes.
// The products and messages are fictional promises of a better self.
let cartImage, storeBackground, meltPicture;
let products = [],
  words = [],
  patches = [],
  notices = [];
let state = "intro",
  paused = false,
  collected = 0,
  meltClicks = 0;
let noticeFrame = 0,
  noticeBeat = 0,
  noticeNumber = 0;
let returnAt = 0,
  returnEnd = 0;
const NOTICE_BEATS = [3, 27, 41, 54, 67];
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
// Edit these short messages to change the story of the artwork.
const NOTICE_MESSAGES = [
  ["SELF-IMPROVEMENT UPDATE", "Your new self is ready. Your old self is still in the cart."],
  ["IDENTITY NOT FOUND", "We searched every aisle. Have you tried being someone else?"],
  ["CART CAPACITY EXCEEDED", "There is no more room for the person you are supposed to become."],
  [
    "ANOTHER BETTER YOU",
    "A newer version of you has arrived. This version is already out of date.",
  ],
  ["UNEXPECTED ITEM", "An unpurchased feeling was found in the bagging area."],
  ["FIX IN PROGRESS", "Please wait. We are fixing something that was never broken."],
  ["SATISFACTION PENDING", "Your order was delivered. The feeling was not included."],
  ["SPECIAL OFFER", "Buy one new identity. Get another expectation absolutely free."],
  ["COMPARISON LOOP", "Someone else has a better version. Would you like to keep looking?"],
  ["NOT ENOUGH, AGAIN", "You have everything you asked for. The list has become longer."],
  ["RETURN REQUEST", "The old you has no receipt. Please keep it somewhere safe."],
  ["PERFECTION UNAVAILABLE", "This item is out of stock. More alternatives are on the way."],
  ["STILL PROCESSING", "Your cart is full. Why does it still feel empty?"],
  ["ACCEPTANCE REQUIRED", "Click OK to accept yourself. Receive more things to change."],
  ["ME-MARRT REASSURANCE", "You do not need to buy your way into being a person."],
];

function preload() {
  cartImage = loadImage("assets/cart_challenge.png");
  loadProjectSounds(["item", "start", "datamosh", "notification", "ok", "transition"]);
}

function setup() {
  const canvas = makeCanvas(
    "Falling products, a melting shopping cart and fictional artwork messages",
  );
  canvas.elt.tabIndex = 0;
  storeBackground = makeStoreBackground(false);
  textFont("Arial");
  frameRate(60);
  document.getElementById("challenge-start").onclick = startChallenge;
  document.getElementById("challenge-pause").onclick = pauseChallenge;
  document.getElementById("challenge-restart").onclick = restartChallenge;
  document.getElementById("challenge-start").focus();
}

function draw() {
  if (aboutOpen || paused) return;
  if (state === "intro" || state === "collect") drawShopping();
  if (state === "melt" || state === "notifications") drawMelting();
  if (state === "notifications") drawNotifications();
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
  patches = [];
  notices = [];
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
  else if (state === "notifications") clickNotice(mouseX, mouseY);
}

function keyPressed(event) {
  if (keyCode !== ENTER || aboutOpen || paused) return;
  if (event && ["BUTTON", "A"].includes(event.target.tagName)) return;
  if (state === "collect") catchLowest();
  else if (state === "melt") meltAt(random(100, W - 100), random(100, H - 100));
  else if (state === "notifications") acceptLatestNotice();
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
  meltPicture = get();
  meltAt(x, y);
  setStatus("Each click now melts another area. Click around the picture, or press Enter.");
}

function meltAt(x, y) {
  patches.push(new MeltPatch(x, y));
  meltClicks++;
  if (patches.length > 24) patches.shift();
  if (meltClicks >= 8 && state === "melt") beginNotifications();
}

// Copy narrow pieces of the photo downward, then keep the changed picture.
function drawMelting() {
  loopEffect("datamosh", 0.045);
  image(meltPicture, 0, 0, W, H);
  for (const patch of patches) patch.show();
  if (frameCount % 3 === 0) meltPicture = get();
  drawWords();
}

function beginNotifications() {
  state = "notifications";
  document.getElementById("challenge-stage").classList.add("is-art-ending");
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) patches.push(new MeltPatch(col * 480 + 200, row * 340 + 100));
  }
  replayNotifications();
  setStatus("Artwork messages are appearing. Click OK, or press Enter, to receive more.");
}

function replayNotifications() {
  noticeFrame = frameCount;
  noticeBeat = 0;
  playEffect("notification", 0.35);
}

function drawNotifications() {
  if (noticeBeat < NOTICE_BEATS.length && frameCount - noticeFrame >= NOTICE_BEATS[noticeBeat]) {
    for (let i = 0; i < 3; i++)
      addNotice(65 + noticeBeat * 260 + i * 22, 50 + noticeBeat * 140 + i * 24);
    if (noticeBeat > 1) addNotice();
    noticeBeat++;
  }
  for (let i = notices.length - 1; i >= 0; i--) {
    if (notices[i].dismiss === 0) notices.splice(i, 1);
  }
  for (const notice of notices) notice.show();
  if (returnAt > 0 && millis() >= returnAt) beginReturn();
}

function addNotice(x = random(30, W - 490), y = random(30, H - 270)) {
  notices.push(new Notice(x, y, noticeNumber));
  noticeNumber++;
  if (notices.length > 16) notices.shift();
}

function clickNotice(x, y) {
  for (let i = notices.length - 1; i >= 0; i--) {
    if (notices[i].hit(x, y)) {
      acceptNotice(notices[i]);
      return;
    }
    if (notices[i].contains(x, y)) return;
  }
}

function acceptLatestNotice() {
  for (let i = notices.length - 1; i >= 0; i--) {
    if (notices[i].dismiss === -1) {
      acceptNotice(notices[i]);
      return;
    }
  }
}

function acceptNotice(notice) {
  if (notice.dismiss !== -1) return;
  notice.dismiss = 12;
  if (returnAt === 0) returnAt = millis() + 12000;
  meltPicture = get();
  patches.push(new MeltPatch(notice.x + 200, notice.y + 80));
  if (patches.length > 24) patches.shift();
  playEffect("ok", 0.35);
  addNotice();
  addNotice();
  replayNotifications();
}

function beginReturn() {
  state = "return";
  returnEnd = millis() + 1900;
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
  stage.dataset.notifications = notices.length;
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

class MeltPatch {
  constructor(x, y) {
    this.x = constrain(x, 100, W - 100);
    this.y = constrain(y, 20, H - 30);
    this.drop = 1;
  }

  show() {
    for (let i = 0; i < 5; i++) {
      const x = constrain(this.x + random(-150, 150), 0, W - 90);
      const y = constrain(this.y + random(-90, 90), 0, H - 12);
      const w = random(12, 90);
      copy(meltPicture, x, y, w, 8, x + random(-12, 12), y + this.drop, w, 24 + this.drop);
    }
    this.drop = min(this.drop + 2.5, 320);
  }
}

class Notice {
  constructor(x, y, number) {
    this.x = constrain(x, 15, W - 475);
    this.y = constrain(y, 15, H - 250);
    this.words = NOTICE_MESSAGES[number % NOTICE_MESSAGES.length];
    this.dismiss = -1;
  }

  show() {
    push();
    translate(this.x, this.y);
    if (this.dismiss > 0) translate(random(-18, 18), random(-5, 5));
    this.drawPanel();
    this.drawMessage();
    this.drawButton();
    pop();
    if (this.dismiss > 0) this.dismiss--;
  }

  drawPanel() {
    stroke("#FFFFFF");
    strokeWeight(3);
    fill("#CACACA");
    rect(0, 0, 460, 235);
    noStroke();
    fill("#0714AD");
    rect(5, 5, 450, 36);
    fill("#FFFF00");
    triangle(35, 65, 15, 105, 55, 105);
  }

  drawMessage() {
    noStroke();
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    textSize(19);
    fill("#FFFFFF");
    text(this.words[0], 12, 13);
    fill("#111111");
    textSize(23);
    text("!", 31, 78);
    textStyle(NORMAL);
    text(this.words[1], 75, 64, 365, 100);
  }

  drawButton() {
    fill("#CACACA");
    stroke("#111111");
    strokeWeight(2);
    rect(178, 180, 104, 37);
    fill("#111111");
    noStroke();
    textSize(21);
    textAlign(CENTER, CENTER);
    text("OK", 230, 199);
  }

  hit(x, y) {
    return (
      this.dismiss === -1 &&
      x > this.x + 178 &&
      x < this.x + 282 &&
      y > this.y + 180 &&
      y < this.y + 217
    );
  }

  contains(x, y) {
    return x > this.x && x < this.x + 460 && y > this.y && y < this.y + 235;
  }
}
