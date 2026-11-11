// Match selected high-confidence insults and common shorthand in plaza nicknames.
const blocked = ["씨발","시발","씹새끼","개새끼","개색끼","개쉐끼","좆같","좆밥","좆까","지랄","병신","븅신","등신","엿먹","닥쳐","꺼져","미친놈","미친년","썅년","쌍년","씨팔","씨빨","시팔","시빨","십새끼","니애미","느금마","니엄마","애미뒤","애비뒤","고아새끼","한남충","김치녀","맘충","틀딱","짱깨","쪽바리","조센징","호모새끼","ㅅㅂ","ㅆㅂ","ㅂㅅ","ㅄ","ㅈㄹ","ㅈ같","ㅈ까","fuck","fucking","motherfucker","shit","bullshit","bitch","asshole","dickhead","cunt","bastard","retard","retarded","nigger","nigga","faggot","fck","sht","btch","ㅅ발","ㅆ발","시ㅂ","씨ㅂ"];

function compact(value) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
}

const blockedNames = blocked.map(compact);

export function isBlockedNickname(value) {
  const name=compact(value);
  const leet=name.replace(/[013457]/g,digit=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t'})[digit]);
  return blockedNames.some(word=>name.includes(word) || leet.includes(word));
}
