// Run against a local Firebase Realtime Database emulator only.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

test('plaza ownership, visibility, and server-side validation', async () => {
  const env=await initializeTestEnvironment({
    projectId:'demo-dot-it',
    database:{host:'127.0.0.1',port:9000,rules:await readFile(new URL('../database.rules.json',import.meta.url),'utf8')}
  });
  try {
    await env.clearDatabase();
    const client=(uid,provider)=>env.authenticatedContext(uid,{firebase:{sign_in_provider:provider}}).database();
    const alice=client('alice','anonymous');
    const bob=client('bob','google.com');
    const guest=env.unauthenticatedContext().database();
    const seat=(owner,session,nickname='별빛')=>({owner,pose:{
      session,x:120,y:150,action:'idle',flip:false,nickname,at:{'.sv':'timestamp'}
    }});
    const first=seat('alice','00000000-0000-4000-8000-000000000001');
    const second=seat('bob','00000000-0000-4000-8000-000000000002');
    await assertSucceeds(alice.ref('plazaV2/0').set(first));
    await assertSucceeds(bob.ref('plazaV2/1').set(second));
    const visible=(await assertSucceeds(bob.ref('plazaV2/0/pose').get())).val();
    assert.equal(visible.nickname,'별빛');
    assert.equal(visible.owner,undefined);
    assert.equal(visible.uid,undefined);
    await assertFails(bob.ref('plazaV2/0/owner').get());
    await assertFails(bob.ref('plazaV2/0').get());
    await assertFails(bob.ref('plazaV2').get());
    await assertFails(guest.ref('plazaV2/0/pose').get());
    await assertFails(bob.ref('plazaV1').get());
    await assertSucceeds(alice.ref('plazaV2/0/pose').update({x:130,action:'walk',at:{'.sv':'timestamp'}}));
    await assertFails(bob.ref('plazaV2/0/pose').update({x:130}));
    await assertFails(bob.ref('plazaV2/0').remove());
    await assertFails(bob.ref('plazaV2/0').set(second));
    await assertFails(bob.ref('plazaV2/8').set(second));
    await assertFails(bob.ref('plazaV2/2').set({...second,owner:'alice'}));
    await assertFails(bob.ref('plazaV2/2').set({...second,pose:{...second.pose,nickname:'ㅅ . ㄲ'}}));
    await assertFails(bob.ref('plazaV2/2').set({...second,pose:{...second.pose,appearance:'x'.repeat(98305)}}));
    await assertFails(bob.ref('plazaV2/2').set({...second,pose:{...second.pose,uid:'bob'}}));
    await assertSucceeds(alice.ref('plazaV2/0').remove());
    assert.equal((await bob.ref('plazaV2/0/pose').get()).exists(),false);
  } finally {
    await env.cleanup();
  }
});
