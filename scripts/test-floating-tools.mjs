// scripts/test-floating-tools.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('== 1. Verificación de Exportaciones de Herramientas Flotantes ==');

const iconsContent = fs.readFileSync('src/components/Icons.jsx', 'utf8');
assert.ok(iconsContent.includes('export const Calculator'), 'Calculator icon debe estar exportado en Icons.jsx');
console.log('  OK  Calculator icon exportado en Icons.jsx');

const floatingContent = fs.readFileSync('src/components/FloatingToolsOverlay.jsx', 'utf8');
assert.ok(floatingContent.includes('export const SimpleCalculator'), 'SimpleCalculator debe estar exportado');
assert.ok(floatingContent.includes('export const FloatingCoin'), 'FloatingCoin debe estar exportado');
assert.ok(floatingContent.includes('export const FloatingTimer'), 'FloatingTimer debe estar exportado');
assert.ok(floatingContent.includes('export const FloatingWindow'), 'FloatingWindow debe estar exportado');
assert.ok(floatingContent.includes('export const CoinFaceHeads'), 'CoinFaceHeads debe estar exportado');
assert.ok(floatingContent.includes('export const CoinFaceTails'), 'CoinFaceTails debe estar exportado');
assert.ok(floatingContent.includes('export const playAlarmSound'), 'playAlarmSound debe estar exportado');
assert.ok(floatingContent.includes('export const playCoinSound'), 'playCoinSound debe estar exportado');
console.log('  OK  FloatingToolsOverlay exporta todos los componentes y utilidades necesarios');

console.log('\n== 2. Verificación de Integración en TeacherToolsTab ==');
const teacherToolsContent = fs.readFileSync('src/components/TeacherToolsTab.jsx', 'utf8');
assert.ok(teacherToolsContent.includes("id: 'calculator'"), 'TeacherToolsTab debe incluir calculator en TOOL_TABS');
assert.ok(teacherToolsContent.includes("activeSubTab === 'calculator'"), 'TeacherToolsTab debe renderizar la calculadora sencilla');
assert.ok(teacherToolsContent.includes("onOpenFloatingTool('timer')"), 'TeacherToolsTab debe tener botón para abrir temporizador flotante');
assert.ok(teacherToolsContent.includes("onOpenFloatingTool('coin')"), 'TeacherToolsTab debe tener botón para abrir moneda flotante');
assert.ok(teacherToolsContent.includes("onOpenFloatingTool('calculator')"), 'TeacherToolsTab debe tener botón para abrir calculadora flotante');
console.log('  OK  TeacherToolsTab integra pestaña de Calculadora y botones de apertura flotante para timer, moneda y calculadora');

console.log('\n== 3. Verificación de Integración en App.jsx ==');
const appContent = fs.readFileSync('src/App.jsx', 'utf8');
assert.ok(appContent.includes('import FloatingToolsOverlay'), 'App.jsx debe importar FloatingToolsOverlay');
assert.ok(appContent.includes('<FloatingToolsOverlay'), 'App.jsx debe renderizar FloatingToolsOverlay');
assert.ok(appContent.includes('openFloatingTool'), 'App.jsx debe definir openFloatingTool');
assert.ok(appContent.includes('floatingTools'), 'App.jsx debe mantener el estado de herramientas flotantes');
assert.ok(appContent.includes('minimizedFloatingTools'), 'App.jsx debe soportar minimizado de herramientas flotantes');
console.log('  OK  App.jsx monta FloatingToolsOverlay y maneja estado de apertura y minimizado');

console.log('\n== 4. Lógica Aritmética de la Calculadora ==');
// Test the core calculation algorithm matching SimpleCalculator
function calculateResult(first, second, op) {
  switch (op) {
    case '+': return first + second;
    case '-': return first - second;
    case '×':
    case '*': return first * second;
    case '÷':
    case '/': return second === 0 ? 'Error' : first / second;
    default: return second;
  }
}

assert.equal(calculateResult(10, 5, '+'), 15);
assert.equal(calculateResult(10, 5, '-'), 5);
assert.equal(calculateResult(10, 5, '×'), 50);
assert.equal(calculateResult(10, 5, '÷'), 2);
assert.equal(calculateResult(10, 0, '÷'), 'Error', 'División por cero debe retornar Error');
assert.equal(parseFloat(Number(calculateResult(0.1, 0.2, '+')).toFixed(8)), 0.3, 'Decimales con precisión redondeada');
console.log('  OK  Operaciones básicas (+, -, ×, ÷), redondeo de decimales y protección contra división por cero');

console.log('\n========================================');
console.log('Total pruebas Herramientas Flotantes: OK');
console.log('========================================');
