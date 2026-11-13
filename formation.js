// As duas formações compartilham os integrantes e guardam posições independentes.
function validFormationLayouts(saved) {
  return (saved.formationLayout === undefined || ['palco', 'circulo'].includes(saved.formationLayout)) &&
    saved.people.every(person => person.circle === undefined || (person.circle &&
      Number.isFinite(person.circle.x) && person.circle.x >= 7 && person.circle.x <= 93 &&
      Number.isFinite(person.circle.y) && person.circle.y >= 8 && person.circle.y <= 92));
}

function migrateFormationLayouts(saved) {
  let changed = false;
  if (saved.formationLayout === undefined) {
    saved.formationLayout = 'circulo';
    changed = true;
  }
  if (saved.formationOrderRevision !== 1) {
    saved.formationLayout = 'circulo';
    saved.formationOrderRevision = 1;
    changed = true;
  }
  const mestre = saved.people.find(person => person.slot === 'joao-mestre') ||
    saved.people.find(person => /mestre|apito/i.test(person.notes));
  const ring = saved.people.filter(person => person !== mestre);
  saved.people.forEach(person => {
    if (person.circle !== undefined) return;
    const index = ring.indexOf(person);
    const angle = -Math.PI / 2 + index * 2 * Math.PI / Math.max(1, ring.length);
    person.circle = person === mestre || (!mestre && ring.length === 1) ? { x: 50, y: 50 } : {
      x: Number((50 + 39 * Math.cos(angle)).toFixed(2)),
      y: Number((50 + 39 * Math.sin(angle)).toFixed(2))
    };
    changed = true;
  });
  return changed;
}

function formationPosition(person) {
  return state.formationLayout === 'circulo' ? person.circle : person;
}

function renderFormation() {
  const circle = state.formationLayout === 'circulo';
  const stage = $('#stage');
  $('#formation-layout').value = state.formationLayout;
  const other = circle ? 'palco' : 'em círculo';
  $('#formation-prev').setAttribute('aria-label', `Formação anterior: ${other}`);
  $('#formation-next').setAttribute('aria-label', `Próxima formação: ${other}`);
  stage.classList.toggle('stage-circle', circle);
  stage.setAttribute('aria-label', circle ? 'Formação em círculo' : 'Formação de palco');
  $('#stage-back').hidden = circle;
  $('#stage-front').hidden = circle;
  stage.querySelectorAll('.person').forEach(element => element.remove());
  state.people.forEach(person => {
    const position = formationPosition(person);
    const element = document.createElement('button');
    element.className = 'person';
    element.dataset.id = person.id;
    element.style.left = position.x + '%';
    element.style.top = position.y + '%';
    element.title = person.name + (person.notes ? ' — ' + person.notes : '');
    element.innerHTML = esc(person.name) + (person.notes ? `<small>${esc(person.notes)}</small>` : '');
    stage.append(element);
  });
}

function selectFormation(layout) {
  if (!['circulo', 'palco'].includes(layout)) return;
  moving = null;
  state.formationLayout = layout;
  save();
  renderFormation();
}

function setupFormation() {
  const carousel = $('#formation-carousel');
  let swipe = null;
  const next = () => {
    swipe = null;
    selectFormation(state.formationLayout === 'circulo' ? 'palco' : 'circulo');
  };
  $('#formation-layout').onchange = event => {
    swipe = null;
    selectFormation(event.target.value);
  };
  $('#formation-prev').onclick = next;
  $('#formation-next').onclick = next;
  carousel.onpointerdown = event => {
    swipe = null;
    if (event.isPrimary === false || (event.button !== undefined && event.button !== 0) ||
        event.target.closest('.person, button, select')) return;
    swipe = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    carousel.setPointerCapture(event.pointerId);
  };
  carousel.onpointerup = event => {
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) >= 65 && Math.abs(dx) > Math.abs(dy) * 1.5) next();
  };
  carousel.onpointercancel = () => { swipe = null; };
  carousel.onkeydown = event => {
    if (event.target.closest('.person, button, select') || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    next();
  };
}
