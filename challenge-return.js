// The first OK starts a single wall-clock deadline. Later OKs never reset it.
class ChallengeReturn {
  constructor(stage, {
    getCanvas, onBegin, duration=1250,
    random=Math.random, now=()=>performance.now(),
    setTimer=(fn,ms)=>setTimeout(fn,ms), clearTimer=id=>clearTimeout(id),
    navigate=()=>location.assign("index.html")
  }={}) {
    this.stage=stage; this.getCanvas=getCanvas; this.onBegin=onBegin;
    this.random=random; this.now=now; this.setTimer=setTimer; this.clearTimer=clearTimer;
    this.navigate=navigate; this.state="idle"; this.timers=[]; this.raf=null;
    this.duration=duration;
    this.logo=new Image(); this.logo.src="assets/ME-MARTT_TITLE.png";
  }

  arm() {
    if(this.state!=="idle") return false;
    this.state="armed";
    this.delay=10000+this.random()*5000;
    this.deadline=this.now()+this.delay;
    this.stage.dataset.returnState=this.state;
    this.stage.dataset.returnDelayMs=String(Math.round(this.delay));
    this.timers.push(this.setTimer(()=>this.begin(),this.delay-this.duration));
    this.timers.push(this.setTimer(()=>this.finish(),this.delay));
    return true;
  }

  begin() {
    if(this.state!=="armed") return;
    this.state="transition";
    this.stage.dataset.returnState=this.state;
    this.stage.classList.add("is-returning");
    if(this.onBegin) this.onBegin();
    this.root=document.createElement("div");
    this.root.className="challenge-return-shroud"; this.root.setAttribute("aria-hidden","true");
    this.canvas=document.createElement("canvas");
    this.canvas.className="challenge-return-canvas"; this.canvas.width=960; this.canvas.height=540;
    this.root.append(this.canvas); this.stage.append(this.root);
    this.ctx=this.canvas.getContext("2d");
    this.snapshot=document.createElement("canvas"); this.snapshot.width=960; this.snapshot.height=540;
    const source=this.getCanvas?.();
    if(source) this.snapshot.getContext("2d").drawImage(source,0,0,960,540);
    this.paint();
  }

  paint() {
    if(this.state!=="transition") return;
    const ctx=this.ctx, progress=Math.max(0,Math.min(1,1-(this.deadline-this.now())/this.duration));
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(this.snapshot,0,0);
    const tears=18+Math.floor(progress*36);
    for(let i=0;i<tears;i++) {
      const y=Math.random()*530, h=2+Math.random()*(8+progress*60);
      const shift=(Math.random()-.5)*(70+progress*450);
      ctx.drawImage(this.snapshot,0,y,960,Math.min(h,540-y),shift,y,960,h);
    }
    if(progress>.24) {
      for(let i=0;i<22;i++) {
        const x=Math.random()*940, y=Math.random()*480, w=4+Math.random()*32;
        ctx.drawImage(this.snapshot,x,y,w,12,x+Math.random()*90,y,w,40+progress*450);
      }
      ctx.globalAlpha=.18; ctx.globalCompositeOperation="screen";
      ["#FF2396","#087CFF","#00E000"].forEach(color=>{
        ctx.fillStyle=color; ctx.fillRect(Math.random()*800,Math.random()*530,160+Math.random()*300,3+Math.random()*24);
      });
      ctx.globalAlpha=1; ctx.globalCompositeOperation="source-over";
    }
    if(progress>.58) {
      // Hard rectangular cuts reveal the store colours and its actual logo.
      const coverage=(progress-.58)/.42;
      for(let row=0;row<18;row++) for(let col=0;col<30;col++) {
        const n=Math.sin(col*71+row*129)*43758.5;
        if(n-Math.floor(n)<coverage) {
          ctx.fillStyle=(row+col)%3===0?"#FF2396":"#FFFF00";
          ctx.fillRect(col*32,row*30,32,30);
        }
      }
      ctx.save(); ctx.globalAlpha=Math.min(1,coverage*1.6);
      if(this.logo.complete && this.logo.naturalWidth) {
        const w=660, h=w*this.logo.naturalHeight/this.logo.naturalWidth;
        ctx.drawImage(this.logo,150,270-h/2,w,h);
      } else {
        ctx.font="italic 900 120px Impact,Arial";ctx.textAlign="center";
        ctx.strokeStyle="#087CFF";ctx.lineWidth=20;ctx.strokeText("ME-MARRT",480,310);
        ctx.fillStyle="#FF0000";ctx.fillText("ME-MARRT",480,310);
      }
      ctx.restore();
    }
    this.raf=requestAnimationFrame(()=>this.paint());
  }

  finish() {
    if(this.state!=="armed" && this.state!=="transition") return;
    if(this.state==="armed") this.begin();
    this.state="done"; this.stage.dataset.returnState=this.state;
    if(this.raf!==null) cancelAnimationFrame(this.raf);
    try {
      sessionStorage.setItem("me-marrt-glitch-return",JSON.stringify({
        at:Date.now(), image:this.canvas.toDataURL("image/webp",.55)
      }));
    } catch (_) { /* Navigation also works when browser storage is unavailable. */ }
    this.navigate();
  }

  reset() {
    for(const id of this.timers) this.clearTimer(id);
    this.timers=[];
    if(this.raf!==null) cancelAnimationFrame(this.raf);
    this.root?.remove(); this.root=null; this.raf=null; this.state="idle";
    this.stage.classList.remove("is-returning");
    this.stage.dataset.returnState="idle";
    delete this.stage.dataset.returnDelayMs;
  }
}

// Carry the final torn frame over the page navigation, then reveal the real
// landing canvas when its assets are ready. Normal visits get no entry overlay.
(() => {
  const stage=document.querySelector("[data-return-entry]");
  if(!stage) return;
  let record;
  try {
    const raw=sessionStorage.getItem("me-marrt-glitch-return");
    sessionStorage.removeItem("me-marrt-glitch-return");
    if(!raw) return;
    record=JSON.parse(raw);
    if(Date.now()-record.at>15000 || !record.image?.startsWith("data:image/")) return;
  } catch (_) {return;}
  const root=document.createElement("div");
  root.className="challenge-return-shroud is-entry"; root.setAttribute("aria-hidden","true");
  const canvas=document.createElement("canvas"); canvas.width=960;canvas.height=540;
  canvas.className="challenge-return-canvas";root.append(canvas);stage.append(root);
  const ctx=canvas.getContext("2d"), image=new Image();
  image.src=record.image;
  const started=performance.now(); let revealAt=null;
  function draw(now) {
    ctx.globalCompositeOperation="source-over";
    ctx.fillStyle="#FFFF00";ctx.fillRect(0,0,960,540);
    if(image.complete && image.naturalWidth) ctx.drawImage(image,0,0,960,540);
    if(revealAt===null && (stage.querySelector("canvas[data-scene-ready='true']") || now-started>2500)) revealAt=now;
    if(revealAt!==null) {
      const progress=Math.min(1,(now-revealAt)/700);
      ctx.globalCompositeOperation="destination-out";
      for(let row=0;row<18;row++) for(let col=0;col<30;col++) {
        const n=Math.sin(col*83+row*117)*43758.5;
        if(n-Math.floor(n)<progress) ctx.fillRect(col*32,row*30,33,31);
      }
      if(progress===1) {root.remove();return;}
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
