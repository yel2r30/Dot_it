import { firebaseConfig } from './firebase-config.js';

const button = document.getElementById('googleAccount');
const status = document.getElementById('accountStatus');
let user = null;
let signIn;
let signOut;

function show(message) {
  status.textContent = message;
  status.hidden = !message;
}

if (firebaseConfig) {
  button.disabled = true;
  try {
    const [app, auth] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js')
    ]);
    const account = auth.getAuth(app.initializeApp(firebaseConfig));
    const provider = new auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    signIn = () => auth.signInWithPopup(account, provider);
    signOut = () => auth.signOut(account);
    auth.onAuthStateChanged(account, current => {
      user = current;
      button.textContent = user ? '로그아웃' : 'Google로 로그인';
      show(user ? (user.displayName || 'Google 계정') + '으로 로그인했습니다. 캐릭터는 이 브라우저에 저장됩니다.' : '');
      button.disabled = false;
    }, () => {
      show('Google 로그인 상태를 확인하지 못했습니다.');
    });
  } catch {
    show('Google 로그인을 불러오지 못했습니다. 캐릭터 편집과 브라우저 저장은 사용할 수 있습니다.');
  }
}

button.addEventListener('click', async () => {
  if (!signIn) {
    show('Google 로그인 연결을 준비 중입니다. 캐릭터 편집과 브라우저 저장은 사용할 수 있습니다.');
    return;
  }
  button.disabled = true;
  try {
    if (user) await signOut();
    else await signIn();
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return;
    const message = error.code === 'auth/popup-blocked'
      ? '팝업이 차단됐습니다. Dot_it의 팝업을 허용한 뒤 다시 시도해 주세요.'
      : 'Google 계정 전환을 완료하지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
    show(message);
  } finally {
    button.disabled = false;
  }
});
