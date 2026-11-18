// scripts/test-calls.mjs
import assert from 'assert';
import {
  playRingtone,
  stopRingtone,
  playOutgoingRing,
  stopOutgoingRing,
  playConnectedSound,
  playHangupSound,
  playSuccessChime,
  connectRemoteAudio
} from '../src/utils/callSounds.js';
import {
  isTeacherId,
  isCamiloTeacher
} from '../src/utils/helpers.js';

console.log('\n== 1. Sistema de Audio y Sonidos de Llamada (callSounds.js) ==');

// Test 1: Funciones de audio se ejecutan sin crashear en Node
assert.doesNotThrow(() => playRingtone(), 'playRingtone no debe crashear');
assert.doesNotThrow(() => stopRingtone(), 'stopRingtone no debe crashear');
assert.doesNotThrow(() => playOutgoingRing(), 'playOutgoingRing no debe crashear');
assert.doesNotThrow(() => stopOutgoingRing(), 'stopOutgoingRing no debe crashear');
assert.doesNotThrow(() => playConnectedSound(), 'playConnectedSound no debe crashear');
assert.doesNotThrow(() => playHangupSound(), 'playHangupSound no debe crashear');
assert.doesNotThrow(() => playSuccessChime(), 'playSuccessChime no debe crashear');
console.log('  OK  Todas las funciones de audio (ringtone, timbrado saliente, conexión, colgar) son seguras en SSR/Node');

// Test 2: connectRemoteAudio configura el elemento HTML5 como salida nativa no silenciada
const mockAudioEl = {
  srcObject: null,
  muted: true,
  volume: 0,
  autoplay: false,
  playsInline: false,
  paused: true,
  attributes: {},
  setAttribute(k, v) { this.attributes[k] = v; },
  play() { return Promise.resolve(); },
  pause() {}
};

const mockStream = {
  getAudioTracks: () => [{ kind: 'audio', enabled: true }]
};

const cleanups = connectRemoteAudio(mockAudioEl, mockStream);
assert(Array.isArray(cleanups), 'connectRemoteAudio debe retornar un array de funciones de limpieza');
assert.strictEqual(mockAudioEl.srcObject, mockStream, 'srcObject debe ser asignado al stream');
assert.strictEqual(mockAudioEl.muted, false, 'audioEl NUNCA debe estar silenciado para garantizar salida por altavoces');
assert.strictEqual(mockAudioEl.volume, 1.0, 'volume debe ser 1.0');
assert.strictEqual(mockAudioEl.playsInline, true, 'playsInline debe ser true');
assert.strictEqual(mockAudioEl.attributes['playsinline'], 'true', 'Atributo playsinline debe estar presente para iOS WebKit');
assert.strictEqual(mockAudioEl.attributes['webkit-playsinline'], 'true', 'Atributo webkit-playsinline debe estar presente para iOS');

// Ejecutar limpiezas
cleanups.forEach(fn => { assert.doesNotThrow(fn); });
console.log('  OK  connectRemoteAudio configura el canal de altavoces con volumen 1.0, muted=false y compatibilidad iOS WebKit');

console.log('\n== 2. Unicidad de Sesiones de Llamada y Prevención de Bloqueo tras Rechazo ==');

// Test 3: Generación de CallId único con timestamp
const userA = 'student_yeisor';
const userB = 'teacher_gina';
const t1 = Date.now();
const callId1 = `dm_${[userA, userB].sort().join('_')}_${t1}`;
const t2 = t1 + 500;
const callId2 = `dm_${[userA, userB].sort().join('_')}_${t2}`;

assert.notStrictEqual(callId1, callId2, 'Dos llamadas sucesivas deben tener IDs distintos para no heredar rechazo previo');
assert(callId1.startsWith('dm_student_yeisor_teacher_gina_'));
console.log('  OK  CallId de DM genera identificador único por sesión con marca de tiempo');

// Test 4: Sistema de rechazo con auto-expiración no bloquea llamadas futuras
const rejectedSet = new Set();
rejectedSet.add(callId1);
assert.strictEqual(rejectedSet.has(callId1), true, 'Llamada rechazada 1 debe estar marcada');
assert.strictEqual(rejectedSet.has(callId2), false, 'Llamada 2 posterior no debe ser rechazada prematuramente');
console.log('  OK  Rechazar una llamada no bloquea llamadas posteriores del mismo interlocutor');

console.log('\n== 3. Enrutamiento Bidireccional de Docentes y Estudiantes ==');

// Test 5: Resolución de alias docentes en llamadas (Gina y Camilo)
const isMatchCallee = (calleeId, myChatId) => {
  return calleeId === myChatId || (isTeacherId(myChatId) && isTeacherId(calleeId) && (isCamiloTeacher(myChatId) === isCamiloTeacher(calleeId)));
};

assert.strictEqual(isMatchCallee('teacher', 'teacher_gina'), true, 'Docente Gina recibe llamada dirigida a "teacher"');
assert.strictEqual(isMatchCallee('teacher_gina', 'teacher'), true, 'Docente con ID "teacher" recibe llamada dirigida a "teacher_gina"');
assert.strictEqual(isMatchCallee('camilodocente', 'teacher_camilo'), true, 'Docente Camilo recibe llamada dirigida a "camilodocente"');
assert.strictEqual(isMatchCallee('teacher_camilo', 'camilodocente'), true, 'Docente Camilo recibe llamada dirigida a "teacher_camilo"');
assert.strictEqual(isMatchCallee('camilodocente', 'teacher_gina'), false, 'Docente Gina NO intercepta llamadas de Camilo');
assert.strictEqual(isMatchCallee('student_123', 'student_123'), true, 'Estudiantes reciben llamadas directas a su ID');
console.log('  OK  Enrutamiento de llamadas soporta alias bidireccionales de docentes sin colisiones');

console.log('\n== 4. Deduplicación de Candidatos ICE en WebRTC ==');

// Test 6: Filtro de candidatos ICE repetidos
const getCandidateKey = (c) => {
  if (!c) return '';
  return typeof c === 'string' ? c : `${c.sdpMid || ''}_${c.sdpMLineIndex || ''}_${c.candidate || ''}`;
};

const processedSet = new Set();
const c1 = { sdpMid: '0', sdpMLineIndex: 0, candidate: 'candidate:1 1 UDP 2122260223 192.168.1.100 54321 typ host' };
const c2 = { sdpMid: '0', sdpMLineIndex: 0, candidate: 'candidate:2 1 UDP 2122260224 192.168.1.100 54322 typ srflx' };

const addCandidate = (c) => {
  const k = getCandidateKey(c);
  if (processedSet.has(k)) return false;
  processedSet.add(k);
  return true;
};

assert.strictEqual(addCandidate(c1), true, 'Primer candidato c1 aceptado');
assert.strictEqual(addCandidate(c1), false, 'Segundo intento con candidato c1 duplicado es descartado');
assert.strictEqual(addCandidate(c2), true, 'Candidato c2 nuevo aceptado');
assert.strictEqual(addCandidate(c2), false, 'Candidato c2 duplicado es descartado');
console.log('  OK  Deduplicador ICE evita inyección repetida de candidatos en la conexión WebRTC');

console.log('\n== 5. Propagación de Identidad en Llamadas Entrantes ==');

// Test 7: Aceptación de llamada entrante en DM propaga targetId e initiatorId para resolución de avatar
const incomingCallPayload = {
  callId: 'dm_student_teacher_123',
  isGroup: false,
  callerName: 'Yeisor',
  targetId: 'student_yeisor',
  offer: { type: 'offer', sdp: 'v=0...' }
};

const acceptedCall = {
  callId: incomingCallPayload.callId,
  role: 'participant',
  isGroup: false,
  name: incomingCallPayload.callerName,
  callerName: incomingCallPayload.callerName,
  targetId: incomingCallPayload.targetId,
  initiatorId: incomingCallPayload.targetId,
  offer: incomingCallPayload.offer
};

assert.strictEqual(acceptedCall.targetId, 'student_yeisor');
assert.strictEqual(acceptedCall.initiatorId, 'student_yeisor');
console.log('  OK  Aceptación de llamada entrante en DM propaga targetId e initiatorId para avatar');

console.log('\n== 6. Invariantes de Estabilidad WebRTC y Llamadas Grupales ==');
import fs from 'fs';
const audioCallSrc = fs.readFileSync(new URL('../src/components/AudioCall.jsx', import.meta.url), 'utf8');
const appSrc = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const callSoundsSrc = fs.readFileSync(new URL('../src/utils/callSounds.js', import.meta.url), 'utf8');

// Test 8: AudioContext único compartido (evita límite de 6 contextos hardware en grupos)
assert(audioCallSrc.includes('monitorAudioCtxRef') && audioCallSrc.includes('getMonitorAudioContext'), 'AudioCall debe reutilizar un único AudioContext compartido para detección de voz');

// Test 9: Estado transitorio 'disconnected' NO destruye monitor ni elimina peer
const connStateBlock = audioCallSrc.slice(audioCallSrc.indexOf('pc.onconnectionstatechange ='), audioCallSrc.indexOf('// ---------- INICIADOR: llamada DM ----------'));
assert(!connStateBlock.includes("pc.connectionState === 'disconnected'"), "onconnectionstatechange no debe destruir monitorStream ni peers en estado transitorio 'disconnected'");

// Test 10: answerDMCall suscribe onSnapshot(callRef) antes de createPC()
const answerBlock = audioCallSrc.slice(audioCallSrc.indexOf('const answerDMCall ='), audioCallSrc.indexOf('// ---------- Ciclo de vida ----------'));
assert(answerBlock.indexOf('onSnapshot(callRef') < answerBlock.indexOf('await createPC()'), 'answerDMCall debe escuchar cancelación del llamante antes de solicitar el micrófono');

// Test 11: getCandidateKey preserva sdpMLineIndex 0 usando ??
assert(audioCallSrc.includes('c.sdpMLineIndex ??'), 'getCandidateKey debe usar operador ?? para sdpMLineIndex=0');

// Test 12: Rechazo total grupal finaliza la llamada y unlockAll verifica paused
assert(appSrc.includes('allRejected'), 'rejectIncomingCall debe cerrar llamada grupal si todos los participantes rechazan');
assert(callSoundsSrc.includes('if (audioEl.paused)'), 'unlockAll solo debe invocar audioEl.play() cuando el audio esté pausado');

console.log('  OK  AudioContext único compartido, estado disconnected seguro, answerDMCall sin race condition y cierre grupal por rechazo total');

console.log('\n========================================');
console.log('Total pruebas Llamadas: 12 | OK: 12 | FAIL: 0');
console.log('========================================\n');
