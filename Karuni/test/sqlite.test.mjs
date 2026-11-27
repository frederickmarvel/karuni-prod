import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {store,usageCharge} from '../store.mjs';
import {parseSeedCatalog} from '../catalog-seed.mjs';

test('blended per-million pricing uses exact integer arithmetic',()=>{
  assert.equal(usageCharge(100_000,277_500_000,50_000,277_500_000),41_625_000);
  assert.equal(usageCharge(1_000_000,3_960_000_000,0,3_960_000_000),3_960_000_000);
});

test('catalog seed is normalized, idempotent, disabled, and respects removals',()=>{
  const rows=parseSeedCatalog(fs.readFileSync(new URL('../data/seed-catalog.csv',import.meta.url),'utf8')),s=store(':memory:');
  try{
    assert.equal(rows.length,70);
    assert.equal(rows.some(x=>/^(wz|cx|ag)\//.test(x.id)),false);
    assert.equal(rows.find(x=>x.source==='wz/weizerouter-v1').id,'general-v1');
    assert.equal(rows.find(x=>x.source==='wz/weizerouter-image').id,'image-generation-v1');
    assert.equal(s.seedModels(rows),70);
    assert.equal(s.seedModels(rows),0);
    assert.equal(s.catalog().length,0);
    const actor=s.user('catalog-admin@example.invalid','password','admin'),model=rows[0];
    s.sync([model.source],actor);
    s.model({...model,enabled:1},actor);
    assert.equal(s.catalog().length,1);
    s.archiveModel(model.id,actor);
    assert.equal(s.seedModels(rows),0);
    assert.equal(s.getModel(model.id),undefined);
  }finally{
    s.close();
  }
});

test('SQLite store preserves billing, replay, and pending-request invariants',()=>{
  const s=store(':memory:');
  try{
    const uid=s.user('sqlite-test@example.invalid','encoded-password');
    const key=s.key(uid,'test key');
    assert.match(key,/^kr_live_[a-f0-9]{64}$/);
    assert.equal(s.keyUser(key).id,uid);
    const keyId=s.keyUser(key).keyId;
    assert.equal(s.adjust(uid,1000,'initial-credit'),true);
    assert.equal(s.adjust(uid,1000,'initial-credit'),false);
    s.sync(['upstream/test']);
    const model={id:'test-model',source:'upstream/test',name:'Test Model',family:'Test',description:'SQLite fixture',input:2_000_000,output:3_000_000,maxIn:10,maxOut:10,enabled:1};
    s.model(model);

    const first=s.reserve(uid,'request-1','fingerprint-1',model,10,true,null,10,keyId);
    assert.equal(first.held,50);
    assert.equal(s.settle(uid,'request-1',4,2),true);
    assert.equal(s.settle(uid,'request-1',4,2),false);
    assert.equal(s.account(uid).balance,986);
    assert.equal(s.summary(uid).spend,14);

    s.reserve(uid,'request-2','fingerprint-2',model,10,true,null,10,keyId);
    assert.deepEqual(s.balanceState(uid),{available:986,held:50,effective:936,pending:1});
    assert.equal(s.reapPending(0),1);
    assert.equal(s.history(uid)[0].state,'rejected');
    assert.equal(s.account(uid).balance,986);
    assert.deepEqual(s.balanceState(uid),{available:986,held:0,effective:986,pending:0});
    assert.deepEqual({...s.usageTokens(uid).summary},{input:4,output:2,requests:2,successes:1});
    assert.equal(s.usageRequests(uid,{state:'settled',page:1}).data.length,1);
    assert.equal(s.usageRequests(uid,{state:'settled',page:1}).has_more,false);
    assert.equal(s.usageLedger(uid,1).has_more,false);
    assert.deepEqual(s.usageByKey(uid).map(x=>({name:x.name,requests:x.requests,input:x.input,output:x.output,charge:x.charge})),[{name:'test key',requests:2,input:4,output:2,charge:14}]);
  }finally{
    s.close();
  }
});

test('approved referral fees transfer atomically to the AI wallet',()=>{
  const s=store(':memory:');
  try{
    const inviter=s.user('inviter@example.invalid','password'),code=s.referralState(inviter).code;
    const invitee=s.user('invitee@example.invalid','password','customer',code);
    const deposit=s.applyDeposit({uid:invitee,amount:1_000,ref:'deposit-1',actor:inviter,rateBps:1000});
    assert.deepEqual(deposit,{applied:true,id:1,earning:100});
    assert.equal(s.applyDeposit({uid:invitee,amount:1_000,ref:'deposit-1',actor:inviter,rateBps:1000}).applied,false);
    assert.equal(s.account(invitee).balance,1_000);
    let state=s.referralState(inviter);
    assert.equal(state.total,0);
    const earning=s.adminReferralIndex().earnings[0];
    assert.equal(s.setReferralEarning(earning.id,'approved',inviter),true);
    state=s.referralState(inviter);
    assert.equal(state.total,100);
    assert.deepEqual(s.transferReferral(inviter),{transferred:100,balance:100});
    state=s.referralState(inviter);
    assert.equal(state.total,0);
    assert.equal(s.account(inviter).balance,100);
    assert.throws(()=>s.transferReferral(inviter),/No referral balance available/);
    assert.equal(s.usageLedger(inviter).data[0].kind,'referral_transfer');
  }finally{
    s.close();
  }
});

test('master admin can create a non-master administrator',()=>{
  const s=store(':memory:');
  try{
    const master=s.user('master@example.invalid','encoded-password','admin');
    s.ensureMaster(master);
    assert.equal(s.account(master).role,'master');
    const admin=s.createAdmin('admin@example.invalid','encoded-password',master,'Delegate operations');
    assert.equal(s.account(admin).role,'admin');
    assert.equal(s.login('admin@example.invalid').role,'admin');
    assert.throws(()=>s.createAdmin('admin@example.invalid','encoded-password',master,'Duplicate'),/already registered/);
  }finally{
    s.close();
  }
});
