// SPDX-License-Identifier: GPL-3.0-or-later
// AI-assisted implementation, revised into named helpers for this project.
// Tracking samples existing images; its visual web never mutates physics bodies.
class FrameArt {
  constructor(width, height, area, logoBounds, callbacks = {}) {
    this.width = width;
    this.height = height;
    this.area = { ...area };
    this.logoBounds = { ...logoBounds };
    this.setCallbacks(callbacks);
    this.seed = (Date.now() ^ 0x71a9c35d) >>> 0;
    this.initializeTracking();
    this.initializeMessages();
    this.initializeZones();
    this.greenFragments = Array.from({ length: 18 }, (_, i) => this.makeGreenFragment(i));
  }

  setCallbacks({ onMessageAppear, onMessageDismiss }) {
    this.onMessageAppear = typeof onMessageAppear === "function" ? onMessageAppear : null;
    this.onMessageDismiss = typeof onMessageDismiss === "function" ? onMessageDismiss : null;
  }

  initializeTracking() {
    this.imageCache = new WeakMap();
    this.features = new Map();
    this.trackedPoints = [];
    this.trackingTime = 0;
  }

  initializeMessages() {
    this.messages = [];
    this.phrases = [
      "I love this!",
      "this is so me",
      "new me?",
      "try me on",
      "100% you",
      "one more version",
      "me, again.",
      "same me. new look.",
    ];
  }

  initializeZones() {
    const { left, right, bottom } = this.area;
    this.zones = [
      { x: 26, y: 34, w: left - 52, h: bottom - 68 },
      { x: right + 26, y: 34, w: this.width - right - 52, h: bottom - 68 },
    ];
  }

  makeGreenFragment(index) {
    const zone = this.zones[index % 2];
    const shape = index % 7 === 0 ? "cluster" : index % 3 === 0 ? "bar" : "square";
    const w = shape === "square" ? this.random(22, 34) : this.random(75, 122);
    const h = shape === "cluster" ? this.random(36, 54) : this.random(18, 29);
    const rowY = 56 + (Math.floor(index / 2) * (this.area.bottom - 130)) / 8;
    return {
      shape,
      w,
      h,
      x: this.random(zone.x + 14, zone.x + zone.w - w - 20),
      y: Math.min(this.area.bottom - h - 24, rowY + this.random(-12, 12)),
      phase: this.random(0, Math.PI * 2),
    };
  }

  random(min = 0, max = 1) {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return min + (this.seed / 4294967296) * (max - min);
  }

  pick(items) {
    return items[Math.floor(this.random(0, items.length))];
  }

  trackingNoise(phase, tick) {
    const value = Math.sin(phase * 127.1 + tick * 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  drawGreenFragments(ctx, now) {
    const tick = Math.floor(now / 90);
    const lock = Math.floor(now / 450);
    ctx.save();
    for (const fragment of this.greenFragments) this.drawGreenFragment(ctx, fragment, tick, lock);
    ctx.restore();
  }

  drawGreenFragment(ctx, fragment, tick, lock) {
    const flicker = this.trackingNoise(fragment.phase, tick);
    if (flicker < 0.23) return;
    const x = fragment.x + (this.trackingNoise(fragment.phase + 3, lock) - 0.5) * 20;
    const y = fragment.y + (this.trackingNoise(fragment.phase + 7, tick) - 0.5) * 8;
    const width = fragment.w * (0.76 + flicker * 0.28);
    ctx.fillStyle = flicker > 0.87 ? "#35FF00" : "#00E000";
    this.paintFragmentShape(ctx, fragment, x, y, width);
    if (flicker > 0.82) ctx.fillRect(x - 8, y + fragment.h * 0.58, width * 0.64, 3);
  }

  paintFragmentShape(ctx, fragment, x, y, width) {
    const height = fragment.h;
    if (fragment.shape !== "cluster") {
      ctx.fillRect(x, y, width, fragment.shape === "square" ? width : height);
      return;
    }
    ctx.fillRect(x, y, width, height * 0.58);
    ctx.fillRect(x + width * 0.23, y - height * 0.36, width * 0.3, height * 1.25);
    ctx.fillRect(x + width * 0.76, y + height * 0.28, width * 0.36, height * 0.28);
  }

  roundedRect(ctx, x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  makeMessage(ctx, slot, born) {
    const zone = this.zones[slot % this.zones.length];
    const text = this.pick(this.phrases);
    const fontSize = slot % 4 === 0 ? this.random(28, 33) : this.random(21, 27);
    ctx.font = `500 ${fontSize}px Arial, sans-serif`;
    const w = Math.min(zone.w - 28, ctx.measureText(text).width + 34);
    const message = this.messageRecord(text, fontSize, w, zone, born);
    this.placeMessage(message, slot);
    this.bakeMessage(message);
    return message;
  }

  messageRecord(text, fontSize, w, zone, born) {
    return {
      text,
      fontSize,
      w,
      h: fontSize + 28,
      zone,
      born,
      ...this.messageAppearance(),
      dismissedAt: null,
      appearanceNotified: false,
      layout: null,
    };
  }

  messageAppearance() {
    return {
      life: this.random(12000, 18000),
      color: this.pick(["#087CFF", "#087CFF", "#087CFF", "#EF426A", "#E92D28"]),
      phase: this.random(0, Math.PI * 2),
      tailRight: this.random() > 0.5,
    };
  }

  placeMessage(message, slot) {
    const { zone, w, h } = message;
    for (let attempt = 0; attempt < 36; attempt++) {
      message.x = this.random(zone.x + 14, zone.x + zone.w - w - 14);
      message.y = this.random(zone.y + 14, zone.y + zone.h - h - 14);
      if (!this.messages.some((other) => this.messagesOverlap(message, other, slot))) break;
    }
  }

  messagesOverlap(message, other, slot) {
    if (!other || other === this.messages[slot]) return false;
    return (
      message.x < other.x + other.w + 14 &&
      message.x + message.w + 14 > other.x &&
      message.y < other.y + other.h + 20 &&
      message.y + message.h + 20 > other.y
    );
  }

  messageCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);
    return canvas;
  }

  bakeMessage(message) {
    const sprite = this.messageCanvas(message.w + 48, message.h + 28);
    const ctx = sprite.getContext("2d");
    ctx.translate(24, 10);
    ctx.fillStyle = message.color;
    this.roundedRect(ctx, 0, 0, message.w, message.h, message.h * 0.43);
    ctx.fill();
    this.paintMessageTail(ctx, message);
    this.paintMessageText(ctx, message);
    message.sprite = sprite;
    message.ghosts = ["#08FFFF", "#FF2396"].map((color) => this.makeMessageGhost(sprite, color));
  }

  paintMessageTail(ctx, message) {
    const x = message.tailRight ? message.w - 14 : 14;
    const direction = message.tailRight ? 1 : -1;
    const h = message.h;
    ctx.beginPath();
    ctx.moveTo(x, h - 17);
    ctx.quadraticCurveTo(x + direction * 6, h - 3, x + direction * 18, h + 2);
    ctx.quadraticCurveTo(x - direction * 7, h + 4, x - direction * 8, h - 10);
    ctx.closePath();
    ctx.fill();
  }

  paintMessageText(ctx, message) {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `500 ${message.fontSize}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message.text, message.w / 2, message.h / 2 + 1, message.w - 24);
  }

  makeMessageGhost(sprite, color) {
    const ghost = this.messageCanvas(sprite.width, sprite.height);
    const ctx = ghost.getContext("2d");
    ctx.drawImage(sprite, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, ghost.width, ghost.height);
    return ghost;
  }

  messageLayout(message, now) {
    if (message.dismissedAt !== null) return message.glitchLayout;
    const t = Math.max(0, Math.min(1, (now - message.born) / 620));
    const scale = t >= 1 ? 1 : Math.max(0.025, 1 - Math.exp(-7 * t) * Math.cos(12 * t));
    const x = this.messagePosition(message, "x", Math.sin(now * 0.0005 + message.phase) * 6);
    const y = this.messagePosition(message, "y", Math.cos(now * 0.00045 + message.phase) * 5);
    return {
      x,
      y,
      scale,
      anchorX: message.tailRight ? x + message.w - 14 : x + 14,
      anchorY: y + message.h,
    };
  }

  messagePosition(message, axis, offset) {
    const size = axis === "x" ? "w" : "h";
    const min = message.zone[axis] + 3;
    const max = message.zone[axis] + message.zone[size] - message[size] - 3;
    return Math.max(min, Math.min(max, message[axis] + offset));
  }

  glitchMessage(ctx, message, now, layout) {
    const progress = Math.min(1, (now - message.dismissedAt) / 320);
    const frame = Math.floor((now - message.dismissedAt) / 32);
    const stripe = Math.ceil(message.sprite.height / 8);
    for (let band = 0; band < 8; band++) {
      this.paintMessageBand(ctx, message, { progress, frame, stripe, band, layout });
    }
  }

  paintMessageBand(ctx, message, { progress, frame, stripe, band, layout }) {
    const noise = (Math.sin((band + 1) * 41.7 + frame * 23.1 + message.phase) + 1) / 2;
    const sy = band * stripe;
    const sh = Math.min(stripe, message.sprite.height - sy);
    if (noise < progress * 0.95 || sh <= 0) return;
    const shift = Math.sin(band * 11 + frame * 8 + message.phase) * (12 + progress * 32);
    const dx = layout.x - 24 + shift;
    const dy = layout.y - 10 + sy;
    this.paintGhostBands(ctx, message, sy, sh, dx, dy);
    this.paintSpriteBand(ctx, message.sprite, sy, sh, dx, dy);
  }

  paintSpriteBand(ctx, sprite, sy, sh, dx, dy) {
    ctx.drawImage(sprite, 0, sy, sprite.width, sh, dx, dy, sprite.width, sh);
  }

  paintGhostBands(ctx, message, sy, sh, dx, dy) {
    const width = message.sprite.width;
    ctx.globalAlpha = 0.55;
    ctx.drawImage(message.ghosts[0], 0, sy, width, sh, dx - 7, dy, width, sh);
    ctx.drawImage(message.ghosts[1], 0, sy, width, sh, dx + 7, dy + 1, width, sh);
    ctx.globalAlpha = 1;
  }

  drawMessages(ctx, now) {
    for (let slot = 0; slot < 12; slot++) {
      const message = this.messageForSlot(ctx, slot, now);
      if (now < message.born) {
        message.layout = null;
        continue;
      }
      this.updateMessage(message, now);
      this.paintMessage(ctx, message, now);
    }
  }

  messageForSlot(ctx, slot, now) {
    if (!this.messages[slot]) this.messages[slot] = this.makeMessage(ctx, slot, now + slot * 390);
    const message = this.messages[slot];
    if (message.dismissedAt !== null && now - message.dismissedAt >= 320) {
      this.messages[slot] = this.makeMessage(ctx, slot, now + this.random(1400, 3600));
    }
    return this.messages[slot];
  }

  updateMessage(message, now) {
    message.layout = this.messageLayout(message, now);
    if (!message.appearanceNotified) {
      message.appearanceNotified = true;
      if (this.onMessageAppear) this.onMessageAppear(message, now);
    }
    if (message.dismissedAt === null && now - message.born > message.life) {
      message.dismissedAt = now;
      message.glitchLayout = { ...message.layout };
    }
  }

  paintMessage(ctx, message, now) {
    const layout = message.layout;
    ctx.save();
    ctx.translate(layout.anchorX, layout.anchorY);
    ctx.scale(layout.scale, layout.scale);
    ctx.translate(-layout.anchorX, -layout.anchorY);
    if (message.dismissedAt === null) ctx.drawImage(message.sprite, layout.x - 24, layout.y - 10);
    else this.glitchMessage(ctx, message, now, layout);
    ctx.restore();
  }

  isMessageArea(point) {
    const area = this.area;
    const logo = this.logoBounds;
    const inFrame = this.pointWithin(point, 0, 0, this.width, area.bottom);
    const inArea = this.pointWithin(point, area.left, area.top, area.right, area.bottom);
    const inLogo = this.pointWithin(point, logo.x, logo.y, logo.x + logo.w, logo.y + logo.h);
    return inFrame && point.y < area.bottom && !inArea && !inLogo;
  }

  pointWithin(point, left, top, right, bottom) {
    return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
  }

  messageAtPoint(point) {
    if (!this.isMessageArea(point)) return null;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.pointInsideMessage(point, this.messages[i])) return this.messages[i];
    }
    return null;
  }

  pointInsideMessage(point, message) {
    const layout = message.layout;
    if (!layout || message.dismissedAt !== null || layout.scale < 0.15) return false;
    const x = layout.anchorX + (point.x - layout.anchorX) / layout.scale;
    const y = layout.anchorY + (point.y - layout.anchorY) / layout.scale;
    return x >= layout.x && x <= layout.x + message.w && y >= layout.y && y <= layout.y + message.h;
  }

  dismissMessageAt(point, now) {
    const message = this.messageAtPoint(point);
    if (!message) return false;
    message.dismissedAt = now;
    message.glitchLayout = { ...message.layout };
    if (this.onMessageDismiss) this.onMessageDismiss(message, now);
    return true;
  }

  heatmapFor(source) {
    if (!source || !source.width || !source.height) return null;
    if (this.imageCache.has(source)) return this.imageCache.get(source);
    const canvas = this.messageCanvas(source.width, source.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.colorizeHeatmap(pixels.data);
    ctx.putImageData(pixels, 0, 0);
    const result = { canvas, pixels: pixels.data, width: canvas.width, height: canvas.height };
    this.imageCache.set(source, result);
    return result;
  }

  // Transparent pixels stay transparent, so heat patches follow the cut-out images.
  colorizeHeatmap(pixels) {
    const colors = [
      [37, 24, 100],
      [163, 40, 251],
      [255, 42, 137],
      [255, 102, 39],
      [246, 255, 32],
      [74, 255, 145],
    ];
    for (let i = 0; i < pixels.length; i += 4) {
      if (!pixels[i + 3]) continue;
      const brightness = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114) / 255;
      const level = Math.min(colors.length - 1.001, brightness * (colors.length - 1));
      this.blendHeatmapPixel(pixels, i, colors, level);
    }
  }

  blendHeatmapPixel(pixels, index, colors, level) {
    const lower = Math.floor(level);
    const blend = level - lower;
    for (let channel = 0; channel < 3; channel++) {
      pixels[index + channel] =
        colors[lower][channel] * (1 - blend) + colors[lower + 1][channel] * blend;
    }
  }

  opaqueAt(heatmap, crop, u, v, threshold = 101) {
    const x = Math.min(heatmap.width - 1, Math.floor(crop.x + u * crop.w));
    const y = Math.min(heatmap.height - 1, Math.floor(crop.y + v * crop.h));
    return heatmap.pixels[(y * heatmap.width + x) * 4 + 3] >= threshold;
  }

  makeFeature(heatmap, crop) {
    let u, v;
    for (let attempt = 0; attempt < 80; attempt++) {
      u = this.random(0.2, 0.8);
      v = this.random(0.2, 0.8);
      if (this.opaqueAt(heatmap, crop, u, v)) break;
    }
    return { u, v, size: this.random(0.2, 0.31), phase: this.random(0, Math.PI * 2) };
  }

  trackImage(ctx, source, crop, width, height, id, count = 1) {
    const heatmap = this.heatmapFor(source);
    if (!heatmap || !crop) return;
    if (!this.features.has(id)) {
      this.features.set(
        id,
        Array.from({ length: count }, () => this.makeFeature(heatmap, crop)),
      );
    }
    for (const feature of this.features.get(id)) {
      this.drawFeature(ctx, feature, heatmap, crop, width, height);
    }
  }

  // Quantized clocks continuously reacquire targets, even when an image is still.
  featurePosition(feature, tick, lock) {
    const noise = (offset, clock) => this.trackingNoise(feature.phase + offset, clock) - 0.5;
    return {
      u: Math.max(0.12, Math.min(0.88, feature.u + noise(0, lock) * 0.3 + noise(2, tick) * 0.036)),
      v: Math.max(0.12, Math.min(0.88, feature.v + noise(7, lock) * 0.24 + noise(4, tick) * 0.036)),
    };
  }

  featureBox(feature, position, tick, width, height) {
    const pulse = 0.84 + this.trackingNoise(feature.phase + 11, tick) * 0.3;
    const size = Math.min(80, Math.min(width, height) * 0.56, width * feature.size * pulse);
    const x = Math.max(
      -width / 2,
      Math.min(width / 2 - size, -width / 2 + position.u * width - size / 2),
    );
    const y = Math.max(
      -height / 2,
      Math.min(height / 2 - size, -height / 2 + position.v * height - size / 2),
    );
    return { x, y, size };
  }

  featureSample(box, crop, width, height) {
    return {
      sx: crop.x + ((box.x + width / 2) / width) * crop.w,
      sy: crop.y + ((box.y + height / 2) / height) * crop.h,
      sw: (box.size / width) * crop.w,
      sh: (box.size / height) * crop.h,
    };
  }

  drawFeature(ctx, feature, heatmap, crop, width, height) {
    const tick = Math.floor((this.trackingTime + feature.phase * 31) / 75);
    const lock = Math.floor((this.trackingTime + feature.phase * 77) / 280);
    let position = this.featurePosition(feature, tick, lock);
    if (!this.opaqueAt(heatmap, crop, position.u, position.v, 100)) position = feature;
    const box = this.featureBox(feature, position, tick, width, height);
    const sample = this.featureSample(box, crop, width, height);
    const flash = this.trackingNoise(feature.phase + 17, tick);
    this.recordTrackedPoint(ctx, box, feature.phase);
    if (flash < 0.16) return;
    this.paintFeature(ctx, { feature, heatmap, box, sample, flash, tick, u: position.u });
  }

  recordTrackedPoint(ctx, box, phase) {
    const matrix = ctx.getTransform();
    const x = box.x + box.size / 2;
    const y = box.y + box.size / 2;
    this.trackedPoints.push({
      x: matrix.a * x + matrix.c * y + matrix.e,
      y: matrix.b * x + matrix.d * y + matrix.f,
      phase,
    });
  }

  paintFeature(ctx, data) {
    ctx.save();
    ctx.globalAlpha = data.flash < 0.42 ? 0.46 : 0.98;
    this.paintHeatmapPatch(ctx, data);
    this.paintFeatureBorders(ctx, data);
    this.paintFeatureLabel(ctx, data.box, data.u);
    ctx.restore();
  }

  paintHeatmapPatch(ctx, data) {
    const { sx, sy, sw, sh } = data.sample;
    const { x, y, size } = data.box;
    if (data.flash <= 0.72) {
      ctx.drawImage(data.heatmap.canvas, sx, sy, sw, sh, x, y, size, size);
      return;
    }
    for (let band = 0; band < 3; band++) this.paintHeatmapBand(ctx, data, band);
  }

  paintHeatmapBand(ctx, { feature, tick, heatmap, sample, box }, band) {
    const { sx, sy, sw, sh } = sample;
    const { x, y, size } = box;
    const shift = (this.trackingNoise(feature.phase + band + 23, tick) - 0.5) * 12;
    const source = [sx, sy + (sh * band) / 3, sw, sh / 3];
    const destination = [x + shift, y + (size * band) / 3, size, size / 3];
    ctx.drawImage(heatmap.canvas, ...source, ...destination);
  }

  paintFeatureBorders(ctx, { feature, tick, box }) {
    const { x, y, size } = box;
    const split = 1 + this.trackingNoise(feature.phase + 29, tick) * 3;
    this.featureBorder(ctx, "#08FFFF", 1, x - split, y, size);
    this.featureBorder(ctx, "#FF2396", 1, x + split, y + 1, size);
    this.featureBorder(ctx, "rgba(22,20,50,0.4)", 3, x, y, size);
    this.featureBorder(ctx, "#FFFCE9", 1.25, x, y, size);
  }

  featureBorder(ctx, color, lineWidth, x, y, size) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x, y, size, size);
  }

  paintFeatureLabel(ctx, { x, y, size }, u) {
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "#182035";
    ctx.shadowBlur = 2;
    ctx.font = `${Math.max(9, Math.min(12, size * 0.21))}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(u.toFixed(3), x + size / 2, y + size / 2, size - 4);
  }

  drawTrackingLinks(ctx) {
    ctx.save();
    this.clipTrackingArea(ctx);
    const tick = Math.floor(this.trackingTime / 85);
    const links = new Set();
    this.trackedPoints.forEach((point, index) =>
      this.connectTrackedPoint(ctx, point, index, tick, links),
    );
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#FFFCE9";
    for (const point of this.trackedPoints) ctx.fillRect(point.x - 1.5, point.y - 1.5, 3, 3);
    ctx.restore();
  }

  clipTrackingArea(ctx) {
    ctx.beginPath();
    ctx.rect(
      this.area.left,
      this.area.top,
      this.area.right - this.area.left,
      this.area.bottom - this.area.top,
    );
    ctx.clip();
  }

  nearestTrackedPoints(point, index) {
    return this.trackedPoints
      .map((target, i) => ({
        target,
        i,
        distance: Math.hypot(point.x - target.x, point.y - target.y),
      }))
      .filter((item) => item.i !== index)
      .sort((a, b) => a.distance - b.distance);
  }

  // Nearby strings form clusters; distant diagonals weave them into one web.
  chooseTrackingLinks(point, index, tick) {
    const candidates = this.nearestTrackedPoints(point, index);
    const count = this.trackingNoise(point.phase + 31, tick) > 0.5 ? 5 : 4;
    const selected = candidates.filter((item) => item.distance < 640).slice(0, count);
    const distant = candidates.filter((item) => item.distance > 260 && item.distance < 1100);
    if (distant.length) {
      selected.push(
        distant[Math.floor(this.trackingNoise(point.phase + 43, tick) * distant.length)],
      );
      if (index % 3 === 0)
        selected.push(
          distant[Math.floor(this.trackingNoise(point.phase + 59, tick) * distant.length)],
        );
    }
    return selected;
  }

  connectTrackedPoint(ctx, point, index, tick, links) {
    for (const { target, i } of this.chooseTrackingLinks(point, index, tick)) {
      const key = [Math.min(i, index), Math.max(i, index)].join(":");
      if (links.has(key)) continue;
      links.add(key);
      const flash = this.trackingNoise(point.phase + i + 37, tick);
      if (flash >= 0.06) this.paintTrackingLink(ctx, point, target, flash, tick);
    }
  }

  paintTrackingLink(ctx, point, target, flash, tick) {
    const thickness = 1.1 + flash * 0.6;
    ctx.globalAlpha = 0.52 + flash * 0.34;
    ctx.setLineDash(flash > 0.33 ? [] : [4, 7]);
    ctx.lineDashOffset = -(tick % 16) * 2;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(target.x, target.y);
    this.strokeTrackingLink(ctx, "rgba(19,27,51,0.2)", thickness + 1.8);
    this.strokeTrackingLink(ctx, flash > 0.94 ? "#08FFFF" : "#FFFCE9", thickness);
  }

  strokeTrackingLink(ctx, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  draw(ctx, now) {
    this.trackingTime = now;
    this.trackedPoints = [];
    ctx.save();
    this.clipMessageAreas(ctx);
    this.drawGreenFragments(ctx, now);
    this.drawMessages(ctx, now);
    ctx.restore();
  }

  // Keep decorative pixels and click regions away from the centre and footer.
  clipMessageAreas(ctx) {
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.area.bottom);
    ctx.rect(
      this.area.left,
      this.area.top,
      this.area.right - this.area.left,
      this.area.bottom - this.area.top,
    );
    ctx.clip("evenodd");
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.rect(this.logoBounds.x, this.logoBounds.y, this.logoBounds.w, this.logoBounds.h);
    ctx.clip("evenodd");
  }
}
