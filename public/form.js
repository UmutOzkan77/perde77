const form=document.querySelector('form'), statusLine=document.querySelector('#status');
form.onsubmit=async event=>{
  event.preventDefault();
  const body=Object.fromEntries(new FormData(form));
  if (!body.name.trim()||!body.film.trim()) {statusLine.textContent='Lütfen iki alanı da doldur.';return;}
  const button=form.querySelector('button');
  button.disabled=true;statusLine.textContent='Gönderiliyor…';
  try {
    const r=await fetch('/api/cinema?action=submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok) throw Error();
    form.hidden=true;document.querySelector('#thanks').hidden=false;statusLine.textContent='Film seçimin kaydedildi.';
  } catch {statusLine.textContent='Gönderilemedi. Bağlantını kontrol edip tekrar dene.';}
  button.disabled=false;
};
