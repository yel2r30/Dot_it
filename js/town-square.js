// Draw the village as a single layer below the players and their nameplates.
export function drawTownSquare(scene, width, height) {
  const art=scene.add.graphics().setDepth(.5);
  const rect=(x,y,w,h,color,alpha=1)=>art.fillStyle(color,alpha).fillRect(x,y,w,h);
  rect(0,0,width,height,0x745854);
  for (let y=0;y<height;y+=18) {
    for (let x=(y/18%2)*24-48;x<width;x+=48) {
      const tone=(Math.floor((x+48)/24)+y/18*7)%5;
      rect(x+1,y+1,46,16,[0xad8372,0xb38a77,0xba907e,0xa87d6e,0xb68c78][tone]);
      rect(x+2,y+2,44,2,0xd0a694,.5);
    }
  }
  // Paving around the open center.
  rect(0,0,width,16,0x3d594b);
  rect(0,height-25,width,25,0x3d594b);
  for (let x=0;x<width;x+=32) {
    rect(x+4,5,12,3,0x779263);
    rect(x+15,height-12,14,3,0x779263);
  }
  rect(0,15,width,6,0x645b58);
  rect(0,height-30,width,6,0x645b58);
  rect(216,164,528,302,0xbc9b86);
  rect(220,168,520,294,0xd2b29c);
  for (let y=173;y<459;y+=24) {
    rect(224,y,512,1,0xbd9a84);
    for (let x=226+(y%48===5?28:0);x<728;x+=56) rect(x,y,1,24,0xbd9a84);
  }
  // Fountain at the north end. Keep the plaza spawn and walking area open.
  const cx=width/2;
  rect(cx-71,106,142,43,0x583f43,.45);
  rect(cx-66,88,132,49,0x555864);
  rect(cx-54,77,108,68,0x555864);
  rect(cx-62,89,124,42,0xbec1bb);
  rect(cx-52,81,104,58,0xbec1bb);
  rect(cx-55,95,110,32,0x397c8a);
  rect(cx-45,89,90,44,0x397c8a);
  rect(cx-43,103,86,3,0x79c3cb);
  rect(cx-49,116,40,2,0x9bd9d8);
  rect(cx+14,119,30,2,0x9bd9d8);
  rect(cx-8,79,16,39,0x777e82);
  rect(cx-19,73,38,9,0xc6c9be);
  rect(cx-14,69,28,4,0xeff0d6);
  rect(cx-2,58,4,12,0xc5e8dd);
  rect(cx-12,82,3,15,0xb2e5de);
  rect(cx+9,82,3,15,0xb2e5de);

  function planter(x,y) {
    rect(x+4,y+14,46,16,0x6c4d47,.65);
    rect(x,y+10,44,17,0x75473e);
    rect(x,y+7,44,7,0xbd7857);
    rect(x+3,y+5,38,7,0x496244);
    for (let i=0;i<4;i++) {
      const stem=x+7+i*10;
      rect(stem,y-1,2,11,0x617d47);
      rect(stem-2,y+(i%2)*3-4,6,5,i%2?0xf3ca76:0xe69ba4);
      rect(stem,y+(i%2)*3-3,2,2,0xffe7b5);
    }
  }
  function stall(x,y,roof,shade) {
    rect(x+6,y+31,118,47,0x64484a,.55);
    rect(x+9,y+14,103,56,0x64453f);
    rect(x+16,y+24,89,27,0x523b38);
    rect(x+12,y+51,97,20,0x9b6349);
    rect(x+8,y+48,105,7,0xc89066);
    rect(x+15,y+58,91,3,0xb37954);
    for (let i=0;i<8;i++) rect(x+i*15,y,15,21,i%2?0xf1d6a8:roof);
    rect(x,y+20,120,5,shade);
    rect(x+24,y+43,14,5,0xa9b378);
    rect(x+56,y+42,14,6,0xd69b64);
    rect(x+80,y+44,13,4,0xc97973);
  }
  stall(44,45,0xb86562,0x884e53);
  stall(width-164,45,0x6f8b77,0x526b64);
  for (const x of [62,158,width-204,width-108]) {
    planter(x,151);
    planter(x,height-89);
  }
  for (const x of [177,width-193]) {
    rect(x,85,7,53,0x5d4944);
    rect(x-5,135,17,5,0x604c47);
    rect(x-4,77,15,13,0x624d45);
    rect(x-1,80,9,7,0xf4cf84);
  }
  return art;
}

export function drawMoonGarden(scene, width, height) {
  const art=scene.add.graphics().setDepth(.5);
  const rect=(x,y,w,h,c,a=1)=>art.fillStyle(c,a).fillRect(x,y,w,h);
  rect(0,0,width,height,0x243e3d);
  for(let y=16;y<height;y+=32) for(let x=14;x<width;x+=38) {
    const offset=(x*13+y*7)%17;
    rect(x+offset,y,7,2,0x34504a);
    rect(x+offset+2,y-3,2,3,0x527064);
  }
  art.fillStyle(0x283337).fillEllipse(width/2,296,632,334);
  art.fillStyle(0x4c5c62).fillEllipse(width/2,290,616,320);
  art.fillStyle(0x67777e).fillEllipse(width/2,289,595,300);
  for(let row=-5;row<=5;row++) {
    const span=Math.floor(282*Math.sqrt(1-(row/6)**2));
    const y=289+row*23;
    rect(width/2-span,y,span*2,2,0x53656d);
    for(let x=width/2-span+18;x<width/2+span-18;x+=43)
      rect(x+(row%2)*10,y-13,2,13,0x53656d);
  }
  art.fillStyle(0x293c42).fillEllipse(790,104,220,116);
  art.fillStyle(0x546c69).fillEllipse(790,98,210,110);
  art.fillStyle(0x264e61).fillEllipse(790,97,194,94);
  for(const [x,y,w] of [[730,89,42],[776,71,54],[798,107,56],[748,122,36]])
    rect(x,y,w,2,0x79a9b4,.7);
  art.fillStyle(0xadcbd0,.17).fillCircle(790,96,34);
  rect(770,95,40,3,0xa0c8cd,.65);
  for(const [x,y] of [[124,108],[823,350],[126,395],[560,99]]) {
    art.fillStyle(0xf6cd85,.13).fillCircle(x+3,y+8,40);
    rect(x,y+10,6,43,0x26353a);
    rect(x-5,y+48,16,6,0x526263);
    rect(x-5,y,16,14,0x756c54);
    rect(x-2,y+3,10,8,0xffda91);
    rect(x-7,y-3,20,3,0x394748);
  }
  for(const [x,y] of [[67,219],[801,442]]) {
    rect(x+3,y+10,87,16,0x1b3134,.65);
    rect(x+8,y+8,5,17,0x303b3e);
    rect(x+73,y+8,5,17,0x303b3e);
    rect(x,y,86,7,0x856956);
    rect(x,y+8,86,5,0xa1886a);
  }
  return art;
}
