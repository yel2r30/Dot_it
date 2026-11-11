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
      const drawLeg = (hip, foot, depth, trouser, shoe) => {
        const knee = Math.round((hip+foot)/2)+2;
        segment(hip,-13,knee,-7+depth,trouser,5);
        segment(knee,-7+depth,foot,-3+depth,trouser,4);
        ctx.fillStyle=shoe;
        ctx.fillRect(foot-2,-4+depth,5,3);
        ctx.fillRect(foot+2,-3+depth,4,2);
        ctx.fillStyle='#18212a';
        ctx.fillRect(foot-2,-1+depth,8,1);
      };
      // Both knees and both toes point toward the same side as the face.
      drawLeg(2,backFoot+1,-2,'#778d99','#222832');
      drawLeg(-3,frontFoot-1,0,'#aec0c4','#303744');
      segment(-6,-22,backHand-2,-14,'#15485d',5);
      ctx.fillStyle='#bb8467';
      ctx.fillRect(backHand-4,-15,3,3);
      ctx.fillStyle='#1e6580';
      ctx.fillRect(-7,-24,14,13);
      ctx.fillStyle='#184d66';
      ctx.fillRect(-7,-23,3,11);
      ctx.fillRect(-6,-13,12,2);
      ctx.fillStyle='#2d7b92';
      ctx.fillRect(-3,-24,9,2);
      ctx.fillRect(-2,-16,6,2);
      segment(6,-22,frontHand+1,handY,'#28748c',5);
      ctx.fillStyle='#e4ac86';
      ctx.fillRect(frontHand,handY-1,3,3);
      ctx.fillRect(-1,-26,4,3);

      const nod = effect==='nod' ? 3 : effect==='blink' ? 1 : 0;
      ctx.save();
      ctx.translate(nod,nod);
      // The face fills most of the head. A narrow shaded side and offset features suggest the turn.
      ctx.fillStyle='#c48b70';
      ctx.fillRect(-8,-33,3,6);
      ctx.fillRect(-7,-36,14,9);
      ctx.fillStyle='#efbd99';
      ctx.fillRect(-5,-36,13,8);
      ctx.fillRect(-4,-28,11,2);
      ctx.fillRect(-2,-26,7,1);
      ctx.fillStyle='#38242a';
      ctx.fillRect(-7,-38,14,4);
      ctx.fillRect(-8,-36,17,3);
      ctx.fillRect(-7,-34,3,4);
      ctx.fillRect(-3,-35,2,2);
      ctx.fillRect(3,-35,3,2);
      ctx.fillStyle='#553439';
      ctx.fillRect(-5,-38,9,1);
      ctx.fillStyle='#362a30';
      ctx.fillRect(-2,-32,2,nod ? 1 : 3);
      ctx.fillRect(4,-32,2,nod ? 1 : 3);
      ctx.fillStyle='#cc8e72';
      ctx.fillRect(2,-30,2,1);
      ctx.fillRect(1,-27,3,1);
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
