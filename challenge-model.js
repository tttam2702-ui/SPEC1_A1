const CHALLENGE_WIDTH = 1920;
const CHALLENGE_HEIGHT = 1080;
const CHALLENGE_COLORS = ["#087CFF", "#FF2396", "#FFFF00", "#EE2724", "#00E000", "#FFF6DF"];
const CHALLENGE_ITEMS = [
  { type: "clothes", label: "OLD CLOTHES" },
  { type: "book", label: "BOOK" },
  { type: "skincare", label: "SKINCARE" },
  { type: "shoe", label: "SNEAKERS" },
  { type: "journal", label: "JOURNAL" },
  { type: "bottle", label: "WATER BOTTLE" },
  { type: "headphones", label: "HEADPHONES" },
  { type: "plant", label: "PLANT" }
];

class ChallengeRound {
  constructor(random = Math.random) {
    this.random = random;
    this.reset();
  }

  between(min, max) { return min + this.random() * (max - min); }
  pick(values) { return values[Math.floor(this.random() * values.length)]; }

  reset() {
    this.time = 0;
    this.mode = "intro";
    this.paused = false;
    this.collected = 0;
    this.overloadAt = 5 + Math.floor(this.random() * 2);
    this.nextId = 1;
    this.nextLane = Math.floor(this.random() * 6);
    this.nextSpawn = 0;
    this.items = [];
    this.flights = [];
    this.stored = [];
    this.labels = [];
    this.particles = [];
  }

  start() {
    if (this.mode !== "intro") return;
    this.mode = "playing";
    for (let i = 0; i < 3; i++) this.spawn(-85 - i * 115);
    this.nextSpawn = 0.42;
  }

  spawn(y) {
    const lanes = [175, 455, 760, 1125, 1460, 1730];
    const definition = this.pick(CHALLENGE_ITEMS);
    const item = {
      ...definition,
      id: this.nextId++,
      x: lanes[this.nextLane % lanes.length] + this.between(-42, 42),
      y: y ?? -150,
      size: this.between(152, 192),
      angle: this.between(-0.38, 0.38),
      spin: this.between(-0.7, 0.7),
      speed: this.between(215, 290) + Math.min(this.collected, 15) * 17,
      drift: this.between(-15, 15),
      color: this.pick(CHALLENGE_COLORS)
    };
    this.nextLane += 1;
    this.items.push(item);
    return item;
  }

  collect(id) {
    if (!["playing", "corrupting"].includes(this.mode) || this.paused) return null;
    const index = this.items.findIndex(item => item.id === id);
    if (index < 0) return null;
    const item = this.items.splice(index, 1)[0];
    item.color = this.pick(CHALLENGE_COLORS.filter(color => color !== item.color));
    this.collected++;
    const target = {
      x: 960 + this.between(-165, 165),
      y: this.between(405, 710),
      size: this.between(100, 138),
      angle: this.between(-0.7, 0.7)
    };
    this.flights.push({ ...item, from: { x:item.x, y:item.y, size:item.size, angle:item.angle }, target,
      born:this.time, duration:this.between(0.62, 0.84) });
    this.labels.push({ text:item.label, x:item.x, y:item.y, born:this.time, life:1.05,
      angle:this.between(-0.14, 0.14), color:this.pick(["#EE2724", "#087CFF", "#FF2396"]), large:true });
    this.labels.push({ text:this.pick(["ADDED!", "NEW ME?", "BETTER?", "MORE!"]),
      x:item.x + this.between(-70,70), y:item.y + 65, born:this.time + 0.06, life:0.85,
      angle:this.between(-0.2,0.2), color:"#111111", large:false });
    for (let i = 0; i < 12; i++) this.particles.push({
      x:item.x, y:item.y, vx:this.between(-230,230), vy:this.between(-330,-80),
      born:this.time, life:this.between(0.4,0.8), size:this.between(6,14), color:this.pick(CHALLENGE_COLORS)
    });
    if (this.collected >= this.overloadAt) this.mode = "corrupting";
    return item;
  }

  tick(dt) {
    if (!["playing", "corrupting"].includes(this.mode) || this.paused) return;
    dt = Math.max(0, Math.min(dt, 0.05));
    this.time += dt;
    if (this.time >= this.nextSpawn && this.items.length < 10) {
      this.spawn();
      this.nextSpawn = this.time + Math.max(0.26, 0.5 - this.collected * 0.018);
    }
    for (const item of this.items) {
      item.y += item.speed * dt;
      item.x += item.drift * dt;
      item.angle += item.spin * dt;
    }
    this.items = this.items.filter(item => item.y < CHALLENGE_HEIGHT + item.size);
    const flying = [];
    for (const item of this.flights) {
      if (this.time - item.born >= item.duration) this.stored.push({ ...item, ...item.target });
      else flying.push(item);
    }
    this.flights = flying;
    this.stored = this.stored.slice(-14);
    this.labels = this.labels.filter(label => this.time - label.born < label.life);
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 620 * dt; }
    this.particles = this.particles.filter(p => this.time - p.born < p.life);
  }

  flightPose(item) {
    const t = Math.max(0, Math.min(1, (this.time - item.born) / item.duration));
    const eased = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
    return {
      ...item,
      x:item.from.x + (item.target.x-item.from.x)*eased,
      y:item.from.y + (item.target.y-item.from.y)*eased - Math.sin(t*Math.PI)*135,
      size:item.from.size + (item.target.size-item.from.size)*eased,
      angle:item.from.angle + (item.target.angle-item.from.angle)*eased,
      progress:t
    };
  }
}
