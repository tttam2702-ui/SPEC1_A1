// Attack times measured from notification_end.wav (seconds from file start).
const CHALLENGE_NOTIFICATION_BEATS = [0.045, 0.456, 0.688, 0.905, 1.110];
const CHALLENGE_DATAMOSH_BEATS = [0.025,0.299,0.586,0.874,1.161,1.442,1.729,2.015,
  2.302,2.589,2.876,3.157,3.444,3.729,4.011];

class ChallengeAudio {
  constructor({onState, onPlay, paths, now=()=>performance.now()}={}) {
    this.onState=onState; this.onPlay=onPlay; this.now=now;
    this.context=null; this.buffers={}; this.sources=new Set();
    this.trackSerial=0; this.generation=0; this.notificationTrack=null; this.datamoshTrack=null;
    this.paths=paths || {
      item:"sounds/challenge_click.wav",
      notification:"sounds/notification_end.wav",
      ok:"sounds/ok_click.ogg",
      start:"sounds/game-start.ogg",
      datamosh:"sounds/datamosh.wav",
      transition:"sounds/transition.wav"
    };
    // Fetch while the instructions are visible; create/resume audio on START.
    this.raw={};
    for(const [name,path] of Object.entries(this.paths)) {
      this.raw[name]=fetch(path).then(response=>{
        if(!response.ok) throw new Error("Audio file unavailable: "+path);
        return response.arrayBuffer();
      }).catch(()=>null);
    }
  }

  unlock() {
    const AudioContextClass=window.AudioContext || window.webkitAudioContext;
    if(!AudioContextClass) {this.onState?.("unavailable");return Promise.resolve();}
    if(!this.context) {
      try {
        this.context=new AudioContextClass({latencyHint:"interactive"});
        this.master=this.context.createGain(); this.master.gain.value=.8;
        const compressor=this.context.createDynamicsCompressor();
        compressor.threshold.value=-10; compressor.ratio.value=5;
        compressor.attack.value=.002; compressor.release.value=.12;
        this.master.connect(compressor); compressor.connect(this.context.destination);
        this.context.onstatechange=()=>this.onState?.(this.context.state);
        this.decoded=Promise.all(Object.entries(this.raw).map(async([name,promise])=>{
          const data=await promise;
          if(!data) return;
          try {this.buffers[name]=await this.context.decodeAudioData(data.slice(0));}
          catch (_) { /* Visual cues remain available if a codec cannot decode. */ }
        }));
      } catch (_) {
        this.onState?.("unavailable"); return Promise.resolve();
      }
    }
    const resume=this.context.state==="running" ? Promise.resolve() : this.context.resume().catch(()=>{});
    this.onState?.(this.context.state);
    return Promise.all([resume,this.decoded]);
  }

  audibleTime() {
    const context=this.context;
    if(!context) return 0;
    // Account for output latency so a visual wave follows the audible attack.
    if(context.state==="running" && context.getOutputTimestamp) {
      const stamp=context.getOutputTimestamp();
      if(stamp.performanceTime>0) {
        return Math.min(context.currentTime,stamp.contextTime+(this.now()-stamp.performanceTime)/1000);
      }
    }
    return Math.max(0,context.currentTime-(context.baseLatency||0)-(context.outputLatency||0));
  }

  makeVoice(name,at,volume,{loop=false}={}) {
    const context=this.context, buffer=this.buffers[name];
    if(!context || !buffer) return null;
    const source=context.createBufferSource(), gain=context.createGain();
    source.buffer=buffer; source.loop=loop; gain.gain.value=volume;
    source.connect(gain); gain.connect(this.master);
    const voice={source,gain,name};
    source.onended=()=>{
      this.sources.delete(voice); source.disconnect(); gain.disconnect();
    };
    this.sources.add(voice); source.start(at);
    this.onPlay?.(name);
    return voice;
  }

  stopVoice(voice) {
    if(!voice || !this.sources.has(voice)) return;
    const at=this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(at);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value,at);
    voice.gain.gain.linearRampToValueAtTime(0,at+.008);
    try {voice.source.stop(at+.01);} catch (_) {}
  }

  effect(name,volume,limit) {
    const generation=this.generation;
    return this.unlock().then(()=>{
      if(generation!==this.generation || this.context?.state!=="running" || !this.buffers[name]) return false;
      const voices=[...this.sources].filter(voice=>voice.name===name);
      while(voices.length>=limit) this.stopVoice(voices.shift());
      return Boolean(this.makeVoice(name,this.context.currentTime+.005,volume));
    }).catch(()=>false);
  }

  playItem() {this.effect("item",.72,6);}
  playOK() {this.effect("ok",.6,3);}
  playStart() {this.effect("start",.75,1);}
  playTransition() {this.effect("transition",.8,1);}

  playNotification() {
    this.stopNotification();
    return this.timedTrack("notification",CHALLENGE_NOTIFICATION_BEATS,{duration:1.289646,volume:.8});
  }

  playDatamosh() {
    if(this.datamoshTrack && !this.datamoshTrack.stopped) return this.datamoshTrack;
    // The original recording at one fifth of its previous playback gain.
    return this.timedTrack("datamosh",CHALLENGE_DATAMOSH_BEATS,{duration:4.280979,volume:.07,loop:true});
  }

  timedTrack(name,beats,{duration,volume,loop=false}) {
    const generation=this.generation;
    const track={id:++this.trackSerial,beats:[...beats],duration,loop,
      startAt:null,fallbackAt:null,stopped:false,voice:null};
    track.elapsed=()=>{
      if(track.stopped) return -1;
      if(track.startAt!==null) return this.audibleTime()-track.startAt;
      return track.fallbackAt===null ? -1 : this.now()/1000-track.fallbackAt;
    };
    const property=name+"Track";
    this[property]=track;
    void this.unlock().then(()=>{
      if(generation!==this.generation || track!==this[property] || track.stopped) return;
      if(this.context?.state==="running" && this.buffers[name]) {
        track.startAt=this.context.currentTime+.015;
        track.duration=this.buffers[name].duration;
        track.voice=this.makeVoice(name,track.startAt,volume,{loop});
      } else track.fallbackAt=this.now()/1000;
    }).catch(()=>{if(!track.stopped) track.fallbackAt=this.now()/1000;});
    return track;
  }

  stopNotification() {
    if(!this.notificationTrack) return;
    this.notificationTrack.stopped=true;
    this.stopVoice(this.notificationTrack.voice);
    this.notificationTrack=null;
  }

  stopDatamosh() {
    if(!this.datamoshTrack) return;
    this.datamoshTrack.stopped=true;
    for(const voice of this.sources) if(voice.name==="datamosh") this.stopVoice(voice);
    this.datamoshTrack=null;
  }

  pause() {if(this.context?.state==="running") void this.context.suspend().catch(()=>{});}
  resume() {if(this.context) void this.context.resume().catch(()=>{});}

  stopAll() {
    this.generation++;
    this.stopNotification();
    this.stopDatamosh();
    for(const voice of this.sources) this.stopVoice(voice);
  }
}
