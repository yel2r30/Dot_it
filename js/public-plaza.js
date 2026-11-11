import { firebaseConfig } from './firebase-config.js?v=plaza-1';

import { isBlockedNickname } from './nickname-filter.js?v=4';

const sdk='https://www.gstatic.com/firebasejs/12.19.0/';
const slots=8;
const leaseMs=45000;
const guestAppName='dot-it-plaza-guest';
const allowedActions=new Set(['idle','walk','special','attack','damage','death']);

export function setupPublicPlaza(game, createDemo, ranges) {
  const enter=document.getElementById('plazaEnter');
  const leave=document.getElementById('plazaLeave');
  const status=document.getElementById('plazaStatus');
  const nicknameInput=document.getElementById('plazaNickname');
  let session;

  async function stop(message='공용 광장에서 나왔습니다.') {
    const current=session;
    if (!current) return;
    session=null;
    clearInterval(current.tick);
    clearTimeout(current.timeout);
    for (const unsubscribe of current.subscriptions) unsubscribe();
    if (current.demoInstalled) game.leaveTestRoom();
    leave.disabled=true;
    status.textContent=message;
    try {
      if (current.slot) {
        const remove=current.db.runTransaction(current.slot,pose=>
          pose?.session===current.id ? null : undefined,{applyLocally:false});
        await Promise.race([remove,new Promise(resolve=>setTimeout(resolve,1500))]);
      }
    } catch {} finally {
      if (current.database) current.db.goOffline(current.database);
      if (!session) enter.disabled=nicknameInput.disabled=false;
    }
  }

  async function start() {
    if (session) return;
    const nickname=nicknameInput.value.trim();
    if (!nickname || nickname.length>16 || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(nickname)) {
      status.textContent='닉네임을 1~16자로 입력해 주세요.';
      nicknameInput.focus();
      return;
    }
    if (isBlockedNickname(nickname)) {
      status.textContent='사용할 수 없는 표현이 포함되어 있습니다. 다른 닉네임을 입력해 주세요.';
      nicknameInput.focus();
      return;
    }
    nicknameInput.value=nickname;
    const current={id:crypto.randomUUID(),subscriptions:[],remotes:new Map()};
    session=current;
    leave.disabled=false;
    enter.disabled=nicknameInput.disabled=true;
    status.textContent='공용 광장에 연결하는 중입니다.';
    current.timeout=setTimeout(()=>stop('연결 시간이 초과됐습니다. 잠시 뒤 다시 시도해 주세요.'),18000);
    try {
      const [app,auth,db]=await Promise.all([
        import(sdk+'firebase-app.js'),import(sdk+'firebase-auth.js'),import(sdk+'firebase-database.js')
      ]);
      if (session!==current) return;
      let firebase=app.getApps().find(instance=>instance.name==='[DEFAULT]') ?? app.initializeApp(firebaseConfig);
      let account=auth.getAuth(firebase);
      await account.authStateReady();
      if (session!==current) return;
      if (!account.currentUser) {
        // Keep the guest session separate from the site's Google login.
        firebase=app.getApps().find(instance=>instance.name===guestAppName) ??
          app.initializeApp(firebaseConfig,guestAppName);
        account=auth.getAuth(firebase);
        await account.authStateReady();
        if (session!==current) return;
        if (!account.currentUser) await auth.signInAnonymously(account);
      }
      if (session!==current) return;
      const user=account.currentUser;
      const guest=user.isAnonymous;
      const demo=await createDemo();
      if (session!==current) return;
      game.enterTestRoom(demo,ranges);
      current.demoInstalled=true;
      game.setPlazaNickname(nickname);
      current.subscriptions.push(auth.onAuthStateChanged(account,next=>{
        if (session===current && next?.uid!==user.uid) void stop('로그인이 종료되어 광장에서 나왔습니다.');
      }));
      const database=current.database=db.getDatabase(firebase,firebaseConfig.databaseURL);
      current.db=db;
      db.goOnline(database);
      const plaza=db.ref(database,'plazaV1');
      const initial=(await db.get(plaza)).val() ?? {};
      if (session!==current) return;
      const payload=()=>({...game.plazaPose(),uid:user.uid,nickname,session:current.id,at:db.serverTimestamp()});
      let offset=0;
      current.subscriptions.push(db.onValue(db.ref(database,'.info/serverTimeOffset'),snapshot=>{
        offset=Number(snapshot.val())||0;
      }));
      const now=()=>Date.now()+offset;
      const active=pose=>pose && Number.isFinite(pose.at) && pose.at>=now()-leaseMs;
      for (let index=0;index<slots;index++) {
        const key=String(index);
        if (active(initial[key])) continue;
        game.placePlazaPlayer(index);
        const ref=db.child(plaza,key);
        const result=await db.runTransaction(ref,pose=>active(pose)?undefined:payload(),{applyLocally:false});
        if (session!==current) return;
        if (!result.committed) continue;
        current.slot=ref;
        current.key=key;
        await db.onDisconnect(ref).remove();
        break;
      }
      if (session!==current) return;
      if (!current.slot) {await stop('광장 8자리가 모두 찼습니다. 잠시 뒤 다시 시도해 주세요.');return;}
      clearTimeout(current.timeout);
      const updateCount=()=>{
        status.textContent=(guest?'게스트로 입장':'공용 광장')+' · '+(current.remotes.size+1)+' / '+slots+'명';
      };
      const remove=key=>{
        current.remotes.delete(key);
        game.showPlazaPlayer(key,null);
        updateCount();
      };
      const receive=snapshot=>{
        if (session!==current || snapshot.key===current.key) return;
        const pose=snapshot.val();
        if (!active(pose) || !allowedActions.has(pose.action) ||
            !Number.isFinite(pose.x) || !Number.isFinite(pose.y) || typeof pose.flip!=='boolean') {
          remove(snapshot.key);
          return;
        }
        current.remotes.set(snapshot.key,pose.at);
        game.showPlazaPlayer(snapshot.key,pose);
        updateCount();
      };
      const denied=()=>{if (session===current) void stop('광장 데이터를 읽을 수 없습니다. 다시 입장해 주세요.');};
      current.subscriptions.push(db.onChildAdded(plaza,receive,denied),db.onChildChanged(plaza,receive,denied),
        db.onChildRemoved(plaza,snapshot=>{if (session===current) remove(snapshot.key);},denied));
      current.subscriptions.push(db.onValue(db.ref(database,'.info/connected'),snapshot=>{
        if (session===current && snapshot.val()===false) void stop('연결이 끊겼습니다. 다시 입장해 주세요.');
      }));
      updateCount();
      let pending=false,last='',sentAt=0;
      current.tick=setInterval(async ()=>{
        if (session!==current) return;
        for (const [key,at] of current.remotes) if (at<now()-leaseMs) remove(key);
        const pose=game.plazaPose();
        const encoded=JSON.stringify(pose);
        if (!pose || pending || (encoded===last && Date.now()-sentAt<12000)) return;
        pending=true;
        try {
          await db.set(current.slot,{...pose,uid:user.uid,nickname,session:current.id,at:db.serverTimestamp()});
          last=encoded;
          sentAt=Date.now();
        } catch {
          if (session===current) void stop('광장에 위치를 전송할 수 없습니다. 다시 입장해 주세요.');
        } finally {pending=false;}
      },200);
    } catch {
      if (session===current) await stop('공용 광장에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
    }
  }
  enter.addEventListener('click',()=>start());
  nicknameInput.addEventListener('keydown',event=>{
    if (event.key==='Enter' && !event.isComposing && !event.repeat) {
      event.preventDefault();
      void start();
    }
  });
  leave.addEventListener('click',()=>stop());
  window.addEventListener('pagehide',()=>stop());
  return {stop};
}
