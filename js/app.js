import { Playground } from './game.js';

const $ = id => document.getElementById(id);
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 2048;
const ids = ['frameWidth','frameHeight','idleStart','idleCount','idleFps','walkStart','walkCount','walkFps'];
const state = { image: null, demo: true, fileName: 'DEMO / Penguin', selected: 'idle', frames: { idle:{start:0,count:4,fps:4},walk:{start:6,count:6,fps:8} }, frameWidth:32, frameHeight:32, game:null };
let previewFrame = 0;
let lastPreviewTime = 0;
let previewRequest = null;

function notice(message, error=false) {
  $('notice').textContent = message;
  $('notice').classList.toggle('error', error);
}
function createDemo() {
  const canvas=document.createElement('canvas');
  canvas.width=32*6; canvas.height=32*2;
  const g=canvas.getContext('2d');
  // Original minimalist pixel penguin sprite: four idle poses, six walk poses.
  for(let i=0;i<12;i++) {
    const x=(i%6)*32, y=Math.floor(i/6)*32;
    const step=i>=6?Math.sin((i-6)/6*Math.PI*2):0;
    const bob=i>=6?Math.abs(step)*2:(i%4===2?1:0);
    g.fillStyle='#152e3b';g.fillRect(x+9,y+8-bob,14,17);
    g.fillRect(x+7,y+13-bob,18,11);
    g.fillStyle='#deedf0';g.fillRect(x+12,y+14-bob,8,9);
    g.fillStyle='#263e4c';g.fillRect(x+8,y+7-bob,16,2);
    g.fillStyle='#f7faf5';g.fillRect(x+12,y+10-bob,3,3);g.fillRect(x+18,y+10-bob,3,3);
    g.fillStyle='#16232b';g.fillRect(x+13,y+11-bob,1,1);g.fillRect(x+19,y+11-bob,1,1);
    g.fillStyle='#f4b264';g.fillRect(x+15,y+14-bob,4,3);
    g.fillStyle='#f0a65c';
    const leftStep=step>0?2:0,rightStep=step<0?2:0;
    g.fillRect(x+9-leftStep,y+25,6,3);g.fillRect(x+18+rightStep,y+25,6,3);
    g.fillStyle='#203846';
    g.fillRect(x+5,y+16-bob,3,6);g.fillRect(x+24,y+16-bob,3,6);
  }
  return canvas;
}
function computeLayout() {
  if(!state.image) throw new Error('이미지를 먼저 업로드해 주세요.');
  const w=Number($('frameWidth').value),h=Number($('frameHeight').value);
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<8||h<8||w>256||h>256) throw new Error('프레임 크기는 8~256px 사이의 정수여야 합니다.');
  if(state.image.width%w!==0||state.image.height%h!==0) throw new Error('시트 크기가 프레임 크기로 정확히 나누어져야 합니다.');
  const cols=state.image.width/w,rows=state.image.height/h,total=cols*rows;
  if(total>512) throw new Error('프레임 수는 512개 이하로 설정해 주세요.');
  const animations={};
  for(const kind of ['idle','walk']) {
    const start=Number($(kind+'Start').value),count=Number($(kind+'Count').value),fps=Number($(kind+'Fps').value);
    if(![start,count,fps].every(Number.isInteger)||start<0||count<1||count>24||fps<1||fps>24||start+count>total)
      throw new Error(kind.toUpperCase()+' 설정을 확인해 주세요. 시작 번호와 프레임 수는 전체 '+total+'칸 안에 있어야 하고, FPS는 1~24입니다.');
    animations[kind]={start,count,fps};
  }
  return {image:state.image,width:w,height:h,columns:cols,rows,total,animations};
}
function drawSheet() {
  const canvas=$('sheetCanvas'),g=canvas.getContext('2d');
  if(!state.image) return;
  const w=Number($('frameWidth').value),h=Number($('frameHeight').value);
  const valid=Number.isInteger(w)&&Number.isInteger(h)&&w>=8&&h>=8&&state.image.width%w===0&&state.image.height%h===0;
  $('sheetSize').textContent=state.image.width+' × '+state.image.height+' px';
  const columns=valid?state.image.width/w:0,rows=valid?state.image.height/h:0,total=columns*rows;
  $('frameTotal').textContent=valid?total+' frames':'크기 확인 필요';
  const zoom=Math.min(4,Math.max(1,Math.floor(720/state.image.width)));
  canvas.width=state.image.width*zoom;canvas.height=state.image.height*zoom;
  canvas.dataset.zoom=String(zoom);
  g.imageSmoothingEnabled=false;
  g.drawImage(state.image,0,0,canvas.width,canvas.height);
  if(!valid)return;
  let start=Number($(state.selected+'Start').value),count=Number($(state.selected+'Count').value);
  if(!Number.isFinite(start))start=-1;
  if(!Number.isFinite(count))count=0;
  for(let i=0;i<total;i++) {
    const x=(i%columns)*w*zoom,y=Math.floor(i/columns)*h*zoom;
    const selected=i>=start&&i<start+count;
    g.strokeStyle=selected?'#b8e66f':'rgba(237,243,248,.48)';
    g.lineWidth=selected?2:1;
    g.strokeRect(x+.5,y+.5,w*zoom-1,h*zoom-1);
    if(selected){g.fillStyle='rgba(184,230,111,.13)';g.fillRect(x+1,y+1,w*zoom-2,h*zoom-2);}
    if(w*zoom>=24&&h*zoom>=20){
      g.fillStyle='rgba(8,16,23,.8)';g.fillRect(x+2,y+2,Math.max(16,String(i).length*7+5),13);
      g.fillStyle=selected?'#dcffad':'#e9f3f4';
      g.font='10px monospace';g.fillText(String(i),x+4,y+12);
    }
  }
}
function syncPreviewInfo() {
  const type=state.selected.toUpperCase();
  $('previewTitle').textContent=type;
  $('previewInfo').textContent=$(''+state.selected+'Count').value+' frames · '+$(''+state.selected+'Fps').value+' FPS';
}
function selectMode(mode) {
  state.selected=mode;
  for(const type of ['idle','walk']){
    $(type+'Tab').classList.toggle('active',type===mode);
    $(type+'Tab').setAttribute('aria-pressed',String(type===mode));
    $(type+'Fields').hidden=type!==mode;
  }
  previewFrame=0;lastPreviewTime=0;
  syncPreviewInfo();drawSheet();
}
function animatePreview(timestamp) {
  previewRequest=requestAnimationFrame(animatePreview);
  if(!state.image)return;
  const c=$('animCanvas'),g=c.getContext('2d');
  g.clearRect(0,0,c.width,c.height);
  let data;
  try { data=computeLayout(); } catch { return; }
  const a=data.animations[state.selected];
  if(!lastPreviewTime)lastPreviewTime=timestamp;
  const period=1000/a.fps;
  if(timestamp-lastPreviewTime>=period) {
    previewFrame=(previewFrame+Math.max(1,Math.floor((timestamp-lastPreviewTime)/period)))%a.count;
    lastPreviewTime=timestamp;
  }
  const frame=a.start+previewFrame;
  const column=frame%data.columns,row=Math.floor(frame/data.columns);
  const scale=Math.min(4,Math.max(1,Math.floor(130/Math.max(data.width,data.height))));
  const renderW=data.width*scale,renderH=data.height*scale;
  g.imageSmoothingEnabled=false;
  g.drawImage(data.image,column*data.width,row*data.height,data.width,data.height,
    (c.width-renderW)/2,(c.height-renderH)/2,renderW,renderH);
}
function resetDefaults(demo=false) {
  $('frameWidth').value='32';$('frameHeight').value='32';
  $('idleStart').value='0';$('idleCount').value='4';$('idleFps').value='4';
  $('walkStart').value=demo?'6':'0';$('walkCount').value=demo?'6':'4';$('walkFps').value='8';
  previewFrame=0;lastPreviewTime=0;syncPreviewInfo();
}
function apply() {
  try {
    const data=computeLayout();
    state.game.install(data);
    $('activeCharacter').textContent=state.fileName;
    notice('캐릭터에 적용했습니다! WASD 또는 방향키로 움직여 보세요.');
    drawSheet();
  } catch(e) { notice(e.message,true); }
}
function useDemo() {
  state.image=createDemo();state.demo=true;state.fileName='DEMO / Penguin';
  $('spriteFile').value='';$('fileName').textContent='현재: 데모 캐릭터';
  resetDefaults(true);drawSheet();apply();
}
async function handleFile(file) {
  if(!file)return;
  if(file.type!=='image/png'&&!/\.png$/i.test(file.name)) return notice('PNG 파일만 지원합니다.',true);
  if(file.size>MAX_BYTES)return notice('파일 크기는 2MB 이하여야 합니다.',true);
  let url;
  try {
    url=URL.createObjectURL(file);
    const img=new Image();
    img.src=url;
    await img.decode();
    if(img.width>MAX_DIMENSION||img.height>MAX_DIMENSION||!img.width||!img.height)
      throw new Error('이미지 크기는 최대 2048 × 2048px입니다.');
    state.image=img;
    state.demo=false;
    state.fileName=file.name.replace(/\.png$/i,'');
    $('fileName').textContent='현재: '+file.name;
    const dims=[16,32,48,64].find(n=>img.width%n===0&&img.height%n===0);
    if(dims){$('frameWidth').value=String(dims);$('frameHeight').value=String(dims);}
    const total=Math.floor(img.width/Number($('frameWidth').value))*Math.floor(img.height/Number($('frameHeight').value));
    $('idleStart').value='0';$('idleCount').value=String(Math.max(1,Math.min(4,total)));
    $('walkStart').value=String(total>4?4:0);$('walkCount').value=String(Math.max(1,Math.min(6,total-Number($('walkStart').value))));
    previewFrame=0;lastPreviewTime=0;syncPreviewInfo();drawSheet();
    notice('시트를 불러왔습니다. IDLE/WALK 프레임을 확인하고 적용하세요.');
  } catch(e) { notice(e?.message||'PNG를 읽을 수 없습니다.',true); }
  finally { if(url)URL.revokeObjectURL(url); }
}
function init() {
  try {
    state.game=new Playground($('gameMount'),(mode,x,y)=>{
      $('movementStatus').textContent=mode;
      $('positionStatus').textContent=x+', '+y;
    });
  } catch(e) {notice(e.message,true);return;}
  $('spriteFile').addEventListener('change',ev=>handleFile(ev.target.files?.[0]));
  const zone=$('dropZone');
  ['dragenter','dragover'].forEach(type=>zone.addEventListener(type,ev=>{ev.preventDefault();zone.classList.add('drag-over');}));
  ['dragleave','drop'].forEach(type=>zone.addEventListener(type,ev=>{ev.preventDefault();zone.classList.remove('drag-over');}));
  zone.addEventListener('drop',ev=>handleFile(ev.dataTransfer?.files?.[0]));
  $('demoButton').addEventListener('click',useDemo);
  $('idleTab').addEventListener('click',()=>selectMode('idle'));
  $('walkTab').addEventListener('click',()=>selectMode('walk'));
  $('applyButton').addEventListener('click',apply);
  for(const id of ids) $(id).addEventListener('input',()=>{
    previewFrame=0;lastPreviewTime=0;syncPreviewInfo();drawSheet();
    try {computeLayout();notice('설정이 변경되었습니다. 적용하기를 눌러 게임에 반영하세요.');}
    catch(e){notice(e.message,true);}
  });
  $('sheetCanvas').addEventListener('click',ev=>{
    try {
      const data=computeLayout(),rect=ev.currentTarget.getBoundingClientRect();
      const sx=ev.currentTarget.width/rect.width,sy=ev.currentTarget.height/rect.height;
      const x=(ev.clientX-rect.left)*sx/Number(ev.currentTarget.dataset.zoom);
      const y=(ev.clientY-rect.top)*sy/Number(ev.currentTarget.dataset.zoom);
      const col=Math.floor(x/data.width),row=Math.floor(y/data.height);
      const index=row*data.columns+col;
      if(col<0||col>=data.columns||row<0||row>=data.rows)return;
      $(state.selected+'Start').value=String(index);
      const currentCount=Number($(state.selected+'Count').value);
      if(index+currentCount>data.total)$(state.selected+'Count').value=String(data.total-index);
      previewFrame=0;lastPreviewTime=0;syncPreviewInfo();drawSheet();
      notice(index+'번부터 '+state.selected.toUpperCase()+' 프레임이 선택되었습니다. 적용하기를 눌러 반영하세요.');
    }catch(e){notice(e.message,true);}
  });
  useDemo();
  previewRequest=requestAnimationFrame(animatePreview);
}
init();
