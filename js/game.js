// Dot_it DEV-001 — Phaser scene for the local player.
const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
export class Playground {
  constructor(mount, onUpdate) {
    if (!window.Phaser) throw new Error('게임 엔진을 불러오지 못했습니다. 인터넷 연결 후 새로고침해 주세요.');
    this.onUpdate = onUpdate;
    this.frameData = null;
    this.frameKeys = [];
    this.animKeys = [];
    this.player = null;
    this.state = 'IDLE';
    this.facing = 'right';
    this.oneShot = null;
    this.dead = false;
    this.idleElapsedMs = 0;
    this.nextSpecialMs = 30000;
    this.moving = false;
    this.instance = new Phaser.Game({
      type: Phaser.AUTO,
      parent: mount,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#293f46',
      render: { pixelArt: true, antialias: false, roundPixels: true },
      scale: { mode: Phaser.Scale.NONE },
      input: { keyboard: true },
      scene: { create: () => this.create(), update: (_t, dt) => this.update(dt) }
    });
  }
  create() {
    const scene = this.instance.scene.scenes[0];
    this.scene = scene;
    const bg = scene.add.graphics();
    bg.fillStyle(0x293f46, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.fillStyle(0x304d51, 1);
    for (let y=0; y<GAME_HEIGHT; y+=48) for (let x=0; x<GAME_WIDTH; x+=48) {
      if (((x / 48 + y / 48) % 3) === 0) bg.fillRect(x+6,y+8,3,3);
    }
    bg.lineStyle(1, 0x456168, 0.36);
    for(let x=0;x<GAME_WIDTH;x+=48) bg.lineBetween(x,0,x,GAME_HEIGHT);
    for(let y=0;y<GAME_HEIGHT;y+=48) bg.lineBetween(0,y,GAME_WIDTH,y);
    scene.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT-43, GAME_WIDTH, 86, 0x243740, 0.6);
    scene.add.text(20,20,'DOT_IT  /  SOLO PLAYGROUND',{fontFamily:'monospace',fontSize:'13px',color:'#a8ceba'}).setAlpha(.8);
    scene.add.text(20,GAME_HEIGHT-27,'WASD / ARROWS · MOVE   J · ATTACK   K · DAMAGE   L · DEATH   R · REVIVE',{fontFamily:'monospace',fontSize:'12px',color:'#9eb4bb'});
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys('W,A,S,D,J,K,L,R');
    scene.input.keyboard.on('keydown', ev => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(ev.key) &&
          !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) ev.preventDefault();
    });
    if (this.frameData) this.install(this.frameData);
  }
  install(data) {
    this.frameData = data;
    if (!this.scene) return;
    const scene = this.scene;
    if (this.player) { this.player.destroy(); this.player = null; }
    this.animKeys.forEach(k => { if (scene.anims.exists(k)) scene.anims.remove(k); });
    this.frameKeys.forEach(k => { if (scene.textures.exists(k)) scene.textures.remove(k); });
    this.animKeys=[]; this.frameKeys=[];
    const { animations, sourceFacing } = data;
    const scale = Math.min(4,96/Math.max(data.width,data.height));
    this.oneShot = null;
    this.dead = false;
    this.idleElapsedMs = 0;
    this.nextSpecialMs = data.specialDelayMs ?? 30000;
    this.moving = false;
    for (const [kind, info] of Object.entries(animations)) {
      const key='dotit-'+kind;
      const {image,width,height,columns}=info.image ? info : data;
      const sheet=document.createElement('canvas');
      sheet.width=width;
      sheet.height=height;
      const ctx=sheet.getContext('2d');
      const frames=Array.from({length:info.count},(_,i)=>{
        const index=info.start+i;
        const frameKey=key+'-frame-'+index;
        ctx.clearRect(0,0,width,height);
        ctx.drawImage(image,(index%columns)*width,Math.floor(index/columns)*height,width,height,0,0,width,height);
        scene.textures.addCanvas(frameKey,this.cloneCanvas(sheet));
        this.frameKeys.push(frameKey);
        return info.perFrame ? {key:frameKey,duration:info.durations[i]} : {key:frameKey};
      });
      const timeConfig=info.perFrame?{duration:1}:{frameRate:info.fps};
      const loops = kind==='idle' || kind==='walk' || (kind==='special' && data.specialLoop);
      scene.anims.create({key,frames,...timeConfig,repeat:loops?-1:0});
      this.animKeys.push(key);
    }
    const savedX=this.x ?? GAME_WIDTH/2, savedY=this.y ?? GAME_HEIGHT/2;
    this.player=scene.add.sprite(savedX,savedY,'dotit-idle-frame-'+animations.idle.start)
      .setScale(scale);
    this.player.setDepth(2);
    // One-shot animations return to movement/idle only when their final frame completes.
    this.player.on(Phaser.Animations.Events.ANIMATION_COMPLETE,(animation)=>{
      const expected=this.oneShot&&('dotit-'+this.oneShot);
      if(animation.key!==expected) return;
      this.oneShot=null;
      if (this.dead) return;
      this.playAnimation(this.moving?'walk':'idle');
      this.notifyState();
    });
    // The sheet may be originally drawn facing left OR right.
    // Reset to the artist's original orientation on every apply.
    this.facing=sourceFacing;
    this.x=savedX; this.y=savedY;
    this.playAnimation('idle');
    this.setFacing(sourceFacing);
    this.notifyState();
  }
  // Change the original sprite orientation without re-uploading or re-applying animations.
  setSourceFacing(direction) {
    if (!['left','right'].includes(direction)) return;
    if (this.frameData) this.frameData.sourceFacing = direction;
    this.setFacing(direction);
    this.notifyState();
  }
  setFacing(direction) {
    if (!['left','right'].includes(direction)) return;
    this.facing = direction;
    this.positionSprite();
  }
  positionSprite() {
    if (!this.player || !this.frameData) return;
    const data=this.frameData;
    const action=data.animations[this.animationType];
    const frame=action?.image ? action : data;
    const flipped=this.facing!==(frame.sourceFacing ?? data.sourceFacing);
    const offsetX=(frame.width/2-(frame.anchorX ?? frame.width/2))*this.player.scaleX;
    const offsetY=((data.anchorY ?? data.height)-data.height/2+
      frame.height/2-(frame.anchorY ?? frame.height))*this.player.scaleY;
    this.player.setFlipX(flipped);
    this.player.setPosition(this.x+(flipped?-offsetX:offsetX),this.y+offsetY);
  }
  notifyState() {
    if (!this.player) return;
    this.onUpdate?.(
      this.state, Math.round(this.x), Math.round(this.y),
      this.facing, this.player.flipX
    );
  }
  enterTestRoom(image, ranges) {
    if (this.roomPreviousData) throw new Error('현재 방에서 나온 뒤 다시 입장해 주세요.');
    if (!this.scene || !this.frameData) throw new Error('광장을 불러오는 중입니다. 잠시 뒤 다시 시도해 주세요.');
    this.roomPreviousData=this.frameData;
    const size=48;
    const fps={idle:4,walk:8,special:4,attack:10,damage:10,death:10};
    const animations=Object.fromEntries(Object.entries(ranges).map(([type,[start,count]])=>[
      type,{start,count,fps:fps[type]}
    ]));
    this.install({image,width:size,height:size,columns:image.width/size,animations,sourceFacing:'right',specialLoop:true});
    this.onUpdate?.(this.state,Math.round(this.x),Math.round(this.y),this.facing,this.player.flipX);
  }
  leaveTestRoom() {
    this.showRoomPlayer(null);
    for (const key of this.plazaPlayers?.keys() ?? []) this.showPlazaPlayer(key,null);
    if (this.roomPreviousData) {
      const previous=this.roomPreviousData;
      this.roomPreviousData=null;
      this.install(previous);
    }
  }
  placePlazaPlayer(slot) {
    this.x=GAME_WIDTH/2+(slot%4-1.5)*72;
    this.y=GAME_HEIGHT/2+(Math.floor(slot/4)-.5)*72;
    this.positionSprite();
    this.notifyState();
  }
  plazaPose() {
    if (!this.roomPreviousData || !this.player) return null;
    return {x:Math.round(this.x),y:Math.round(this.y),action:this.animationType,flip:this.player.flipX};
  }
  showPlazaPlayer(id, pose) {
    this.plazaPlayers ??= new Map();
    let remote=this.plazaPlayers.get(id);
    if (!pose) {
      remote?.sprite.destroy();
      remote?.label.destroy();
      this.plazaPlayers.delete(id);
      return;
    }
    if (!this.roomPreviousData) return;
    const key='dotit-'+pose.action;
    const info=this.frameData.animations[pose.action];
    if (!info) return;
    const x=Math.max(28,Math.min(GAME_WIDTH-28,pose.x));
    const y=Math.max(28,Math.min(GAME_HEIGHT-62,pose.y));
    if (!remote) {
      const sprite=this.scene.add.sprite(x,y,key+'-frame-'+info.start).setScale(2).setDepth(1);
      const label=this.scene.add.text(x,y-52,'상대',{fontSize:'12px',color:'#fff',backgroundColor:'#15242e'})
        .setOrigin(.5,1).setDepth(3);
      remote={sprite,label};
      this.plazaPlayers.set(id,remote);
    }
    if (remote.action!==pose.action || remote.session!==pose.session) {
      remote.sprite.play(key);
      remote.action=pose.action;
      remote.session=pose.session;
    }
    remote.sprite.setFlipX(pose.flip).setPosition(x,y);
    remote.label.setPosition(x,y-52);
  }
  roomPose() {
    const match=this.player?.texture?.key?.match(/^dotit-(\w+)-frame-(\d+)$/);
    if (!this.roomPreviousData || !match) return null;
    return {x:Math.round(this.x),y:Math.round(this.y),frame:Number(match[2]),flip:this.player.flipX};
  }
  showRoomPlayer(pose) {
    if (!pose) {
      this.roomPlayer?.destroy();
      this.roomLabel?.destroy();
      this.roomPlayer=this.roomLabel=null;
      return;
    }
    if (!this.roomPreviousData) return;
    const suffix='-frame-'+pose.frame;
    const key=this.frameKeys.find(frame=>frame.endsWith(suffix));
    if (!key) return;
    const x=Math.max(28,Math.min(GAME_WIDTH-28,pose.x));
    const y=Math.max(28,Math.min(GAME_HEIGHT-62,pose.y));
    if (!this.roomPlayer) {
      this.roomPlayer=this.scene.add.sprite(x,y,key).setScale(2).setDepth(1);
      this.roomLabel=this.scene.add.text(x,y-52,'상대',{fontSize:'12px',color:'#fff',backgroundColor:'#15242e'})
        .setOrigin(.5,1).setDepth(3);
    }
    this.roomPlayer.setTexture(key).setFlipX(pose.flip).setPosition(x,y);
    this.roomLabel.setPosition(x,y-52);
  }
  cloneCanvas(source) {
    const c=document.createElement('canvas');c.width=source.width;c.height=source.height;
    c.getContext('2d').drawImage(source,0,0);return c;
  }
  playAnimation(type) {
    if (!this.player || !this.frameData?.animations?.[type]) return;
    const label=type==='special'?'SPECIAL IDLE':type.toUpperCase();
    if (this.state === label && this.player.anims.isPlaying) return;
    this.state=label;
    this.animationType=type;
    this.player.play('dotit-'+type,true);
    this.positionSprite();
  }
  startOneShot(type) {
    if(!this.frameData?.animations?.[type]||!this.player) return false;
    if (this.dead || this.oneShot===type) return false;
    if (type==='attack' && this.oneShot==='damage') return false;
    if (type==='death') this.dead=true;
    this.oneShot=type;
    // Inputs trigger one animation without queuing repeats.
    this.state='';
    this.playAnimation(type);
    this.notifyState();
    return true;
  }
  resetInactivity() {
    this.idleElapsedMs=0;
    this.nextSpecialMs=this.frameData?.specialDelayMs??30000;
    if(this.oneShot==='special') {
      this.player.anims.stop();
      this.oneShot=null;
    }
  }
  update(dt) {
    if (!this.player || !this.cursors || !this.frameData) return;
    const editing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
    const pressed = Phaser.Input.Keyboard.JustDown;
    const attackPressed=pressed(this.keys.J)&&!editing;
    const damagePressed=pressed(this.keys.K)&&!editing&&Boolean(this.frameData.animations.damage);
    const deathPressed=pressed(this.keys.L)&&!editing&&Boolean(this.frameData.animations.death);
    const revivePressed=pressed(this.keys.R)&&!editing;
    if (this.dead) {
      if (this.oneShot || !revivePressed) return;
      this.dead=false;
      this.resetInactivity();
    } else if (deathPressed) {
      this.startOneShot('death');
      return;
    }
    const left=!editing&&(this.keys.A.isDown||this.cursors.left.isDown);
    const right=!editing&&(this.keys.D.isDown||this.cursors.right.isDown);
    const up=!editing&&(this.keys.W.isDown||this.cursors.up.isDown);
    const down=!editing&&(this.keys.S.isDown||this.cursors.down.isDown);
    const dx=Number(right)-Number(left), dy=Number(down)-Number(up);
    const moving=Boolean(dx||dy);
    this.moving=moving;
    if (moving) {
      const length=Math.hypot(dx,dy);
      const speed=140*Math.min(dt,50)/1000;
      this.x=Math.max(28,Math.min(GAME_WIDTH-28,this.x+dx/length*speed));
      this.y=Math.max(28,Math.min(GAME_HEIGHT-62,this.y+dy/length*speed));
      if(dx)this.setFacing(dx<0?'left':'right');
    }
    // Input cancels special idle and restarts its inactivity countdown.
    if(moving||attackPressed||damagePressed) this.resetInactivity();
    else this.idleElapsedMs+=Math.max(0,Math.min(dt,1000));

    // Attack takes priority over SPECIAL, WALK and IDLE.
    if (damagePressed) this.startOneShot('damage');
    else if (attackPressed) this.startOneShot('attack');
    if(!this.oneShot) {
      if(!moving&&this.frameData.animations.special&&this.idleElapsedMs>=this.nextSpecialMs) {
        this.nextSpecialMs=this.idleElapsedMs+(this.frameData.specialRepeatMs??30000);
        this.startOneShot('special');
      }else this.playAnimation(moving?'walk':'idle');
    }
    // During ATTACK, movement still changes position/facing but not the one-shot animation.
    this.positionSprite();
    if(this.lastState!==this.state||this.lastX!==Math.round(this.x)||
        this.lastY!==Math.round(this.y)||this.lastFacing!==this.facing||this.lastFlip!==this.player.flipX){
      this.notifyState();
      this.lastState=this.state;
      this.lastX=Math.round(this.x);this.lastY=Math.round(this.y);
      this.lastFacing=this.facing;this.lastFlip=this.player.flipX;
    }
  }
}
