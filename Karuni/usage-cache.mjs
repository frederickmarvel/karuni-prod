import {createClient} from 'redis';

const TTL_SECONDS=3*24*60*60;

export async function usageCache(url,store){
 let client=null;
 if(url){
  client=createClient({url,socket:{connectTimeout:3000,reconnectStrategy:retries=>Math.min(250*retries,3000)}});
  client.on('error',error=>console.error('[redis] '+error.message));
  try{await client.connect()}catch(error){console.error('[redis] unavailable; PostgreSQL remains authoritative: '+error.message);client=null}
 }
 const key=uid=>'karuni:usage:last3d:'+uid;
 return {
  async get(uid){
   if(client){
    try{const cached=await client.get(key(uid));if(cached)return JSON.parse(cached)}catch(error){console.error('[redis] read failed: '+error.message)}
   }
   const data=await store.usageLog(uid);
   if(client)try{await client.setEx(key(uid),TTL_SECONDS,JSON.stringify(data))}catch(error){console.error('[redis] write failed: '+error.message)}
   return data;
  },
  async invalidate(uid){if(client)try{await client.del(key(uid))}catch(error){console.error('[redis] invalidate failed: '+error.message)}},
  async close(){if(client?.isOpen)await client.quit()}
 };
}
