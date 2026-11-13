const $=s=>document.querySelector(s),uid=()=>crypto.randomUUID(),key='na-marcacao-v1';
const formationRoster=[
  ['bru','Bruna','Surdo de Primeira',30,12],
  ['lg','Luis','Surdo de Terceira',50,12],
  ['bre','Brenda','Surdo de Primeira',70,12],
  ['beck','Beck','Caixa',32,27],
  ['julia','Julia','Caixa',50,27],
  ['g-ou-t','G ou T','Caixa',68,27],
  ['joao-ripa','João','Ripa',41,40],
  ['sofia','Sofia','Ripa',59,40],
  ['lara','Lara','Tamborim',28,53],
  ['gabriel','Gabriel','Tamborim',47,53],
  ['malu','Malu','Tamborim',67,53],
  ['isadora','Isadora','Agogô',32,65],
  ['ligia','Lígia','Chocalho',50,65],
  ['artur','Artur','Chocalho',68,65],
  ['joao-mestre','João','Mestre/Apito',49,91]
];
const breakDefinitions=[
  {id:'C',code:'C',name:'Começo',notes:'Tan taran taran tan tan'},
  {id:'SR',code:'SR',name:'Samba Reto',notes:'Samba Reto.'},
  {id:'2',code:'2',name:'Virada de Dois',notes:'Virada de Dois.'},
  {id:'42',code:'4 2',name:'4 Batidas e Virada de Dois',notes:'4 batidas e Virada de Dois.'},
  {id:'M',code:'M',name:'Mosquito',notes:'Mosquito.'},
  {id:'86',code:'8 6',name:'8 Batidas e 3 Viradas de Dois',notes:'8 batidas e 3 Viradas de Dois.'},
  {id:'A',code:'A',name:'Azão',notes:'4 batidas, 8 rápidas e 3 Viradas de Dois. Repetir duas vezes; no intervalo, gritar “Absurda!”.'},
  {id:'PR',code:'PR',name:'Pergunta e Resposta',notes:'Pergunta e Resposta. No fim: 4 batidas da Ripa e Virada de Dois de todos.'}
];
function migrateBreaks(s){
  if(s.libraryRevision>=1)return false;
  for(const definition of breakDefinitions){
    const entry=s.library.find(item=>item.id===definition.id);
    if(!entry)continue;
    const previousNotes=entry.notes.trim();
    Object.assign(entry,definition);
    if(previousNotes&&previousNotes!==definition.notes)entry.notes+='\nObservação anterior: '+previousNotes;
  }
  s.libraryRevision=1;
  return true;
}
function migrateSavedState(s){
  const formationChanged=migrateFormation(s);
  const namesChanged=migrateFormationNames(s);
  const layoutsChanged=migrateFormationLayouts(s);
  const breaksChanged=migrateBreaks(s);
  const tutorialsChanged=migrateTutorials(s);
  return formationChanged||namesChanged||layoutsChanged||breaksChanged||tutorialsChanged;
}
function migrateFormationNames(s){
  const names={bre:'Brenda',bree:'Brenda',bu:'Bruna',bru:'Bruna',lg:'Luis'};
  let changed=false;
  for(const person of s.people){
    const name=names[person.name.trim().toLowerCase()];
    if(typeof name!=='string')continue;
    person.name=name;
    changed=true;
  }
  return changed;
}
const initial={version:1,formationRevision:1,libraryRevision:1,tutorialRevision:2,tutorials:structuredClone(defaultTutorials),target:7,notes:'',library:[...breakDefinitions.map(item=>({...item})),{id:'FIM',code:'FIM',name:'Fim',notes:''}],sequence:['C','SR','2','SR','42','SR','M','SR','42','SR','86','A','PR','SR','A','FIM'].map(code=>({id:uid(),ref:code,seconds:0,notes:''})),people:formationRoster.map(([slot,name,notes,x,y])=>({id:uid(),slot,name,notes,x,y}))};
migrateFormationLayouts(initial);
// Atualiza a formação transcrita da foto sem alterar roteiro, IDs ou posições.
function migrateFormation(s){
  if(s.formationRevision>=1)return false;
  const oldNames=['Bru','LG','Bree','B','J','G ou T','J','S','L','G','M','I','L','A','LA','LT','I','A','G','EU'];
  const isLegacy=s.people.length>=20&&oldNames.filter((name,i)=>s.people[i].name===name).length>=16;
  if(isLegacy){
    const removeRow=['LA','LT','I','A','G'].every((name,i)=>s.people[14+i].name===name);
    const oldSurdoNotes=['2º','3º','1º'];
    s.people=s.people.flatMap((person,i)=>{
      if(removeRow&&i>=14&&i<=18)return [];
      const rosterIndex=i===19?14:i<14?i:-1;
      if(rosterIndex<0)return [person];
      const [slot,name,instrument]=formationRoster[rosterIndex];
      if(person.name!==oldNames[i])return [person];
      const extra=person.notes.trim();
      return [{...person,slot,name,notes:extra&&extra!==oldSurdoNotes[i]&&extra!==instrument?instrument+' · '+extra:instrument}];
    });
  }
  s.formationRevision=1;
  return true;
}
let state=structuredClone(initial),active='roteiro',editing=null;
try{const saved=JSON.parse(localStorage.getItem(key));if(valid(saved)){state=saved;if(migrateSavedState(state))localStorage.setItem(key,JSON.stringify(state))}}catch{}
function valid(s){return s&&s.version===1&&Number.isFinite(s.target)&&s.target>0&&typeof s.notes==='string'&&Array.isArray(s.library)&&s.library.length>0&&s.library.every(x=>x&&typeof x.id==='string'&&typeof x.code==='string'&&typeof x.name==='string'&&typeof x.notes==='string')&&new Set(s.library.map(x=>x.id)).size===s.library.length&&Array.isArray(s.sequence)&&s.sequence.every(x=>x&&typeof x.id==='string'&&s.library.some(l=>l.id===x.ref)&&Number.isFinite(x.seconds)&&x.seconds>=0&&typeof x.notes==='string')&&new Set(s.sequence.map(x=>x.id)).size===s.sequence.length&&Array.isArray(s.people)&&s.people.every(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.notes==='string'&&Number.isFinite(x.x)&&x.x>=5&&x.x<=95&&Number.isFinite(x.y)&&x.y>=8&&x.y<=92)&&validFormationLayouts(s)&&(s.tutorials===undefined||validTutorials(s.tutorials,true))}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function save(){try{localStorage.setItem(key,JSON.stringify(state));$('#save-state').textContent='● Salvo neste navegador'}catch{$('#save-state').textContent='⚠ Exporte para guardar suas alterações'}}
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2500)}
function time(n){return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`}
function render(){
  renderTutorials();$('#notes').value=state.notes;
  $('#piece-sequence').innerHTML=state.sequence.map((segment,index)=>{
    const breque=state.library.find(item=>item.id===segment.ref);
    return `<li class="sequence-step ${index===0?'sequence-first':''} ${index===state.sequence.length-1?'sequence-last':''}" aria-label="Trecho ${index+1}: ${esc(breque.name)} (${esc(breque.code)})" title="${esc(breque.name)}"><small aria-hidden="true">${String(index+1).padStart(2,'0')}</small><b aria-hidden="true">${esc(breque.code)}</b>${index<state.sequence.length-1?'<span class="sequence-arrow" aria-hidden="true">→</span>':''}</li>`;
  }).join('') || '<li class="sequence-empty">Nenhum trecho definido.</li>';

  $('#timeline').innerHTML=state.sequence.map((segment,index)=>{
    const breque=state.library.find(item=>item.id===segment.ref);
    const instructions=[breque.notes,segment.notes].filter(Boolean);
    return `<article class="block piece-block ${breque.code==='C'?'start':breque.code==='FIM'?'end':''}" aria-label="Trecho ${index+1}: ${esc(breque.name)}">
      <div class="card-top"><span>${String(index+1).padStart(2,'0')} / TRECHO</span></div>
      <div class="card-body"><span class="code">${esc(breque.code)}</span><div class="card-name">${esc(breque.name)}</div></div>
      <div class="card-bottom"><span>${segment.seconds?time(segment.seconds):'Duração a definir'}</span></div>
      ${instructions.length?`<details class="piece-instructions"><summary>Instruções e observações</summary>${instructions.map(text=>`<p>${esc(text)}</p>`).join('')}</details>`:''}
    </article>`;
  }).join('');
  $('#library').innerHTML=state.library.map(l=>`<button class="library-card" data-id="${esc(l.id)}"><span class="code">${esc(l.code)}</span><b>${esc(l.name)}</b><p>${esc(l.notes||'Adicionar significado e observações →')}</p></button>`).join('');renderFormation()}
function changeTab(tab){
  const pages={
    roteiro:{title:'Peça'},
    formacao:{title:'Formação'},
    breques:{title:'Breques'},
    tutoriais:{title:'Tutoriais'}
  };
  if(!pages[tab])return;
  active=tab;
  document.querySelectorAll('[data-tab]').forEach(button=>{button.classList.toggle('active',button.dataset.tab===tab);button.setAttribute('aria-pressed',String(button.dataset.tab===tab))});
  document.querySelectorAll('.view').forEach(view=>view.hidden=view.id!==tab);
  $('#page-title').textContent=pages[tab].title;
  if(tab!=='roteiro'){
    const video=$('#piece-video');
    if(video&&typeof video.pause==='function'&&!video.paused)video.pause();
  }
}

const pieceVideoChapters=[
  {start:0,end:27,code:'C',name:'Começo',hint:'Tan taran taran tan tan'},
  {start:28,end:49,code:'SR',name:'Samba Reto',hint:'Samba Reto contínuo · Base rítmica'},
  {start:50,end:54,code:'4 2',name:'4 batidas e virada de 2',hint:'4 batidas e Virada de Dois'},
  {start:54,end:76,code:'SR',name:'Samba Reto',hint:'Samba Reto contínuo'},
  {start:77,end:91,code:'M',name:'Mosquito 1º Parte',hint:'Mosquito · Primeira parte da convenção'},
  {start:92,end:105,code:'M',name:'Mosquito 2º Parte',hint:'Mosquito · Segunda parte da convenção'},
  {start:106,end:133,code:'SR',name:'Samba Reto',hint:'Samba Reto contínuo'},
  {start:134,end:138,code:'4 2',name:'4 batidas e virada de 2',hint:'4 batidas e Virada de Dois'},
  {start:139,end:152,code:'SR',name:'Samba Reto',hint:'Samba Reto contínuo'},
  {start:153,end:158,code:'8 6',name:'8 batidas com 3 Viradas',hint:'8 batidas e 3 Viradas de Dois'},
  {start:158,end:192,code:'A',name:'Azão',hint:'4 batidas, 8 rápidas e 3 Viradas de Dois. Repetir 2x; no intervalo: “Absurda!”'},
  {start:192,end:243,code:'PR',name:'Pergunta e Resposta',hint:'Pergunta e Resposta · 4 batidas da Ripa e Virada de Dois de todos'},
  {start:244,end:272,code:'SR',name:'Samba Reto',hint:'Samba Reto contínuo'},
  {start:272,end:282,code:'A',name:'Azão',hint:'4 batidas, 8 rápidas e 3 Viradas de Dois · Gritar “Absurda!”'},
  {start:283,end:328,code:'PR',name:'Pergunta e Resposta',hint:'Pergunta e Resposta · Ripa + Virada de Dois de todos'},
  {start:328,end:380,code:'SR',name:'Samba Reto',hint:'Samba Reto contínuo'},
  {start:381,end:391,code:'A',name:'Azão',hint:'4 batidas, 8 rápidas e 3 Viradas de Dois · Gritar “Absurda!”'},
  {start:392,end:443,code:'PR',name:'Pergunta e Resposta',hint:'Pergunta e Resposta · Ripa + Virada de Dois de todos'},
  {start:444,end:471,code:'SR',name:'Samba Reto',hint:'Samba Reto contínuo'},
  {start:471,end:482,code:'A',name:'Azão',hint:'4 batidas, 8 rápidas e 3 Viradas de Dois · Gritar “Absurda!”'},
  {start:482,end:500,code:'FIM',name:'Encerramento',hint:'Final da apresentação da Bateria Absurda'}
];

function padTime(n){return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}`}

function getCurrentPieceChapter(time){
  const t=Math.max(0,time);
  for(let i=pieceVideoChapters.length-1;i>=0;i--){
    if(t>=pieceVideoChapters[i].start){
      return {chapter:pieceVideoChapters[i],index:i,next:pieceVideoChapters[i+1]||null};
    }
  }
  return {chapter:pieceVideoChapters[0],index:0,next:pieceVideoChapters[1]||null};
}

function updatePieceVideoOverlay(){
  const v=$('#piece-video');
  const currentTime=(v&&typeof v.currentTime==='number')?v.currentTime:0;
  const {chapter,index,next}=getCurrentPieceChapter(currentTime);
  const codeEl=$('#overlay-code'),nameEl=$('#overlay-name'),hintEl=$('#overlay-hint'),rangeEl=$('#overlay-range'),nextEl=$('#overlay-next'),stepEl=$('#overlay-step');
  if(codeEl)codeEl.textContent=chapter.code;
  if(nameEl)nameEl.textContent=chapter.name;
  if(hintEl)hintEl.textContent=chapter.hint;
  if(rangeEl)rangeEl.textContent=`${padTime(chapter.start)} - ${padTime(chapter.end)}`;
  if(stepEl)stepEl.textContent=`TRECHO ${String(index+1).padStart(2,'0')}/${String(pieceVideoChapters.length).padStart(2,'0')}`;
  if(nextEl)nextEl.textContent=next?`${next.name} (${padTime(next.start)})`:'Fim da apresentação';
  const pills=document.querySelectorAll('.chapter-pill');
  if(pills&&pills.length){
    pills.forEach((p,i)=>p.classList.toggle('active',i===index));
  }
}

function setupPieceVideo(){
  const v=$('#piece-video'),rewind=$('#video-rewind'),restart=$('#video-restart'),forward=$('#video-forward'),toggle=$('#overlay-toggle'),overlay=$('#video-overlay'),chaptersList=$('#chapters-list');
  if(rewind)rewind.onclick=()=>{if(v&&typeof v.currentTime==='number'){v.currentTime=Math.max(0,v.currentTime-10);updatePieceVideoOverlay()}};
  if(restart)restart.onclick=()=>{if(v&&typeof v.currentTime==='number'){v.currentTime=0;if(typeof v.play==='function')v.play();updatePieceVideoOverlay()}};
  if(forward)forward.onclick=()=>{if(v&&typeof v.currentTime==='number'){v.currentTime=Math.min(v.duration||999999,v.currentTime+10);updatePieceVideoOverlay()}};

  let overlayVisible=true;
  if(toggle){
    toggle.onclick=()=>{
      overlayVisible=!overlayVisible;
      if(overlay)overlay.classList.toggle('is-hidden',!overlayVisible);
      toggle.classList.toggle('is-off',!overlayVisible);
      toggle.setAttribute('aria-pressed',String(overlayVisible));
    };
  }

  if(v){
    v.ontimeupdate=()=>updatePieceVideoOverlay();
    v.onseeked=()=>updatePieceVideoOverlay();
  }

  if(chaptersList){
    chaptersList.innerHTML=pieceVideoChapters.map((c,i)=>`<button type="button" class="chapter-pill ${i===0?'active':''}" data-start="${c.start}" title="${esc(c.name)} (${padTime(c.start)} - ${padTime(c.end)})"><span class="chapter-pill-time">${padTime(c.start)}</span><span class="chapter-pill-code">${esc(c.code)}</span><span>${esc(c.name)}</span></button>`).join('');
    chaptersList.onclick=e=>{
      const btn=e.target.closest('.chapter-pill');
      if(!btn)return;
      const start=Number(btn.dataset.start);
      if(Number.isFinite(start)&&v&&typeof v.currentTime==='number'){
        v.currentTime=start;
        if(typeof v.play==='function')v.play();
        updatePieceVideoOverlay();
      }
    };
  }

  updatePieceVideoOverlay();
}

document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>changeTab(b.dataset.tab));
function field(label,name,value,type='text'){return `<label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" ${type==='number'?'min="0" max="10800" step="1"':'maxlength="80" required'}>`}
function note(value){return `<label for="f-notes">Observações</label><textarea id="f-notes" name="notes" maxlength="3000" placeholder="Entradas, contagem, sinais, detalhes…">${esc(value)}</textarea>`}
function openEditor(kind,id){if(kind==='segment')return;editing={kind,id};const data=id?state[kind==='segment'?'sequence':kind==='person'?'people':'library'].find(x=>x.id===id):null;$('#modal-kind').textContent=kind==='segment'?'TRECHO DA PEÇA':kind==='person'?'FORMAÇÃO DA BATERIA':'BIBLIOTECA DE BREQUES';$('#modal-title').textContent=(id?'Editar ':'Adicionar ')+(kind==='segment'?'trecho':kind==='person'?'caixinha':'breque');$('#delete').hidden=!id;$('#fields').innerHTML=kind==='segment'?`<label for="f-ref">Breque / marcação</label><select id="f-ref" name="ref">${state.library.map(l=>`<option value="${esc(l.id)}" ${data?.ref===l.id?'selected':''}>${esc(l.code)} — ${esc(l.name)}</option>`).join('')}</select><div class="footnote"><div><b>Como tocar</b><p id="break-guide"></p></div></div>${field('Duração em segundos (0 = a definir)','seconds',data?.seconds||0,'number')}${note(data?.notes||'')}`:kind==='person'?field('Nome ou sigla','name',data?.name||'')+note(data?.notes||''):field('Sigla','code',data?.code||'')+field('Nome do breque','name',data?.name||'')+note(data?.notes||'');if(kind==='segment'){const updateGuide=()=>{$('#break-guide').textContent=state.library.find(l=>l.id===$('#f-ref').value)?.notes||'Sem instruções cadastradas.'};$('#f-ref').onchange=updateGuide;updateGuide()}$('#editor').showModal()}
$('#library').onclick=e=>{const c=e.target.closest('[data-id]');if(c)openEditor('break',c.dataset.id)};
document.querySelectorAll('#editor .close').forEach(b=>b.onclick=()=>$('#editor').close());$('#editor-form').onsubmit=e=>{e.preventDefault();if(!editing||editing.kind==='segment')return;const f=Object.fromEntries(new FormData(e.target)),{kind,id}=editing;const list=state[kind==='segment'?'sequence':kind==='person'?'people':'library'];let item=list.find(x=>x.id===id);if(kind==='break'&&state.library.some(x=>x.id!==id&&x.code.toLowerCase()===f.code.trim().toLowerCase())){toast('Esta sigla já existe na biblioteca.');return}let values=kind==='segment'?{ref:f.ref,seconds:Number(f.seconds),notes:f.notes}:kind==='person'?{name:f.name.trim(),notes:f.notes}:{code:f.code.trim(),name:f.name.trim(),notes:f.notes};if(kind!=='segment'&&(!values.name||(kind==='break'&&!values.code))){toast('Preencha os campos com um nome ou sigla.');return}if(item)Object.assign(item,values);else list.push({id:uid(),...(kind==='person'?{x:50,y:50}:{}),...values});migrateFormationLayouts(state);save();render();$('#editor').close();toast('Alterações salvas')};
$('#delete').onclick=()=>{if(!editing||editing.kind==='segment')return;const{kind,id}=editing;if(kind==='break'&&state.sequence.some(x=>x.ref===id)){toast('Remova os trechos que usam este breque antes de excluí-lo.');return}const name=kind==='segment'?'sequence':kind==='person'?'people':'library';if(name==='library'&&state.library.length===1){toast('Mantenha ao menos um breque na biblioteca.');return}state[name]=state[name].filter(x=>x.id!==id);save();render();$('#editor').close();toast('Item excluído')};
let moving=null;$('#stage').onpointerdown=e=>{const el=e.target.closest('.person');if(!el)return;const p=state.people.find(x=>x.id===el.dataset.id),position=formationPosition(p);moving={el,p,position,startX:e.clientX,startY:e.clientY,x:position.x,y:position.y,moved:false};el.setPointerCapture(e.pointerId)};$('#stage').onpointermove=e=>{if(!moving)return;const m=moving,r=$('#stage').getBoundingClientRect(),dx=e.clientX-m.startX,dy=e.clientY-m.startY;if(Math.abs(dx)+Math.abs(dy)>6)m.moved=true;if(!m.moved)return;m.position.x=Math.max(7,Math.min(93,m.x+dx/r.width*100));m.position.y=Math.max(8,Math.min(92,m.y+dy/r.height*100));m.el.style.left=m.position.x+'%';m.el.style.top=m.position.y+'%'};$('#stage').onpointerup=()=>{if(!moving)return;const m=moving;moving=null;if(m.moved)save();else openEditor('person',m.p.id)};$('#stage').onpointercancel=()=>{if(moving)save();moving=null};$('#stage').onkeydown=e=>{const el=e.target.closest('.person');if(!el)return;const p=state.people.find(x=>x.id===el.dataset.id);if(e.key==='Enter'||e.key===' '){e.preventDefault();openEditor('person',p.id)}else if(e.key.startsWith('Arrow')){e.preventDefault();const position=formationPosition(p);position.x=Math.max(7,Math.min(93,position.x+(e.key==='ArrowRight'?2:e.key==='ArrowLeft'?-2:0)));position.y=Math.max(8,Math.min(92,position.y+(e.key==='ArrowDown'?2:e.key==='ArrowUp'?-2:0)));el.style.left=position.x+'%';el.style.top=position.y+'%';save()}};
// A importação das outras áreas não substitui a peça bloqueada.
function retainPieceOnImport(imported){
  imported.sequence=structuredClone(state.sequence);
  imported.target=state.target;
  imported.notes=state.notes;
  for(const segment of state.sequence){
    if(!imported.library.some(item=>item.id===segment.ref)){
      imported.library.push(structuredClone(state.library.find(item=>item.id===segment.ref)));
    }
  }
  return imported;
}
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='bateria-absurda-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Peça exportada com formação, legendas e tutoriais')};$('#import').onclick=()=>$('#file').click();$('#file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;const s=JSON.parse(await file.text());if(!valid(s))throw Error();if(!confirm('Importar formação, breques e tutoriais deste arquivo? Exporte o planejamento atual antes, se quiser guardar uma cópia.'))return;migrateSavedState(s);state=retainPieceOnImport(s);save();render();toast('Planejamento importado.')}catch{toast('Arquivo inválido. Use uma peça exportada pelo site.')}finally{e.target.value=''}};$('#print').onclick=()=>window.print();setupPieceVideo();setupTutorials();setupFormation();render();

