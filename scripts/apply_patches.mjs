import fs from 'fs';
import path from 'path';

try {
  // 1. Patch @vitejs/plugin-legacy
  const legacyFile = path.resolve('node_modules/@vitejs/plugin-legacy/dist/index.mjs');
  if (fs.existsSync(legacyFile)) {
    let legacyCode = fs.readFileSync(legacyFile, 'utf8');
    if (!legacyCode.includes('tplLitPlugin')) {
      legacyCode = legacyCode.replace(
        'const babel2 = await loadBabel();',
        `const babel2 = await loadBabel();
      const tplLitPlugin = (await import('@babel/plugin-transform-template-literals')).default;
      const optChainPlugin = (await import('@babel/plugin-transform-optional-chaining')).default;
      const nullishPlugin = (await import('@babel/plugin-transform-nullish-coalescing-operator')).default;`
      );
      legacyCode = legacyCode.replace(
        'wrapIIFEBabelPlugin()',
        'wrapIIFEBabelPlugin(), tplLitPlugin, optChainPlugin, nullishPlugin'
      );
      fs.writeFileSync(legacyFile, legacyCode, 'utf8');
      console.log('✔ Patched @vitejs/plugin-legacy for Babel compatibility');
    }
  }

  // 2. Patch @babel/plugin-transform-optional-chaining
  const optChainFile = path.resolve('node_modules/@babel/plugin-transform-optional-chaining/lib/index.js');
  if (fs.existsSync(optChainFile)) {
    let optCode = fs.readFileSync(optChainFile, 'utf8');
    const target = `        scope.push({
          id: core.types.cloneNode(tmpVar)
        });`;
    const replacement = `        try {
          scope.push({
            id: core.types.cloneNode(tmpVar)
          });
        } catch (err) {
          (scope.getProgramParent ? scope.getProgramParent() : scope).push({
            id: core.types.cloneNode(tmpVar)
          });
        }`;
    if (!optCode.includes('catch (err) {') && optCode.includes(target)) {
      optCode = optCode.replace(target, replacement);
      fs.writeFileSync(optChainFile, optCode, 'utf8');
      console.log('✔ Patched @babel/plugin-transform-optional-chaining scope bug');
    }
  }

  // 3. Patch Vite terser worker loader in all chunk files
  const chunksDir = path.resolve('node_modules/vite/dist/node/chunks');
  if (fs.existsSync(chunksDir)) {
    for (const f of fs.readdirSync(chunksDir)) {
      if (f.endsWith('.js')) {
        const chunkPath = path.join(chunksDir, f);
        let chunkCode = fs.readFileSync(chunkPath, 'utf8');
        if (chunkCode.includes('worker ||= makeWorker();') && chunkCode.includes('outputOptions.__vite_force_terser__')) {
          const directTarget = `    async renderChunk(code, _chunk, outputOptions) {
      if (config.build.minify !== "terser" && // @ts-expect-error injected by @vitejs/plugin-legacy
      !outputOptions.__vite_force_terser__) {
        return null;
      }
      if (config.build.lib && outputOptions.format === "es") {
        return null;
      }
      worker ||= makeWorker();
      const terserPath2 = loadTerserPath(config.root);
      const res = await worker.run(terserPath2, code, {
        safari10: true,
        ...terserOptions,
        sourceMap: !!outputOptions.sourcemap,
        module: outputOptions.format.startsWith("es"),
        toplevel: outputOptions.format === "cjs"
      });
      return {
        code: res.code,
        map: res.map
      };
    },`;
          const directReplacement = `    async renderChunk(code, _chunk, outputOptions) {
      if (config.build.minify !== "terser" && // @ts-expect-error injected by @vitejs/plugin-legacy
      !outputOptions.__vite_force_terser__) {
        return null;
      }
      if (config.build.lib && outputOptions.format === "es") {
        return null;
      }
      const terser = await import("terser");
      const minifyFn = terser.minify || terser.default?.minify;
      const res = await minifyFn(code, {
        safari10: true,
        ...terserOptions,
        sourceMap: !!outputOptions.sourcemap,
        module: outputOptions.format.startsWith("es"),
        toplevel: outputOptions.format === "cjs"
      });
      return {
        code: res.code,
        map: res.map
      };
    },`;
          if (chunkCode.includes(directTarget)) {
            chunkCode = chunkCode.replace(directTarget, directReplacement);
            fs.writeFileSync(chunkPath, chunkCode, 'utf8');
            console.log('✔ Patched Vite terser direct minifier in ' + f);
          }
        }
      }
    }
  }
} catch (e) {
  console.warn('Patch script warning:', e.message);
}
