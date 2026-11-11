const prefix = 'dotit-test-v1-';
const sdk = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
let sdkLoad;

function loadPeer() {
  if (window.Peer) return Promise.resolve(window.Peer);
  return sdkLoad ??= new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=sdk;
    script.onload=()=>window.Peer ? resolve(window.Peer) : reject(new Error('연결 도구를 불러오지 못했습니다.'));
    script.onerror=()=>reject(new Error('연결 도구를 불러오지 못했습니다.'));
    document.head.append(script);
  }).catch(error=>{sdkLoad=null;throw error;});
}

export function setupTestRoom(game, createDemo, ranges) {
  const create=document.getElementById('roomCreate');
  const join=document.getElementById('roomJoin');
  const leave=document.getElementById('roomLeave');
  const codeInput=document.getElementById('roomCode');
  const status=document.getElementById('roomStatus');
  let session;

  function stop(message='방에서 나왔습니다.') {
    const previous=session;
    if (!previous) return;
    session=null;
    clearInterval(previous.tick);
    clearTimeout(previous.timeout);
    previous.connection?.close();
    previous.peer?.destroy();
    if (previous.demoInstalled) game.leaveTestRoom();
    create.disabled=join.disabled=codeInput.disabled=false;
    leave.disabled=true;
    status.textContent=message;
  }

  function connect(current, connection) {
    if (session!==current || current.connection) {
      connection.close();
      return;
    }
    current.connection=connection;
    let heard=Date.now();
    const connectTimeout=setTimeout(()=>disconnected(),18000);
    function disconnected() {
      if (session!==current || current.connection!==connection) return;
      clearTimeout(connectTimeout);
      clearInterval(current.tick);
      current.connection=null;
      game.showRoomPlayer(null);
      connection.close();
      if (current.host)
        status.textContent='상대가 나갔습니다. 방 코드 '+current.code+'로 다시 초대할 수 있습니다.';
      else stop('호스트와 연결이 끊겼습니다.');
    }
    connection.on('data',data=>{
      if (session!==current || current.connection!==connection || typeof data!=='string' || data.length>150) return;
      try {
        const pose=JSON.parse(data);
        if (!pose || !Number.isFinite(pose.x) || !Number.isFinite(pose.y) ||
            !Number.isInteger(pose.frame) || !current.frames.has(pose.frame) || typeof pose.flip!=='boolean') return;
        heard=Date.now();
        game.showRoomPlayer(pose);
      } catch {}
    });
    connection.on('open',()=>{
      if (session!==current || current.connection!==connection) return;
      clearTimeout(connectTimeout);
      clearTimeout(current.timeout);
      status.textContent='2명 연결됨 · 방 코드 '+current.code;
      let sent=0, previous='';
      const send=()=>{
        if (session!==current || current.connection!==connection) return;
        const now=Date.now();
        if (now-heard>35000) {disconnected();return;}
        if (!connection.open) return;
        const pose=game.roomPose();
        if (!pose) return;
        const encoded=JSON.stringify(pose);
        if (encoded!==previous || now-sent>=2000) {
          try { connection.send(encoded); }
          catch { disconnected();return; }
          previous=encoded;
          sent=now;
        }
      };
      current.tick=setInterval(send,50);
      send();
    });
    connection.on('close',disconnected);
    connection.on('error',disconnected);
  }

  async function start(host) {
    if (session) return;
    const code=host ? Array.from(crypto.getRandomValues(new Uint8Array(5)),byte=>byte.toString(16).padStart(2,'0')).join('')
      : codeInput.value.trim().toLowerCase();
    if (!/^[0-9a-f]{10}$/.test(code)) {status.textContent='호스트의 10자리 방 코드를 입력해 주세요.';return;}
    const frames=new Set(Object.values(ranges).flatMap(([start,count])=>Array.from({length:count},(_,i)=>start+i)));
    const current={host,code,frames};
    session=current;
    create.disabled=join.disabled=codeInput.disabled=true;
    leave.disabled=false;
    status.textContent='테스트 방에 연결하는 중입니다.';
    current.timeout=setTimeout(()=>stop('연결 시간이 초과됐습니다. 방 코드와 네트워크를 확인해 주세요.'),18000);
    try {
      const [Peer,demo]=await Promise.all([loadPeer(),createDemo()]);
      if (session!==current) return;
      game.enterTestRoom(demo,ranges);
      current.demoInstalled=true;
      const peer=current.peer=host ? new Peer(prefix+code) : new Peer();
      peer.on('open',()=>{
        if (session!==current) return;
        if (host) {
          clearTimeout(current.timeout);
          codeInput.value=code;
          status.textContent='방 코드 '+code+' · 다른 브라우저에서 이 코드로 참가하세요.';
        } else connect(current,peer.connect(prefix+code,{reliable:true,serialization:'none'}));
      });
      if (host) peer.on('connection',connection=>connect(current,connection));
      peer.on('error',error=>{
        if (session!==current) return;
        stop(error.type==='peer-unavailable'?'열려 있는 방을 찾지 못했습니다. 호스트와 방 코드를 확인해 주세요.'
          :'테스트 방 연결에 실패했습니다. 잠시 뒤 다시 시도해 주세요.');
      });
      peer.on('disconnected',()=>{if (session===current) stop('연결 서비스와 연결이 끊겼습니다.');});
    } catch(error) {
      if (session===current) stop(error.message);
    }
  }

  create.addEventListener('click',()=>start(true));
  join.addEventListener('click',()=>start(false));
  leave.addEventListener('click',()=>stop());
  window.addEventListener('pagehide',()=>stop());
  return { stop };
}
