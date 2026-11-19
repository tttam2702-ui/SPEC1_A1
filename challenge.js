// p5 hosts the scene; native buttons make the moving objects keyboard accessible.
(() => {
  const W = CHALLENGE_WIDTH, H = CHALLENGE_HEIGHT;
  const round = new ChallengeRound();
  const stage = document.getElementById("challenge-stage");
  const targets = document.getElementById("challenge-targets");
  const intro = document.getElementById("challenge-intro");
  const start = document.getElementById("challenge-start");
  const pause = document.getElementById("challenge-pause");
  const restart = document.getElementById("challenge-restart");
  const counter = document.getElementById("challenge-count");
  const timer = document.getElementById("challenge-time");
  const mode = document.getElementById("challenge-mode");
  const melt = document.getElementById("challenge-melt");
  const buttons = new Map(), icons = new Map();
  const cartBox = { width:1364 / 1080 * 1120, height:1120, y:-40 };
  cartBox.x = (W - cartBox.width) / 2;
  let cart, canvas, scene, sceneContext, background;
  let ready = false, lastHud = "", aboutPaused = false, ending = null;
  const soundCounts = {item:0,notification:0,ok:0};
  const sound = new ChallengeAudio({
    onState: state => { stage.dataset.audioState = state; },
    onPlay: name => {
      soundCounts[name]=(soundCounts[name]||0)+1;
      stage.dataset["audio" + name[0].toUpperCase() + name.slice(1)] = String(soundCounts[name]);
    }
  });
  const notices = new ChallengeNotifications(stage, {
    audio: sound,
    onAccept: packet => {
      ending?.meltNotification(packet);
      returnTransition.arm();
    }
  });
  const returnTransition = new ChallengeReturn(stage, {
    duration: 1900,
    getCanvas: () => canvas,
    onBegin: () => {
      if (document.body.classList.contains("about-open")) document.querySelector(".about-close")?.click();
      notices.setExiting?.();
      sound.stopAll();
      sound.playTransition();
      const stageRect = stage.getBoundingClientRect();
      for (const record of notices.windows.slice(-14)) {
        const bounds = record.element.getBoundingClientRect();
        ending.meltNotification({title:record.title,message:record.message,
          x:(bounds.left-stageRect.left)/stageRect.width, y:(bounds.top-stageRect.top)/stageRect.height,
          width:bounds.width/stageRect.width, height:bounds.height/stageRect.height});
      }
      ending.draw(drawingContext, 0);
      round.paused = true;
      document.getElementById("challenge-art-status").textContent = "Returning to ME-MARRT.";
    }
  });

  const offer = new URLSearchParams(location.search).get("label");
  if (offer) {
    const context = document.getElementById("challenge-offer");
    context.textContent = `TODAY'S OFFER: ${offer.slice(0, 160)}`;
    context.hidden = false;
  }

  function surface() {
    const result = document.createElement("canvas");
    result.width = W; result.height = H;
    return result;
  }

  window.setup = function () {
    pixelDensity(1);
    const renderer = createCanvas(W, H);
    renderer.parent(stage);
    renderer.elt.setAttribute("aria-label", "A shopping cart with falling, collectable objects");
    canvas = renderer.elt;
    frameRate(60);
    scene = surface(); sceneContext = scene.getContext("2d");
    background = surface();
    const bg = background.getContext("2d");
    const gradient = bg.createLinearGradient(0, 0, 0, H);
    [[0,"#FF2396"],[0.1,"#FF8423"],[0.24,"#FFFF00"],[0.79,"#FFFF00"],[0.91,"#FF8423"],[1,"#FF2396"]]
      .forEach(([position, color]) => gradient.addColorStop(position, color));
    bg.fillStyle = gradient; bg.fillRect(0,0,W,H);
    intro.showModal(); positionIntro();
    document.getElementById("challenge-intro-title").focus({preventScroll:true});
    intro.querySelector(".challenge-intro-card").scrollTop = 0;
    cart = loadImage("assets/cart_challenge.png", loaded => {
      cart = loaded; ready = true;
      start.disabled = false; start.textContent = "LET'S GO SHOPPING →";
    }, () => {
      start.disabled = false; start.textContent = "RELOAD CART ↻";
      intro.querySelector(".challenge-disclaimer").textContent = "The cart image could not load. Reload to try again.";
    });
    syncHud();
  };

  window.draw = function () {
    if (!sceneContext || round.paused) return;
    const dt = Math.min(deltaTime / 1000, 0.05);
    if (round.mode === "notifications") {
      ending.draw(drawingContext, dt);
      syncMeltBeat();
      notices.tick(dt);
    } else {
      round.tick(dt);
      renderScene();
      if (ending) {
        ending.draw(drawingContext, dt, scene);
        syncMeltBeat();
        stage.dataset.damageCoverage = ending.coverage.toFixed(3);
        stage.dataset.damageHits = String(ending.hits);
        if (ending.complete) beginNotifications();
      } else drawingContext.drawImage(scene,0,0);
      syncTargets(); syncHud();
    }
  };

  function positionIntro() {
    if (!intro.open) return;
    const rect = stage.getBoundingClientRect();
    const top = Math.max(rect.top, document.querySelector(".site-bar")?.getBoundingClientRect().bottom || 0, 0);
    const bottom = Math.min(rect.bottom, innerHeight);
    const dialogHeight = rect.width < 700 ? Math.max(bottom-top, Math.min(460, innerHeight-top)) : bottom-top;
    intro.style.left = `${Math.max(0, rect.left)}px`;
    intro.style.top = `${top}px`;
    intro.style.width = `${Math.min(rect.width, innerWidth)}px`;
    intro.style.height = `${Math.max(0, dialogHeight)}px`;
  }
  addEventListener("resize", positionIntro);
  addEventListener("scroll", positionIntro, {passive:true});
  intro.addEventListener("cancel", event => event.preventDefault());
  start.addEventListener("click", () => {
    if (!ready) { location.reload(); return; }
    void sound.unlock();
    sound.playStart();
    intro.close(); round.start();
    pause.disabled = restart.disabled = false;
    pause.focus({preventScroll:true});
    syncTargets(); syncHud();
  });
  pause.addEventListener("click", () => {
    round.paused = !round.paused;
    if (round.paused) sound.pause(); else sound.resume();
    syncTargets(); syncHud();
  });
  restart.addEventListener("click", () => {
    round.reset(); round.start(); aboutPaused = false;
    ending = null; stage.classList.remove("is-art-ending", "is-corrupting"); targets.inert = false;
    notices.reset(); melt.hidden = true;
    sound.stopAll(); sound.resume();
    returnTransition.reset();
    canvas.setAttribute("aria-label", "A shopping cart with falling, collectable objects");
    stage.dataset.damageCoverage = "0"; stage.dataset.damageHits = "0";
    document.getElementById("challenge-art-status").textContent = "";
    syncTargets(); syncHud();
  });
  document.addEventListener("site:aboutchange", event => {
    if (event.detail.open) {
      aboutPaused = round.mode !== "intro" && !round.paused;
      if (aboutPaused) { round.paused = true; sound.pause(); }
    } else {
      if (aboutPaused) { round.paused = false; sound.resume(); }
      aboutPaused = false;
    }
    syncTargets(); syncHud();
  });

  function collect(id) {
    const item = round.collect(id);
    if (!item) return;
    sound.playItem();
    if (round.mode === "corrupting") damage(item.x, item.y);
    syncTargets(); syncHud();
  }

  function damage(x,y) {
    if (round.mode !== "corrupting" || round.paused) return;
    renderScene();
    if (!ending) {
      ending = new ChallengeDatamosh(scene,{track:sound.playDatamosh()});
      stage.classList.add("is-corrupting"); melt.hidden = false;
      canvas.setAttribute("aria-label", "Click different areas to glitch the picture and make its pixels melt downward");
      document.getElementById("challenge-art-status").textContent = "Every click now melts another area. Click around the picture.";
    }
    ending.addDamage(x,y,scene);
    stage.dataset.damageHits = String(ending.hits);
  }

  addEventListener("pagehide", () => sound.stopAll());

  function syncMeltBeat() {
    if(stage.dataset.datamoshBeats===String(ending.beatCount)) return;
    stage.dataset.datamoshBeats=String(ending.beatCount);
    stage.dataset.datamoshCues=JSON.stringify(ending.beatLog);
  }

  melt.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    event.preventDefault();
    const rect = stage.getBoundingClientRect();
    damage((event.clientX-rect.left)/rect.width*W, (event.clientY-rect.top)/rect.height*H);
  });
  melt.addEventListener("click", event => {
    if (event.detail === 0) damage(Math.random()*W,Math.random()*H);
  });

  function beginNotifications() {
    round.mode = "notifications";
    stage.classList.add("is-art-ending"); melt.hidden = true;
    targets.replaceChildren(); buttons.clear(); targets.inert = true;
    pause.disabled = restart.disabled = true;
    canvas.setAttribute("aria-label", "A continuously melting collage of the cart, objects and error-window fragments");
    document.getElementById("challenge-art-status").textContent = "The image has melted. Artwork notifications are appearing. Each OK creates more.";
    notices.start();
  }

  function syncTargets() {
    if (round.mode === "notifications") return;
    const active = new Set(round.items.map(item => item.id));
    for (const [id, button] of buttons) {
      if (!active.has(id)) { button.remove(); buttons.delete(id); }
    }
    for (const item of round.items) {
      let button = buttons.get(item.id);
      if (!button) {
        button = document.createElement("button");
        button.className = "collect-target"; button.type = "button";
        button.addEventListener("pointerdown", event => {
          if (event.button !== 0) return;
          event.preventDefault(); collect(item.id);
        });
        button.addEventListener("click", () => collect(item.id));
        buttons.set(item.id, button); targets.append(button);
      }
      button.setAttribute("aria-label", `Collect ${item.label.toLowerCase()}`);
      button.hidden = item.y < -item.size * 0.25 || item.y > H + item.size * 0.25;
      button.disabled = round.paused;
      button.style.left = `${item.x/W*100}%`; button.style.top = `${item.y/H*100}%`;
      button.style.width = `${item.size/W*100}%`; button.style.height = `${item.size/H*100}%`;
      button.style.transform = `translate(-50%,-50%) rotate(${item.angle}rad)`;
    }
  }

  function syncHud() {
    const signature = `${round.collected}/${round.mode}/${round.paused}`;
    if (lastHud !== signature) {
      counter.value = String(round.collected).padStart(2,"0");
      mode.textContent = round.mode === "corrupting" ? "CLICK ANYWHERE / LET IT MELT." : "CATCH THE NEXT YOU.";
      pause.textContent = round.paused ? "RESUME ▶" : "PAUSE";
      pause.setAttribute("aria-pressed", String(round.paused));
      stage.dataset.mode = round.mode; stage.dataset.paused = String(round.paused);
      lastHud = signature;
    }
    timer.textContent = `${round.time.toFixed(1)}s`;
  }

  function basketClip(ctx) {
    const scale = cartBox.height / 1080;
    ctx.beginPath();
    [[425,140],[890,140],[990,807],[365,807]].forEach(([x,y],i) => {
      ctx[i ? "lineTo" : "moveTo"](cartBox.x+x*scale, cartBox.y+y*scale);
    });
    ctx.closePath(); ctx.clip();
  }

  function renderScene() {
    const ctx = sceneContext;
    ctx.drawImage(background,0,0);
    const flights = round.flights.map(item => round.flightPose(item));
    ctx.save(); basketClip(ctx);
    for (const item of round.stored) drawItem(ctx,item);
    for (const item of flights) if(item.progress > 0.7) drawItem(ctx,item);
    ctx.restore();
    if (ready) ctx.drawImage(cart.canvas,cartBox.x,cartBox.y,cartBox.width,cartBox.height);
    for (const item of round.items) drawItem(ctx,item);
    for (const item of flights) if(item.progress <= 0.7) drawItem(ctx,item);
    for (const p of round.particles) {
      ctx.globalAlpha = Math.max(0,1-(round.time-p.born)/p.life);
      ctx.fillStyle = p.color; ctx.fillRect(p.x,p.y,p.size,p.size*0.6);
    }
    ctx.globalAlpha = 1;
    for (const label of round.labels) drawLabel(ctx,label);
  }

  function drawItem(ctx,item,opacity=1) {
    const key = `${item.type}/${item.color}`;
    if (!icons.has(key)) icons.set(key,makeIcon(item.type,item.color));
    ctx.save(); ctx.globalAlpha = opacity; ctx.translate(item.x,item.y); ctx.rotate(item.angle);
    ctx.drawImage(icons.get(key),-item.size/2,-item.size/2,item.size,item.size);
    ctx.restore();
  }

  function polygon(ctx, points, fill, stroke="#111111", lineWidth=5) {
    ctx.beginPath(); points.forEach(([x,y],i) => ctx[i ? "lineTo" : "moveTo"](x,y)); ctx.closePath();
    if(fill) { ctx.fillStyle=fill; ctx.fill(); }
    if(stroke) { ctx.strokeStyle=stroke; ctx.lineWidth=lineWidth; ctx.stroke(); }
  }
  function box(ctx,x,y,w,h,fill,r=8) {
    ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fillStyle=fill; ctx.fill(); ctx.stroke();
  }
  function line(ctx,points,color="#111111",width=5) {
    ctx.beginPath(); points.forEach(([x,y],i) => ctx[i ? "lineTo" : "moveTo"](x,y));
    ctx.strokeStyle=color; ctx.lineWidth=width; ctx.stroke();
  }

  // Flat vector products: each can be recoloured immediately when collected.
  function makeIcon(type,color) {
    const result = document.createElement("canvas"); result.width=result.height=256;
    const ctx = result.getContext("2d");
    ctx.lineJoin="round"; ctx.lineCap="round"; ctx.strokeStyle="#111111"; ctx.lineWidth=5;
    const cream="#FFF6DF", blue="#087CFF", red="#EE2724";
    if(type === "clothes") {
      polygon(ctx,[[89,47],[106,61],[150,61],[167,47],[222,82],[199,126],[177,114],[181,214],[75,214],[79,114],[57,126],[34,82]],color);
      ctx.beginPath(); ctx.ellipse(128,60,25,16,0,0,Math.PI); ctx.stroke();
      box(ctx,103,105,50,50,cream,0);
      ctx.fillStyle=red; ctx.font="900 19px Arial"; ctx.textAlign="center"; ctx.fillText("NEW",128,138);
      line(ctx,[[84,200],[172,200]],cream,4);
    } else if(type === "book" || type === "journal") {
      polygon(ctx,[[57,40],[182,40],[211,63],[211,218],[78,218],[48,194]],cream);
      polygon(ctx,[[48,40],[180,40],[180,194],[48,194]],color);
      line(ctx,[[69,40],[69,194]]);
      line(ctx,[[80,201],[202,201],[202,209],[84,209]],"#111111",3);
      ctx.fillStyle=cream; ctx.font="900 24px Impact,Arial"; ctx.textAlign="center";
      ctx.fillText(type === "book" ? "BETTER" : "NEW ME",125,99);
      ctx.fillText(type === "book" ? "YOU!" : "JOURNAL",125,128);
      if(type === "journal") for(let y=58;y<185;y+=23) {
        ctx.beginPath(); ctx.ellipse(55,y,12,5,0,0,Math.PI*2); ctx.stroke();
      }
      else line(ctx,[[93,153],[156,153]],cream,4);
    } else if(type === "skincare") {
      box(ctx,62,94,132,119,color,18); box(ctx,56,66,144,38,cream,6);
      for(let x=69;x<194;x+=13) line(ctx,[[x,74],[x,97]],"#111111",2);
      box(ctx,77,125,102,57,cream,0);
      ctx.fillStyle="#111111"; ctx.font="900 22px Impact,Arial"; ctx.textAlign="center";
      ctx.fillText("GLOW UP",128,161);
      line(ctx,[[103,42],[103,27],[120,34]],red,4);
      line(ctx,[[158,47],[169,32]],red,4);
    } else if(type === "shoe") {
      polygon(ctx,[[30,167],[47,104],[88,96],[123,132],[165,145],[213,155],[228,187],[225,207],[28,207],[23,186]],color);
      polygon(ctx,[[26,185],[226,185],[225,207],[28,207]],cream);
      polygon(ctx,[[52,110],[78,109],[94,131],[48,145]],cream);
      line(ctx,[[111,137],[95,152],[126,144],[114,160],[143,152]],cream,6);
      line(ctx,[[152,171],[184,168],[196,176]],"#111111",4);
    } else if(type === "bottle") {
      box(ctx,104,27,48,30,cream,4);
      ctx.beginPath(); ctx.moveTo(102,57); ctx.lineTo(154,57); ctx.lineTo(154,79);
      ctx.bezierCurveTo(184,101,187,116,183,137); ctx.lineTo(183,214);
      ctx.quadraticCurveTo(128,233,73,214); ctx.lineTo(73,137);
      ctx.bezierCurveTo(69,116,72,101,102,79); ctx.closePath(); ctx.fillStyle=color; ctx.fill(); ctx.stroke();
      box(ctx,74,130,109,49,cream,0);
      ctx.fillStyle=blue; ctx.font="900 23px Impact,Arial"; ctx.textAlign="center"; ctx.fillText("REFRESH",128,162);
    } else if(type === "headphones") {
      ctx.beginPath(); ctx.arc(128,130,76,Math.PI,Math.PI*2); ctx.strokeStyle="#111111"; ctx.lineWidth=30; ctx.stroke();
      ctx.strokeStyle=color; ctx.lineWidth=20; ctx.stroke();
      ctx.strokeStyle="#111111"; ctx.lineWidth=5;
      box(ctx,36,117,43,85,color,15); box(ctx,177,117,43,85,color,15);
      box(ctx,67,124,19,72,cream,7); box(ctx,170,124,19,72,cream,7);
      line(ctx,[[113,142],[113,182],[140,172],[140,132]],red,6);
      ctx.beginPath(); ctx.ellipse(102,184,12,8,-.3,0,Math.PI*2); ctx.fillStyle=red; ctx.fill();
      ctx.beginPath(); ctx.ellipse(129,174,12,8,-.3,0,Math.PI*2); ctx.fill();
    } else if(type === "plant") {
      line(ctx,[[128,169],[128,54]],"#111111",7);
      [[87,82,-.7],[162,60,.7],[91,128,-.7],[164,112,.7]].forEach(([x,y,angle]) => {
        ctx.beginPath(); ctx.ellipse(x,y,42,19,angle,0,Math.PI*2); ctx.fillStyle=color; ctx.fill(); ctx.stroke();
      });
      polygon(ctx,[[74,163],[182,163],[167,223],[89,223]],red);
      box(ctx,66,155,124,22,cream,3);
    }
    return result;
  }

  function drawLabel(ctx,label) {
    const age = round.time-label.born;
    if(age < 0) return;
    const scale = Math.max(0.05,1-Math.exp(-age*13)*Math.cos(age*21));
    ctx.save(); ctx.translate(label.x,label.y-age*76); ctx.rotate(label.angle); ctx.scale(scale,scale);
    ctx.globalAlpha = Math.min(1,(label.life-age)*5);
    ctx.font = label.large ? "900 39px Impact,Arial Narrow,Arial" : "italic 900 25px Arial";
    const width = ctx.measureText(label.text).width + (label.large ? 30 : 22);
    if(label.large) {
      const points=[];
      for(let i=0;i<32;i++) {
        const a=i/32*Math.PI*2, r=i%2 ? .72 : 1;
        points.push([Math.cos(a)*(width/2+16)*r,Math.sin(a)*54*r]);
      }
      polygon(ctx,points,label.color,"#FFF6DF",3);
    } else polygon(ctx,[[-width/2,-20],[width/2,-20],[width/2,20],[-width/2,20]],label.color,"#FFF6DF",2);
    ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.lineJoin="round";
    ctx.strokeStyle="#111111"; ctx.lineWidth=5; ctx.strokeText(label.text,0,1);
    ctx.fillStyle="#FFFF00"; ctx.fillText(label.text,0,1);
    ctx.restore();
  }

})();
