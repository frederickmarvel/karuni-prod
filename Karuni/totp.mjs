import {createCipheriv,createDecipheriv,createHmac,createHash,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';

const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(value){
 const bytes=Buffer.from(value);let bits=0,acc=0,out='';
 for(const byte of bytes){acc=(acc<<8)|byte;bits+=8;while(bits>=5){out+=alphabet[(acc>>>(bits-5))&31];bits-=5}}
 if(bits)out+=alphabet[(acc<<(5-bits))&31];
 return out;
}

export function base32Decode(value){
 const clean=String(value).toUpperCase().replace(/=+$/,'');let bits=0,acc=0,out=[];
 for(const char of clean){const n=alphabet.indexOf(char);if(n<0)throw Error('Invalid TOTP secret');acc=(acc<<5)|n;bits+=5;if(bits>=8){out.push((acc>>>(bits-8))&255);bits-=8}}
 return Buffer.from(out);
}

export const newTotpSecret=()=>base32Encode(randomBytes(20));

export function hotp(secret,counter,digits=6){
 const count=Buffer.alloc(8);count.writeBigUInt64BE(BigInt(counter));const digest=createHmac('sha1',base32Decode(secret)).update(count).digest(),offset=digest[19]&15;
 const value=(digest.readUInt32BE(offset)&0x7fffffff)%10**digits;
 return String(value).padStart(digits,'0');
}

export function matchingCounter(secret,code,now=Date.now(),skew=1){
 if(!/^\d{6}$/.test(String(code)))return null;const current=Math.floor(now/30000);
 for(let delta=-skew;delta<=skew;delta++){const counter=current+delta,expected=Buffer.from(hotp(secret,counter));const actual=Buffer.from(String(code));if(expected.length===actual.length&&timingSafeEqual(expected,actual))return counter}
 return null;
}

export function otpauthUri(secret,email){
 const issuer='Karuni',label=issuer+':'+email;
 return `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function encryptionKey(){
 const material=process.env.KARUNI_TOTP_ENCRYPTION_KEY||process.env.KARUNI_POSTGRES_URL;
 if(!material||material.length<24)throw Error('TOTP encryption is not configured');
 return scryptSync(material,'karuni-admin-totp-v1',32);
}

export function encryptSecret(secret,key=encryptionKey()){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),ciphertext=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);
 return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),ciphertext.toString('base64url')].join('.');
}

export function decryptSecret(value,key=encryptionKey()){
 const [version,iv,tag,ciphertext]=String(value).split('.');if(version!=='v1'||!iv||!tag||!ciphertext)throw Error('Invalid encrypted TOTP secret');
 const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64url'));decipher.setAuthTag(Buffer.from(tag,'base64url'));
 return Buffer.concat([decipher.update(Buffer.from(ciphertext,'base64url')),decipher.final()]).toString('utf8');
}

export function newRecoveryCodes(count=8){return Array.from({length:count},()=>randomBytes(8).toString('hex').toUpperCase().match(/.{1,4}/g).join('-'))}
export const recoveryHash=(code,key=encryptionKey())=>createHash('sha256').update(key).update(String(code).toUpperCase().replace(/[^A-F0-9]/g,'')).digest('hex');
