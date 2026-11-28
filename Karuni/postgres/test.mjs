import assert from 'node:assert/strict';
import {store} from './store.mjs';

const s=await store(process.env.KARUNI_POSTGRES_URL);
try{
 const stamp=Date.now();
 const uid=await s.user('qa-'+stamp+'@example.invalid','not-a-real-password');
 const uid2=await s.user('qa2-'+stamp+'@example.invalid','invalid');
 await s.adjust(uid,100000,'qa');
 assert.equal(await s.adjust(uid,100000,'qa'),false);
 await s.sync(['neutral']);
 const m={id:'test-model',source:'neutral',name:'Test',family:'Test',description:'Isolated test',input:10_000_000,output:20_000_000,maxIn:100,maxOut:20,enabled:1};
 await s.model(m);
 const t=await s.session(uid);
 assert.equal((await s.sessionUser(t)).id,uid);
 const key=await s.key(uid,'qa'),keyActor=await s.keyUser(key);
 assert.equal(keyActor.id,uid);
 assert.equal((await s.keys(uid2)).length,0);
 const race=await Promise.allSettled([s.reserve(uid,'a','fp',m,5,true,null,null,keyActor.keyId),s.reserve(uid,'b','fp',m,5,true,null,null,keyActor.keyId)]);
 assert.equal(race.filter(x=>x.status==='fulfilled').length,1);
 const id=race[0].status==='fulfilled'?'a':'b';
 assert.equal(await s.settle(uid,id,10,2),true);
 assert.equal(await s.settle(uid,id,10,2),false);
 assert.equal((await s.account(uid)).balance,99860);
 assert.equal((await s.reserve(uid,id,'fp',m,5,true,null,null,keyActor.keyId)).duplicate,true);
 assert.equal((await s.summary(uid)).spend,140);
 assert.equal((await s.usageTokens(uid)).summary.successes,1);
 assert.equal((await s.usageByKey(uid))[0].charge,140);
 assert.deepEqual(await s.balanceState(uid),{available:99860,held:0,effective:99860,pending:0});

 await s.setReferralAgent(uid,true,1000);
 const invite=await s.mintReferralCode(uid);
 const invitee=await s.user('qa-invitee-'+stamp+'@example.invalid','invalid','customer',invite);
 const deposit=await s.applyDeposit({uid:invitee,amount:1000,ref:'qa-deposit-'+stamp,actor:uid,rateBps:1000});
 assert.equal(deposit.earning,100);
 const earning=(await s.adminReferralIndex()).earnings.find(x=>x.deposit_id===deposit.id);
 assert.equal(earning.state,'approved');
 assert.equal(earning.paid_amount,100);
 assert.equal((await s.referralState(uid)).total,100);
 assert.equal((await s.account(uid)).balance,99960);

 await s.logout(t);
 assert.equal(await s.sessionUser(t),undefined);
 await s.revoke(uid,(await s.keys(uid))[0].id);
 assert.equal(await s.keyUser(key),undefined);
 console.log('PASS postgres: billing, usage attribution, automatic referral bonus, session, revoke, tenant isolation');
}finally{
 await s.close();
}
