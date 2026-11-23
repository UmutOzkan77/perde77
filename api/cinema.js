import { list, put, get } from '@vercel/blob';
import { randomUUID, createHmac, timingSafeEqual, createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest();
const equal = (a,b) => timingSafeEqual(hash(a),hash(b));
function sign(expiry) {
  return createHmac('sha256',process.env.ADMIN_PASSWORD).update('session/'+expiry).digest('hex');
}
function authorized(req) {
  const token = /(?:^|; *)perde=(\d+)\.([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '');
  return token && Number(token[1]) > Date.now() && equal(token[2],sign(token[1]));
}
const cookie = (value, age) => 'perde='+value+'; Max-Age='+age+'; Path=/; HttpOnly; Secure; SameSite=Strict';
const field = (value,max) => typeof value==='string' && value.trim().length>0 && value.trim().length<=max;
export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  try {
    const {action} = req.query;
    if (req.method==='POST') {
      if (!req.headers['content-type']?.startsWith('application/json')) return res.status(415).end();
      const body=req.body || {};
      if (action==='submit') {
        if (!field(body.name,60)||!field(body.film,120)) return res.status(400).end();
        const id=randomUUID(), time=Date.now();
        const row={id,time,name:body.name.trim(),film:body.film.trim()};
        await put('responses/'+time+'-'+id+'.json',JSON.stringify(row),{access:'private',contentType:'application/json'});
        return res.status(201).json({ok:true});
      }
      if (action==='login') {
        if (!process.env.ADMIN_PASSWORD || body.user!=='koordinator' || !equal(String(body.pass),process.env.ADMIN_PASSWORD)) return res.status(401).end();
        const exp=String(Date.now()+8*3600000);
        res.setHeader('Set-Cookie',cookie(exp+'.'+sign(exp),28800));
        return res.json({ok:true});
      }
      if (action==='logout') { res.setHeader('Set-Cookie',cookie('',0));return res.json({ok:true}); }
    }
    if (req.method==='GET' && action==='feed') {
      if (!authorized(req)) return res.status(401).end();
      const since=Number(req.query.since)||0;
      let cursor,paths=[];
      do {
        const page=await list({prefix:'responses/',cursor});
        paths.push(...page.blobs.filter(b=>Number(b.pathname.slice(10,23))>=since));
        cursor=page.hasMore?page.cursor:undefined;
      } while(cursor);
      const rows=[];
      for(let i=0;i<paths.length;i+=15){
        rows.push(...await Promise.all(paths.slice(i,i+15).map(async b=>{
          const blob=await get(b.pathname,{access:'private'});
          return new Response(blob.stream).json();
        })));
      }
      return res.json(rows.sort((a,b)=>b.time-a.time));
    }
    return res.status(404).end();
  } catch {return res.status(503).json({error:'Hizmete şu anda ulaşılamıyor.'});}
}
