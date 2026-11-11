import { Playground } from './game.js?v=dev001-timeline-5';
import { TimelineEditor } from './timeline.js?v=dev001-timeline-5';

const $ = id => document.getElementById(id);
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 2048;
const ids = ['frameWidth','frameHeight','idleStart','idleCount','idleFps','walkStart','walkCount','walkFps'];
const state = { image: null, demo: true, fileName: 'DEMO / Penguin', selected: 'idle', frames: { idle:{start:0,count:4,fps:4},walk:{start:6,count:6,fps:8} }, frameWidth:32, frameHeight:32, game:null, timeline:null };
const timings = {
  idle: { enabled: false, values: {} },
  walk: { enabled: false, values: {} }
};
const selectedFrames = {idle:0,walk:0};
let previewFrame = 0;
let previewFacing = 'right';
let previewTime = 0;
let previewPlaying = true;
let lastPreviewTime = 0;
function resetPreviewClock() {
  previewFrame=0;previewTime=0;lastPreviewTime=0;
  state.timeline?.setPlayhead(0);
}
function resetTimingSettings() {
  for(const type of ['idle','walk']){
    timings[type].enabled=false;
    timings[type].values={};
    selectedFrames[type]=0;
  }
}
function baseFrameTime(type) {
  const fps = Number($(type+'Fps').value);
  return Number.isFinite(fps) && fps > 0 ? Math.round(1000 / fps) : 250;
}
function frameTime(type, absoluteIndex) {
  return Object.hasOwn(timings[type].values,absoluteIndex)
    ? timings[type].values[absoluteIndex]
    : baseFrameTime(type);
}
function animationDurations(a) {
  return a.perFrame ? [...a.durations] : Array(a.count).fill(1000/a.fps);
}
function refreshInspector() {
  const type=state.selected;
  try {
    const a=computeLayout().animations[type];
    const selected=Math.max(0,Math.min(a.count-1,selectedFrames[type]));
    selectedFrames[type]=selected;
    const time=a.perFrame?a.durations[selected]:Math.round(1000/a.fps);
    $('timelineSelectedName').textContent='프레임 #'+(a.start+selected);
    $('timelineSelectedOrder').textContent=(selected+1)+' / '+a.count;
    $('selectedFrameTime').value=String(time);
    $('selectedFrameTime').disabled=!a.perFrame;
    $('resetFrameTimes').disabled=!a.perFrame;
    $('timelineModeHint').textContent=a.perFrame
      ? '키프레임(◆)을 움직여 프레임 유지 시간을 조절해 보세요.'
      : '전체 FPS 재생 중 · 프레임별 시간 편집을 켜면 경계를 조절할 수 있습니다.';
  } catch(e) {
    $('timelineModeHint').textContent=e.message;
    $('selectedFrameTime').disabled=true;
  }
}
function renderFrameTimes() {
  const type=state.selected;
  $('perFrameToggle').checked=timings[type].enabled;
  $('frameTimingEditor').hidden=false;
  if(!state.timeline)return;
  try {
    const data=computeLayout();
    const a=data.animations[type];
    selectedFrames[type]=Math.max(0,Math.min(a.count-1,selectedFrames[type]));
    state.timeline.render({
      image:data.image,width:data.width,height:data.height,columns:data.columns,
      start:a.start,count:a.count,durations:animationDurations(a),
      editable:a.perFrame,selected:selectedFrames[type]
    });
    refreshInspector();
    state.timeline.setPlayhead(previewTime);
  }catch(e){
    $('timelineModeHint').textContent=e.message;
  }
}
function setPreviewPlaying(value) {
  previewPlaying=Boolean(value);
  lastPreviewTime=0;
  $('timelinePlayPause').textContent=previewPlaying?'Ⅱ':'▶';
  $('timelinePlayPause').setAttribute('aria-label',previewPlaying?'일시정지':'재생');
  $('timelinePlayPause').setAttribute('aria-pressed',String(previewPlaying));
}
function seekPreview(ms) {
  const total=Math.max(1,state.timeline?.getTotal()||1);
  previewTime=Math.max(0,Math.min(total-1,ms));
  setPreviewPlaying(false);
  state.timeline?.setPlayhead(previewTime);
}
function selectTimelineFrame(index) {
  const type=state.selected;
  selectedFrames[type]=Math.max(0,index);
  state.timeline?.setSelection(selectedFrames[type]);
  refreshInspector();
}
function changeTimelineDuration(index,value,finished) {
  const type=state.selected;
  const start=Number($(type+'Start').value);
  const absolute=start+index;
  timings[type].values[absolute]=value;
  selectedFrames[type]=index;
  try {
    const a=computeLayout().animations[type];
    const total=animationDurations(a).reduce((sum,d)=>sum+d,0);
    previewTime=Math.min(previewTime,Math.max(0,total-1));
    state.timeline?.setSelection(index);
    refreshInspector();syncPreviewInfo();
    if(finished)notice('프레임 #'+absolute+' 시간을 '+value+'ms로 변경했습니다. 광장에 적용하려면 설정 적용하기를 눌러 주세요.');
  }catch(e){notice(e.message,true);}
}
let previewRequest = null;

function notice(message, error=false) {
  $('notice').textContent = message;
  $('notice').classList.toggle('error', error);
}
function createDemo() {
  const canvas=document.createElement('canvas');
  canvas.width=32*6; canvas.height=32*2;
  const g=canvas.getContext('2d');
  // Asymmetric right-facing side-view penguin to make horizontal flip unmistakable.
  for(let i=0;i<12;i++) {
    const x=(i%6)*32,y=Math.floor(i/6)*32;
    const step=i>=6?Math.sin((i-6)/6*Math.PI*2):0;
    const bob=i>=6?Math.round(Math.abs(step)*2):(i%4===2?1:0);
    g.fillStyle='#142b39';
    g.fillRect(x+9,y+7-bob,17,19);
    g.fillRect(x+7,y+12-bob,20,12);
    // White front-facing belly (right side of the sprite).
    g.fillStyle='#e2edf0';
    g.fillRect(x+19,y+15-bob,7,9);
    g.fillRect(x+22,y+12-bob,4,4);
    // Only one eye, near the right edge.
    g.fillStyle='#fff6ec';g.fillRect(x+21,y+9-bob,3,3);
    g.fillStyle='#142b39';g.fillRect(x+23,y+10-bob,1,1);
    // Pointed orange beak extending to the right.
    g.fillStyle='#f5a24f';g.fillRect(x+26,y+14-bob,5,3);
    g.fillRect(x+29,y+15-bob,3,1);
    // Scarf and trailing tail on left to make mirrored state obvious.
    g.fillStyle='#b8e66f';g.fillRect(x+10,y+14-bob,12,2);g.fillRect(x+5,y+16-bob,5,3);
    g.fillStyle='#203b4a';g.fillRect(x+7,y+18-bob,3,6);
    g.fillStyle='#eca35f';
    g.fillRect(x+10+(step>0?2:0),y+26,7,3);
    g.fillRect(x+20+(step<0?-2:0),y+26,6,3);
  }
  return canvas;
}
// Prefer a plausible sprite-grid layout instead of blindly selecting the smallest tile size.
// A 384x240 image should resolve to 48x48 (8 columns x 5 rows), not 16x16.
function suggestFrameSize(image) {
  const candidates=[32,48,64,16].filter(size=>image.width%size===0&&image.height%size===0);
  const plausible=candidates.find(size=>{
    const cols=image.width/size,rows=image.height/size;
    return cols>=2&&cols<=12&&rows>=2&&rows<=12;
  });
  return plausible??candidates[0]??null;
}
function resetSheetViewport() {
  const viewport=$('sheetCanvas').parentElement;
  viewport.scrollTop=0;
  viewport.scrollLeft=0;
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
    const perFrame=timings[kind].enabled;
    const durations=perFrame
      ? Array.from({length:count},(_,i)=>frameTime(kind,start+i))
      : null;
    if(perFrame&&!durations.every(v=>Number.isInteger(v)&&v>=20&&v<=3000))
      throw new Error(kind.toUpperCase()+' 프레임별 시간은 20~3000ms 사이의 정수여야 합니다.');
    animations[kind]={start,count,fps,perFrame,durations};
  }
  const sourceFacing=$('sourceFacing').value;
  if(!['left','right'].includes(sourceFacing))throw new Error('원본 방향을 선택해 주세요.');
  return {image:state.image,width:w,height:h,columns:cols,rows,total,animations,sourceFacing};
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
function setPreviewFacing(direction) {
  previewFacing=direction;
  for(const d of ['left','right']) {
    const element=$(d==='left'?'previewLeft':'previewRight');
    element.classList.toggle('active',d===direction);
    element.setAttribute('aria-pressed',String(d===direction));
  }
  updateMirrorLabel();
}
function updateMirrorLabel() {
  const source=$('sourceFacing').value;
  const mirrored=previewFacing!==source;
  $('previewMirrorStatus').textContent=mirrored?'좌우 반전 적용됨':'원본 방향 그대로';
}
function syncPreviewInfo() {
  const type=state.selected.toUpperCase();
  $('previewTitle').textContent=type;
  $('previewInfo').textContent=$(''+state.selected+'Count').value+' frames · '+
    (timings[state.selected].enabled?'프레임별 시간':'전체 '+$(state.selected+'Fps').value+' FPS');
}
function selectMode(mode) {
  state.selected=mode;
  for(const type of ['idle','walk']){
    $(type+'Tab').classList.toggle('active',type===mode);
    $(type+'Tab').setAttribute('aria-pressed',String(type===mode));
    $(type+'Fields').hidden=type!==mode;
  }
  resetPreviewClock();
  syncPreviewInfo();drawSheet();renderFrameTimes();
}
function animatePreview(timestamp) {
  previewRequest=requestAnimationFrame(animatePreview);
  if(!state.image)return;
  const c=$('animCanvas'),g=c.getContext('2d');
  g.clearRect(0,0,c.width,c.height);
  let data;
  try {data=computeLayout();} catch {lastPreviewTime=0;return;}
  const a=data.animations[state.selected];
  const durations=animationDurations(a);
  const total=durations.reduce((sum,d)=>sum+d,0);
  const elapsed=lastPreviewTime?Math.min(200,Math.max(0,timestamp-lastPreviewTime)):0;
  lastPreviewTime=timestamp;
  if(previewPlaying)previewTime=(previewTime+elapsed)%total;
  else previewTime=Math.max(0,Math.min(previewTime,total-1));
  let passed=0;
  for(let i=0;i<a.count;i++){
    if(previewTime<passed+durations[i]||i===a.count-1){previewFrame=i;break;}
    passed+=durations[i];
  }
  const frame=a.start+previewFrame;
  const duration=Math.round(durations[previewFrame]);
  $('previewFrameTime').textContent='프레임 '+frame+' · '+duration+'ms';
  $('timelineTimeLabel').textContent=Math.round(previewTime)+' / '+Math.round(total)+'ms';
  state.timeline?.setPlayhead(previewTime);
  const column=frame%data.columns,row=Math.floor(frame/data.columns);
  const scale=Math.min(4,Math.max(1,Math.floor(130/Math.max(data.width,data.height))));
  const renderW=data.width*scale,renderH=data.height*scale;
  g.imageSmoothingEnabled=false;
  g.save();
  if(previewFacing!==data.sourceFacing){g.translate(c.width,0);g.scale(-1,1);}
  g.drawImage(data.image,column*data.width,row*data.height,data.width,data.height,
    (c.width-renderW)/2,(c.height-renderH)/2,renderW,renderH);
  g.restore();
}
function resetDefaults(demo=false) {
  $('frameWidth').value='32';$('frameHeight').value='32';
  $('idleStart').value='0';$('idleCount').value='4';$('idleFps').value='4';
  $('walkStart').value=demo?'6':'0';$('walkCount').value=demo?'6':'4';$('walkFps').value='8';
  $('sourceFacing').value='right';
  setPreviewFacing('right');
  resetPreviewClock();syncPreviewInfo();
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
  resetTimingSettings();resetDefaults(true);drawSheet();resetSheetViewport();renderFrameTimes();apply();
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
    const dims=suggestFrameSize(img);
    if(dims){$('frameWidth').value=String(dims);$('frameHeight').value=String(dims);}
    const total=Math.floor(img.width/Number($('frameWidth').value))*Math.floor(img.height/Number($('frameHeight').value));
    $('idleStart').value='0';$('idleCount').value=String(Math.max(1,Math.min(4,total)));
    $('walkStart').value=String(total>4?4:0);$('walkCount').value=String(Math.max(1,Math.min(6,total-Number($('walkStart').value))));
    resetTimingSettings();resetPreviewClock();syncPreviewInfo();drawSheet();
    resetSheetViewport();renderFrameTimes();
    notice('시트를 불러왔습니다. '+(dims?'프레임 크기 '+dims+'×'+dims+'px를 임시 설정했습니다. ':'')+'원본 방향과 애니메이션 범위를 확인하세요.');
  } catch(e) { notice(e?.message||'PNG를 읽을 수 없습니다.',true); }
  finally { if(url)URL.revokeObjectURL(url); }
}
function init() {
  try {
    state.game=new Playground($('gameMount'),(mode,x,y,facing,flipped)=>{
      $('movementStatus').textContent=mode;
      $('positionStatus').textContent=x+', '+y;
      $('facingStatus').textContent=(facing==='left'?'LEFT ←':'RIGHT →')+(flipped?' · FLIPPED':' · ORIGINAL');
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
  $('perFrameToggle').addEventListener('change',ev=>{
    timings[state.selected].enabled=ev.target.checked;
    resetPreviewClock();
    renderFrameTimes();syncPreviewInfo();
    notice(ev.target.checked
      ? '프레임별 시간을 설정할 수 있습니다. 변경 후 캐릭터에 적용해 주세요.'
      : '전체 FPS 모드로 전환했습니다. 변경 후 캐릭터에 적용해 주세요.');
  });
  $('resetFrameTimes').addEventListener('click',()=>{
    const type=state.selected;
    const start=Number($(type+'Start').value),count=Number($(type+'Count').value);
    if(!Number.isInteger(start)||!Number.isInteger(count)||count<1||count>24) return;
    for(let i=0;i<count;i++) timings[type].values[start+i]=baseFrameTime(type);
    resetPreviewClock();renderFrameTimes();syncPreviewInfo();
    notice('모든 프레임 시간을 현재 '+$(type+'Fps').value+' FPS 기준으로 초기화했습니다.');
  });
  $('previewLeft').addEventListener('click',()=>setPreviewFacing('left'));
  $('previewRight').addEventListener('click',()=>setPreviewFacing('right'));
  $('gameMount').addEventListener('pointerdown',()=>{
    // The game should regain keyboard input after editing frame numbers.
    if (['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)) document.activeElement.blur();
  });
  $('sourceFacing').addEventListener('change',()=>{
    // Apply immediately to both the preview and the active sprite.
    const source=$('sourceFacing').value;
    setPreviewFacing(source);
    state.game.setSourceFacing(source);
    // A focused SELECT blocks movement keys; release focus after the choice.
    $('sourceFacing').blur();
    notice('원본 방향이 즉시 반영되었습니다. A/D 키로 반전을 확인해 보세요.');
  });
  for(const id of ids) $(id).addEventListener('input',()=>{
    resetPreviewClock();syncPreviewInfo();drawSheet();renderFrameTimes();
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
      resetPreviewClock();syncPreviewInfo();drawSheet();renderFrameTimes();
      notice(index+'번부터 '+state.selected.toUpperCase()+' 프레임이 선택되었습니다. 적용하기를 눌러 반영하세요.');
    }catch(e){notice(e.message,true);}
  });
  useDemo();
  previewRequest=requestAnimationFrame(animatePreview);
}
init();
