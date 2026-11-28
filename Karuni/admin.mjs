import pg from 'pg';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse} from '@simplewebauthn/server';
import {decryptSecret,encryptSecret,matchingCounter,newRecoveryCodes,newTotpSecret,otpauthUri,recoveryHash} from './totp.mjs';
const pool=new pg.Pool({connectionString:process.env.KARUNI_POSTGRES_URL,max:3,statement_timeout:8000});
const query=async(sql,args=[])=>(await pool.query(sql,args)).rows;
const challenges=new Map(),limits=new Map();
const origin=process.env.KARUNI_ORIGIN||'https://karuni.app',rpID=new URL(origin).hostname;
const need=(v,code=400,message='Invalid request')=>{if(!v)throw Object.assign(Error(message),{code})};
const isAdmin=role=>role==='admin'||role==='master';
function challenge(kind,uid,value){const id=randomBytes(32).toString('hex');challenges.set(id,{kind,uid,value,attempts:0,expires:Date.now()+120000});return id}
function consume(id,kind,uid){const c=challenges.get(id);challenges.delete(id);need(c&&c.kind===kind&&c.expires>Date.now()&&(uid===undefined||c.uid===uid),401);return c}
setInterval(()=>{for(const [k,c]of challenges)if(c.expires<Date.now())challenges.delete(k);limits.clear()},60000).unref();
function password(p,h){try{const [salt]=h.split(':');return typeof p==='string'&&p.length<=128&&timingSafeEqual(Buffer.from(salt+':'+scryptSync(p,salt,64).toString('hex')),Buffer.from(h))}catch{return false}}
export async function initAdmin(){await query(`CREATE TABLE IF NOT EXISTS admin_passkeys(id TEXT PRIMARY KEY,uid BIGINT NOT NULL REFERENCES users(id),public_key BYTEA NOT NULL,counter BIGINT NOT NULL,transports JSONB NOT NULL DEFAULT '[]',created_at TIMESTAMPTZ NOT NULL DEFAULT now());CREATE TABLE IF NOT EXISTS admin_totp(uid BIGINT PRIMARY KEY REFERENCES users(id),secret_enc TEXT NOT NULL,enabled BOOLEAN NOT NULL DEFAULT false,last_counter BIGINT NOT NULL DEFAULT -1,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),confirmed_at TIMESTAMPTZ);CREATE TABLE IF NOT EXISTS admin_totp_recovery(uid BIGINT NOT NULL REFERENCES users(id),code_hash TEXT NOT NULL,used_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(uid,code_hash));CREATE INDEX IF NOT EXISTS admin_totp_recovery_uid_unused ON admin_totp_recovery(uid) WHERE used_at IS NULL`)}
export async function adminSecondFactor(uid,email){
 const [totp]=await query('SELECT enabled FROM admin_totp WHERE uid=$1',[uid]);
 if(totp?.enabled)return {requireTotp:true,challengeId:challenge('totp-login',uid,null)};
 const secret=newTotpSecret();return {requireTotpSetup:true,challengeId:challenge('totp-setup',uid,{secret,email}),secret,otpauth:otpauthUri(secret,email)};
}
export async function adminRoute({p,m,q,r,a,s,body,send,setCookie}){
 const post=m==='POST';
 if(post)need(q.headers.origin===origin,403);
 if(p.startsWith('/api/passkey/')||p==='/api/admin/totp/complete'){
  const ip=q.socket.remoteAddress;const n=limits.get(ip)||0;need(n<12,429);limits.set(ip,n+1);
  const b=await body(q);
  if(p==='/api/admin/totp/complete'){
   need(typeof b.challengeId==='string'&&typeof b.code==='string'&&b.code.length<=32,401);const pending=challenges.get(b.challengeId);need(pending&&['totp-login','totp-setup'].includes(pending.kind)&&pending.expires>Date.now(),401);pending.attempts++;if(pending.attempts>5)challenges.delete(b.challengeId);need(pending.attempts<=5,401);
   if(pending.kind==='totp-setup'){
    const counter=matchingCounter(pending.value.secret,b.code);need(counter!==null,401);consume(b.challengeId,'totp-setup',pending.uid);const codes=newRecoveryCodes(),cx=await pool.connect();
    try{await cx.query('BEGIN');const u=await cx.query('SELECT role,blocked FROM users WHERE id=$1 FOR UPDATE',[pending.uid]);need(u.rows.length&&isAdmin(u.rows[0].role)&&!u.rows[0].blocked,401);await cx.query('INSERT INTO admin_totp(uid,secret_enc,enabled,last_counter,confirmed_at) VALUES($1,$2,true,$3,now()) ON CONFLICT(uid) DO UPDATE SET secret_enc=excluded.secret_enc,enabled=true,last_counter=excluded.last_counter,confirmed_at=now()',[pending.uid,encryptSecret(pending.value.secret),counter]);await cx.query('DELETE FROM admin_totp_recovery WHERE uid=$1',[pending.uid]);for(const code of codes)await cx.query('INSERT INTO admin_totp_recovery(uid,code_hash) VALUES($1,$2)',[pending.uid,recoveryHash(code)]);await cx.query('DELETE FROM sessions WHERE uid=$1',[pending.uid]);await cx.query('INSERT INTO audit(actor,action,detail) VALUES($1,$2,$3)',[pending.uid,'totp_enroll','{}']);await cx.query('COMMIT')}catch(e){await cx.query('ROLLBACK');throw e}finally{cx.release()}
    setCookie(r,await s.session(Number(pending.uid)),28800);return send(r,200,{ok:true,recoveryCodes:codes});
   }
   const [totp]=await query('SELECT secret_enc,last_counter FROM admin_totp WHERE uid=$1 AND enabled=true',[pending.uid]);need(totp,401);let verified=false;
   if(/^\d{6}$/.test(b.code)){const counter=matchingCounter(decryptSecret(totp.secret_enc),b.code);if(counter!==null&&counter>Number(totp.last_counter))verified=(await pool.query('UPDATE admin_totp SET last_counter=$1 WHERE uid=$2 AND enabled=true AND last_counter<$1',[counter,pending.uid])).rowCount===1}
   else{const used=await pool.query('UPDATE admin_totp_recovery SET used_at=now() WHERE uid=$1 AND code_hash=$2 AND used_at IS NULL RETURNING uid',[pending.uid,recoveryHash(b.code)]);verified=used.rowCount===1}
   need(verified,401);consume(b.challengeId,'totp-login',pending.uid);const [u]=await query('SELECT role,blocked FROM users WHERE id=$1',[pending.uid]);need(u&&isAdmin(u.role)&&!u.blocked,401);setCookie(r,await s.session(Number(pending.uid)),28800);return send(r,200,{ok:true});
  }
  if(p==='/api/passkey/options'){
   const options=await generateAuthenticationOptions({rpID,userVerification:'required'});return send(r,200,{options,challengeId:challenge('login',null,options.challenge)});
  }
  if(p==='/api/passkey/verify'){
   const c=consume(b.challengeId,'login');const [k]=await query('SELECT k.*,u.blocked,u.role,u.email FROM admin_passkeys k JOIN users u ON u.id=k.uid WHERE k.id=$1',[b.response?.id]);need(k&&isAdmin(k.role)&&!k.blocked,401);
   const v=await verifyAuthenticationResponse({response:b.response,expectedChallenge:c.value,expectedOrigin:origin,expectedRPID:rpID,credential:{id:k.id,publicKey:new Uint8Array(k.public_key),counter:Number(k.counter),transports:k.transports},requireUserVerification:true});need(v.verified,401);
   await query('UPDATE admin_passkeys SET counter=$1 WHERE id=$2',[v.authenticationInfo.newCounter,k.id]);return send(r,200,await adminSecondFactor(Number(k.uid),k.email));
  }
 }
 need(isAdmin(a?.role)&&!a.blocked,403);
 if(m==='GET'&&p==='/api/admin/overview'){
  const [summary]=await query(`SELECT (SELECT count(*) FROM users) users,(SELECT count(*) FROM users WHERE blocked=1) blocked,(SELECT count(*) FROM models WHERE enabled=1) models,(SELECT count(*) FROM requests) requests,(SELECT coalesce(sum(charge),0) FROM requests WHERE state='settled') charged`);
  return send(r,200,{currentRole:a.role,summary,users:await query('SELECT u.id,u.email,u.role,u.balance,u.blocked,(ra.uid IS NOT NULL) AS "referralEligible",ra.rate_bps AS "referralRateBps" FROM users u LEFT JOIN referral_agents ra ON ra.uid=u.id ORDER BY u.id'),models:await query('SELECT id,name,family,description,input,output,maxin,maxout,enabled FROM models ORDER BY name'),usage:await query('SELECT uid,id,model,state,input,output,charge,at FROM requests ORDER BY at DESC LIMIT 100'),audit:await query('SELECT actor,action,detail FROM audit ORDER BY id DESC LIMIT 60'),passkeys:await query('SELECT id,created_at FROM admin_passkeys WHERE uid=$1',[a.id]),totp:(await query('SELECT enabled,confirmed_at FROM admin_totp WHERE uid=$1',[a.id]))[0]||{enabled:false}});
 }
 const b=post?await body(q):{};
 if(post&&['/api/admin/pricing','/api/admin/user-block','/api/admin/key-revoke'].includes(p)){need(typeof b.reason==='string'&&b.reason.trim().length>0,400,'A reason is required');const [u]=await query('SELECT password FROM users WHERE id=$1',[a.id]);need(password(b.password,u.password),401);}
 if(post&&p==='/api/admin/user-block'){
  need(Number.isSafeInteger(b.uid)&&typeof b.blocked==='boolean'&&b.uid!==a.id);const cx=await pool.connect();try{await cx.query('BEGIN');const z=await cx.query('SELECT role FROM users WHERE id=$1 FOR UPDATE',[b.uid]);need(z.rows.length&&!isAdmin(z.rows[0].role),403);await cx.query('UPDATE users SET blocked=$1 WHERE id=$2',[b.blocked?1:0,b.uid]);if(b.blocked)await cx.query('DELETE FROM sessions WHERE uid=$1',[b.uid]);await cx.query('INSERT INTO audit(actor,action,detail) VALUES($1,$2,$3)',[a.id,'user_block',JSON.stringify({uid:b.uid,blocked:b.blocked,reason:b.reason})]);await cx.query('COMMIT')}catch(e){await cx.query('ROLLBACK');throw e}finally{cx.release()}return send(r,200,{ok:true});
 }
 if(post&&p==='/api/admin/user-keys'){need(Number.isSafeInteger(b.uid));return send(r,200,await query('SELECT id,name,prefix,active FROM keys WHERE uid=$1',[b.uid]))}
 if(post&&p==='/api/admin/key-revoke'){need(Number.isSafeInteger(b.id));await query('UPDATE keys SET active=0 WHERE id=$1',[b.id]);await query('INSERT INTO audit(actor,action,detail) VALUES($1,$2,$3)',[a.id,'key_revoke',JSON.stringify({id:b.id,reason:b.reason})]);return send(r,200,{ok:true})}
 if(post&&p==='/api/admin/pricing'){
  need(typeof b.id==='string'&&Number.isSafeInteger(b.price)&&b.price>=0&&b.price<=1e12&&typeof b.enabled==='boolean');
  const old=await s.getModel(b.id);need(old,404);await s.model({...old,id:old.id,source:old.source,name:old.name,family:old.family,description:old.description,input:b.price,output:b.price,maxIn:old.maxIn,maxOut:old.maxOut,enabled:b.enabled?1:0},a.id);return send(r,200,{ok:true});
 }
 if(post&&p==='/api/admin/password'){
  const [u]=await query('SELECT password FROM users WHERE id=$1',[a.id]);need(password(b.current,u.password),401);need(typeof b.password==='string'&&b.password.length>=16&&b.password.length<=128);const salt=randomBytes(32).toString('hex');const hash=salt+':'+scryptSync(b.password,salt,64).toString('hex');await query('UPDATE users SET password=$1 WHERE id=$2',[hash,a.id]);await query('DELETE FROM sessions WHERE uid=$1',[a.id]);setCookie(r,'',0);return send(r,200,{ok:true});
 }
 if(post&&p==='/api/admin/passkey-options'){
  const [u]=await query('SELECT email,password FROM users WHERE id=$1',[a.id]);need(password(b.password,u.password),401);const keys=await query('SELECT id,transports FROM admin_passkeys WHERE uid=$1',[a.id]);const options=await generateRegistrationOptions({rpName:'Karuni Admin',rpID,userName:u.email,userID:new TextEncoder().encode(String(a.id)),attestationType:'none',excludeCredentials:keys.map(x=>({id:x.id,transports:x.transports})),authenticatorSelection:{residentKey:'required',userVerification:'required'}});return send(r,200,{options,challengeId:challenge('register',a.id,options.challenge)});
 }
 if(post&&p==='/api/admin/passkey-verify'){
  const c=consume(b.challengeId,'register',a.id);const v=await verifyRegistrationResponse({response:b.response,expectedChallenge:c.value,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true});need(v.verified,401);const k=v.registrationInfo.credential;await query('INSERT INTO admin_passkeys(id,uid,public_key,counter,transports) VALUES($1,$2,$3,$4,$5)',[k.id,a.id,Buffer.from(k.publicKey),k.counter,JSON.stringify(k.transports||[])]);await query('INSERT INTO audit(actor,action,detail) VALUES($1,$2,$3)',[a.id,'passkey_enroll','{}']);return send(r,200,{ok:true});
 }
 throw Object.assign(Error('Endpoint not found'),{code:404});
}
