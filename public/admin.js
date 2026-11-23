const el=id=>document.getElementById(id);
const rows=new Map();
let timer, newest=0, generation=0;
function showPanel(active){el('panel').hidden=!active;el('login').hidden=active;}
function reset(){
  generation++; clearTimeout(timer);rows.clear();newest=0;
  el('rows').replaceChildren();el('status').textContent='';showPanel(false);
}
const post=(action,body)=>fetch('/api/cinema?action='+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
async function refresh(){
  const current=generation;
  try{
    const r=await fetch('/api/cinema?action=feed&since='+Math.max(0,newest-5000),{cache:'no-store'});
    if(current!==generation)return;
    if(r.status===401){reset();return;}
    if(!r.ok)throw Error();
    const incoming=await r.json();
    if(current!==generation)return;
    let changed=false;
    for(const row of incoming){if(!rows.has(row.id)){rows.set(row.id,row);newest=Math.max(newest,row.time);changed=true;}}
    if(changed){
      el('rows').replaceChildren(...Array.from(rows.values()).sort((a,b)=>b.time-a.time).map(row=>{
        const item=document.createElement('div'),title=document.createElement('b'),by=document.createElement('span');
        item.className='row';title.textContent=row.film;by.textContent=row.name;item.append(title,by);return item;
      }));
    }
    el('count').textContent=rows.size?rows.size+' yanıt':'İlk yanıt bekleniyor…';
    showPanel(true);el('status').textContent='';
  }catch{el('status').textContent='Bağlantı kuruluyor. Birazdan tekrar denenecek.';}
  if(current===generation)timer=setTimeout(refresh,2000);
}
el('login').onsubmit=async event=>{
  event.preventDefault();try{
    const r=await post('login',{user:el('user').value,pass:el('pass').value});
    if(!r.ok){el('status').textContent=r.status===401?'Giriş bilgilerini kontrol et.':'Giriş yapılamadı.';return;}
    el('pass').value='';clearTimeout(timer);refresh();
  }catch{el('status').textContent='Bağlantı kurulamadı.';}
};
el('logout').onclick=async()=>{try{if(!(await post('logout',{})).ok)throw Error();reset();}catch{el('status').textContent='Çıkış yapılamadı. Tekrar dene.';}};
refresh();
