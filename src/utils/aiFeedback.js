// src/utils/aiFeedback.js
// Retroalimentacion con IA para las evaluaciones: SIEMPRE en espanol, automatica y para todos los tipos.
// REGLA CLAVE: se puede generar/mostrar cuando la evaluacion YA VENCIO o cuando tiene activa la opcion de retroalimentacion inmediata.
// Probado en scripts/test-feedback.mjs

/** True si la evaluacion ya paso su fecha/hora limite (misma logica que cierra el examen). */
export function evaluacionVencida(ev, ahora = Date.now()) {
  if (!ev?.dueDate) return false;
  const fecha = new Date(`${ev.dueDate}T${ev.dueTime || '23:59'}`);
  if (isNaN(fecha.getTime())) return false;
  return ahora > fecha.getTime();
}

/** True si la evaluacion tiene activada la opcion de retroalimentacion inmediata. */
export function tieneRetroalimentacionInmediata(ev) {
  return Boolean(ev?.immediateFeedback || ev?.retroalimentacionInmediata);
}

/** True si ya se puede mostrar la retroalimentacion (inmediata activada o evaluacion vencida). */
export function puedeMostrarFeedback(ev, ahora = Date.now()) {
  return tieneRetroalimentacionInmediata(ev) || evaluacionVencida(ev, ahora);
}

function normalizarComparacion(v) {
  return String(v == null ? '' : v)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:¡¿"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Resumen legible de una pregunta con la respuesta del estudiante y la correcta. */
export function describirPregunta(q, respuesta) {
  const limpio = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const tipo = q?.type || 'text';
  const enunciado = limpio(q?.text || q?.question || '').slice(0, 300);

  if (tipo === 'speaking') {
    // No se puede oir el audio: se explica que debia incluir una buena respuesta.
    const respondio = !!respuesta;
    return {
      tipo,
      esAudio: true,
      enunciado,
      opciones: '',
      correcta: '',
      delEstudiante: respondio ? '(respondio grabando un audio)' : '(no grabo nada)',
      acierto: null,
    };
  }

  let correcta = '';
  let delEstudiante = '';
  let acierto = false;
  let extra = {};

  if ((tipo === 'multiple' || tipo === 'listening' || tipo === 'reading') && Array.isArray(q?.options) && q.options.length >= 2) {
    const opciones = (q.options || []).map((o, i) => `${String.fromCharCode(65 + i)}) ${limpio(o.text)}`);
    const correctas = (q.options || []).map((o, i) => (o.isCorrect ? i : -1)).filter((i) => i !== -1);
    const marcadas = Array.isArray(respuesta) ? respuesta : [];
    acierto = correctas.length > 0 && marcadas.length === correctas.length && correctas.every((i) => marcadas.includes(i));
    correcta = correctas.map((i) => limpio(q.options?.[i]?.text)).filter(Boolean).join(' / ');
    delEstudiante = marcadas.length ? marcadas.map((i) => limpio(q.options?.[i]?.text)).filter(Boolean).join(' / ') : '(en blanco)';
    extra = { opciones: opciones.join('; ') };
  } else if (tipo === 'order') {
    const esperado = (q.words || []).map(limpio).join(' ');
    const dado = (Array.isArray(respuesta) ? respuesta : []).map(limpio).join(' ');
    acierto = !!esperado && normalizarComparacion(dado) === normalizarComparacion(esperado);
    correcta = esperado;
    delEstudiante = dado || '(en blanco)';
  } else if (tipo === 'match') {
    const pares = q.pairs || [];
    const elegidas = respuesta && typeof respuesta === 'object' ? respuesta : {};
    const aciertos = pares.filter((p, i) => normalizarComparacion(elegidas[i]) === normalizarComparacion(p.right)).length;
    acierto = pares.length > 0 && aciertos === pares.length;
    correcta = pares.map((p) => `${limpio(p.left)} -> ${limpio(p.right)}`).join('; ');
    delEstudiante = pares.map((p, i) => `${limpio(p.left)} -> ${limpio(elegidas[i]) || '(sin elegir)'}`).join('; ');
    extra = { parcial: aciertos };
  } else {
    const validas = [q?.correctAnswer, ...(Array.isArray(q?.acceptedAnswers) ? q.acceptedAnswers : [])].map(normalizarComparacion).filter(Boolean);
    const dada = normalizarComparacion(respuesta);
    acierto = validas.length > 0 && validas.includes(dada);
    correcta = limpio(q?.correctAnswer) + (Array.isArray(q?.acceptedAnswers) && q.acceptedAnswers.length ? ` (tambien vale: ${q.acceptedAnswers.map(limpio).join(', ')})` : '');
    delEstudiante = limpio(respuesta) || '(en blanco)';
  }

  return { tipo, esAudio: false, enunciado, correcta, delEstudiante, acierto, ...extra };
}

/**
 * Arma el prompt. SIEMPRE en espanol (para que todos los estudiantes entiendan).
 */
export function construirPromptFeedback({ titulo = '', items = [] }) {
  const lineas = items.map((it, i) => {
    if (it.esAudio) {
      return [
        `${i + 1}) [RESPUESTA GRABADA (audio)] Consigna: ${it.enunciado || '(sin consigna)'}`,
        `   El estudiante respondio grabando su voz (la profesora lo califica escuchando).`,
      ].join('\n');
    }
    const estado = it.acierto ? 'CORRECTA' : 'INCORRECTA';
    const parcial = Number.isFinite(it.parcial) && it.parcial > 0 && !it.acierto ? ` (acerto ${it.parcial} de las parejas)` : '';
    return [
      `${i + 1}) [${estado}${parcial}] Enunciado: ${it.enunciado || '(sin enunciado)'}`,
      it.opciones ? `   Opciones: ${it.opciones}` : '',
      it.correcta ? `   Respuesta correcta: ${it.correcta}` : '',
      `   Respondio el estudiante: ${it.delEstudiante}`,
    ].filter(Boolean).join('\n');
  });

  return [
    'Eres un docente de idiomas que da retroalimentacion breve, clara y muy motivadora a sus estudiantes.',
    titulo ? `Evaluacion: "${titulo}"` : '',
    'IMPORTANTE: escribe SIEMPRE en ESPANOL (asi todos los estudiantes entienden), aunque la pregunta este en otro idioma.',
    'Para cada pregunta escribe maximo 2 oraciones: por que esta bien o cual fue el error y cual era la respuesta correcta.',
    'Usa un tono amable y cercano. Nunca regañes ni uses palabras duras.',
    'Devuelve UNICAMENTE un arreglo JSON valido, sin texto antes ni despues, sin bloques de codigo:',
    '[{"i":1,"explicacion":"...","trampa":"...","porQueOpciones":["..."],"opcionesJuego":[{"texto":"...","esCorrecta":true,"feedback":"..."},{"texto":"...","esCorrecta":false,"feedback":"..."},{"texto":"...","esCorrecta":false,"feedback":"..."}]},{"i":2,"explicacion":"..."}]',
    'Reglas por tipo:',
    '- Si la respuesta fue CORRECTA: refuerza por que esta bien y da una pista corta para recordarlo.',
    '- Si fue INCORRECTA o quedo en blanco: explica el error, por que las otras opciones no iban y por que la respuesta correcta es la correcta.',
    '- Si acerto solo una parte (relacionar): reconoce lo que hizo bien y aclara lo que falto.',
    '- Si la pregunta es de RESPUESTA GRABADA (audio): NO puedes oirla; explica en español que debia incluir una buena respuesta y da un ejemplo breve y util.',
    '- En "trampa" y "opcionesJuego": crea un minijuego corto para esa pregunta que intente confundir al estudiante con 2 afirmaciones trampa (esCorrecta:false) y 1 afirmacion verdadera (esCorrecta:true) que explique por que las otras opciones no iban y por que la correcta es la correcta.',
    '- Usa solo la informacion de la pregunta; no inventes datos.',
    '- Texto plano: sin asteriscos, sin etiquetas y sin markdown.',
    '- Escribe como un docente humano: nunca menciones que eres una IA, ni la tecnologia que usas; jamas escribas "como IA" ni "inteligencia artificial".',
    '',
    'Preguntas:',
    ...lineas,
    '',
    'Responde solo con el JSON.',
  ].filter(Boolean).join('\n');
}

/** Quita cualquier mencion a que la explicacion viene de una IA (el estudiante no debe saberlo). */
export function limpiarMencionIA(texto) {
  const t = String(texto == null ? '' : texto);
  if (!t) return '';
  const mencion = /(inteligencia artificial|modelo de lenguaje|asistente virtual|soy (una )?ia\b|como (una )?ia\b|\bIA\b)/i;
  if (!mencion.test(t)) return t.trim();
  const partes = t.match(/[^.!?]+[.!?]*/g) || [];
  const limpias = partes.filter((p) => !mencion.test(p));
  const resultado = limpias.join(' ').replace(/\s{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
  if (resultado) return resultado;
  return t.replace(/inteligencia artificial|modelo de lenguaje|asistente virtual|\bIA\b/gi, '').replace(/\s{2,}/g, ' ').trim();
}

/** Desordena de forma deterministica una lista pequena usando una semilla de texto. */
function mezclarConSemilla(lista, semilla = '') {
  const arr = [...lista];
  let hash = 2166136261;
  const str = String(semilla || 'semilla');
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  for (let i = arr.length - 1; i > 0; i--) {
    hash ^= i + 1;
    hash = Math.imul(hash, 16777619);
    const j = Math.abs(hash) % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Construye el desglose de opciones y el minijuego interactivo ("¡No te dejes confundir!")
 * para una pregunta de cualquier tipo. Combina lo que venga de la IA con un respaldo
 * pedagogico local para que SIEMPRE funcione al instante.
 */
export function armarMinijuegoPregunta(q, respuesta, explicacion = '', minijuegoIA = null) {
  const limpio = (v, max = 320) => limpiarMencionIA(String(v == null ? '' : v).replace(/\s+/g, ' ').trim()).slice(0, max);
  const detalle = describirPregunta(q, respuesta);
  const expLimpia = limpio(explicacion, 380);
  const enunciadoCorto = (detalle.enunciado || 'esta pregunta').slice(0, 120);
  const correctaBase = limpio(q?.correctAnswer || detalle.correcta || '', 160) || 'la respuesta esperada';

  // 1) Desglose explicando por que cada opcion si o no iba
  const razonesIA = Array.isArray(minijuegoIA?.porQueOpciones) && minijuegoIA.porQueOpciones.some(Boolean)
    ? minijuegoIA.porQueOpciones.map((r) => limpio(r, 240))
    : Array.isArray(minijuegoIA?.analisisOpciones) && minijuegoIA.analisisOpciones.some((a) => a?.razon)
      ? minijuegoIA.analisisOpciones.map((a) => limpio(a?.razon, 240))
      : [];

  let analisisOpciones = [];
  if ((detalle.tipo === 'multiple' || detalle.tipo === 'listening' || detalle.tipo === 'reading') && Array.isArray(q?.options) && q.options.length >= 2) {
    const marcadas = Array.isArray(respuesta) ? respuesta : [];
    analisisOpciones = q.options.map((opt, idx) => {
      const textoOpt = limpio(opt?.text, 140) || `Opción ${idx + 1}`;
      const esCorrecta = Boolean(opt?.isCorrect);
      const elegida = marcadas.includes(idx);
      const razonIA = razonesIA[idx] || '';
      let razon = razonIA;
      if (!razon) {
        if (esCorrecta) {
          razon = expLimpia
            ? `Es la correcta: ${expLimpia}`
            : `Es la respuesta correcta porque cumple exactamente con lo pedido en «${enunciadoCorto}».`;
        } else if (elegida) {
          razon = `Elegiste «${textoOpt}», pero no iba aquí: actúa como distractor frente a la opción correcta («${detalle.correcta}»).`;
        } else {
          razon = `«${textoOpt}» no iba porque no corresponde a la forma o significado que exige el enunciado; la correcta es «${detalle.correcta}».`;
        }
      }
      return {
        etiqueta: String.fromCharCode(65 + idx),
        texto: textoOpt,
        esCorrecta,
        elegida,
        fueElegida: elegida,
        razon,
      };
    });
  } else if (detalle.tipo === 'match' && Array.isArray(q?.pairs) && q.pairs.length > 0) {
    const elegidas = respuesta && typeof respuesta === 'object' ? respuesta : {};
    analisisOpciones = q.pairs.map((p, idx) => {
      const izq = limpio(p?.left, 100);
      const der = limpio(p?.right, 100);
      const dada = limpio(elegidas[idx], 100);
      const bien = Boolean(dada && normalizarComparacion(dada) === normalizarComparacion(der));
      const razonIA = razonesIA[idx] || '';
      return {
        etiqueta: String(idx + 1),
        texto: `${izq} → ${der}`,
        esCorrecta: bien,
        elegida: Boolean(dada),
        fueElegida: Boolean(dada),
        razon: razonIA || (bien
          ? `¡Bien relacionado! «${izq}» corresponde exactamente a «${der}» y las demás opciones definían otros conceptos.`
          : `Pusiste «${dada || 'sin elegir'}», pero esa opción no iba con «${izq}» (correspondía a otro término). La pareja correcta de «${izq}» es «${der}».`),
      };
    });
  } else if (detalle.tipo === 'order') {
    if (!detalle.acierto) {
      analisisOpciones.push({
        etiqueta: '✗',
        texto: detalle.delEstudiante,
        esCorrecta: false,
        elegida: true,
        fueElegida: true,
        razon: razonesIA[0] || `Este orden («${detalle.delEstudiante}») no iba porque altera la estructura gramatical de la oración.`,
      });
    }
    analisisOpciones.push({
      etiqueta: '✓',
      texto: detalle.correcta,
      esCorrecta: true,
      elegida: detalle.acierto,
      fueElegida: detalle.acierto,
      razon: (!detalle.acierto ? razonesIA[1] : razonesIA[0]) || expLimpia || `El orden correcto es «${detalle.correcta}» respetando la secuencia de sujeto, verbo y complemento.`,
    });
  } else if (!detalle.esAudio) {
    if (!detalle.acierto) {
      analisisOpciones.push({
        etiqueta: '✗',
        texto: detalle.delEstudiante,
        esCorrecta: false,
        elegida: true,
        fueElegida: true,
        razon: razonesIA[0] || `Tu respuesta («${detalle.delEstudiante}») no iba en este contexto porque se requería «${correctaBase}».`,
      });
    }
    analisisOpciones.push({
      etiqueta: '✓',
      texto: detalle.correcta || correctaBase,
      esCorrecta: true,
      elegida: Boolean(detalle.acierto),
      fueElegida: Boolean(detalle.acierto),
      razon: (!detalle.acierto ? razonesIA[1] : razonesIA[0]) || expLimpia || `«${correctaBase}» es la respuesta correcta que completa adecuadamente el enunciado.`,
    });
  }

  // 2) Explicacion general garantizada (IA o respaldo inmediato claro)
  let explicacionGeneral = expLimpia;
  if (!explicacionGeneral) {
    if (detalle.esAudio) {
      explicacionGeneral = `En esta pregunta de voz debías responder con claridad a «${enunciadoCorto}» usando vocabulario y pronunciación adecuados.`;
    } else if (detalle.acierto) {
      explicacionGeneral = `¡Muy bien! «${detalle.correcta}» es la respuesta correcta para «${enunciadoCorto}», mientras que las demás opciones no cumplían lo pedido.`;
    } else if (detalle.parcial > 0) {
      explicacionGeneral = `Acertaste ${detalle.parcial} de las parejas. Revisa las que se cruzaron: la relación correcta completa es ${detalle.correcta}.`;
    } else {
      explicacionGeneral = `Tu respuesta fue «${detalle.delEstudiante}», pero no iba en este caso. La respuesta correcta es «${detalle.correcta}» porque se ajusta a lo que pide la pregunta.`;
    }
  }

  // 3) Minijuego interactivo que intenta confundir al estudiante
  let preguntaTrampa = limpio(minijuegoIA?.trampa || minijuegoIA?.preguntaTrampa, 280);
  let opcionesIA = Array.isArray(minijuegoIA?.opcionesJuego || minijuegoIA?.opciones)
    ? (minijuegoIA.opcionesJuego || minijuegoIA.opciones)
        .map((o) => ({
          texto: limpio(o?.texto || o?.text, 240),
          esCorrecta: Boolean(o?.esCorrecta ?? o?.correcta ?? o?.isCorrect),
          feedback: limpio(o?.feedback || o?.porQue || o?.razon, 260),
        }))
        .filter((o) => o.texto)
    : [];

  const tieneValidaIA = opcionesIA.length >= 2 && opcionesIA.some((o) => o.esCorrecta) && opcionesIA.some((o) => !o.esCorrecta);
  const yaVenianMezcladas = Boolean(minijuegoIA?.yaMezclado && tieneValidaIA);

  if (!tieneValidaIA) {
    if (detalle.esAudio) {
      preguntaTrampa = preguntaTrampa || `¡Reto anti-confusión! Para responder bien a «${enunciadoCorto}», ¿cuál de estas estrategias es la correcta y por qué las otras dos no funcionan?`;
      opcionesIA = [
        {
          texto: 'Responder directamente a la consigna con oraciones completas y ejemplos claros del tema.',
          esCorrecta: true,
          feedback: '¡Exacto! No te dejaste confundir: responder con oraciones completas sobre la consigna es lo que demuestra dominio del tema.',
        },
        {
          texto: 'Decir palabras sueltas sin verbo ni relación con la pregunta porque solo importa hablar rápido.',
          esCorrecta: false,
          feedback: '¡Trampa! Hablar sin estructura ni relación con la consigna no responde la pregunta. Intenta de nuevo.',
        },
        {
          texto: 'Repetir el enunciado exactamente igual sin agregar ninguna respuesta propia.',
          esCorrecta: false,
          feedback: '¡Casi caes en la trampa! Solo repetir la pregunta no cuenta como respuesta. Elige otra opción.',
        },
      ];
    } else if (detalle.tipo === 'match' && Array.isArray(q?.pairs) && q.pairs.length > 0) {
      const elegidas = respuesta && typeof respuesta === 'object' ? respuesta : {};
      const idxFallo = q.pairs.findIndex((p, i) => normalizarComparacion(elegidas[i]) !== normalizarComparacion(p?.right));
      const idxFoco = idxFallo >= 0 ? idxFallo : 0;
      const parFoco = q.pairs[idxFoco] || q.pairs[0];
      const izqFoco = limpio(parFoco?.left, 80) || 'el concepto';
      const derFoco = limpio(parFoco?.right, 100) || 'su definición correcta';
      const dadaFoco = limpio(elegidas[idxFoco], 100);
      const otroPar = q.pairs.find((_, i) => i !== idxFoco) || q.pairs[0];
      const distractorDer = (dadaFoco && normalizarComparacion(dadaFoco) !== normalizarComparacion(derFoco))
        ? dadaFoco
        : (limpio(otroPar?.right, 100) || 'otra definición');

      preguntaTrampa = preguntaTrampa || (
        idxFallo >= 0
          ? `¡Cuidado, intentaremos confundirte! Al relacionar «${izqFoco}», ¿por qué la opción «${distractorDer}» NO iba ahí y por qué la pareja correcta es «${derFoco}»?`
          : `¡Reto anti-confusión! Si alguien intenta confundirte diciendo que «${izqFoco}» debía unirse con «${distractorDer}», ¿por qué esa opción NO iba y por qué la correcta es «${derFoco}»?`
      );

      opcionesIA = [
        {
          texto: expLimpia
            ? `${expLimpia} Por eso «${izqFoco}» va únicamente con «${derFoco}» y no con «${distractorDer}».`
            : `Porque «${derFoco}» define con exactitud a «${izqFoco}», mientras que «${distractorDer}» corresponde a otro término de la columna.`,
          esCorrecta: true,
          feedback: `¡Excelente, no caíste en la trampa! Tienes claro por qué «${izqFoco}» se une con «${derFoco}» y por qué «${distractorDer}» no iba ahí.`,
        },
        {
          texto: `En realidad «${izqFoco}» podía unirse tanto con «${distractorDer}» como con «${derFoco}» porque ambas expresan la misma idea.`,
          esCorrecta: false,
          feedback: `¡Caíste en la trampa! Te intentamos confundir: «${distractorDer}» define a otro concepto distinto. La pareja correcta de «${izqFoco}» es «${derFoco}». ¡Prueba otra opción!`,
        },
        {
          texto: `«${derFoco}» era un distractor sobrante y la relación principal de «${izqFoco}» siempre era «${distractorDer}».`,
          esCorrecta: false,
          feedback: `¡Trampa detectada! Esa afirmación buscaba hacerte dudar: «${derFoco}» sí es la definición exacta de «${izqFoco}». ¡Intenta de nuevo!`,
        },
      ];
    } else if ((detalle.tipo === 'multiple' || detalle.tipo === 'listening' || detalle.tipo === 'reading') && Array.isArray(q?.options) && q.options.length >= 2) {
      const textosOpciones = q.options.map((o) => limpio(o?.text, 80).toLowerCase());
      const esVF = q.options.length === 2 && textosOpciones.includes('verdadero') && textosOpciones.includes('falso');
      const incorrectas = q.options.filter((o) => !o?.isCorrect).map((o) => limpio(o?.text, 100)).filter(Boolean);
      const distractorElegido = !detalle.acierto && detalle.delEstudiante !== '(en blanco)' ? detalle.delEstudiante : (incorrectas[0] || 'otra opción');
      const otroDistractor = incorrectas.find((t) => t !== distractorElegido) || incorrectas[0] || 'las demás opciones';

      if (esVF) {
        preguntaTrampa = preguntaTrampa || `¡Reto anti-confusión! Alguien intenta hacerte dudar diciendo que la afirmación era «${distractorElegido}» en lugar de «${detalle.correcta}». ¿Por qué «${distractorElegido}» NO iba y por qué «${detalle.correcta}» es la respuesta correcta?`;
        opcionesIA = [
          {
            texto: expLimpia
              ? `${expLimpia} Por eso la respuesta correcta es «${detalle.correcta}» y descartamos «${distractorElegido}».`
              : `Porque lo que plantea el enunciado coincide con el concepto del tema; por eso «${detalle.correcta}» es la única opción válida y «${distractorElegido}» contradice la definición.`,
            esCorrecta: true,
            feedback: `¡Muy bien, no te dejaste confundir! Comprendiste por qué «${detalle.correcta}» es la opción correcta y por qué «${distractorElegido}» no correspondía.`,
          },
          {
            texto: `Porque en este tipo de afirmaciones daría igual marcar «${distractorElegido}» o «${detalle.correcta}», ya que ambas dicen lo mismo.`,
            esCorrecta: false,
            feedback: `¡Caíste en la trampa! «${distractorElegido}» y «${detalle.correcta}» son opuestos; aquí la única respuesta válida es «${detalle.correcta}». ¡Inténtalo de nuevo!`,
          },
          {
            texto: `La respuesta debía ser «${distractorElegido}» porque el enunciado contiene una excepción oculta que invierte toda la regla.`,
            esCorrecta: false,
            feedback: `¡Trampa detectada! Te intentamos confundir con una excepción inexistente: la respuesta correcta es «${detalle.correcta}». ¡Prueba con otra opción!`,
          },
        ];
      } else {
        preguntaTrampa = preguntaTrampa || (
          !detalle.acierto
            ? `¡Cuidado, intentaremos confundirte! Alguien afirma que tu respuesta («${distractorElegido}») también servía igual que «${detalle.correcta}». ¿Por qué «${distractorElegido}» y las demás opciones NO iban y por qué «${detalle.correcta}» es la correcta?`
            : `¡Reto anti-confusión! Si alguien intenta confundirte diciendo que «${distractorElegido}» podía ir en lugar de «${detalle.correcta}», ¿por qué las otras opciones NO iban y solo «${detalle.correcta}» es la correcta?`
        );

        opcionesIA = [
          {
            texto: expLimpia
              ? `${expLimpia} Por eso «${detalle.correcta}» es la única correcta y «${distractorElegido}» no iba.`
              : `Porque solo «${detalle.correcta}» responde con exactitud al contexto y la regla de la pregunta, mientras que «${distractorElegido}»${otroDistractor !== distractorElegido ? ` y «${otroDistractor}»` : ''} son distractores que no aplican aquí.`,
            esCorrecta: true,
            feedback: `¡Excelente, no caíste en la trampa! Tienes totalmente claro por qué «${detalle.correcta}» es la correcta y por qué «${distractorElegido}» no iba.`,
          },
          {
            texto: `En realidad «${distractorElegido}» y «${detalle.correcta}» significan exactamente lo mismo aquí y cualquiera de las dos era válida sin diferencia.`,
            esCorrecta: false,
            feedback: `¡Caíste en la trampa! Te intentamos confundir: «${distractorElegido}» NO equivale a «${detalle.correcta}» en esta pregunta. Revisa bien y prueba otra opción.`,
          },
          {
            texto: `«${detalle.correcta}» no debía ir; la opción correcta era «${distractorElegido}» porque encaja mejor que «${otroDistractor}» en cualquier oración.`,
            esCorrecta: false,
            feedback: `¡Trampa detectada! Esa afirmación es falsa para confundirte: «${distractorElegido}» era un distractor incorrecto y la que sí va es «${detalle.correcta}». ¡Inténtalo otra vez!`,
          },
        ];
      }
    } else if (detalle.tipo === 'order') {
      const palabras = Array.isArray(q?.words) ? q.words.map((w) => limpio(w, 40)).filter(Boolean) : [];
      const ordenInvertido = palabras.length >= 2 ? [...palabras.slice(1), palabras[0]].join(' ') : 'otro orden';
      const errorMuestra = !detalle.acierto && detalle.delEstudiante !== '(en blanco)' ? detalle.delEstudiante : ordenInvertido;
      preguntaTrampa = preguntaTrampa || `¡Reto anti-confusión! Alguien te dice que ordenar la oración como «${errorMuestra}» también era válido en lugar de «${correctaBase}». ¿Por qué ese otro orden NO iba y por qué «${correctaBase}» es la estructura correcta?`;
      opcionesIA = [
        {
          texto: expLimpia
            ? `${expLimpia} Por ello el orden correcto es «${correctaBase}» y no «${errorMuestra}».`
            : `Porque la gramática de la oración exige el orden «${correctaBase}» (sujeto, verbo y complemento), mientras que «${errorMuestra}» rompe la estructura sintáctica.`,
          esCorrecta: true,
          feedback: `¡Genial, no te dejaste confundir! Comprendiste por qué «${correctaBase}» es el orden correcto y por qué «${errorMuestra}» no funcionaba.`,
        },
        {
          texto: `El orden de las palabras no altera la gramática aquí, así que «${errorMuestra}» y «${correctaBase}» son igual de correctas.`,
          esCorrecta: false,
          feedback: `¡Caíste en la trampa! En este idioma el orden de sujeto, verbo y complemento sí importa: la secuencia correcta es «${correctaBase}». ¡Prueba otra opción!`,
        },
        {
          texto: `«${correctaBase}» tiene el verbo en posición incorrecta y siempre debía escribirse «${errorMuestra}».`,
          esCorrecta: false,
          feedback: `¡Cuidado, era una trampa para hacerte dudar! La estructura gramatical correcta es «${correctaBase}». ¡Inténtalo de nuevo!`,
        },
      ];
    } else {
      const errorMuestra = !detalle.acierto && detalle.delEstudiante !== '(en blanco)' ? detalle.delEstudiante : 'una forma diferente';
      preguntaTrampa = preguntaTrampa || `¡Reto anti-confusión! Imagina que alguien te dice que poner «${errorMuestra}» daba exactamente lo mismo que «${correctaBase}». ¿Por qué esa opción NO iba y por qué «${correctaBase}» es la correcta?`;
      opcionesIA = [
        {
          texto: expLimpia
            ? `${expLimpia} Por ello la forma correcta es «${correctaBase}» y no «${errorMuestra}».`
            : `Porque la estructura y el significado de la pregunta exigen específicamente «${correctaBase}», mientras que «${errorMuestra}» cambia el sentido o incumple la regla del tema.`,
          esCorrecta: true,
          feedback: `¡Genial, no te dejaste confundir! Comprendiste por qué «${correctaBase}» es la respuesta correcta y por qué otra forma no iba.`,
        },
        {
          texto: `Da exactamente igual escribir «${errorMuestra}» o «${correctaBase}», porque en este tema cualquier palabra o forma verbal significa lo mismo.`,
          esCorrecta: false,
          feedback: `¡Caíste en la trampa! Te intentamos confundir: «${errorMuestra}» no cumple lo que pide la pregunta. La respuesta correcta es «${correctaBase}». ¡Prueba otra opción!`,
        },
        {
          texto: `«${correctaBase}» es una excepción incorrecta y siempre debía ponerse «${errorMuestra}» sin importar lo que diga el enunciado.`,
          esCorrecta: false,
          feedback: `¡Cuidado, era una trampa! El enunciado pide específicamente «${correctaBase}». No te dejes engañar e intenta de nuevo.`,
        },
      ];
    }
  } else {
    preguntaTrampa = preguntaTrampa || `¡Reto anti-confusión! Descubre cuál es la explicación verdadera de por qué «${detalle.correcta || correctaBase}» es la correcta y por qué las otras opciones no iban:`;
    opcionesIA = opcionesIA.map((o) => ({
      ...o,
      feedback: o.feedback || (o.esCorrecta
        ? `¡Excelente, no caíste en la trampa! Entendiste por qué «${detalle.correcta || correctaBase}» es la correcta y por qué las demás no iban.`
        : `¡Cuidado, caíste en la trampa! Esa opción buscaba confundirte. La respuesta correcta de la pregunta es «${detalle.correcta || correctaBase}». ¡Intenta con otra opción!`),
    }));
  }

  const baseOpciones = yaVenianMezcladas
    ? opcionesIA
    : mezclarConSemilla(opcionesIA, `${detalle.enunciado}-${detalle.correcta}`);
  const opcionesMezcladas = baseOpciones.map((op, idx) => ({
    ...op,
    id: idx,
  }));

  return {
    acierto: detalle.acierto,
    parcial: detalle.parcial || 0,
    esAudio: detalle.esAudio,
    tipo: detalle.tipo,
    enunciado: detalle.enunciado,
    delEstudiante: detalle.delEstudiante,
    correcta: detalle.correcta,
    explicacionGeneral,
    porQueOpciones: analisisOpciones.map((a) => a.razon),
    analisisOpciones,
    preguntaTrampa,
    opcionesJuego: opcionesMezcladas,
    yaMezclado: true,
  };
}

/** Parseo defensivo: devuelve un arreglo de textos por pregunta y datos de minijuego si vienen. */
export function parsearFeedback(texto, totalPreguntas) {
  const limpio = (v, max = 400) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
  let t = String(texto || '').trim().replace(/```json/gi, '').replace(/```/g, '').trim();
  const ini = t.indexOf('[');
  const fin = t.lastIndexOf(']');
  if (ini !== -1 && fin !== -1 && fin > ini) t = t.slice(ini, fin + 1);

  let datos = null;
  try { datos = JSON.parse(t); } catch (e) {
    try { datos = JSON.parse(t.replace(/[\u201C\u201D]/g, '"').replace(/,\s*([\]}])/g, '$1')); } catch (e2) { return { ok: false, feedback: [], minijuegos: [], problemas: ['La IA no devolvio un JSON valido.'] }; }
  }
  const lista = Array.isArray(datos) ? datos : Array.isArray(datos?.feedback) ? datos.feedback : null;
  if (!lista) return { ok: false, feedback: [], minijuegos: [], problemas: ['La respuesta de la IA no traia una lista.'] };

  const total = Number(totalPreguntas) || lista.length;
  const salida = new Array(total).fill('');
  const minijuegos = new Array(total).fill(null);
  const problemas = [];
  lista.forEach((item, idx) => {
    const posicion = Number(item?.i) ? Number(item.i) - 1 : idx;
    const txt = limpio(limpiarMencionIA(typeof item === 'string' ? item : item?.explicacion || item?.feedback || item?.texto));
    if (posicion >= 0 && posicion < salida.length && txt) {
      salida[posicion] = txt;
      if (item && typeof item === 'object' && (item.trampa || item.preguntaTrampa || item.opcionesJuego || item.opciones || item.porQueOpciones || item.minijuego)) {
        const baseMj = item.minijuego && typeof item.minijuego === 'object' ? item.minijuego : item;
        minijuegos[posicion] = {
          trampa: limpio(limpiarMencionIA(baseMj.trampa || baseMj.preguntaTrampa || ''), 280),
          porQueOpciones: Array.isArray(baseMj.porQueOpciones) ? baseMj.porQueOpciones.map((x) => limpio(limpiarMencionIA(x), 240)) : [],
          opcionesJuego: Array.isArray(baseMj.opcionesJuego || baseMj.opciones)
            ? (baseMj.opcionesJuego || baseMj.opciones).map((o) => ({
                texto: limpio(limpiarMencionIA(o?.texto || o?.text || ''), 240),
                esCorrecta: Boolean(o?.esCorrecta ?? o?.correcta ?? o?.isCorrect),
                feedback: limpio(limpiarMencionIA(o?.feedback || o?.porQue || o?.razon || ''), 260),
              })).filter((o) => o.texto)
            : [],
        };
      }
    } else if (!txt) {
      problemas.push(`la explicacion ${idx + 1} vino vacia`);
    }
  });
  return { ok: salida.some(Boolean), feedback: salida, minijuegos, problemas };
}

export const FEEDBACK_BATCH_SIZE = 20;

/**
 * Genera la retroalimentacion completa (todos los tipos, en espanol) y sus minijuegos.
 * Se niega si la evaluacion NO ha vencido y NO tiene activada la retroalimentacion inmediata.
 * Cuando hay mas de 20 preguntas (hasta 100), divide la generacion en lotes de 20 para evitar
 * que el JSON de salida se trunque por limite de tokens.
 * @param {object} opciones { evaluacion, preguntas, respuestas, llamarIA, ahora }
 */
export async function generarFeedbackIA({ evaluacion, preguntas = [], respuestas = {}, llamarIA, ahora = Date.now() }) {
  const vencida = evaluacionVencida(evaluacion, ahora);
  const inmediata = tieneRetroalimentacionInmediata(evaluacion);
  if (!vencida && !inmediata) {
    return { ok: false, feedback: [], minijuegos: [], problemas: ['La explicacion estara disponible cuando cierre la evaluacion.'], vencida: false };
  }
  const items = (preguntas || []).map((q, i) => describirPregunta(q, respuestas?.[i]));
  if (items.length === 0) return { ok: false, feedback: [], minijuegos: [], problemas: ['No hay preguntas para explicar.'], vencida: vencida || inmediata };

  const feedbackFinal = new Array(items.length).fill('');
  const minijuegosIAFinal = new Array(items.length).fill(null);
  const problemasTotal = [];

  for (let offset = 0; offset < items.length; offset += FEEDBACK_BATCH_SIZE) {
    const subItems = items.slice(offset, offset + FEEDBACK_BATCH_SIZE);
    const prompt = construirPromptFeedback({ titulo: evaluacion?.title || '', items: subItems });
    try {
      const bruto = await llamarIA(prompt, 120000);
      const parsed = parsearFeedback(bruto, subItems.length);
      for (let j = 0; j < subItems.length; j++) {
        feedbackFinal[offset + j] = parsed.feedback[j] || '';
        minijuegosIAFinal[offset + j] = parsed.minijuegos?.[j] || null;
      }
      if (parsed.problemas?.length) {
        problemasTotal.push(...parsed.problemas);
      }
    } catch (err) {
      problemasTotal.push(err?.message || 'Error al generar retroalimentacion de un lote.');
    }
  }

  const minijuegosCompletos = (preguntas || []).map((q, i) =>
    armarMinijuegoPregunta(q, respuestas?.[i], feedbackFinal[i] || '', minijuegosIAFinal[i] || null)
  );
  return {
    ok: feedbackFinal.some(Boolean),
    feedback: feedbackFinal,
    minijuegos: minijuegosCompletos,
    problemas: problemasTotal,
    vencida: vencida || inmediata,
    inmediata,
  };
}

/**
 * Que evaluaciones necesitan retroalimentacion (vencidas o con retroalimentacion inmediata, con nota y sin explicacion generada).
 * Devuelve una lista ordenada (la mas reciente primero) y limitada.
 */
export function pendientesDeFeedback({ evaluaciones = [], notas = [], limite = 5, ahora = Date.now() } = {}) {
  const pendientes = [];
  (evaluaciones || []).forEach((ev) => {
    if (!puedeMostrarFeedback(ev, ahora)) return;
    const nota = (notas || []).find((g) => g?.evaluationId === ev.id);
    if (!nota) return;
    const yaTiene = Array.isArray(nota.feedbackIA) && nota.feedbackIA.some(Boolean);
    if (yaTiene) return;
    pendientes.push({ evaluacion: ev, nota });
  });
  pendientes.sort((a, b) => (Number(b.evaluacion?.createdAt) || 0) - (Number(a.evaluacion?.createdAt) || 0));
  return pendientes.slice(0, Math.max(0, limite));
}

export default generarFeedbackIA;

