(function(){
  const $ = s => document.querySelector(s);
  const toastEl = $('#toast'); let tT;
  function toast(m){ toastEl.textContent=m; toastEl.classList.add('show'); clearTimeout(tT); tT=setTimeout(()=>toastEl.classList.remove('show'),2600); }
  const hasWeb3 = typeof window.solanaWeb3 !== 'undefined';

  /* ---------- wallet (Solana wallet providers + @solana/web3.js) ---------- */
  const WALLETS = [
    { name:'Phantom',  get:()=> window.phantom && window.phantom.solana && window.phantom.solana.isPhantom ? window.phantom.solana : (window.solana && window.solana.isPhantom ? window.solana : null), url:'https://phantom.app/' },
    { name:'Solflare', get:()=> window.solflare && window.solflare.isSolflare ? window.solflare : null, url:'https://solflare.com/' },
    { name:'Backpack', get:()=> window.backpack && window.backpack.solana ? window.backpack.solana : (window.backpack || null), url:'https://backpack.app/' },
  ];
  const state = { provider:null, wallet:null, pubkey:null };
  const short = k => k.slice(0,4)+'…'+k.slice(-4);

  function toPubkey(pk){
    const s = pk && pk.toString ? pk.toString() : String(pk);
    if (hasWeb3){ try { return new solanaWeb3.PublicKey(s); } catch(e){ return null; } }
    return { toBase58:()=>s, toString:()=>s };
  }

  function renderWallet(){
    const connected = !!state.pubkey;
    const label = connected ? short(state.pubkey.toBase58()) : 'connect wallet';
    $('#walletBtn').textContent = label;
    $('#finalConnect').textContent = connected ? 'wallet connected' : 'connect wallet';
    $('#wmProvider').textContent = connected ? state.wallet+' connected' : '';
    $('#wmAddr').textContent = connected ? state.pubkey.toBase58() : '';
    $('#launchBtn').textContent = connected ? 'launch validator' : 'connect wallet to launch';
    if(!connected) $('#walletMenu').classList.remove('open');
  }

  function openConnect(){
    const list = $('#wList'); list.innerHTML='';
    WALLETS.forEach(w=>{
      const p = w.get(); const b = document.createElement('button');
      b.innerHTML = '<span>'+w.name+'</span><span class="tag '+(p?'ok':'')+'">'+(p?'detected':'install')+'</span>';
      b.onclick = () => p ? connect(w.name,p) : window.open(w.url,'_blank','noopener');
      list.appendChild(b);
    });
    $('#connectModal').classList.add('open');
    list.querySelector('button').focus();
  }

  async function connect(name, provider){
    try{
      const res = await provider.connect();
      const raw = (res && res.publicKey) || provider.publicKey;
      const pk = toPubkey(raw);
      if(!pk) throw new Error('The wallet returned an invalid address.');
      state.provider = provider; state.wallet = name; state.pubkey = pk;
      if (provider.on){
        provider.on('accountChanged', npk => { if(npk){ state.pubkey = toPubkey(npk); renderWallet(); toast('Switched to '+short(state.pubkey.toBase58())); } else disconnect(); });
        provider.on('disconnect', () => { state.pubkey=null; renderWallet(); });
      }
      $('#connectModal').classList.remove('open');
      renderWallet(); toast(name+' connected: '+short(pk.toBase58()));
    }catch(e){
      toast(e && e.code===4001 ? 'Connection request was rejected in '+name+'.' : (e.message || 'Could not connect to '+name+'.'));
    }
  }

  async function disconnect(){
    try{ if(state.provider && state.provider.disconnect) await state.provider.disconnect(); }catch(e){}
    state.provider=null; state.pubkey=null; state.wallet=null; renderWallet(); toast('Wallet disconnected.');
  }

  // silent reconnect if the wallet already trusts this site
  window.addEventListener('load', async ()=>{
    for (const w of WALLETS){
      const p = w.get();
      if (p && p.connect){ try{ const r = await p.connect({ onlyIfTrusted:true }); const pk = toPubkey((r&&r.publicKey)||p.publicKey); if(pk){ state.provider=p; state.wallet=w.name; state.pubkey=pk; renderWallet(); break; } }catch(e){} }
    }
  });

  $('#walletBtn').onclick = e => { e.stopPropagation(); state.pubkey ? $('#walletMenu').classList.toggle('open') : openConnect(); };
  $('#finalConnect').onclick = () => state.pubkey ? toast('Already connected: '+short(state.pubkey.toBase58())) : openConnect();
  $('#disconnect').onclick = disconnect;
  $('#copyAddr').onclick = async () => { try{ await navigator.clipboard.writeText(state.pubkey.toBase58()); toast('Address copied.'); }catch(e){ toast('Copy failed. Select the address and copy it manually.'); } };
  document.addEventListener('click', e => { if(!e.target.closest('.wallet')) $('#walletMenu').classList.remove('open'); });
  $('#cmClose').onclick = () => $('#connectModal').classList.remove('open');
  $('#dmClose').onclick = () => $('#delegateModal').classList.remove('open');
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if(e.target===m) m.classList.remove('open'); }));
  document.addEventListener('keydown', e => { if(e.key==='Escape') document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open')); });

  /* ---------- live epoch from Solana mainnet ---------- */
  // Swap in your own RPC endpoint (Helius, Triton, QuickNode...) for production traffic.
  const RPC_URL = 'https://api.mainnet-beta.solana.com';
  const conn = hasWeb3 ? new solanaWeb3.Connection(RPC_URL, 'confirmed') : null;
  async function tick(){
    if(!conn) return;
    try{
      const e = await conn.getEpochInfo();
      $('#epoch').textContent = e.epoch + ' · ' + Math.floor(e.slotIndex / e.slotsInEpoch * 100) + '%';
    }catch(err){ /* keep last value; the public RPC can rate-limit */ }
  }
  tick(); setInterval(tick, 60000);

  /* ---------- launch console ---------- */
  const COLORS = ['#5ef2b4','#e7d9b8','#ffcf6b','#8fb6ff','#ff9ad5','#ff8a5c'];
  let color = COLORS[0];
  const sw = $('#swatches');
  COLORS.forEach((c,i)=>{ const b=document.createElement('button'); b.type='button'; b.style.background=c; b.setAttribute('aria-label','colour '+(i+1)); b.setAttribute('aria-pressed', i===0); b.onclick=()=>{ color=c; sw.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed', x===b)); preview(); }; sw.appendChild(b); });
  function preview(){
    const n = $('#vName').value.trim();
    $('#pvName').textContent = n || 'your validator';
    $('#pvAv').textContent = n ? n[0].toUpperCase() : '?';
    $('#pvAv').style.background = color;
    $('#pvMeta').textContent = $('#vComm').value+' commission, '+$('#vRegion').value;
  }
  ['#vName','#vComm','#vRegion'].forEach(s=>$(s).addEventListener('input',preview)); preview();

  let running = false;
  $('#launchForm').addEventListener('submit', async e => {
    e.preventDefault();
    if(running) return;
    if(!state.pubkey){ openConnect(); return; }
    const name = $('#vName').value.trim();
    if(!name){ $('#vName').focus(); toast('Give your validator a name first.'); return; }
    running = true; $('#launchBtn').disabled = true;
    const list = $('#logList'); list.innerHTML=''; $('#logState').textContent='configuring'; $('#logState').style.color='#ffcf6b';
    let identity = '—';
    if (hasWeb3){ identity = solanaWeb3.Keypair.generate().publicKey.toBase58(); }
    const steps = [
      ['owner wallet', short(state.pubkey.toBase58())],
      ['generating identity key', hasWeb3 ? short(identity) : 'ok'],
      ['generating vote account key', hasWeb3 ? short(solanaWeb3.Keypair.generate().publicKey.toBase58()) : 'ok'],
      ['validator name', '"'+name+'"'],
      ['server region', $('#vRegion').value],
      ['commission', $('#vComm').value],
    ];
    for (let i=0;i<steps.length;i++){
      const li=document.createElement('li'); li.innerHTML='&gt; '+steps[i][0]+' … <span class="w">working</span>'; list.appendChild(li);
      await new Promise(r=>setTimeout(r, 380+Math.random()*320));
      li.querySelector('span').className='ok'; li.querySelector('span').textContent=steps[i][1];
      $('#logBar').style.width = ((i+1)/steps.length*100)+'%';
    }
    const done=document.createElement('li');
    done.innerHTML='<span class="ok">✓ configuration ready. server provisioning opens soon: follow <a href="https://x.com/UseValidatorfun" target="_blank" rel="noopener noreferrer" style="color:#a6ffd9">@UseValidatorfun</a> for go-live.</span><span class="cursor"></span>';
    list.appendChild(done);
    $('#logState').textContent='ready'; $('#logState').style.color='#5ef2b4';
    toast('Configuration ready for '+name+'.');
    running=false; $('#launchBtn').disabled=false;
  });

  /* ---------- marketplace ---------- */
  const VALS = [];
  let sortKey='stake', q='';
  const fmt = n => n.toLocaleString('en-US',{maximumFractionDigits:2});
  function renderMk(){
    const max = Math.max(1,...VALS.map(v=>v.stake));
    const rows = VALS.filter(v => !q || (v.n+' '+v.t).toLowerCase().includes(q))
      .sort((a,b)=> sortKey==='new' ? a.age-b.age : b[sortKey]-a[sortKey]);
    $('#mkBody').innerHTML = rows.length ? rows.map((v,i)=>`
      <tr>
        <td class="rank">${i+1}</td>
        <td><div class="vname"><div class="avatar" style="background:${v.c}">${v.n[0].toUpperCase()}</div><div><b>${v.n.replace(/</g,'&lt;')}</b><span>$${v.t}${v.mine?' · yours':''}${v.age<=7&&!v.mine?' · new':''}</span></div></div></td>
        <td class="num">${fmt(v.stake)} SOL<span class="stakebar"><i style="width:${v.stake/max*100}%"></i></span></td>
        <td class="num">${v.apy? v.apy.toFixed(2)+'%':'—'}</td>
        <td class="num">${v.comm}%</td>
        <td><span class="up ${v.up<99?'warn':''}"><i></i>${v.mine?'syncing':v.up+'%'}</span></td>
        <td class="num">${fmt(v.del)}</td>
        <td><button class="td-btn" data-i="${VALS.indexOf(v)}">delegate</button></td>
      </tr>`).join('') : (VALS.length ? '<tr><td colspan="8" style="color:var(--mute);font-family:var(--mono);font-size:14px">No validators match that search. Try a ticker, or launch one with that name.</td></tr>'
      : '<tr><td colspan="8" style="padding:56px 14px;text-align:center"><div style="font-family:var(--px);font-size:22px;margin-bottom:8px">no validators yet</div><div style="color:var(--mute);font-size:15px;margin-bottom:18px">The marketplace fills up as people launch. Yours can be the first listing.</div><a class="btn" href="#launch">launch the first validator</a></td></tr>');
  }
  $('#mkSearch').addEventListener('input', e=>{ q=e.target.value.trim().toLowerCase(); renderMk(); });
  document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{ sortKey=b.dataset.sort; document.querySelectorAll('.seg button').forEach(x=>x.setAttribute('aria-pressed',x===b)); renderMk(); });
  let cur=null;
  function est(){ const a=parseFloat($('#dmAmt').value)||0; const apy = cur.apy||7.2; $('#dmEst').textContent = '≈ '+(a*apy/100).toFixed(3)+' SOL / year at '+apy.toFixed(2)+'% (estimate, not guaranteed)'; }
  $('#mkBody').addEventListener('click', e=>{
    const b=e.target.closest('.td-btn'); if(!b) return;
    if(!state.pubkey){ openConnect(); toast('Connect a wallet to delegate.'); return; }
    cur = VALS[+b.dataset.i];
    $('#dmTitle').textContent = 'delegate to '+cur.n;
    $('#dmSub').textContent = cur.comm+'% commission · from '+short(state.pubkey.toBase58());
    est(); $('#delegateModal').classList.add('open'); $('#dmAmt').focus();
  });
  $('#dmAmt').addEventListener('input', est);
  $('#dmGo').onclick = ()=>{
    const a=parseFloat($('#dmAmt').value);
    if(!(a>0)){ toast('Enter an amount above 0 SOL.'); return; }
    $('#delegateModal').classList.remove('open');
    toast('Delegation opens at go-live. Follow @UseValidatorfun for the date.');
  };
  renderMk();
  renderWallet();

  /* ---------- 3D machine ---------- */
  const rig = $('#rig'), stage = $('#stage');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  let px=0, py=0, tx=0, ty=0, t0=performance.now();
  stage.addEventListener('pointermove', e=>{ const r=stage.getBoundingClientRect(); tx=((e.clientX-r.left)/r.width-.5)*2; ty=((e.clientY-r.top)/r.height-.5)*2; });
  stage.addEventListener('pointerleave', ()=>{ tx=0; ty=0; });
  function frame(now){
    const t=(now-t0)/1000;
    px+=(tx-px)*.08; py+=(ty-py)*.08;
    const ry = Math.sin(t*.55)*30 + px*18;
    const rx = -6 + Math.sin(t*.9)*2 - py*10;
    const y = Math.sin(t*1.3)*6;
    rig.style.transform = 'scale(var(--s)) translateY('+y+'px) rotateX('+rx+'deg) rotateY('+ry+'deg)';
    if(!still.matches) requestAnimationFrame(frame);
  }
  if(!still.matches) requestAnimationFrame(frame);
})();
