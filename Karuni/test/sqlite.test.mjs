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
    assert.deepEqual(s.usageLog(uid).summary.map(x=>({model:x.model,requests:x.requests,input:x.input,output:x.output,cost:x.cost})),[{model:'test-model',requests:1,input:4,output:2,cost:14}]);
  }finally{
    s.close();
  }
});

test('referral bonuses credit the inviter main balance immediately',()=>{
  const s=store(':memory:');
  try{
    const inviter=s.user('inviter@example.invalid','password');
    assert.throws(()=>s.referralState(inviter),/not been enabled/);
    s.setReferralAgent(inviter,true,1000);
    const code=s.referralState(inviter).code;
    const invitee=s.user('invitee@example.invalid','password','customer',code);
    const second=s.user('second@example.invalid','password');
    s.setReferralAgent(inviter,false,1000);
    assert.throws(()=>s.bindReferral(second,code),/Invalid referral code/);
    s.setReferralAgent(inviter,true,1000);
    const deposit=s.applyDeposit({uid:invitee,amount:1_000,ref:'deposit-1',actor:inviter,rateBps:1000});
    assert.deepEqual(deposit,{applied:true,id:1,earning:100});
    assert.equal(s.applyDeposit({uid:invitee,amount:1_000,ref:'deposit-1',actor:inviter,rateBps:1000}).applied,false);
    assert.equal(s.account(invitee).balance,1_000);
    assert.equal(s.account(inviter).balance,100);
    const state=s.referralState(inviter);
    assert.equal(state.total,100);
    assert.equal(state.referred,1);
    assert.equal(state.bonuses,1);
    const earning=s.adminReferralIndex().earnings[0];
    assert.equal(earning.state,'approved');
    assert.equal(earning.paid_amount,100);
    assert.throws(()=>s.transferReferral(inviter),/No referral balance available/);
    assert.equal(s.usageLedger(inviter).data[0].kind,'referral_bonus');
  }finally{
    s.close();
  }
});

test('Google registration preserves referral attribution',()=>{
  const s=store(':memory:');
  try{
    const inviter=s.user('google-inviter@example.invalid','password');s.setReferralAgent(inviter,true,500);const code=s.referralState(inviter).code;
    const invitee=s.googleUser('google-subject','google-invitee@example.invalid','encoded-password',code);
    s.applyDeposit({uid:invitee,amount:2_000,ref:'google-referral-deposit',rateBps:500});
    assert.equal(s.account(inviter).balance,100);
    assert.deepEqual({...s.referralState(inviter)},{code,total:100,bonuses:1,referred:1,rateBps:500});
  }finally{
    s.close();
  }
});

test('QRIS payment settlement is idempotent and applies referral commission',()=>{
  const s=store(':memory:');
  try{
    const inviter=s.user('payment-inviter@example.invalid','password');s.setReferralAgent(inviter,true,1000);const code=s.referralState(inviter).code;
    const invitee=s.user('payment-invitee@example.invalid','password','customer',code);
    s.createPaymentOrder({reference:'krq_test',uid:invitee,amountIdr:10_000,credits:10_000_000_000});
    s.activatePaymentOrder({reference:'krq_test',transactionId:'trx_test',qrUrl:'https://link.belibayar.id/test.png',expiredAt:2_000_000_000});
    assert.equal(s.settlePayment({reference:'krq_test',transactionId:'trx_test',amountIdr:10_000,status:'paid',rateBps:1000}).applied,true);
    assert.equal(s.settlePayment({reference:'krq_test',transactionId:'trx_test',amountIdr:10_000,status:'paid',rateBps:1000}).applied,false);
    assert.equal(s.account(invitee).balance,10_000_000_000);
    assert.equal(s.account(inviter).balance,1_000_000_000);
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
