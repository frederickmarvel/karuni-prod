import fs from 'node:fs';

const path=process.argv[2]||'.env';
if(!fs.existsSync(path))throw Error(`${path} is missing; copy .env.example and provide real deployment values`);
const env={};
for(const raw of fs.readFileSync(path,'utf8').split(/\r?\n/)){
  const line=raw.trim();
  if(!line||line.startsWith('#'))continue;
  const at=line.indexOf('=');
  if(at<1)throw Error(`Invalid environment line: ${raw}`);
  env[line.slice(0,at).trim()]=line.slice(at+1).trim();
}
const required=['POSTGRES_PASSWORD','KARUNI_ORIGIN','KARUNI_ADMIN_EMAIL','KARUNI_ADMIN_PASSWORD','KARUNI_UPSTREAM_URL','KARUNI_UPSTREAM_KEY'];
for(const name of required)if(!env[name]||/replace-with|<[^>]+>|admin@example\.com|ai\.example\.com/i.test(env[name]))throw Error(`${name} must contain a real deployment value`);
if(!/^[A-Za-z0-9_-]{24,}$/.test(env.POSTGRES_PASSWORD))throw Error('POSTGRES_PASSWORD must be at least 24 URL-safe characters');
if(env.KARUNI_ADMIN_PASSWORD.length<16)throw Error('KARUNI_ADMIN_PASSWORD must be at least 16 characters');
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.KARUNI_ADMIN_EMAIL))throw Error('KARUNI_ADMIN_EMAIL is invalid');
const origin=new URL(env.KARUNI_ORIGIN),upstream=new URL(env.KARUNI_UPSTREAM_URL);
if(origin.pathname!=='/'||origin.search||origin.hash)throw Error('KARUNI_ORIGIN must contain only scheme and host');
if(!upstream.pathname.replace(/\/$/,'').endsWith('/v1'))throw Error('KARUNI_UPSTREAM_URL must end in /v1');
if(upstream.protocol!=='https:'&&env.KARUNI_ALLOW_INSECURE_UPSTREAM!=='true')throw Error('HTTP upstream requires KARUNI_ALLOW_INSECURE_UPSTREAM=true');
if(env.KARUNI_GOOGLE_CLIENT_ID&&!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(env.KARUNI_GOOGLE_CLIENT_ID))throw Error('KARUNI_GOOGLE_CLIENT_ID is invalid');
try{const models=JSON.parse(env.KARUNI_UNCENSORED_MODELS||'[]');if(!Array.isArray(models)||!models.every(x=>typeof x==='string'))throw Error()}catch{throw Error('KARUNI_UNCENSORED_MODELS must be a JSON string array')}
if(origin.protocol==='https:'&&(!env.KARUNI_DOMAIN||env.KARUNI_DOMAIN!==origin.hostname))throw Error('For HTTPS deployment, KARUNI_DOMAIN must equal the KARUNI_ORIGIN hostname');
console.log(`Deployment preflight passed for ${origin.origin}; secrets were not printed.`);
