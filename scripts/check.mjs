// Chequeo previo al despliegue. Si algo falla, el build se detiene y NO se publica.
// Atrapa la clase de error que tumbo la pagina una vez (una variable/componente inexistente).
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";

const ROJO = "";
const errores = [];
const avisos = [];

// ---------- 1) Marcas de conflicto sin resolver ----------
const archivos = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (!["node_modules", "dist", ".git", ".vercel"].includes(e.name)) walk(p);
    } else if (/\.(jsx?|mjs|json|css|html)$/.test(e.name)) archivos.push(p);
  }
};
for (const raiz of ["src", "api", "scripts", "public"]) if (fs.existsSync(raiz)) walk(raiz);
for (const f of fs.readdirSync(".").filter((f) => /\.(jsx?|mjs|html)$/.test(f))) archivos.push(f);

for (const f of archivos) {
  const t = fs.readFileSync(f, "utf8");
  if (/^<<<<<<< |^>>>>>>> /m.test(t)) errores.push(`Marcas de conflicto sin resolver en ${f}`);
}

// ---------- 2) Importaciones locales que no existen (export faltante) ----------
const srcFiles = [];
const walkSrc = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walkSrc(p);
    else if (/\.(jsx?|mjs)$/.test(e.name)) srcFiles.push(p);
  }
};
walkSrc("src");

const exportsOf = (text) => {
  const set = new Set();
  for (const m of text.matchAll(/export\s+(?:const|let|var|function|class|async\s+function)\s+([A-Za-z_$][\w$]*)/g)) set.add(m[1]);
  for (const m of text.matchAll(/export\s*\{([\s\S]*?)\}/g)) {
    const body = m[1].replace(/\/\/[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
    for (const part of body.split(",")) {
      const t = part.trim();
      if (!t) continue;
      const as = t.match(/\bas\s+([A-Za-z_$][\w$]*)/);
      const name = (as ? as[1] : t.replace(/^type\s+/, "")).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) set.add(name);
    }
  }
  if (/export\s+default/.test(text)) set.add("default");
  return set;
};

const importStatements = (text) => {
  const out = [];
  let buf = null;
  for (const line of text.split("\n")) {
    if (buf === null && /^\s*import\b/.test(line)) buf = line;
    else if (buf !== null) buf += " " + line;
    else continue;
    if (/from\s*['"][^'"]+['"]/.test(buf) || /^\s*import\s*['"][^'"]+['"]/.test(buf)) {
      out.push(buf);
      buf = null;
    } else if (buf.length > 4000) buf = null;
  }
  return out;
};

for (const f of srcFiles) {
  const text = fs.readFileSync(f, "utf8");
  for (const stmt of importStatements(text)) {
    const m = stmt.match(/from\s*['"]([^'"]+)['"]/) || stmt.match(/import\s*['"]([^'"]+)['"]/);
    if (!m || !m[1].startsWith(".")) continue;
    const spec = m[1];
    let target = path.resolve(path.dirname(f), spec);
    if (!fs.existsSync(target)) {
      for (const ext of [".js", ".jsx", "/index.js", "/index.jsx"]) if (fs.existsSync(target + ext)) { target += ext; break; }
    }
    if (!fs.existsSync(target) || !/\.(jsx?|mjs)$/.test(target)) continue;
    const exp = exportsOf(fs.readFileSync(target, "utf8"));
    const named = stmt.match(/\{([^}]*)\}/);
    if (!named) continue;
    for (const part of named[1].split(",")) {
      const id = part.trim().split(/\s+as\s+/)[0].trim();
      if (!/^[A-Za-z_$][\w$]*$/.test(id)) continue;
      if (!exp.has(id)) errores.push(`${f}: importa "${id}" desde ${spec}, pero ese archivo no lo exporta`);
    }
  }
}

// ---------- 3) ESLint: variables/componentes que no existen ----------
const eslint = new ESLint({ cwd: process.cwd() });
const resultados = await eslint.lintFiles(["src/**/*.{js,jsx}"]);
for (const r of resultados) {
  for (const msg of r.messages) {
    const linea = `${r.filePath.replace(process.cwd() + path.sep, "")}:${msg.line || 0}: ${msg.message} (${msg.ruleId})`;
    if (msg.severity === 2) errores.push(linea);
    else avisos.push(linea);
  }
}

// ---------- Resultado ----------
if (avisos.length) {
  console.log(`\nAvisos (${avisos.length}):`);
  for (const a of avisos.slice(0, 25)) console.log("  ! " + a);
}
if (errores.length) {
  console.error(`\nCHEQUEO FALLIDO (${errores.length} problemas):`);
  for (const e of errores.slice(0, 60)) console.error("  x " + e);
  console.error("\nCorrige esto antes de publicar (el build se detuvo a proposito).\n");
  process.exit(1);
}
console.log(`\nChequeo OK: ${srcFiles.length} archivos, sin errores.\n`);
