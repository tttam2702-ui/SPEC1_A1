// Image tracking is drawn over the existing art, with no physics mutations.
// Messages use their own animation clock, randomness, and click hit regions.
class FrameArt {
  constructor(width, height, area, logoBounds, { onMessageAppear, onMessageDismiss } = {}) {
    this.width = width;
    this.height = height;
    this.area = { ...area };
    this.logoBounds = { ...logoBounds };
    this.onMessageAppear = typeof onMessageAppear === "function" ? onMessageAppear : null;
    this.onMessageDismiss = typeof onMessageDismiss === "function" ? onMessageDismiss : null;
    this.seed = (Date.now() ^ 0x71a9c35d) >>> 0;
    this.messages = [];
    this.imageCache = new WeakMap();
    this.features = new Map();
    this.trackedPoints = [];
    this.trackingTime = 0;
    this.phrases = [
      "I love this!", "this is so me", "new me?", "try me on",
      "100% you", "one more version", "me, again.", "same me. new look."
    ];
    this.zones = [
      { x: 26, y: 34, w: area.left - 52, h: area.bottom - 68 },
      { x: area.right + 26, y: 34, w: width - area.right - 52, h: area.bottom - 68 }
    ];
    this.greenFragments = Array.from({ length: 18 }, (_, index) => {
      const zone = this.zones[index % 2];
      const shape = index % 7 === 0 ? "cluster" : index % 3 === 0 ? "bar" : "square";
      const w = shape === "square" ? this.random(22, 34) : this.random(75, 122);
      const h = shape === "cluster" ? this.random(36, 54) : this.random(18, 29);
      return {
        shape, w, h,
        x: this.random(zone.x + 14, zone.x + zone.w - w - 20),
        y: Math.min(area.bottom - h - 24, 56 + Math.floor(index / 2) * (area.bottom - 130) / 8 + this.random(-12, 12)),
        phase: this.random(0, Math.PI * 2)
      };
    });
  }

  random(min = 0, max = 1) {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return min + this.seed / 4294967296 * (max - min);
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
    for (const f of this.greenFragments) {
      const flicker = this.trackingNoise(f.phase, tick);
      if (flicker < 0.23) continue;
      const x = f.x + (this.trackingNoise(f.phase + 3, lock) - 0.5) * 20;
      const y = f.y + (this.trackingNoise(f.phase + 7, tick) - 0.5) * 8;
      const w = f.w * (0.76 + flicker * 0.28);
      ctx.fillStyle = flicker > 0.87 ? "#35FF00" : "#00E000";
      if (f.shape === "cluster") {
        ctx.fillRect(x, y, w, f.h * 0.58);
        ctx.fillRect(x + w * 0.23, y - f.h * 0.36, w * 0.3, f.h * 1.25);
        ctx.fillRect(x + w * 0.76, y + f.h * 0.28, w * 0.36, f.h * 0.28);
      } else {
        ctx.fillRect(x, y, w, f.shape === "square" ? w : f.h);
      }
      if (flicker > 0.82) {
        ctx.fillRect(x - 8, y + f.h * 0.58, w * 0.64, 3);
      }
    }
    ctx.restore();
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
    const h = fontSize + 28;
    const message = {
      text, fontSize, w, h, zone, born,
      life: this.random(12000, 18000),
      color: this.pick(["#087CFF", "#087CFF", "#087CFF", "#EF426A", "#E92D28"]),
      phase: this.random(0, Math.PI * 2),
      tailRight: this.random() > 0.5,
      dismissedAt: null,
      appearanceNotified: false,
      layout: null
    };
    for (let attempt = 0; attempt < 36; attempt++) {
      message.x = this.random(zone.x + 14, zone.x + zone.w - w - 14);
      message.y = this.random(zone.y + 14, zone.y + zone.h - h - 14);
      const crowded = this.messages.some(other => other && other !== this.messages[slot] &&
        message.x < other.x + other.w + 14 && message.x + w + 14 > other.x &&
        message.y < other.y + other.h + 20 && message.y + h + 20 > other.y);
      if (!crowded) break;
    }
    this.bakeMessage(message);
    return message;
  }

  bakeMessage(m) {
    const sprite = document.createElement("canvas");
    sprite.width = Math.ceil(m.w + 48);
    sprite.height = Math.ceil(m.h + 28);
    const ctx = sprite.getContext("2d");
    ctx.translate(24, 10);
    ctx.fillStyle = m.color;
    this.roundedRect(ctx, 0, 0, m.w, m.h, m.h * 0.43);
    ctx.fill();
    const tailX = m.tailRight ? m.w - 14 : 14;
    const direction = m.tailRight ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(tailX, m.h - 17);
    ctx.quadraticCurveTo(tailX + direction * 6, m.h - 3, tailX + direction * 18, m.h + 2);
    ctx.quadraticCurveTo(tailX - direction * 7, m.h + 4, tailX - direction * 8, m.h - 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `500 ${m.fontSize}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(m.text, m.w / 2, m.h / 2 + 1, m.w - 24);
    m.sprite = sprite;
    m.ghosts = ["#08FFFF", "#FF2396"].map(color => {
      const ghost = document.createElement("canvas");
      ghost.width = sprite.width;
      ghost.height = sprite.height;
      const g = ghost.getContext("2d");
      g.drawImage(sprite, 0, 0);
      g.globalCompositeOperation = "source-in";
      g.fillStyle = color;
      g.fillRect(0, 0, ghost.width, ghost.height);
      return ghost;
    });
  }

  messageLayout(m, now) {
    if (m.dismissedAt !== null) return m.glitchLayout;
    const age = now - m.born;
    const t = Math.max(0, Math.min(1, age / 620));
    const scale = t >= 1 ? 1 : Math.max(0.025, 1 - Math.exp(-7 * t) * Math.cos(12 * t));
    const x = Math.max(m.zone.x + 3, Math.min(m.zone.x + m.zone.w - m.w - 3,
      m.x + Math.sin(now * 0.0005 + m.phase) * 6));
    const y = Math.max(m.zone.y + 3, Math.min(m.zone.y + m.zone.h - m.h - 3,
      m.y + Math.cos(now * 0.00045 + m.phase) * 5));
    return { x, y, scale, anchorX: m.tailRight ? x + m.w - 14 : x + 14, anchorY: y + m.h };
  }

  glitchMessage(ctx, m, now, layout) {
    const progress = Math.min(1, (now - m.dismissedAt) / 320);
    const frame = Math.floor((now - m.dismissedAt) / 32);
    const stripe = Math.ceil(m.sprite.height / 8);
    for (let band = 0; band < 8; band++) {
      const noise = (Math.sin((band + 1) * 41.7 + frame * 23.1 + m.phase) + 1) / 2;
      if (noise < progress * 0.95) continue;
      const sy = band * stripe;
      const sh = Math.min(stripe, m.sprite.height - sy);
      if (sh <= 0) continue;
      const shift = Math.sin(band * 11 + frame * 8 + m.phase) * (12 + progress * 32);
      const dx = layout.x - 24 + shift;
      const dy = layout.y - 10 + sy;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(m.ghosts[0], 0, sy, m.sprite.width, sh, dx - 7, dy, m.sprite.width, sh);
      ctx.drawImage(m.ghosts[1], 0, sy, m.sprite.width, sh, dx + 7, dy + 1, m.sprite.width, sh);
      ctx.globalAlpha = 1;
      ctx.drawImage(m.sprite, 0, sy, m.sprite.width, sh, dx, dy, m.sprite.width, sh);
    }
  }

  drawMessages(ctx, now) {
    for (let slot = 0; slot < 12; slot++) {
      if (!this.messages[slot]) this.messages[slot] = this.makeMessage(ctx, slot, now + slot * 390);
      let m = this.messages[slot];
      if (m.dismissedAt !== null && now - m.dismissedAt >= 320) {
        m = this.messages[slot] = this.makeMessage(ctx, slot, now + this.random(1400, 3600));
      }
      if (now < m.born) {
        m.layout = null;
        continue;
      }
      m.layout = this.messageLayout(m, now);
      if (!m.appearanceNotified) {
        m.appearanceNotified = true;
        if (this.onMessageAppear) this.onMessageAppear(m, now);
      }
      if (m.dismissedAt === null && now - m.born > m.life) {
        m.dismissedAt = now;
        m.glitchLayout = { ...m.layout };
      }
      const layout = m.layout;
      ctx.save();
      ctx.translate(layout.anchorX, layout.anchorY);
      ctx.scale(layout.scale, layout.scale);
      ctx.translate(-layout.anchorX, -layout.anchorY);
      if (m.dismissedAt === null) ctx.drawImage(m.sprite, layout.x - 24, layout.y - 10);
      else this.glitchMessage(ctx, m, now, layout);
      ctx.restore();
    }
  }

  isMessageArea(point) {
    const a = this.area;
    const l = this.logoBounds;
    return point.x >= 0 && point.y >= 0 && point.x <= this.width && point.y < a.bottom &&
      !(point.x >= a.left && point.x <= a.right && point.y >= a.top && point.y <= a.bottom) &&
      !(point.x >= l.x && point.x <= l.x + l.w && point.y >= l.y && point.y <= l.y + l.h);
  }

  messageAtPoint(point) {
    if (!this.isMessageArea(point)) return null;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const m = this.messages[i];
      const p = m.layout;
      if (!p || m.dismissedAt !== null || p.scale < 0.15) continue;
      const x = p.anchorX + (point.x - p.anchorX) / p.scale;
      const y = p.anchorY + (point.y - p.anchorY) / p.scale;
      if (x >= p.x && x <= p.x + m.w && y >= p.y && y <= p.y + m.h) return m;
    }
    return null;
  }

  dismissMessageAt(point, now) {
    const m = this.messageAtPoint(point);
    if (!m) return false;
    m.dismissedAt = now;
    m.glitchLayout = { ...m.layout };
    if (this.onMessageDismiss) this.onMessageDismiss(m, now);
    return true;
  }

  heatmapFor(source) {
    if (!source || !source.width || !source.height) return null;
    if (this.imageCache.has(source)) return this.imageCache.get(source);
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const colors = [[37,24,100], [163,40,251], [255,42,137], [255,102,39], [246,255,32], [74,255,145]];
    for (let i = 0; i < pixels.data.length; i += 4) {
      if (!pixels.data[i + 3]) continue;
      const brightness = (pixels.data[i] * 0.299 + pixels.data[i + 1] * 0.587 + pixels.data[i + 2] * 0.114) / 255;
      const level = Math.min(colors.length - 1.001, brightness * (colors.length - 1));
      const lower = Math.floor(level);
      const blend = level - lower;
      for (let channel = 0; channel < 3; channel++) {
        pixels.data[i + channel] = colors[lower][channel] * (1 - blend) + colors[lower + 1][channel] * blend;
      }
    }
    ctx.putImageData(pixels, 0, 0);
    const result = { canvas, pixels: pixels.data, width: canvas.width, height: canvas.height };
    this.imageCache.set(source, result);
    return result;
  }

  trackImage(ctx, source, crop, width, height, id, count = 1) {
    const heatmap = this.heatmapFor(source);
    if (!heatmap || !crop) return;
    if (!this.features.has(id)) {
      const features = Array.from({ length: count }, () => {
        let u, v;
        for (let attempt = 0; attempt < 80; attempt++) {
          u = this.random(0.2, 0.8);
          v = this.random(0.2, 0.8);
          const x = Math.min(heatmap.width - 1, Math.floor(crop.x + u * crop.w));
          const y = Math.min(heatmap.height - 1, Math.floor(crop.y + v * crop.h));
          if (heatmap.pixels[(y * heatmap.width + x) * 4 + 3] > 100) break;
        }
        return { u, v, size: this.random(0.2, 0.31), phase: this.random(0, Math.PI * 2) };
      });
      this.features.set(id, features);
    }
    for (const f of this.features.get(id)) {
      // Quantized updates make the tracker stutter and reacquire its target,
      // including when the underlying image is completely still.
      const tick = Math.floor((this.trackingTime + f.phase * 31) / 75);
      const lock = Math.floor((this.trackingTime + f.phase * 77) / 280);
      let u = Math.max(0.12, Math.min(0.88, f.u + (this.trackingNoise(f.phase, lock) - 0.5) * 0.3 +
        (this.trackingNoise(f.phase + 2, tick) - 0.5) * 0.036));
      let v = Math.max(0.12, Math.min(0.88, f.v + (this.trackingNoise(f.phase + 7, lock) - 0.5) * 0.24 +
        (this.trackingNoise(f.phase + 4, tick) - 0.5) * 0.036));
      const sampleX = Math.min(heatmap.width - 1, Math.floor(crop.x + u * crop.w));
      const sampleY = Math.min(heatmap.height - 1, Math.floor(crop.y + v * crop.h));
      if (heatmap.pixels[(sampleY * heatmap.width + sampleX) * 4 + 3] < 100) {
        u = f.u;
        v = f.v;
      }
      const pulse = 0.84 + this.trackingNoise(f.phase + 11, tick) * 0.3;
      const size = Math.min(80, Math.min(width, height) * 0.56, width * f.size * pulse);
      const x = Math.max(-width / 2, Math.min(width / 2 - size, -width / 2 + u * width - size / 2));
      const y = Math.max(-height / 2, Math.min(height / 2 - size, -height / 2 + v * height - size / 2));
      const sx = crop.x + (x + width / 2) / width * crop.w;
      const sy = crop.y + (y + height / 2) / height * crop.h;
      const sw = size / width * crop.w;
      const sh = size / height * crop.h;
      const flash = this.trackingNoise(f.phase + 17, tick);
      const matrix = ctx.getTransform();
      const px = x + size / 2;
      const py = y + size / 2;
      this.trackedPoints.push({
        x: matrix.a * px + matrix.c * py + matrix.e,
        y: matrix.b * px + matrix.d * py + matrix.f,
        phase: f.phase
      });
      if (flash < 0.16) continue;

      ctx.save();
      ctx.globalAlpha = flash < 0.42 ? 0.46 : 0.98;
      if (flash > 0.72) {
        // Offset a few image strips for brief digital tearing inside the box.
        for (let band = 0; band < 3; band++) {
          const shift = (this.trackingNoise(f.phase + band + 23, tick) - 0.5) * 12;
          ctx.drawImage(heatmap.canvas, sx, sy + sh * band / 3, sw, sh / 3,
            x + shift, y + size * band / 3, size, size / 3);
        }
      } else {
        ctx.drawImage(heatmap.canvas, sx, sy, sw, sh, x, y, size, size);
      }
      const split = 1 + this.trackingNoise(f.phase + 29, tick) * 3;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#08FFFF";
      ctx.strokeRect(x - split, y, size, size);
      ctx.strokeStyle = "#FF2396";
      ctx.strokeRect(x + split, y + 1, size, size);
      ctx.strokeStyle = "rgba(22,20,50,0.4)";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, size, size);
      ctx.strokeStyle = "#FFFCE9";
      ctx.lineWidth = 1.25;
      ctx.strokeRect(x, y, size, size);
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "#182035";
      ctx.shadowBlur = 2;
      ctx.font = `${Math.max(9, Math.min(12, size * 0.21))}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(u.toFixed(3), x + size / 2, y + size / 2, size - 4);
      ctx.restore();
    }
  }

  drawTrackingLinks(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.area.left, this.area.top, this.area.right - this.area.left, this.area.bottom - this.area.top);
    ctx.clip();
    const tick = Math.floor(this.trackingTime / 85);
    const links = new Set();
    this.trackedPoints.forEach((point, index) => {
      const candidates = this.trackedPoints.map((target, i) => ({
        target, i, distance: Math.hypot(point.x - target.x, point.y - target.y)
      })).filter(item => item.i !== index).sort((a, b) => a.distance - b.distance);

      // Connect several nearby points, then bridge across the scene. The long
      // diagonals weave the separate tracking clusters into one visible web.
      const count = this.trackingNoise(point.phase + 31, tick) > 0.5 ? 5 : 4;
      const selected = candidates.filter(item => item.distance < 640).slice(0, count);
      const distant = candidates.filter(item => item.distance > 260 && item.distance < 1100);
      if (distant.length) {
        selected.push(distant[Math.floor(this.trackingNoise(point.phase + 43, tick) * distant.length)]);
        if (index % 3 === 0) {
          selected.push(distant[Math.floor(this.trackingNoise(point.phase + 59, tick) * distant.length)]);
        }
      }

      for (const { target, i } of selected) {
        const key = [Math.min(i, index), Math.max(i, index)].join(":");
        if (links.has(key)) continue;
        links.add(key);
        const flash = this.trackingNoise(point.phase + i + 37, tick);
        if (flash < 0.06) continue;
        const thickness = 1.1 + flash * 0.6;
        ctx.globalAlpha = 0.52 + flash * 0.34;
        ctx.setLineDash(flash > 0.33 ? [] : [4, 7]);
        ctx.lineDashOffset = -(tick % 16) * 2;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(target.x, target.y);
        // A subtle dark edge keeps the fine white strings readable on yellow.
        ctx.strokeStyle = "rgba(19,27,51,0.2)";
        ctx.lineWidth = thickness + 1.8;
        ctx.stroke();
        ctx.strokeStyle = flash > 0.94 ? "#08FFFF" : "#FFFCE9";
        ctx.lineWidth = thickness;
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#FFFCE9";
    for (const point of this.trackedPoints) ctx.fillRect(point.x - 1.5, point.y - 1.5, 3, 3);
    ctx.restore();
  }

  draw(ctx, now) {
    this.trackingTime = now;
    this.trackedPoints = [];
    ctx.save();
    // Message hit regions use the same exclusion as their painted pixels.
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.area.bottom);
    ctx.rect(this.area.left, this.area.top, this.area.right - this.area.left, this.area.bottom - this.area.top);
    ctx.clip("evenodd");
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.rect(this.logoBounds.x, this.logoBounds.y, this.logoBounds.w, this.logoBounds.h);
    ctx.clip("evenodd");
    this.drawGreenFragments(ctx, now);
    this.drawMessages(ctx, now);
    ctx.restore();
  }
}
