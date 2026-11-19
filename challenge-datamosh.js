// Local, persistent image feedback. Each click tears the scene, then gravity
// stretches its pixels downward. No replacement landscape or global video filter.
class ChallengeDatamosh {
  constructor(source,{track=null}={}) {
    this.width=source.width; this.height=source.height;
    this.w=960; this.h=540;
    this.time=0; this.hits=0; this.complete=false; this.floodAt=null;
    this.seed=Math.random()*10000;
    this.cells=new Uint8Array(32*18);
    this.regions=[]; this.ribbons=[]; this.accumulator=0; this.nextFlow=0;
    this.audioTrack=track; this.audioCycle=0; this.audioCue=0; this.beatPulse=0;
    this.lastAudioBeatAt=-Infinity;
    this.beatCount=0; this.beatLog=[];
    this.clean=this.surface(); this.texture=this.surface();
    this.field=this.surface(); this.history=this.surface();
    this.cleanCtx=this.clean.getContext("2d");
    this.textureCtx=this.texture.getContext("2d",{willReadFrequently:true});
    this.fieldCtx=this.field.getContext("2d");
    this.historyCtx=this.history.getContext("2d");
    this.cleanCtx.drawImage(source,0,0,this.w,this.h);
    this.prepareTexture();
  }

  surface() {
    const canvas=document.createElement("canvas");
    canvas.width=this.w; canvas.height=this.h;
    return canvas;
  }
  hash(n) { const v=Math.sin(n*127.1+this.seed)*43758.5453; return v-Math.floor(v); }
  random(min,max) { return min+Math.random()*(max-min); }
  get coverage() { return this.cells.reduce((sum,value)=>sum+value,0)/this.cells.length; }

  prepareTexture(source) {
    if(source) this.cleanCtx.drawImage(source,0,0,this.w,this.h);
    const ctx=this.textureCtx;
    ctx.drawImage(this.clean,0,0);
    ctx.globalAlpha=.65; ctx.drawImage(this.field,0,0); ctx.globalAlpha=1;
    const image=ctx.getImageData(0,0,this.w,this.h), data=image.data;
    const columns=Math.ceil(this.w/18), turns=[];
    for(let i=0;i<columns*Math.ceil(this.h/12);i++) turns[i]=Math.floor(this.hash(i+this.hits*13)*6);
    for(let y=0;y<this.h;y++) for(let x=0;x<this.w;x++) {
      const i=(y*this.w+x)*4, turn=turns[Math.floor(y/12)*columns+Math.floor(x/18)];
      let r=data[i],g=data[i+1],b=data[i+2];
      if(Math.max(r,g,b)-Math.min(r,g,b)<24 && r>170) {
        // Keep white fragments and popup text bright.
        r=Math.min(255,r*1.1); g=Math.min(255,g*1.1); b=Math.min(255,b*1.1);
      } else {
        r=Math.max(0,Math.min(255,(r-100)*1.8+80));
        g=Math.max(0,Math.min(255,(g-100)*1.8+80));
        b=Math.max(0,Math.min(255,(b-100)*1.8+80));
        if(turn===1) [r,g,b]=[g,b,r];
        if(turn===2) [r,g,b]=[b,r,g];
        if(turn===3) [r,g,b]=[255-g,r,b];
        if(turn===4) [r,g,b]=[r,255-b,g];
        if(turn===5) [r,g,b]=[b,g,255-r];
      }
      data[i]=Math.round(r/32)*32; data[i+1]=Math.round(g/32)*32; data[i+2]=Math.round(b/32)*32;
    }
    ctx.putImageData(image,0,0);
  }

  mark(x,y,w,h) {
    const left=Math.max(0,Math.floor(x/30)), right=Math.min(31,Math.floor((x+w)/30));
    const top=Math.max(0,Math.floor(y/30)), bottom=Math.min(17,Math.floor((y+h)/30));
    for(let row=top;row<=bottom;row++) for(let col=left;col<=right;col++) this.cells[row*32+col]=1;
  }

  addDamage(x,y,source) {
    if(this.complete) return;
    this.hits++;
    this.prepareTexture(source);
    this.makeRegion(x/this.width*this.w,y/this.height*this.h,Math.min(157,74+this.hits*7));
  }

  makeRegion(x,y,radius) {
    x=Math.max(0,Math.min(this.w,x)); y=Math.max(0,Math.min(this.h,y));
    const ctx=this.fieldCtx;
    // Codec-sized pieces have ragged boundaries; intact areas stay intact.
    for(let dy=-radius;dy<radius;dy+=9) for(let dx=-radius;dx<radius;dx+=12) {
      if(dx*dx/(radius*radius)+dy*dy/(radius*radius)>.8+Math.random()*.3) continue;
      const px=x+dx, py=y+dy, w=this.random(10,27), h=this.random(7,19);
      const local=Math.random()>.22;
      const sx=local ? Math.max(0,Math.min(this.w-45,px+this.random(-25,25))) : this.random(250,650);
      const sy=local ? Math.max(0,Math.min(this.h-35,py+this.random(-20,20))) : this.random(40,490);
      ctx.drawImage(this.texture,sx,sy,this.random(6,40),this.random(3,25),px,py,w,h);
      if(Math.random()>.7) {
        ctx.fillStyle=Math.random()>.5?"#00E000":"#FF2396";
        ctx.fillRect(px,py,w,1);
      }
      this.mark(px,py,w,h);
    }
    const region={x,y,radius,born:this.time};
    this.regions.push(region); this.regions=this.regions.slice(-24);
    for(let i=0;i<58;i++) this.addRibbon(region);
    this.historyCtx.drawImage(this.field,0,0);
  }

  addRibbon(region) {
    const x=region.x+this.random(-region.radius,region.radius);
    const y=region.y+this.random(-region.radius*.7,region.radius*.7);
    this.ribbons.push({
      x,y,width:this.random(2,14), length:this.random(3,22),
      speed:this.random(34,112), shear:this.random(-.18,.95),
      sx:Math.max(0,Math.min(this.w-24,x+this.random(-35,35))),
      sy:Math.max(0,Math.min(this.h-28,y+this.random(-28,28))),
      sampleHeight:this.random(2,18), born:this.time,
      fringe:Math.random()>.5?"#00EDFF":"#FF009E"
    });
    this.ribbons=this.ribbons.slice(-650);
  }

  updateAudioBeat(dt) {
    this.beatPulse=Math.max(0,this.beatPulse-dt*8);
    const track=this.audioTrack, elapsed=track?.elapsed();
    if(!track || !Number.isFinite(elapsed) || elapsed<0 || !track.beats.length) return;
    if(!track.loop && this.audioCue>=track.beats.length) return;
    const duration=track.duration;
    if(!Number.isFinite(duration) || duration<=0) return;
    if(track.loop && elapsed-this.audioCycle*duration>duration*2) {
      this.audioCycle=Math.floor(elapsed/duration); this.audioCue=0;
    }
    for(let count=0;count<32;count++) {
      const expected=this.audioCycle*duration+track.beats[this.audioCue];
      if(elapsed<expected) break;
      this.lastAudioBeatAt=expected; this.beatCount++;
      this.beatLog.push({beat:Number(expected.toFixed(3)),at:Number(elapsed.toFixed(3))});
      this.beatLog=this.beatLog.slice(-16);
      for(let i=0;i<8 && this.regions.length;i++) this.addRibbon(this.regions[Math.floor(Math.random()*this.regions.length)]);
      this.audioCue++;
      if(this.audioCue===track.beats.length) {
        if(!track.loop) break;
        this.audioCue=0; this.audioCycle++;
      }
    }
    this.beatPulse=Math.max(0,1-(elapsed-this.lastAudioBeatAt)*8);
  }

  feedback(dt) {
    const ctx=this.fieldCtx;
    ctx.drawImage(this.history,0,0);
    // Transport old pixels downward as well as stretching new strips.
    const pulse=this.audioTrack ? this.beatPulse : 1;
    for(let i=0;i<1+Math.round(8*pulse) && this.regions.length;i++) {
      const region=this.regions[Math.floor(Math.random()*this.regions.length)];
      const sx=Math.max(0,Math.min(this.w-60,region.x+this.random(-region.radius,region.radius)));
      const sy=Math.max(0,Math.min(this.h-16,region.y+this.random(-region.radius,region.radius+160)));
      const w=Math.min(this.w-sx,this.random(20,150)), h=this.random(2,12);
      ctx.drawImage(this.history,sx,sy,w,h,sx+this.random(-8,13)*pulse,sy+this.random(3,13)*(.2+pulse),w,h);
    }
    for(const ribbon of this.ribbons) {
      const previous=ribbon.length;
      const flow=this.audioTrack ? .2+this.beatPulse*3 : 1;
      ribbon.length=Math.min(this.h+180,ribbon.length+ribbon.speed*dt*flow);
      const endX=ribbon.x+ribbon.shear*ribbon.length;
      this.mark(endX,ribbon.y+previous,ribbon.width,Math.max(4,ribbon.length-previous));
      ctx.save();
      ctx.translate(Math.round(ribbon.x),Math.round(ribbon.y));
      ctx.transform(1,0,ribbon.shear,1,0,0);
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(this.texture,ribbon.sx,ribbon.sy,ribbon.width,ribbon.sampleHeight,
        0,0,ribbon.width,ribbon.length);
      ctx.globalAlpha=.55; ctx.fillStyle=ribbon.fringe;
      ctx.fillRect(0,0,1,ribbon.length);
      ctx.restore();
    }
    this.ribbons=this.ribbons.filter(r=>r.y+r.length<this.h+180 && this.time-r.born<13);
    if(!this.audioTrack && this.time>=this.nextFlow && this.regions.length) {
      this.nextFlow=this.time+.13;
      for(let i=0;i<3;i++) this.addRibbon(this.regions[Math.floor(Math.random()*this.regions.length)]);
    }
    this.historyCtx.drawImage(this.field,0,0);

    // A final spill fills remaining gaps only after several click-damaged areas
    // have already merged. Popups start after the image is actually covered.
    if(this.floodAt===null && this.hits>=5 && this.coverage>=.74) this.floodAt=this.time;
    if(this.floodAt!==null && !this.complete) {
      const gaps=[];
      this.cells.forEach((value,index)=>{if(!value) gaps.push(index);});
      for(let i=0;i<4 && gaps.length;i++) {
        const index=gaps.splice(Math.floor(Math.random()*gaps.length),1)[0];
        this.makeRegion(index%32*30+15,Math.floor(index/32)*30+15,44);
      }
      if(this.coverage>.98 && this.time-this.floodAt>1.1) this.complete=true;
    }
  }

  meltNotification(packet) {
    const x=packet.x*this.w, y=packet.y*this.h;
    const w=Math.max(110,packet.width*this.w), h=Math.max(75,packet.height*this.h);
    const ctx=this.fieldCtx;
    ctx.save(); ctx.translate(x,y);
    ctx.fillStyle="#C9C9C9"; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle="#FFFFFF"; ctx.lineWidth=2; ctx.strokeRect(1,1,w-2,h-2);
    ctx.fillStyle="#0610AC"; ctx.fillRect(4,4,w-8,16);
    ctx.font="bold 9px monospace"; ctx.fillStyle="#FFFFFF";
    ctx.fillText(packet.title.slice(0,32),9,15);
    ctx.fillStyle="#FFFF00"; ctx.beginPath(); ctx.moveTo(16,31); ctx.lineTo(6,50); ctx.lineTo(26,50); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#111111"; ctx.font="bold 12px monospace"; ctx.fillText("!",13,47);
    ctx.font="10px Arial";
    let line="",row=0;
    for(const word of packet.message.split(" ")) {
      if(ctx.measureText(line+word).width>w-45 && line) {
        ctx.fillText(line,35,35+row*12); row++; line="";
        if(row>3) break;
      }
      line+=word+" ";
    }
    ctx.fillText(line,35,35+row*12);
    ctx.strokeStyle="#111111"; ctx.lineWidth=1; ctx.strokeRect(w/2-23,h-25,46,17);
    ctx.font="10px Arial"; ctx.fillText("OK",w/2-8,h-13);
    ctx.restore();
    // Reuse the actual ghost window as the next source for the liquid trails.
    this.textureCtx.drawImage(this.field,0,0);
    const region={x:x+w/2,y:y+h/2,radius:w*.55,born:this.time};
    this.regions.push(region); this.regions=this.regions.slice(-24);
    for(let i=0;i<70;i++) this.addRibbon(region);
    this.historyCtx.drawImage(this.field,0,0);
  }

  draw(ctx,dt,source) {
    this.time+=dt; this.accumulator+=dt;
    this.updateAudioBeat(dt);
    if(source) this.cleanCtx.drawImage(source,0,0,this.w,this.h);
    if(this.accumulator>=1/30) {this.feedback(this.accumulator);this.accumulator=0;}
    ctx.save(); ctx.imageSmoothingEnabled=false;
    ctx.drawImage(this.clean,0,0,this.width,this.height);
    ctx.drawImage(this.field,0,0,this.width,this.height);
    ctx.restore();
  }
}
