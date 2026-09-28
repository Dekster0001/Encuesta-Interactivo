/* =======================================================
   QuickSurvey — Encuesta interactiva · JavaScript puro
   Sin librerías, sin framework, sin dependencias. Nunca se
   inyecta markup: el texto entra siempre por textContent.
   Funciona con file:// y en GitHub Pages.
   ======================================================= */

/* 1. BANCO DE PREGUNTAS: la pantalla se dibuja a partir de este arreglo */
const questions = [
  { id: 'satisfaccion', text: '¿Qué tan satisfecho estás con tu experiencia académica?',
    type: 'scale', options: [1, 2, 3, 4, 5], required: true,
    hint: '1 = nada satisfecho · 5 = totalmente satisfecho' },
  { id: 'modalidad', text: '¿Qué modalidad prefieres para tus clases?',
    type: 'radio', options: ['Presencial', 'Virtual', 'Híbrida'], required: true },
  { id: 'recursos', text: '¿Qué recursos utilizas para estudiar?',
    type: 'checkbox', options: ['Biblioteca', 'Campus virtual', 'Laboratorios', 'Tutorías'],
    required: true },
  { id: 'q_horas_estudio', text: '¿Cuántas horas semanales dedicas al estudio autónomo fuera de clases?',
    type: 'select', options: ['Menos de 5 horas', 'Entre 5 y 10 horas', 'Entre 11 y 15 horas', 'Más de 15 horas'],
    required: true },
  { id: 'mejora', text: '¿Qué mejorarías de la experiencia académica?',
    type: 'text', required: false }
];

/* 2. ESTADO CENTRALIZADO: la única memoria de la aplicación */
const appState = { currentIndex: 0, answers: {} };

/* 3. ARRANQUE: todo el código corre con el DOM ya construido,
   aunque el <script> se cargue con defer o al final del <body>. */
document.addEventListener('DOMContentLoaded', () => {

  /* --- Utilidades de DOM --------------------------------------------- */

  const $ = (selector) => document.querySelector(selector);

  /** Crea un nodo con sus clases y su texto. El texto entra SIEMPRE por
   *  textContent, que NO interpreta HTML: si el usuario escribe
   *  <img src=x onerror=alert(1)> se muestra literal y no se ejecuta.
   *  Por eso no hay ni una sola cadena de markup en este archivo.
   *  OJO: classList.add() recibe UN token por llamada; por eso la clase
   *  se parte con split(). Ese detalle era la causa del bug. */
  const el = (tag, className = '', text = null) => {
    const node = document.createElement(tag);
    className.split(' ').filter(Boolean).forEach((c) => node.classList.add(c));
    if (text !== null) node.textContent = text;
    return node;
  };

  /** Vacía un contenedor borrando a cada hijo con Node.remove(). */
  const clear = (node) => { while (node && node.firstChild) node.firstChild.remove(); };

  const question = () => questions[appState.currentIndex];
  const card = () => $('#questionContainer').firstElementChild;
  const isEmpty = (v) => v === undefined || v === null || String(v).trim() === ''
    || (Array.isArray(v) && v.length === 0);
  const notaBaja = () => Number(appState.answers.satisfaccion) <= 2;   // 1 o 2 sobre 5
  const motivo = () => { const a = card() && card().querySelector('#motivo'); return a ? a.value : ''; };
  const esUltima = () => appState.currentIndex === questions.length - 1;

  /** Guarda la respuesta, o borra la clave si no tiene contenido real. */
  const put = (id, v) => (isEmpty(v) ? delete appState.answers[id] : (appState.answers[id] = v));

  /* --- 4. CONSTRUIR LA PREGUNTA -------------------------------------
     Se arma nodo a nodo con createElement() + appendChild(). El
     navegador nunca recibe una cadena de HTML que interpretar. */
  function buildQuestion(q) {
    const card = el('div', 'question-card');
    const title = el('h2', 'question-title', q.text);
    if (q.required) title.appendChild(el('span', 'badge', 'Obligatoria'));
    card.appendChild(title);

    if (q.type === 'text') {
      const area = el('textarea', 'field');
      area.setAttribute('id', q.id);
      area.setAttribute('maxlength', '200');
      area.setAttribute('rows', '4');
      area.setAttribute('placeholder', 'Escribe tu respuesta aquí…');
      area.setAttribute('aria-label', q.text);
      card.appendChild(area);
    } else if (q.type === 'select') {
      // DESPLEGABLE: <select> + <option> creados con createElement(). La
      // primera opción es de cortesía y vale '' , así el required no se
      // cumple solo por tener el control en pantalla.
      const sel = el('select', 'field');
      sel.setAttribute('id', q.id);
      sel.setAttribute('name', q.id);
      sel.setAttribute('aria-label', q.text);
      const vacia = el('option', '', 'Selecciona una opción…');
      vacia.setAttribute('value', '');
      sel.appendChild(vacia);
      q.options.forEach((option) => {
        const opt = el('option', '', String(option));
        opt.setAttribute('value', String(option));
        sel.appendChild(opt);
      });
      // Valor preseleccionado si ya está en el estado (al retroceder).
      const guardado = appState.answers[q.id];
      if (guardado !== undefined) sel.value = guardado;
      card.appendChild(sel);
    } else {
      // Escala, radio y checkbox comparten construcción: fieldset + label.
      // La escala 1-5 recibe la clase "scale" para usar 5 columnas.
      const group = el('fieldset', q.type === 'scale' ? 'options scale' : 'options');
      group.appendChild(el('legend', 'visually-hidden', q.text));
      q.options.forEach((option, i) => {
        const input = el('input');
        input.setAttribute('type', q.type === 'checkbox' ? 'checkbox' : 'radio');
        input.setAttribute('name', q.id);
        input.setAttribute('value', option);
        input.setAttribute('id', `${q.id}-${i}`);
        const label = el('label', 'option');
        label.setAttribute('for', input.id);
        label.appendChild(input);
        label.appendChild(el('span', 'option-text', option));
        group.appendChild(label);
      });
      card.appendChild(group);
    }

    // ADAPTACIÓN DINÁMICA: con nota 1 o 2 se inserta el campo del motivo.
    if (q.id === 'satisfaccion' && notaBaja()) {
      const group = el('div', 'field-group is-dynamic');
      const label = el('label', 'field-label', '¿Por qué no estás satisfecho? Cuéntanos el motivo.');
      label.setAttribute('for', 'motivo');
      const area = el('textarea', 'field');
      area.setAttribute('id', 'motivo');
      area.setAttribute('maxlength', '200');
      area.setAttribute('rows', '3');
      area.setAttribute('placeholder', 'Escribe el motivo de tu insatisfacción…');
      group.appendChild(label);
      group.appendChild(area);
      card.appendChild(group);
    }
    if (q.hint) card.appendChild(el('p', 'hint', q.hint));
    return card;
  }

  /* --- 5. LEER / GUARDAR / RESTAURAR ------------------------------- */

  function readAnswer(q) {
    if (q.type === 'text') return card().querySelector('textarea').value;
    if (q.type === 'select') return card().querySelector('select').value;
    if (q.type === 'checkbox') {
      return Array.from(card().querySelectorAll('input:checked')).map((i) => i.value);
    }
    const checked = card().querySelector('input:checked');
    if (!checked) return '';
    return q.type === 'scale' ? Number(checked.value) : checked.value;
  }

  function saveAnswer(q) {
    put(q.id, readAnswer(q));
    // El motivo solo se toca si su campo existe: en las demás preguntas
    // no está en el DOM y no debe borrarse lo ya guardado.
    const area = card().querySelector('#motivo');
    if (area) put('motivo', area.value);
  }

  /** Repuebla los controles con appState.answers: al retroceder, la
   *  pregunta anterior reaparece tal como se dejó (caso de prueba 3). */
  function restoreAnswer(q) {
    const saved = appState.answers[q.id];
    if (saved !== undefined) {
      if (q.type === 'text') card().querySelector('textarea').value = saved;
      else if (q.type === 'select') card().querySelector('select').value = saved;
      else card().querySelectorAll('input').forEach((input) => {
        input.checked = q.type === 'checkbox'
          ? saved.includes(input.value) : input.value === String(saved);
      });
    }
    const area = card().querySelector('#motivo');
    if (area && appState.answers.motivo !== undefined) area.value = appState.answers.motivo;
  }

  /* --- 6. VALIDACIÓN (caso de prueba 1) ---------------------------- */

  /** Devuelve el aviso, o cadena vacía si todo está correcto. */
  function errorActual() {
    const q = question();
    if (q.required && isEmpty(readAnswer(q)))
      return 'Esta pregunta es obligatoria: marca una opción o escribe tu respuesta.';
    if (q.id === 'satisfaccion' && notaBaja() && motivo().trim() === '')
      return 'Indica el motivo de tu baja satisfacción para continuar.';
    // Campo de texto libre del Finalizar: ni vacío ni solo espacios.
    if (esUltima() && q.type === 'text' && readAnswer(q).trim() === '')
      return 'Escribe tu respuesta antes de finalizar la encuesta.';
    return '';
  }

  function setError(msg) {
    const box = $('#validationMessage');
    box.textContent = msg;
    box.classList.toggle('hidden', !msg);
    box.classList.toggle('is-invalid', !!msg);
    if (card()) {
      card().classList.toggle('is-invalid', !!msg);
      card().querySelectorAll('.field')
        .forEach((f) => f.classList.toggle('is-invalid', !!msg));
    }
  }

  /** Cada cambio guarda la respuesta; al quedar válida, el aviso se borra.
   *  Si la nota cruza el umbral 2, el campo del motivo se elimina del DOM
   *  con Node.remove() y se borra de appState.answers. */
  function onChange() {
    const q = question();
    const habia = !!motivo();
    saveAnswer(q);
    const node = card() && card().querySelector('#motivo');
    if (q.id === 'satisfaccion' && habia !== notaBaja()) {
      if (node) node.remove();                                  // sale del DOM
      if (!notaBaja()) delete appState.answers.motivo;          // y del estado
      return render();
    }
    setError(errorActual());
  }

  /* --- 7. NAVEGACIÓN (casos de prueba 2 y 5) ----------------------- */

  function render() {
    // Limpieza previa con remove() antes de instanciar los nodos nuevos.
    clear($('#questionContainer'));
    setError('');
    $('#questionContainer').appendChild(buildQuestion(question()));
    restoreAnswer(question());

    const step = appState.currentIndex + 1;
    // El avance mide preguntas YA RESPONDIDAS sobre la base de 5: al entrar
    // en la 1 va a 0 % y tras el reinicio vuelve a 0 %.
    const percent = Math.round((appState.currentIndex / questions.length) * 100);
    const last = step === questions.length;
    $('#questionCounter').textContent = `Pregunta ${step} de ${questions.length}`;
    $('#progressPercent').textContent = `${percent}%`;
    $('#progressBar').style.width = `${percent}%`;
    $('#progressBar').setAttribute('aria-valuenow', percent);
    $('#progressBar').setAttribute('aria-valuetext', `${percent} por ciento completado`);
    $('#btnPrev').disabled = step === 1;
    $('#btnNext').classList.toggle('hidden', last);
    $('#btnFinish').classList.toggle('hidden', !last);
  }

  function goNext() {
    const msg = errorActual();
    if (msg) return setError(msg);              // caso 1: no avanza
    saveAnswer(question());
    if (appState.currentIndex < questions.length - 1) appState.currentIndex++;
    render();
  }

  function goPrev() {
    saveAnswer(question());   // se guarda antes de salir, para no perder cambios
    if (appState.currentIndex > 0) appState.currentIndex--;
    render();
  }

  function goFinish() {
    const msg = errorActual();
    if (msg) return setError(msg);              // campo vacío: no hay resumen
    saveAnswer(question());

    // Red de seguridad: si una obligatoria quedara vacía, llevamos al
    // usuario hasta ella en vez de mostrar un resumen incompleto.
    let destino = questions.findIndex((q) => q.required && isEmpty(appState.answers[q.id]));
    if (destino === -1 && notaBaja() && isEmpty(appState.answers.motivo)) destino = 0;
    if (destino !== -1) {
      appState.currentIndex = destino;
      render();
      return setError(errorActual() || 'Responde esta pregunta para continuar.');
    }
    renderSummary();
    $('#surveySection').classList.add('hidden');
    $('#summarySection').classList.remove('hidden');
  }

  /* --- 8. RESUMEN Y ESTADÍSTICAS (caso de prueba 4) --------------- */

  function renderSummary() {
    const filas = questions.map((q) => ({ t: q.text, v: appState.answers[q.id], id: q.id }));

    const list = el('ul', 'summary-list');
    filas.forEach((f) => {
      const vacio = isEmpty(f.v);
      const item = el('li', 'summary-item');
      item.appendChild(el('strong', '', f.t));
      item.appendChild(el('span', vacio ? 'answer-empty' : 'answer-value',
        vacio ? 'Sin respuesta' : Array.isArray(f.v) ? f.v.join(', ') : String(f.v)));
      // MOTIVO: si la nota fue baja, su texto se imprime bajo la respuesta
      // de la Pregunta 1 en un <p> con createElement + textContent.
      const mot = appState.answers.motivo;
      if (f.id === 'satisfaccion' && !isEmpty(mot)) {
        item.appendChild(el('span', 'field-label', '¿Por qué no estás satisfecho?'));
        const p = document.createElement('p');
        p.className = 'answer-value';        // una sola clase: sin riesgo de token
        p.style.margin = '0';
        p.textContent = String(mot).trim();
        item.appendChild(p);
      }
      list.appendChild(item);
    });
    clear($('#summaryContainer'));
    $('#summaryContainer').appendChild(list);

    // Estadísticas reales: promedio de la escala numérica con reduce()
    const notas = questions.filter((q) => q.type === 'scale')
      .map((q) => appState.answers[q.id]).filter((v) => typeof v === 'number');
    const media = notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : 0;
    const hechas = questions.filter((q) => !isEmpty(appState.answers[q.id])).length;

    const box = el('div', 'stat-box');
    box.appendChild(el('h3', '', 'Estadísticas'));
    box.appendChild(el('p', 'stat-mean', `Promedio de satisfacción: ${media.toFixed(2)} de 5`));
    box.appendChild(el('p', '', `Respuestas: ${hechas} de ${questions.length}`));
    clear($('#statsContainer'));
    $('#statsContainer').appendChild(box);
  }

  /* --- 9. REINICIO Y EVENTOS (caso de prueba 5) -------------------- */

  function resetSurvey() {
    appState.answers = {};
    appState.currentIndex = 0;
    clear($('#summaryContainer'));
    clear($('#statsContainer'));
    $('#summarySection').classList.add('hidden');
    $('#surveySection').classList.remove('hidden');
    render();                 // vuelve al paso 0 y repone el progreso a 0 %
  }

  $('#btnPrev').addEventListener('click', goPrev);
  $('#btnNext').addEventListener('click', goNext);
  $('#btnFinish').addEventListener('click', goFinish);
  $('#btnReset').addEventListener('click', resetSurvey);

  // Delegación: un solo listener cubre los controles aunque se creen y
  // se destruyan en cada pregunta.
  $('#questionContainer').addEventListener('change', onChange);
  $('#questionContainer').addEventListener('input', onChange);

  // Se dibuja la Pregunta 1 de inmediato: la tarjeta nunca queda vacía.
  render();

});
