// Catálogo da formação atual. Novas aulas podem ser cadastradas pela interface.
const tutorialInstruments = [
  { id: 'surdo-primeira', name: 'Surdo de Primeira' },
  { id: 'surdo-terceira', name: 'Surdo de Terceira' },
  { id: 'caixa', name: 'Caixa' },
  { id: 'ripa', name: 'Ripa' },
  { id: 'tamborim', name: 'Tamborim' },
  { id: 'agogo', name: 'Agogô' },
  { id: 'chocalho', name: 'Chocalho' }
];
const rehearsalTutorials = [
  { id: 'caixa-estudo', instrument: 'caixa', title: 'Caixa: aula e sequência de estudos', type: 'video', youtubeId: 'kkMP9E-Z0tI', playlistId: 'PL3y2Ed7WCb4usLCuPy2HikNZMjWjltEL1' },
  { id: 'ripa-estudo', instrument: 'ripa', title: 'Ripa: tutorial', type: 'video', youtubeId: 'de9I8qu7Zns' },
  { id: 'chocalho-estudo', instrument: 'chocalho', title: 'Chocalho: tutorial', type: 'video', youtubeId: 'UPERc1jqSVI', startSeconds: 146 },
  { id: 'agogo-estudo', instrument: 'agogo', title: 'Agogô: aula e sequência de estudos', type: 'video', youtubeId: 'QnCsy26KJtc', playlistId: 'PLVPvwO6TJEuD7sd4Q7DEoaGQwLPD_dpY5', playlistIndex: 14 }
];
const defaultTutorials = [
  { id: 'surdos-primeira', instrument: 'surdo-primeira', title: 'Surdos: série de aulas de marcação', type: 'playlist', youtubeId: 'PL3y2Ed7WCb4vg94ZnMs7tDIfiKkRgvxwX' },
  { id: 'surdos-terceira', instrument: 'surdo-terceira', title: 'Surdos: série de aulas de marcação', type: 'playlist', youtubeId: 'PL3y2Ed7WCb4vg94ZnMs7tDIfiKkRgvxwX' },
  { id: 'tamborim-inicio', instrument: 'tamborim', title: 'Tamborim: primeiros passos', type: 'video', youtubeId: 'SsTswX_ljNI' },
  { id: 'tamborim-virada', instrument: 'tamborim', title: 'Tamborim: virada, parte 1', type: 'video', youtubeId: 'MFuUknAluIk' },
  ...rehearsalTutorials
];

function validTutorials(items, allowLegacy = false) {
  return Array.isArray(items) && items.every(item =>
    item && typeof item.id === 'string' && item.id.trim() &&
    (tutorialInstruments.some(instrument => instrument.id === item.instrument) || (allowLegacy && item.instrument === 'apito')) &&
    typeof item.title === 'string' && item.title.trim() && item.title.length <= 160 &&
    typeof item.youtubeId === 'string' &&
    (item.type === 'video' ? /^[\w-]{11}$/.test(item.youtubeId) :
      item.type === 'playlist' && /^PL[\w-]{10,100}$/.test(item.youtubeId)) &&
    (item.playlistId === undefined || (typeof item.playlistId === 'string' && /^PL[\w-]{10,100}$/.test(item.playlistId))) &&
    (item.playlistIndex === undefined || (Number.isInteger(item.playlistIndex) && item.playlistIndex > 0 && item.playlistIndex <= 10000)) &&
    (item.startSeconds === undefined || (Number.isInteger(item.startSeconds) && item.startSeconds >= 0 && item.startSeconds <= 86400))
  ) && new Set(items.map(item => item.id)).size === items.length;
}

function migrateTutorials(saved) {
  if (saved.tutorials === undefined) {
    saved.tutorials = structuredClone(defaultTutorials);
    saved.tutorialRevision = 2;
    return true;
  }
  const count = saved.tutorials.length;
  saved.tutorials = saved.tutorials.filter(item => item.instrument !== 'apito');
  if (saved.tutorialRevision >= 2) return saved.tutorials.length !== count;
  for (const lesson of rehearsalTutorials) {
    if (!saved.tutorials.some(item => item.id === lesson.id ||
        (item.instrument === lesson.instrument && item.type === lesson.type && item.youtubeId === lesson.youtubeId))) {
      saved.tutorials.push(structuredClone(lesson));
    }
  }
  saved.tutorialRevision = 2;
  return true;
}

function youtubeResource(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    let videoId;
    if (host === 'youtu.be') videoId = url.pathname.slice(1);
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
      if (url.pathname === '/playlist') {
        const playlistId = url.searchParams.get('list') || '';
        return /^PL[\w-]{10,100}$/.test(playlistId) ? { type: 'playlist', youtubeId: playlistId } : null;
      }
      videoId = url.pathname === '/watch' ? url.searchParams.get('v') :
        /^\/(shorts|embed)\/([\w-]{11})\/?$/.exec(url.pathname)?.[2];
    }
    if (!/^[\w-]{11}$/.test(videoId || '')) return null;
    const resource = { type: 'video', youtubeId: videoId };
    const playlistId = url.searchParams.get('list') || '';
    if (/^PL[\w-]{10,100}$/.test(playlistId)) resource.playlistId = playlistId;
    const index = Number(url.searchParams.get('index'));
    if (resource.playlistId && Number.isInteger(index) && index > 0 && index <= 10000) resource.playlistIndex = index;
    const time = url.searchParams.get('t') || url.searchParams.get('start') || '';
    const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(time);
    const seconds = /^\d+s?$/.test(time) ? parseInt(time, 10) : parts ? Number(parts[1] || 0) * 3600 + Number(parts[2] || 0) * 60 + Number(parts[3] || 0) : 0;
    if (seconds > 0 && seconds <= 86400) resource.startSeconds = seconds;
    return resource;
  } catch { return null; }
}

function tutorialUrl(item) {
  const url = new URL(item.type === 'playlist' ? 'https://www.youtube.com/playlist' : 'https://www.youtube.com/watch');
  url.searchParams.set(item.type === 'playlist' ? 'list' : 'v', item.youtubeId);
  if (item.type === 'video') {
    if (item.playlistId) url.searchParams.set('list', item.playlistId);
    if (item.playlistId && item.playlistIndex) url.searchParams.set('index', item.playlistIndex);
    if (item.startSeconds) url.searchParams.set('t', `${item.startSeconds}s`);
  }
  return url.href;
}

let tutorialFilter = 'all', editingTutorial = null;

function renderTutorials() {
  const instruments = tutorialInstruments.filter(item => tutorialFilter === 'all' || item.id === tutorialFilter);
  const items = state.tutorials;
  const count = items.filter(item => tutorialFilter === 'all' || item.instrument === tutorialFilter).length;
  $('#tutorial-count').textContent = `${instruments.length} ${instruments.length === 1 ? 'instrumento' : 'instrumentos'} · ${count} ${count === 1 ? 'aula ou playlist cadastrada' : 'aulas e playlists cadastradas'}`;
  $('#tutorial-filters').innerHTML = [{ id: 'all', name: 'Todos' }, ...tutorialInstruments].map(item =>
    `<button type="button" data-instrument="${item.id}" aria-pressed="${item.id === tutorialFilter}">${item.name}</button>`
  ).join('');
  $('#tutorial-groups').innerHTML = instruments.map(instrument => {
    const lessons = items.filter(item => item.instrument === instrument.id);
    return `<article class="tutorial-group" aria-labelledby="tutorial-${instrument.id}">
      <div class="tutorial-group-heading"><h3 id="tutorial-${instrument.id}">${instrument.name}</h3></div>
      ${lessons.length ? `<ul class="tutorial-lessons">${lessons.map(item => `<li>
        <a class="tutorial-lesson" href="${esc(tutorialUrl(item))}" target="_blank" rel="noopener noreferrer">
          <span class="tutorial-play" aria-hidden="true">▶</span><span><small>${item.type === 'playlist' ? 'PLAYLIST' : 'VIDEOAULA'}${item.startSeconds ? ` · A PARTIR DE ${Math.floor(item.startSeconds / 60)}:${String(item.startSeconds % 60).padStart(2, '0')}` : ''}</small><b>${esc(item.title)}</b><span class="tutorial-watch">${item.type === 'playlist' ? 'Abrir playlist' : 'Assistir no YouTube'} ↗</span></span>
        </a><button type="button" class="tutorial-edit" data-tutorial-edit="${esc(item.id)}" aria-label="Editar ${esc(item.title)}">Editar</button>
      </li>`).join('')}</ul>` : '<p class="tutorial-empty">Nenhuma aula cadastrada para este instrumento.</p>'}
    </article>`;
  }).join('');
}

function openTutorialEditor(instrument = tutorialFilter, id = null) {
  editingTutorial = id;
  const item = state.tutorials.find(entry => entry.id === id);
  $('#tutorial-form').reset();
  $('#tutorial-editor-title').textContent = item ? 'Editar tutorial' : 'Adicionar tutorial';
  $('#tutorial-instrument').innerHTML = tutorialInstruments.map(entry => `<option value="${entry.id}">${entry.name}</option>`).join('');
  $('#tutorial-instrument').value = item?.instrument || (instrument === 'all' ? tutorialInstruments[0].id : instrument);
  $('#tutorial-title').value = item?.title || '';
  $('#tutorial-url').value = item ? tutorialUrl(item) : '';
  $('#tutorial-url').setCustomValidity('');
  $('#tutorial-delete').hidden = !item;
  $('#tutorial-editor').showModal();
}

function setupTutorials() {
  $('#tutorial-filters').onclick = event => {
    const button = event.target.closest('[data-instrument]');
    if (!button) return;
    tutorialFilter = button.dataset.instrument;
    renderTutorials();
    $('#tutorial-filters').querySelector(`[data-instrument="${tutorialFilter}"]`).focus();
  };
  $('#tutorial-groups').onclick = event => {
    const edit = event.target.closest('[data-tutorial-edit]');
    if (edit) openTutorialEditor('all', edit.dataset.tutorialEdit);
  };
  document.querySelectorAll('[data-close-tutorial]').forEach(button => {
    button.onclick = () => $('#tutorial-editor').close();
  });
  $('#tutorial-url').oninput = () => $('#tutorial-url').setCustomValidity('');
  $('#tutorial-form').onsubmit = event => {
    event.preventDefault();
    const title = $('#tutorial-title').value.trim();
    const resource = youtubeResource($('#tutorial-url').value.trim());
    if (!title) { $('#tutorial-title').focus(); return; }
    if (!resource) {
      $('#tutorial-url').setCustomValidity('Cole um link HTTPS de um vídeo ou playlist do YouTube.');
      $('#tutorial-url').reportValidity();
      return;
    }
    const instrument = $('#tutorial-instrument').value;
    if (state.tutorials.some(item => item.id !== editingTutorial && item.instrument === instrument &&
        item.type === resource.type && item.youtubeId === resource.youtubeId)) {
      toast('Esta aula já está cadastrada neste instrumento.');
      return;
    }
    const item = state.tutorials.find(entry => entry.id === editingTutorial);
    const values = { title, instrument, ...resource };
    if (item) {
      delete item.playlistId;
      delete item.playlistIndex;
      delete item.startSeconds;
      Object.assign(item, values);
    }
    else state.tutorials.push({ id: uid(), ...values });
    save();
    renderTutorials();
    $('#tutorial-editor').close();
    toast('Tutorial salvo neste navegador');
  };
  $('#tutorial-delete').onclick = () => {
    state.tutorials = state.tutorials.filter(item => item.id !== editingTutorial);
    save();
    renderTutorials();
    $('#tutorial-editor').close();
    toast('Tutorial removido');
  };
}
