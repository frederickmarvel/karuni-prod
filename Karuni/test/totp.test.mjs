import assert from 'node:assert/strict';
import test from 'node:test';
import {base32Encode,base32Decode,hotp,matchingCounter,otpauthUri,encryptSecret,decryptSecret,newRecoveryCodes,recoveryHash} from '../totp.mjs';

test('TOTP primitives match RFC 4226 and reject replay-window misses',()=>{
 const secret=base32Encode(Buffer.from('12345678901234567890'));
 assert.equal(secret,'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
 assert.deepEqual(base32Decode(secret),Buffer.from('12345678901234567890'));
 assert.equal(hotp(secret,0),'755224');
 const now=1_700_000_000_000,code=hotp(secret,Math.floor(now/30000));
 assert.equal(matchingCounter(secret,code,now),Math.floor(now/30000));
 assert.equal(matchingCounter(secret,code,now+90000),null);
 assert.match(otpauthUri(secret,'admin@example.com'),/^otpauth:\/\/totp\/Karuni%3Aadmin%40example\.com\?/);
});

test('TOTP secrets encrypt at rest and recovery hashes are normalized',()=>{
 const key=Buffer.alloc(32,7),secret='JBSWY3DPEHPK3PXP',encrypted=encryptSecret(secret,key);
 assert.notEqual(encrypted,secret);assert.equal(decryptSecret(encrypted,key),secret);
 const codes=newRecoveryCodes();assert.equal(codes.length,8);assert.equal(new Set(codes).size,8);assert.match(codes[0],/^[A-F0-9]{4}(?:-[A-F0-9]{4}){3}$/);
 assert.equal(recoveryHash('ABCD-1234',key),recoveryHash('abcd 1234',key));
});
