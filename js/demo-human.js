// Three-quarter-view human poses on a 6 × 6 grid of 48 px cells.
const rows = [
  // Each pose defines body lift, lean, feet, hands, and an optional effect.
  [[0,0,-4,4,-5,6],[0,0,-4,4,-5,6],[-1,0,-4,4,-5,6],[-1,0,-4,4,-5,6],[0,0,-4,4,-5,6],[0,0,-4,4,-5,6]],
  [[0,0,-4,4,-5,6,'blink'],[0,0,-4,4,-5,6],[0,.04,-4,4,-5,6,'blink'],[0,.09,-4,4,-5,6,'nod'],[0,.09,-4,4,-5,6,'nod'],[0,.02,-4,4,-5,6,'blink']],
  [[0,.12,-9,9,7,-7],[-1,.12,-5,5,4,-4],[-2,.12,-2,2,0,1],[0,.12,9,-9,-7,7],[-1,.12,5,-5,-4,4],[-2,.12,2,-2,0,1]],
  [[0,-.13,-5,6,-6,-6],[0,-.2,-6,7,-6,-10],[0,.16,-6,8,-4,15,'strike'],[0,.27,-6,8,-4,17,'strike'],[0,.15,-6,7,-5,13],[0,0,-4,4,-5,6]],
  [[0,-.27,-6,5,-10,10,'impact'],[0,-.36,-7,6,-12,11,'impact'],[1,-.18,-6,5,-8,8],[0,0,-4,4,-5,6]],
  [[0,-.24,-6,5,-9,10],[1,-.48,-7,5,-11,9],[2,-.8,-6,5,-7,6],[3,-1.2,-4,4,-4,6],[4,-1.57,-3,3,-4,4],[4,-1.57,-3,3,-4,4]]
];

export function createHumanDemo() {
  const size = 48;
  const sheet = document.createElement('canvas');
  sheet.width = sheet.height = size * 6;
  const ctx = sheet.getContext('2d');
  const segment = (x1,y1,x2,y2,color,width) => {
    ctx.strokeStyle=color;
    ctx.lineWidth=width;
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
  };
  for (const [row,poses] of rows.entries()) {
    for (const [column,[lift,lean,backFoot,frontFoot,backHand,frontHand,effect]] of poses.entries()) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(column*size,row*size,size,size);
      ctx.clip();
      const fallShift = row===5 ? Math.round(-lean*9) : 0;
      ctx.translate(column*size+24+fallShift,row*size+41+lift);
      ctx.rotate(lean);
      const handY = effect==='strike' ? -22 : -13;
      segment(-3,-12,backFoot,-2,'#253750',4);
      segment(backFoot-1,-2,backFoot+3,-2,'#18263b',3);
      segment(2,-12,frontFoot,-2,'#405877',4);
      segment(frontFoot-1,-2,frontFoot+3,-2,'#18263b',3);
      segment(-3,-21,backHand,-14,'#18796f',4);
      ctx.fillStyle='#36b59d';
      ctx.fillRect(-5,-25,10,14);
      segment(3,-22,frontHand,handY,'#52cfb4',4);
      ctx.fillStyle='#eab287';
      ctx.fillRect(frontHand-1,handY-1,3,3);
      const nod = effect==='nod' ? 3 : effect==='blink' ? 1 : 0;
      ctx.save();
      ctx.translate(nod,nod);
      ctx.fillRect(-5,-35,12,10);
      ctx.fillStyle='#bc826a';
      ctx.fillRect(-6,-31,2,4);
      ctx.fillRect(6,-30,2,3);
      ctx.fillStyle='#352a32';
      ctx.fillRect(-6,-36,12,4);
      ctx.fillRect(-6,-33,3,5);
      const eyeHeight = nod ? 1 : 2;
      ctx.fillRect(0,-31,2,eyeHeight);
      ctx.fillRect(5,-31,1,eyeHeight);
      ctx.fillStyle='#a76555';
      ctx.fillRect(3,-27,2,1);
      ctx.restore();
      if (effect==='strike') {
        segment(10,-26,16,-31,'#ffe28b',2);
        segment(12,-17,15,-20,'#fff3be',2);
      } else if (effect==='impact') {
        segment(10,-34,14,-36,'#ff7b73',2);
        segment(11,-28,16,-28,'#ffb28d',2);
      }
      ctx.restore();
    }
  }
  return sheet;
}
