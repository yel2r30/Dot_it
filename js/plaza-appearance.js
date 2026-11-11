const actions=['idle','walk','special','attack','damage','death'];
const limit=98304;
const columns=12;
const sizes=[48,32,24,16,12,8];

export function packPlazaAppearance(data) {
  if (data.demo) return null;
  const scale=Math.min(4,96/Math.max(data.width,data.height));
  const foot=(data.anchorY??data.height)-data.height/2;
  const geometry=Object.entries(data.animations).map(([action,info])=>{
    const source=info.image ? info : data;
    return {action,info,source,x:source.anchorX??source.width/2,y:(source.anchorY??source.height)-foot};
  });
  const rows=Math.ceil(geometry.reduce((sum,entry)=>sum+entry.info.count,0)/columns);
  const world=Math.ceil(2*scale*Math.max(...geometry.map(({source,x,y})=>
    Math.max(x,source.width-x,Math.abs(y),Math.abs(source.height-y))))+2);
  const sheet=document.createElement('canvas');
  for (const size of sizes) {
    sheet.width=columns*size;
    sheet.height=rows*size;
    const ctx=sheet.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    const ratio=scale*size/world;
    const frames={};
    let next=0;
    for (const {action,info,source,x,y} of geometry) {
      frames[action]=[next,info.count,info.fps,info.perFrame?info.durations:null,Math.round((source.height-y)*scale)];
      for (let index=0;index<info.count;index++,next++) {
        const frame=info.start+index;
        const left=(next%columns)*size,top=Math.floor(next/columns)*size;
        ctx.save();
        ctx.beginPath();
        ctx.rect(left,top,size,size);
        ctx.clip();
        ctx.translate(left+size/2,top+size/2);
        if ((source.sourceFacing ?? data.sourceFacing)==='left') ctx.scale(-1,1);
        ctx.drawImage(source.image,(frame%source.columns)*source.width,Math.floor(frame/source.columns)*source.height,
          source.width,source.height,-x*ratio,-y*ratio,source.width*ratio,source.height*ratio);
        ctx.restore();
      }
    }
    const packed=JSON.stringify({version:1,size,world,frames,specialLoop:Boolean(data.specialLoop),png:sheet.toDataURL('image/png')});
    if (packed.length<=limit) return packed;
  }
  throw new Error('광장에 공유할 캐릭터 그림이 너무 큽니다.');
}

export async function unpackPlazaAppearance(value) {
  if (typeof value!=='string'||value.length>limit) throw new Error('잘못된 캐릭터 데이터');
  const {version,size,world,frames,specialLoop,png}=JSON.parse(value);
  const prefix='data:image/png;base64,';
  if (version!==1||!sizes.includes(size)||!Number.isInteger(world)||world<1||world>4096||
      !frames||typeof frames!=='object'||Array.isArray(frames)||!Object.hasOwn(frames,'idle')||
      !Object.hasOwn(frames,'walk')||typeof png!=='string'||!png.startsWith(prefix)) throw new Error('잘못된 캐릭터 설정');
  const header=atob(png.slice(prefix.length,prefix.length+32));
  if (header.length!==24||header.slice(12,16)!=='IHDR') throw new Error('잘못된 캐릭터 PNG');
  const view=new DataView(Uint8Array.from(header,c=>c.charCodeAt(0)).buffer);
  const width=view.getUint32(16),height=view.getUint32(20);
  if (width!==columns*size||height<size||height%size||height>12*size) throw new Error('잘못된 프레임 크기');
  const animations={};
  for (const [action,spec] of Object.entries(frames)) {
    if (!actions.includes(action)||!Array.isArray(spec)||spec.length!==5) throw new Error('잘못된 동작');
    const [start,count,fps,durations,bottom]=spec;
    if (![start,count,fps,bottom].every(Number.isInteger)||start<0||count<1||count>24||
        start+count>columns*height/size||fps<1||fps>24||Math.abs(bottom)>world||
        (durations!==null&&(!Array.isArray(durations)||durations.length!==count||
          !durations.every(ms=>Number.isInteger(ms)&&ms>=20&&ms<=3000)))) throw new Error('잘못된 타임라인');
    animations[action]={start,count,fps,durations,perFrame:durations!==null,bottom};
  }
  const image=new Image();
  image.src=png;
  await image.decode();
  if (image.width!==width||image.height!==height) throw new Error('캐릭터 PNG 크기 불일치');
  return {image,width:size,height:size,columns,animations,specialLoop:specialLoop===true,worldScale:world/size};
}
