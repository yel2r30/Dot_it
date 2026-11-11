const spritePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAydJREFUWIXtlz9s03gUxz92WDlybSUaJ1htoblIN7BwOkoZ4MrIxEAECwwIHSPccMuxVCwsiO2kY6F3Uxn4M4EEiOWk6gpCCFUCappEKU4RNGnUoiNg//wYHFsJtInN9WCAr+Q47/3e+76v/d7PluErPjO0uAk/je6U2fnyqmvPypXYfLESMqYhWdMMEwX/p1qvU11ZDkXITEpIn0P79lBX/g1xFVeX6qv6ezd+Q3VlmTjFYwnImIakR3Yzls+TTaX5LX+gbf3M5GWO5Irs/PkK9tQvUWk7t2D79zl531ddWaZVSIDfz5/j0fUbDA+ZJNDbcqYfPFyzTkcBGdMQmrcXoGfTxpZMHURAA88T9BamxlsH11Us1KrQZTi79ikQEWA441+1CGiafxYR9KYC65nti/j3LY03DV6tvOpYI9KgOI4jAKWFF+zd/UPH2Dt/32XI6CexIRGJu2uQVbZlKN2P53l+gq6T0OHp/PO2uCGj/4PcKCL0bgGtKC28IKFD4Y+zoW/Q2Ix+fYJCxRcUnNcFVtkWq2yL4zjiOI5YZVsypiEZ0xDXVWKVbXFdFfpU06dcFR7rIkIpFQrwXi+KzKREaiVxXSVSK4nMpMR7vegLUkqUii4g0gwE/7dt6Yebl3xjx0h74L0pANTYQTSgYPutGDbTHWt0nYFWgqfzzxmfa1AoFj+IKxSLjM81EM+LXDySgNWIBo79CpUR0Kb8ozLi+5qDGrU4H/M6VqpzXxOJaPs/QKxt2NfbI6evXQ3t09eu8tf03dDedfgQfb09sSY/9usY4M/paQCGU0ZoWwuVj6GKLiC4sqyR5sh3/hBefDyAIBzNlSAHkGfu1i36entksVqL1IpILZBaqe22Xnw8AMDRXMkv3uJbK+c/CQB4ad1n6759YWGAiSeDTDwZDH1ZI83xCxd4ad2PSht9F/yYPygAJ06eWjNmtmJze3ISgH8mL61fCwKcOHmK2Yq95nrWSDOWz8ehjLcLguKdRHwSSK0krUP2vv2/I2WkZP+e0bDg/j2jEvcBFCD2oziZTAoCmq6xtLSkAWxKJkVrfqrU6/XYnF823gFkTYxsJDsLeQAAAABJRU5ErkJggg==';

// Frame order matches the editor's six demo ranges.
const poses = [
  // lift, lean, left foot lift, right foot lift, effect
  [[0,0,0,0],[0,0,0,0],[-1,0,0,0],[-1,0,0,0],[0,0,0,0],[0,0,0,0]],
  [[0,0,0,0],[0,.04,0,0,'blink'],[1,.12,0,0,'blink'],[2,.21,0,0,'sleep'],[2,.21,0,0,'sleep'],[0,.05,0,0]],
  [[0,.07,3,0],[-1,.07,2,0],[0,.07,0,0],[0,.07,0,3],[-1,.07,0,2],[0,.07,0,0]],
  [[0,-.13,0,0],[0,-.22,0,0],[-1,.16,0,0,'attack'],[-1,.27,0,0,'attack'],[0,.13,0,0],[0,0,0,0]],
  [[0,-.27,0,1,'damage'],[0,-.39,1,0,'damage'],[0,-.18,0,0],[0,0,0,0]],
  [[0,-.18,0,0],[1,-.45,0,0],[2,-.8,0,0],[3,-1.16,0,0],[3,-1.57,0,0],[3,-1.57,0,0]]
];

export async function createHumanDemo() {
  const source = new Image();
  source.src = spritePng;
  await source.decode();

  const cell = 48;
  const sheet = document.createElement('canvas');
  sheet.width = sheet.height = cell * 6;
  const ctx = sheet.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (const [row,frames] of poses.entries()) {
    for (const [column,[lift,lean,leftFoot,rightFoot,effect]] of frames.entries()) {
      ctx.save();
      const x = column*cell;
      const y = row*cell;
      ctx.beginPath();
      ctx.rect(x,y,cell,cell);
      ctx.clip();
      const fallShift = row===5 ? Math.round(-lean*5) : 0;
      ctx.translate(x+24+fallShift,y+39+lift);
      ctx.rotate(lean);
      if (row===2) {
        ctx.drawImage(source,0,0,32,27,-16,-30,32,27);
        ctx.drawImage(source,12,27,3,3,-4,-3-leftFoot,3,3);
        ctx.drawImage(source,17,27,3,3,1,-3-rightFoot,3,3);
      } else {
        ctx.drawImage(source,-16,-30);
      }
      ctx.restore();

      ctx.save();
      ctx.translate(x,y);
      if (effect==='attack') {
        ctx.fillStyle='#ffdc82';
        ctx.fillRect(35,24,8,2);
        ctx.fillRect(40,21,5,2);
        ctx.fillStyle='#fff4d0';
        ctx.fillRect(37,25,7,1);
      } else if (effect==='damage') {
        ctx.fillStyle='#ff887c';
        ctx.fillRect(10,16,4,2);
        ctx.fillRect(7,20,5,2);
      } else if (effect==='sleep') {
        ctx.fillStyle='#d1eaf4';
        ctx.fillRect(35,7,5,1);
        ctx.fillRect(38,8,1,1);
        ctx.fillRect(37,9,1,1);
        ctx.fillRect(36,10,1,1);
        ctx.fillRect(35,11,5,1);
      }
      ctx.restore();
    }
  }
  return sheet;
}
