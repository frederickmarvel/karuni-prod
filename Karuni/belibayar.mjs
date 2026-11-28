import {createHmac,timingSafeEqual} from 'node:crypto';

const base=(process.env.KARUNI_BELIBAYAR_BASE_URL||'https://api.belibayar.id').replace(/\/+$/,'');
const apiKey=process.env.KARUNI_BELIBAYAR_API_KEY||'';
const secretKey=process.env.KARUNI_BELIBAYAR_SECRET_KEY||'';
const webhookSecret=process.env.KARUNI_BELIBAYAR_WEBHOOK_SECRET||'';
const sandbox=process.env.KARUNI_BELIBAYAR_SANDBOX==='true';
const prefix=sandbox?'/direct/v1/sandbox':'/direct/v1';

export const checkoutEnabled=()=>Boolean(apiKey&&secretKey&&webhookSecret);
export const callbackPath='/api/payments/belibayar/webhook';

export async function createQris({reference,amount,email,callbackUrl}){
 if(!checkoutEnabled())throw Object.assign(Error('QRIS checkout is not configured'),{code:503});
 const payload={reference,amount,pay_method:{method:'qris'},static_qr:false,customer_name:'Karuni Customer',customer_email:email,expired_time:Math.floor(Date.now()/1000)+300,callback_url:callbackUrl};
 const raw=JSON.stringify(payload),signature=createHmac('sha256',secretKey).update(raw).digest('hex');
 const response=await fetch(base+prefix+'/payment/charge',{method:'POST',headers:{'X-Api-Key':apiKey,'X-Signature':signature,'Content-Type':'application/json'},body:raw,redirect:'error',signal:AbortSignal.timeout(15000)});
 const result=await response.json().catch(()=>null);
 if(!response.ok||!result?.success||!result.data?.transaction_id||!result.data?.qr_url){console.error('[belibayar-charge] status='+response.status+' code='+String(result?.data?.code||'unknown').slice(0,80));throw Object.assign(Error('QRIS payment could not be created. Please check the amount and try again.'),{code:502})}
 return {reference:result.data.reference,transactionId:String(result.data.transaction_id),qrUrl:String(result.data.qr_url),status:String(result.data.status||'pending'),expiredAt:Number(result.data.expired_at)};
}

export async function paymentStatus(reference){
 if(!checkoutEnabled())throw Object.assign(Error('QRIS checkout is not configured'),{code:503});
 const timestamp=String(Math.floor(Date.now()/1000)),signature=createHmac('sha256',secretKey).update(':'+timestamp).digest('hex');
 const response=await fetch(base+prefix+'/payment/status/'+encodeURIComponent(reference),{headers:{'X-Api-Key':apiKey,'X-Timestamp':timestamp,'X-Signature':signature},redirect:'error',signal:AbortSignal.timeout(15000)});
 const result=await response.json().catch(()=>null),data=result?.data;
 if(!response.ok||!result?.success||!data)throw Object.assign(Error('QRIS status is temporarily unavailable'),{code:502});
 return {reference:String(data.reference),transactionId:String(data.transaction_id),status:String(data.status),amountIdr:Number(data.base_amount),paymentMethod:String(data.payment_method)};
}

export async function cancelPayment(reference){
 const raw=JSON.stringify({reference,reason:'Karuni QRIS expired after 5 minutes'}),signature=createHmac('sha256',secretKey).update(raw).digest('hex');
 const response=await fetch(base+prefix+'/payment/cancel',{method:'POST',headers:{'X-Api-Key':apiKey,'X-Signature':signature,'Content-Type':'application/json'},body:raw,redirect:'error',signal:AbortSignal.timeout(15000)});
 const result=await response.json().catch(()=>null),data=result?.data?.transaction;
 if(response.status===409)return paymentStatus(reference);
 if(!response.ok||!result?.success||!data)throw Object.assign(Error('QRIS cancellation is temporarily unavailable'),{code:502});
 return {reference:String(data.reference),transactionId:String(data.transaction_id),status:String(data.status),amountIdr:Number(data.base_amount),paymentMethod:String(data.payment_method)};
}

export function verifyWebhook(raw,signature){
 if(!webhookSecret||typeof signature!=='string'||!/^[a-f0-9]{64}$/i.test(signature))return false;
 const expected=createHmac('sha256',webhookSecret).update(raw).digest('hex');
 return timingSafeEqual(Buffer.from(expected),Buffer.from(signature.toLowerCase()));
}
