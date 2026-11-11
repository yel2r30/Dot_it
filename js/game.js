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
    scene.add.text(20,GAME_HEIGHT-27,'W A S D   /   ARROW KEYS  ·  MOVE',{fontFamily:'monospace',fontSize:'12px',color:'#9eb4bb'});
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys('W,A,S,D');
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
    const { image, width, height, columns, animations, sourceFacing } = data;
    // Each frame becomes its own Phaser texture. No assumptions about sheet row count.
    const sheet = document.createElement('canvas');
    sheet.width=width; sheet.height=height;
    const ctx=sheet.getContext('2d',{willReadFrequently:true});
    for (let i=0;i<Math.floor(image.width/width)*Math.floor(image.height/height);i++) {
      ctx.clearRect(0,0,width,height);
      ctx.drawImage(image,(i%columns)*width,Math.floor(i/columns)*height,width,height,0,0,width,height);
      const key='dotit-frame-'+i;
      scene.textures.addCanvas(key, this.cloneCanvas(sheet));
      this.frameKeys.push(key);
    }
    for(const [kind, info] of Object.entries(animations)) {
      const key='dotit-'+kind;
      const frames=Array.from({length:info.count},(_,i)=>({key:this.frameKeys[info.start+i]}));
      scene.anims.create({key,frames,frameRate:info.fps,repeat:-1});
      this.animKeys.push(key);
    }
    const savedX=this.x ?? GAME_WIDTH/2, savedY=this.y ?? GAME_HEIGHT/2;
    this.player=scene.add.sprite(savedX,savedY,this.frameKeys[animations.idle.start])
      .setScale(Math.min(4,96/Math.max(width,height)));
    this.player.setDepth(2);
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
    if (this.player && this.frameData) {
      this.player.setFlipX(direction !== this.frameData.sourceFacing);
    }
  }
  notifyState() {
    if (!this.player) return;
    this.onUpdate?.(
      this.state, Math.round(this.x), Math.round(this.y),
      this.facing, this.player.flipX
    );
  }
  cloneCanvas(source) {
    const c=document.createElement('canvas');c.width=source.width;c.height=source.height;
    c.getContext('2d').drawImage(source,0,0);return c;
  }
  playAnimation(type) {
    if(!this.player) return;
    if (this.state === type.toUpperCase() && this.player.anims.isPlaying) return;
    this.state=type.toUpperCase();
    this.player.play('dotit-'+type,true);
  }
  update(dt) {
    if(!this.player || !this.cursors) return;
    // Ignore gameplay keys while the user edits numeric inputs.
    const editing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
    const left=!editing&&(this.keys.A.isDown||this.cursors.left.isDown);
    const right=!editing&&(this.keys.D.isDown||this.cursors.right.isDown);
    const up=!editing&&(this.keys.W.isDown||this.cursors.up.isDown);
    const down=!editing&&(this.keys.S.isDown||this.cursors.down.isDown);
    let dx=Number(right)-Number(left),dy=Number(down)-Number(up);
    if(dx||dy) {
      const length=Math.hypot(dx,dy);
      const speed=140*Math.min(dt,50)/1000;
      this.x=Math.max(28,Math.min(GAME_WIDTH-28,this.x+dx/length*speed));
      this.y=Math.max(28,Math.min(GAME_HEIGHT-62,this.y+dy/length*speed));
      if(dx) this.setFacing(dx<0?'left':'right');
      this.player.setPosition(this.x,this.y);
      this.playAnimation('walk');
    } else this.playAnimation('idle');
    // Reassert flip state after animation changes to guarantee orientation.
    this.player.setFlipX(this.facing !== this.frameData.sourceFacing);
    if(this.lastState!==this.state || this.lastX!==Math.round(this.x) || this.lastY!==Math.round(this.y) || this.lastFacing!==this.facing || this.lastFlip!==this.player.flipX) {
      this.notifyState();
      this.lastState=this.state;this.lastX=Math.round(this.x);this.lastY=Math.round(this.y);
      this.lastFacing=this.facing;this.lastFlip=this.player.flipX;
    }
  }
}
