import { firebaseConfig } from './firebase-config.js?v=plaza-1';

import { isBlockedNickname } from './nickname-filter.js?v=4';

import { packPlazaAppearance, unpackPlazaAppearance } from './plaza-appearance.js?v=1';

const sdk='https://www.gstatic.com/firebasejs/12.19.0/';
const slots=8;
const leaseMs=45000;
const guestAppName='dot-it-plaza-guest';
const allowedActions=new Set(['idle','walk','special','attack','damage','death']);

export function setupPublicPlaza(game, createDemo, ranges, selectCharacter) {
  const enter=document.getElementById('plazaEnter');
  const leave=document.getElementById('plazaLeave');
  const status=document.getElementById('plazaStatus');
  const nicknameInput=document.getElementById('plazaNickname');
  const characterChoice=document.getElementById('plazaCharacter');
  const activeCharacter=document.getElementById('activeCharacter');
  let session;

  async function stop(message='공용 광장에서 나왔습니다.') {
    const current=session;
    if (!current) return;
    session=null;
    clearInterval(current.tick);
    clearTimeout(current.timeout);
    for (const unsubscribe of current.subscriptions) unsubscribe();
    if (current.demoInstalled) {
      game.leavePublicPlaza();
      activeCharacter.textContent=current.previousName;
    }
    leave.disabled=true;
    status.textContent=message;
    try {
      if (current.slot) {
        const remove=current.db.runTransaction(current.slot,pose=>
          pose?.pose?.session===current.id ? null : undefined,{applyLocally:false});
        await Promise.race([remove,new Promise(resolve=>setTimeout(resolve,1500))]);
      }
    } catch {} finally {
      if (current.database) current.db.goOffline(current.database);
      if (!session) enter.disabled=nicknameInput.disabled=characterChoice.disabled=false;
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
    enter.disabled=nicknameInput.disabled=characterChoice.disabled=true;
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
      const character=await selectCharacter(characterChoice.value,demo);
      if (session!==current) return;
      const appearance=packPlazaAppearance(character.data);
      if (session!==current) return;
      current.previousName=activeCharacter.textContent;
      game.enterPublicPlaza(demo,ranges,character.data);
      current.demoInstalled=true;
      activeCharacter.textContent=character.name;
      game.setPlazaNickname(nickname);
      current.subscriptions.push(auth.onAuthStateChanged(account,next=>{
        if (session===current && next?.uid!==user.uid) void stop('로그인이 종료되어 광장에서 나왔습니다.');
      }));
      const database=current.database=db.getDatabase(firebase,firebaseConfig.databaseURL);
      current.db=db;
      db.goOnline(database);
      const plaza=db.ref(database,'plazaV2');
      const seats=Array.from({length:slots},(_,index)=>db.child(plaza,String(index)));
      const poseRefs=seats.map(seat=>db.child(seat,'pose'));
      const initial=await Promise.all(poseRefs.map(async ref=>(await db.get(ref)).val()));
      if (session!==current) return;
      const payload=()=>({owner:user.uid,pose:{...game.plazaPose(),nickname,session:current.id,
        at:db.serverTimestamp(),...(appearance?{appearance}:{})}});
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
        const ref=seats[index];
        try {
          await db.set(ref,payload());
        } catch (error) {
          if (session!==current) return;
          if (!/permission.denied/i.test(error?.code ?? '')) throw error;
          if (!active((await db.get(poseRefs[index])).val())) throw error;
          continue;
        }
        if (session!==current) return;
        current.slot=ref;
        current.poseRef=poseRefs[index];
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
      const receive=(key,snapshot)=>{
        if (session!==current || key===current.key) return;
        const pose=snapshot.val();
        if (!active(pose) || !allowedActions.has(pose.action) ||
            !Number.isFinite(pose.x) || !Number.isFinite(pose.y) || typeof pose.flip!=='boolean') {
          remove(key);
          return;
        }
        let entry=current.remotes.get(key);
        if (!entry || entry.pose.session!==pose.session) {
          if (entry) game.showPlazaPlayer(key,null);
          entry={pose};
          current.remotes.set(key,entry);
          if (pose.appearance) {
            const pending=entry;
            void unpackPlazaAppearance(pose.appearance).then(data=>{
              if (session!==current || current.remotes.get(key)!==pending) return;
              game.setPlazaAppearance(key,data);
              game.showPlazaPlayer(key,pending.pose);
            }).catch(()=>{});
          }
        } else entry.pose=pose;
        game.showPlazaPlayer(key,pose);
        updateCount();
      };
      const denied=()=>{if (session===current) void stop('광장 데이터를 읽을 수 없습니다. 다시 입장해 주세요.');};
      for (const [index,poseRef] of poseRefs.entries()) {
        const key=String(index);
        if (key!==current.key) current.subscriptions.push(db.onValue(poseRef,snapshot=>receive(key,snapshot),denied));
      }
      current.subscriptions.push(db.onValue(db.ref(database,'.info/connected'),snapshot=>{
        if (session===current && snapshot.val()===false) void stop('연결이 끊겼습니다. 다시 입장해 주세요.');
      }));
      updateCount();
      let pending=false,last='',sentAt=0;
      current.tick=setInterval(async ()=>{
        if (session!==current) return;
        for (const [key,entry] of current.remotes) if (entry.pose.at<now()-leaseMs) remove(key);
        const pose=game.plazaPose();
        const encoded=JSON.stringify(pose);
        if (!pose || pending || (encoded===last && Date.now()-sentAt<12000)) return;
        pending=true;
        try {
          await db.update(current.poseRef,{...pose,at:db.serverTimestamp()});
          last=encoded;
          sentAt=Date.now();
        } catch {
          if (session===current) void stop('광장에 위치를 전송할 수 없습니다. 다시 입장해 주세요.');
        } finally {pending=false;}
      },200);
    } catch (error) {
      if (session===current) await stop(error?.message==='저장한 캐릭터가 없습니다.'
        ? '저장한 캐릭터가 없습니다. 다른 캐릭터를 선택해 주세요.'
        : '공용 광장에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
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
