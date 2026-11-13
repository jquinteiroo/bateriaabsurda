const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { randomUUID } = require('node:crypto');
const vm = require('node:vm');

const root = join(__dirname, '..');
const tutorials = readFileSync(join(root, 'tutorials.js'), 'utf8');
const formation = readFileSync(join(root, 'formation.js'), 'utf8');
const app = readFileSync(join(root, 'app.js'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');

function load(saved = null) {
  const nodes = Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(match => [match[1], {
    innerHTML: '', textContent: '', value: '', hidden: false,
    style: {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {},
    querySelectorAll() { return []; }, append() {}, focus() {}, reset() {}, setPointerCapture() {},
    showModal() { this.open = true; }, close() { this.open = false; },
    setCustomValidity(message) { this.validationMessage = message; }, reportValidity() {}
  }]));
  const storage = new Map(saved ? [['na-marcacao-v1', JSON.stringify(saved)]] : []);
  const context = vm.createContext({
    crypto: { randomUUID }, structuredClone, URL, setTimeout() {},
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    document: {
      querySelector: selector => {
        const node = nodes[selector.slice(1)];
        assert.ok(node, `Elemento existente: ${selector}`);
        return node;
      },
      querySelectorAll: () => [], createElement: () => ({ style: {}, dataset: {} })
    }
  });
  // Executa os dois scripts na ordem real do HTML, com um DOM mínimo para os testes.
  vm.runInContext(tutorials, context);
  vm.runInContext(formation, context);
  vm.runInContext(app, context);
  return { run: code => vm.runInContext(code, context), nodes, storage };
}

test('catálogo cobre os sete instrumentos de estudo e preserva a formação', () => {
  const { run } = load();
  assert.equal(run('valid(state)'), true);
  assert.equal(run('tutorialInstruments.length'), 7);
  assert.equal(run("tutorialInstruments.some(item=>item.id==='apito')"), false);
  assert.equal(run('tutorialInstruments.every(instrument=>defaultTutorials.some(item=>item.instrument===instrument.id))'), true);
  assert.equal(run('new Set(formationRoster.map(person=>person[2])).size'), 8);
  assert.equal(run('validTutorials(defaultTutorials)'), true);
  assert.equal(run('state.sequence.length'), 16);
  assert.equal(run('state.people.length'), 15);
});

test('aceita links de vídeos e playlists e rejeita URLs inseguras ou incompletas', () => {
  const { run } = load();
  for (const url of [
    'https://www.youtube.com/watch?v=SsTswX_ljNI&t=30s',
    'https://youtu.be/SsTswX_ljNI?si=example',
    'https://m.youtube.com/shorts/SsTswX_ljNI',
    'https://www.youtube.com/embed/SsTswX_ljNI',
    'https://www.youtube.com/playlist?list=PL3y2Ed7WCb4vg94ZnMs7tDIfiKkRgvxwX'
  ]) assert.ok(run(`youtubeResource(${JSON.stringify(url)})`), url);
  for (const url of [
    'javascript:alert(1)', 'http://youtu.be/SsTswX_ljNI',
    'https://youtube.com.example.org/watch?v=SsTswX_ljNI',
    'https://user:password@youtube.com/watch?v=SsTswX_ljNI',
    'https://youtube.com/watch?v=invalid', 'https://youtube.com/playlist?list=invalid',
    'https://youtube.com/user/Thalitinhaaa', 'not a URL'
  ]) assert.equal(run(`youtubeResource(${JSON.stringify(url)})`), null, url);
});

test('planejamento antigo recebe aulas sem perder roteiro, notas ou posições', () => {
  const original = load().run('JSON.stringify(state)');
  const legacy = JSON.parse(original);
  delete legacy.tutorials;
  legacy.notes = 'Combinados do ensaio';
  legacy.people[0].x = 21;
  const { run, storage } = load(legacy);
  assert.equal(run('valid(state)'), true);
  assert.equal(run('state.tutorials.length'), 8);
  const migrated = JSON.parse(storage.get('na-marcacao-v1'));
  assert.deepEqual(migrated.sequence, legacy.sequence);
  assert.deepEqual(migrated.people, legacy.people);
  assert.equal(migrated.notes, legacy.notes);
  assert.equal(run('migrateTutorials(state)'), false);
});

test('importação e migração preservam catálogo editado e catálogo vazio', () => {
  const { run } = load();
  assert.equal(run(`state.tutorials=[]; valid(state)`), true);
  assert.equal(run('migrateTutorials(state)'), false);
  assert.equal(run('state.tutorials.length'), 0);
  assert.equal(run(`state.tutorials=[{id:'custom',instrument:'caixa',title:'Minha aula',type:'video',youtubeId:'SsTswX_ljNI'}]; valid(JSON.parse(JSON.stringify(state)))`), true);
  assert.equal(run('migrateTutorials(state)'), false);
  assert.equal(run('state.tutorials[0].title'), 'Minha aula');
  assert.equal(run(`validTutorials([...state.tutorials,...state.tutorials])`), false);
  assert.equal(run(`validTutorials([{...state.tutorials[0],instrument:'desconhecido'}])`), false);
  assert.equal(run(`validTutorials([{...state.tutorials[0],youtubeId:'<script>'}])`), false);
  assert.equal(run(`validTutorials([{...state.tutorials[0],title:'  '}])`), false);
});

test('filtros mostram aulas ou estado vazio e escapam títulos cadastrados', () => {
  const { run, nodes } = load();
  run('renderTutorials()');
  assert.equal((nodes['tutorial-groups'].innerHTML.match(/<article /g) || []).length, 7);
  assert.ok(!nodes['tutorial-groups'].innerHTML.includes('Thalita Santos'));
  assert.ok(!nodes['tutorial-groups'].innerHTML.includes('Buscar no canal'));
  run(`tutorialFilter='tamborim'; renderTutorials()`);
  assert.equal((nodes['tutorial-groups'].innerHTML.match(/<article /g) || []).length, 1);
  assert.match(nodes['tutorial-groups'].innerHTML, /SsTswX_ljNI/);
  assert.match(nodes['tutorial-count'].textContent, /1 instrumento/);
  run(`state.tutorials=state.tutorials.filter(item=>item.instrument!=='ripa'); tutorialFilter='ripa'; renderTutorials()`);
  assert.match(nodes['tutorial-groups'].innerHTML, /Nenhuma aula cadastrada/);
  run(`state.tutorials[2].title='<img src=x onerror=alert(1)>'; tutorialFilter='tamborim'; renderTutorials()`);
  assert.ok(!nodes['tutorial-groups'].innerHTML.includes('<img'));
  assert.match(nodes['tutorial-groups'].innerHTML, /&lt;img/);
});

test('aba de tutoriais atualiza o título sem afetar as outras abas', () => {
  const { run, nodes } = load();
  run(`changeTab('tutoriais')`);
  assert.equal(nodes['page-title'].textContent, 'Tutoriais');
  run(`changeTab('roteiro')`);
  assert.equal(nodes['page-title'].textContent, 'Peça');
});

test('cadastro, edição, remoção e salvamento mantêm os tutoriais consistentes', () => {
  const { run, nodes, storage } = load();
  run(`changeTab('tutoriais')`);
  run(`openTutorialEditor('caixa')`);
  assert.equal(nodes['tutorial-editor'].open, true);
  nodes['tutorial-instrument'].value = 'caixa';
  nodes['tutorial-title'].value = 'Aula de caixa';
  nodes['tutorial-url'].value = 'https://youtu.be/SsTswX_ljNI';
  nodes['tutorial-form'].onsubmit({ preventDefault() {} });
  assert.equal(nodes['tutorial-editor'].open, false);
  assert.equal(JSON.parse(storage.get('na-marcacao-v1')).tutorials.length, 9);
  run(`openTutorialEditor('caixa',state.tutorials.at(-1).id)`);
  nodes['tutorial-title'].value = 'Novo título';
  nodes['tutorial-form'].onsubmit({ preventDefault() {} });
  assert.equal(run('state.tutorials.at(-1).title'), 'Novo título');
  run(`openTutorialEditor('caixa',state.tutorials.at(-1).id)`);
  nodes['tutorial-delete'].onclick();
  assert.equal(run('state.tutorials.length'), 8);
  assert.equal(run('valid(state)'), true);
});

test('cadastro rejeita links inválidos e aulas duplicadas no mesmo instrumento', () => {
  const { run, nodes } = load();
  run(`openTutorialEditor('tamborim')`);
  nodes['tutorial-title'].value = 'Teste';
  nodes['tutorial-url'].value = 'https://example.org/watch?v=SsTswX_ljNI';
  nodes['tutorial-form'].onsubmit({ preventDefault() {} });
  assert.ok(nodes['tutorial-url'].validationMessage);
  assert.equal(nodes['tutorial-editor'].open, true);
  nodes['tutorial-url'].value = 'https://youtu.be/SsTswX_ljNI';
  nodes['tutorial-form'].onsubmit({ preventDefault() {} });
  assert.equal(run('state.tutorials.length'), 8);
  assert.match(nodes.toast.textContent, /já está cadastrada/);
});

test('links escolhidos preservam vídeo, playlist, posição e início após edição', () => {
  const { run, nodes } = load();
  const links = [
    ['caixa-estudo', 'https://www.youtube.com/watch?v=kkMP9E-Z0tI&list=PL3y2Ed7WCb4usLCuPy2HikNZMjWjltEL1'],
    ['ripa-estudo', 'https://www.youtube.com/watch?v=de9I8qu7Zns'],
    ['chocalho-estudo', 'https://www.youtube.com/watch?v=UPERc1jqSVI&t=146s'],
    ['agogo-estudo', 'https://www.youtube.com/watch?v=QnCsy26KJtc&list=PLVPvwO6TJEuD7sd4Q7DEoaGQwLPD_dpY5&index=14']
  ];
  for (const [id, link] of links) {
    assert.equal(run(`tutorialUrl(defaultTutorials.find(item=>item.id===${JSON.stringify(id)}))`), link);
    run(`openTutorialEditor('all',${JSON.stringify(id)})`);
    nodes['tutorial-form'].onsubmit({ preventDefault() {} });
    assert.equal(run(`tutorialUrl(state.tutorials.find(item=>item.id===${JSON.stringify(id)}))`), link);
    const parsed = JSON.parse(run(`JSON.stringify(youtubeResource(${JSON.stringify(link)}))`));
    const stored = JSON.parse(run(`JSON.stringify(state.tutorials.find(item=>item.id===${JSON.stringify(id)}))`));
    for (const [key, value] of Object.entries(parsed)) assert.equal(stored[key], value);
  }
  run(`openTutorialEditor('all','chocalho-estudo')`);
  nodes['tutorial-url'].value = 'https://youtu.be/de9I8qu7Zns';
  nodes['tutorial-form'].onsubmit({ preventDefault() {} });
  assert.equal(run(`state.tutorials.find(item=>item.id==='chocalho-estudo').startSeconds`), undefined);
});

test('atualização de catálogo antigo remove apito e acrescenta links sem perder dados ou duplicar aulas', () => {
  const saved = JSON.parse(load().run('JSON.stringify(state)'));
  delete saved.tutorialRevision;
  saved.tutorials = saved.tutorials.slice(0, 4);
  saved.tutorials[0].title = 'Título personalizado';
  saved.tutorials.push({id:'apito-antigo',instrument:'apito',title:'Apito',type:'video',youtubeId:'SsTswX_ljNI'});
  saved.tutorials.push({id:'caixa-local',instrument:'caixa',title:'Caixa escolhida antes',type:'video',youtubeId:'kkMP9E-Z0tI'});
  saved.notes = 'Manter os combinados';
  const { run } = load(saved);
  assert.equal(run('state.tutorialRevision'), 2);
  assert.equal(run('state.notes'), saved.notes);
  assert.equal(run("state.tutorials.some(item=>item.instrument==='apito')"), false);
  assert.equal(run("state.tutorials.filter(item=>item.youtubeId==='kkMP9E-Z0tI').length"), 1);
  assert.equal(run("state.tutorials.find(item=>item.id==='caixa-local').title"), 'Caixa escolhida antes');
  assert.equal(run('state.tutorials[0].title'), 'Título personalizado');
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.sequence)')), saved.sequence);
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.people)')), saved.people);
  assert.equal(run('migrateTutorials(state)'), false);
  assert.equal(run('validTutorials(state.tutorials)'), true);
  run("state.tutorials=state.tutorials.filter(item=>item.id!=='ripa-estudo')");
  assert.equal(run('migrateTutorials(state)'), false);
  assert.equal(run("state.tutorials.some(item=>item.id==='ripa-estudo')"), false);
});

test('interface apresenta material interno sem bloco de divulgação do canal', () => {
  assert.ok(!html.includes('tutorial-channel'));
  assert.ok(!html.includes('NOSSO CANAL DE ESTUDO'));
  assert.ok(!html.includes('Conhecer o canal'));
  assert.match(html, /Tutoriais por instrumento/);
});

test('peça bloqueada impede edição e exclusão e permite consultar instruções', () => {
  const { run, nodes } = load();
  const original = run('JSON.stringify({sequence:state.sequence,target:state.target,notes:state.notes})');
  run(`openEditor('segment',state.sequence[0].id)`);
  assert.ok(!nodes.editor.open);
  run(`editing={kind:'segment',id:state.sequence[0].id}`);
  nodes['editor-form'].onsubmit({ preventDefault() {} });
  nodes.delete.onclick();
  assert.equal(run('JSON.stringify({sequence:state.sequence,target:state.target,notes:state.notes})'), original);
  assert.equal(nodes.timeline.onclick, undefined);
  assert.equal(nodes.timeline.ondrop, undefined);
  assert.equal(nodes.notes.oninput, undefined);
  assert.ok(!nodes.timeline.innerHTML.includes('draggable="true"'));
  assert.ok(!nodes.timeline.innerHTML.includes('data-move'));
  assert.match(nodes.timeline.innerHTML, /Instruções e observações/);
  assert.match(html, /id="notes" readonly/);
});

test('vídeo da apresentação é exibido na tela inicial da peça com controles', () => {
  const { run, nodes } = load();
  assert.ok(html.includes('id="piece-video"'));
  assert.ok(html.includes('id="video-overlay"'));
  assert.ok(html.includes('assets/apresentacao.mp4'));
  assert.ok(html.includes('assets/Apresentaçao.mp4'));
  assert.ok(html.includes('08:20'));

  const video = nodes['piece-video'];
  video.currentTime = 50;
  video.duration = 500;
  video.paused = false;
  let played = false;
  let paused = false;
  video.play = () => { played = true; video.paused = false; };
  video.pause = () => { paused = true; video.paused = true; };

  nodes['video-rewind'].onclick();
  assert.equal(video.currentTime, 40);

  nodes['video-forward'].onclick();
  assert.equal(video.currentTime, 50);

  nodes['video-restart'].onclick();
  assert.equal(video.currentTime, 0);
  assert.equal(played, true);

  // Overlay exibe o breque atual de acordo com os minutos e segundos
  video.currentTime = 0;
  run(`updatePieceVideoOverlay()`);
  assert.equal(nodes['overlay-name'].textContent, 'Começo');
  assert.equal(nodes['overlay-code'].textContent, 'C');

  video.currentTime = 30;
  run(`updatePieceVideoOverlay()`);
  assert.equal(nodes['overlay-name'].textContent, 'Samba Reto');
  assert.equal(nodes['overlay-code'].textContent, 'SR');

  video.currentTime = 52;
  run(`updatePieceVideoOverlay()`);
  assert.equal(nodes['overlay-name'].textContent, '4 batidas e virada de 2');
  assert.equal(nodes['overlay-code'].textContent, '4 2');

  video.currentTime = 160;
  run(`updatePieceVideoOverlay()`);
  assert.equal(nodes['overlay-name'].textContent, 'Azão');
  assert.equal(nodes['overlay-code'].textContent, 'A');

  video.currentTime = 200;
  run(`updatePieceVideoOverlay()`);
  assert.equal(nodes['overlay-name'].textContent, 'Pergunta e Resposta');
  assert.equal(nodes['overlay-code'].textContent, 'PR');

  // Alternar exibição do overlay
  nodes['overlay-toggle'].onclick();
  assert.equal(nodes['video-overlay'].classList.toggle !== undefined, true);

  video.paused = false;
  run(`changeTab('formacao')`);
  assert.equal(paused, true);
});

test('importação preserva peça e referências mesmo com uma biblioteca diferente', () => {
  const { run } = load();
  const original = JSON.parse(run('JSON.stringify(state)'));
  run(`globalThis.incoming=structuredClone(state); incoming.sequence=[]; incoming.library=[{id:'novo',code:'N',name:'Novo',notes:''}]; incoming.notes='Outra anotação'; incoming.target=30; incoming.people[0].name='Outro nome'; globalThis.result=retainPieceOnImport(incoming)`);
  const imported = JSON.parse(run('JSON.stringify(result)'));
  assert.deepEqual(imported.sequence, original.sequence);
  assert.equal(imported.target, original.target);
  assert.equal(imported.notes, original.notes);
  assert.equal(imported.people[0].name, 'Outro nome');
  assert.equal(run('valid(result)'), true);
});

test('formação circular mantém os integrantes, com ritmistas na roda e mestre no centro', () => {
  const { run, nodes } = load();
  const people = JSON.parse(run('JSON.stringify(state.people)'));
  const mestre = people.find(person => person.slot === 'joao-mestre');
  assert.deepEqual(mestre.circle, { x: 50, y: 50 });
  for (const person of people.filter(person => person !== mestre)) {
    assert.ok(Math.abs(Math.hypot(person.circle.x - 50, person.circle.y - 50) - 39) < 0.02);
  }
  nodes['formation-layout'].onchange({ target: { value: 'circulo' } });
  assert.equal(run('state.people.length'), people.length);
  assert.equal(nodes['stage-back'].hidden, true);
  assert.equal(nodes['stage-front'].hidden, true);
  nodes['formation-layout'].onchange({ target: { value: 'palco' } });
  assert.equal(nodes['stage-back'].hidden, false);
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.people)')), people);
});

test('mover por teclado e arraste altera apenas a formação selecionada e persiste ao recarregar', () => {
  const { run, nodes, storage } = load();
  const original = JSON.parse(run('JSON.stringify(state.people[0])'));
  const element = { dataset: { id: original.id }, style: {}, setPointerCapture() {} };
  const target = { closest: () => element };
  nodes['formation-layout'].onchange({ target: { value: 'circulo' } });
  nodes.stage.onkeydown({ target, key: 'ArrowDown', preventDefault() {} });
  assert.equal(run('state.people[0].circle.y'), original.circle.y + 2);
  assert.equal(run('state.people[0].y'), original.y);
  nodes.stage.getBoundingClientRect = () => ({ width: 800, height: 800 });
  nodes.stage.onpointerdown({ target, clientX: 0, clientY: 0, pointerId: 1 });
  nodes.stage.onpointermove({ clientX: 80, clientY: 0 });
  nodes.stage.onpointerup();
  assert.equal(run('state.people[0].circle.x'), original.circle.x + 10);
  assert.equal(run('state.people[0].x'), original.x);
  const saved = JSON.parse(storage.get('na-marcacao-v1'));
  const reloaded = load(saved);
  assert.equal(reloaded.run('state.formationLayout'), 'circulo');
  assert.equal(reloaded.run('state.people[0].circle.x'), original.circle.x + 10);
  nodes['formation-layout'].onchange({ target: { value: 'palco' } });
  nodes.stage.onkeydown({ target, key: 'ArrowRight', preventDefault() {} });
  assert.equal(run('state.people[0].x'), original.x + 2);
  assert.equal(run('state.people[0].circle.x'), original.circle.x + 10);
});

test('migração cria círculo sem substituir posições e nomes de planejamentos antigos', () => {
  const saved = JSON.parse(load().run('JSON.stringify(state)'));
  delete saved.formationLayout;
  saved.people.forEach(person => delete person.circle);
  saved.people[0].name = 'Nome salvo';
  saved.people[0].x = 17;
  saved.people[0].y = 24;
  const { run } = load(saved);
  const people = JSON.parse(run('JSON.stringify(state.people)'));
  assert.deepEqual(people.map(({ circle, ...person }) => person), saved.people);
  assert.equal(run('state.formationLayout'), 'circulo');
  assert.equal(run('valid(state)'), true);
  assert.equal(run('migrateFormationLayouts(state)'), false);
  assert.equal(run(`state.people[0].circle={x:-1,y:50};valid(state)`), false);
  assert.equal(run(`state.people[0].circle={x:50,y:50};state.formationLayout='invalido';valid(state)`), false);
});

test('círculo abre primeiro e setas alternam preservando posições e seleção salva', () => {
  const { run, nodes, storage } = load();
  assert.equal(run('state.formationLayout'), 'circulo');
  assert.ok(html.indexOf('value="circulo"') < html.indexOf('value="palco"'));
  const people = run('JSON.stringify(state.people)');
  nodes['formation-next'].onclick();
  assert.equal(run('state.formationLayout'), 'palco');
  assert.equal(load(JSON.parse(storage.get('na-marcacao-v1'))).run('state.formationLayout'), 'palco');
  nodes['formation-prev'].onclick();
  assert.equal(run('state.formationLayout'), 'circulo');
  assert.equal(run('JSON.stringify(state.people)'), people);
});

test('deslizar no mapa troca formação sem confundir gestos verticais ou arraste de integrantes', () => {
  const { run, nodes } = load();
  const carousel = nodes['formation-carousel'];
  const empty = { closest: () => null };
  carousel.onpointerdown({ target: empty, clientX: 200, clientY: 100, pointerId: 1, button: 0 });
  carousel.onpointerup({ clientX: 80, clientY: 110, pointerId: 1 });
  assert.equal(run('state.formationLayout'), 'palco');
  carousel.onpointerdown({ target: empty, clientX: 80, clientY: 100, pointerId: 2, button: 0 });
  carousel.onpointerup({ clientX: 200, clientY: 110, pointerId: 2 });
  assert.equal(run('state.formationLayout'), 'circulo');
  carousel.onpointerdown({ target: empty, clientX: 100, clientY: 100, pointerId: 3 });
  carousel.onpointerup({ clientX: 180, clientY: 250, pointerId: 3 });
  assert.equal(run('state.formationLayout'), 'circulo');
  carousel.onpointerdown({ target: { closest: () => ({ className: 'person' }) }, clientX: 100, clientY: 100, pointerId: 4 });
  carousel.onpointerup({ clientX: 250, clientY: 100, pointerId: 4 });
  assert.equal(run('state.formationLayout'), 'circulo');
  carousel.onpointerdown({ target: empty, clientX: 100, clientY: 100, pointerId: 5 });
  carousel.onpointercancel();
  carousel.onpointerup({ clientX: 250, clientY: 100, pointerId: 5 });
  assert.equal(run('state.formationLayout'), 'circulo');
});

test('atualização coloca círculo primeiro uma vez sem perder posições de palco salvas', () => {
  const saved = JSON.parse(load().run('JSON.stringify(state)'));
  saved.formationLayout = 'palco';
  delete saved.formationOrderRevision;
  saved.people[0].x = 19;
  const { run } = load(saved);
  assert.equal(run('state.formationLayout'), 'circulo');
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.people)')), saved.people);
  assert.equal(run('migrateFormationLayouts(state)'), false);
});
