// Student / Viewer Mode & Interactive Activity Evaluators
function renderViewer() {
  const page = currentProject.pages[activePageIndex];
  if (!page) return;
  const slide = page.subSlides ? page.subSlides[activeSubSlideIndex] : null;

  // Calculate Progress Percentage
  let totalSlides = 0;
  let currentSlideProgress = 0;
  currentProject.pages.forEach((p, pIdx) => {
    const count = p.subSlides ? p.subSlides.length : 1;
    totalSlides += count;
    if (pIdx < activePageIndex) {
      currentSlideProgress += count;
    } else if (pIdx === activePageIndex) {
      currentSlideProgress += (activeSubSlideIndex + 1);
    }
  });
  const percent = Math.min(100, Math.round((currentSlideProgress / totalSlides) * 100));
  const pBar = document.getElementById('viewerProgressBar');
  const pPercent = document.getElementById('viewerProgressPercent');
  const bCrumb = document.getElementById('viewerBreadcrumb');
  
  if (pBar) pBar.style.width = percent + '%';
  if (pPercent) pPercent.innerText = percent + '%';
  if (bCrumb) bCrumb.innerText = `${page.title} ${slide && page.subSlides.length > 1 ? '• ' + slide.title : ''}`;

  // Render Viewer Left Nav
  const navContainer = document.getElementById('viewerNavList');
  if (navContainer) {
    let navHtml = '';
    currentProject.pages.forEach((p, idx) => {
      const isActive = idx === activePageIndex;
      const isCompleted = idx < activePageIndex;
      const iconName = getPageIcon(p.type);

      navHtml += `
        <button onclick="viewerSelectPage(${idx})" class="w-full text-left px-3.5 py-2.5 rounded-2xl transition flex items-center justify-between gap-2.5 text-xs font-medium ${isActive ? 'bg-brand-500 text-white font-bold shadow-md shadow-brand-500/25' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}">
          <div class="flex items-center gap-2.5 truncate">
            <i data-lucide="${iconName}" class="w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}"></i>
            <span class="truncate">${p.title}</span>
          </div>
          ${isCompleted ? '<span class="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>' : ''}
        </button>
      `;
    });
    navContainer.innerHTML = navHtml;
  }

  // Render Slide Dots
  const dotsContainer = document.getElementById('viewerSlideDots');
  if (dotsContainer) {
    if (page.subSlides && page.subSlides.length > 1) {
      dotsContainer.innerHTML = page.subSlides.map((_, sIdx) => `
        <span onclick="viewerSelectSlide(${sIdx})" class="w-2.5 h-2.5 rounded-full cursor-pointer transition ${sIdx === activeSubSlideIndex ? 'bg-brand-500 scale-125 shadow-sm' : 'bg-slate-700 hover:bg-slate-500'}"></span>
      `).join('');
    } else {
      dotsContainer.innerHTML = '';
    }
  }

  // Update Buttons State
  const isFirst = activePageIndex === 0 && activeSubSlideIndex === 0;
  const isLast = activePageIndex === currentProject.pages.length - 1 && (!page.subSlides || activeSubSlideIndex === page.subSlides.length - 1);
  const btnPrev = document.getElementById('viewerBtnPrev');
  const btnNext = document.getElementById('viewerBtnNext');

  if (btnPrev) btnPrev.disabled = isFirst;
  if (btnNext) {
    btnNext.disabled = false;
    if (isLast) {
      btnNext.innerHTML = `<span>Finalizar</span><i data-lucide="award" class="w-4 h-4"></i>`;
      btnNext.onclick = () => {
        showToast('¡Felicidades! Has completado todo el recorrido de este OVA.', 'success');
        try {
          if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
          else if (window.confetti) window.confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        } catch (e) {}
      };
    } else {
      btnNext.innerHTML = `<span>Siguiente</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
      btnNext.onclick = viewerNextSlide;
    }
  }

  // Render Main Viewer Body
  const mainCard = document.getElementById('viewerMainCard');
  if (mainCard) {
    if (page.type === 'cover') {
      let extraBlocks = '';
      if (slide && slide.blocks && slide.blocks.length > 0) {
        extraBlocks = `
          <div class="mt-8 space-y-6 pt-6 border-t border-slate-800">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Contenido Adicional</h3>
            ${renderViewerSlideContent(page, slide)}
          </div>
        `;
      }
      mainCard.innerHTML = renderViewerCover() + extraBlocks;
    } else {
      mainCard.innerHTML = renderViewerSlideContent(page, slide);
    }
  }

  renderAllKaTeX();
  if (window.lucide) lucide.createIcons();
}

function renderViewerCover() {
  const cover = currentProject.cover || {};
  const elements = (typeof ensureCoverElements === 'function') ? ensureCoverElements(cover) : (cover.elements || []);

  const elementsHtml = elements.map(el => {
    const shadowCss = (typeof getShadowCss === 'function') ? getShadowCss(el.shadow) : '0 2px 4px rgba(0,0,0,0.8)';
    const responsiveClamp = `clamp(${Math.max(9, Math.round((el.fontSize || 16) * 0.35))}px, ${((el.fontSize || 16) / 7.5).toFixed(2)}cqw, ${el.fontSize || 16}px)`;
    const customStyle = `
      position: absolute;
      left: ${el.x}%; 
      top: ${el.y}%; 
      font-family: '${el.fontFamily}', sans-serif; 
      font-size: ${responsiveClamp}; 
      color: ${el.color}; 
      font-weight: ${el.bold ? 'bold' : 'normal'}; 
      font-style: ${el.italic ? 'italic' : 'normal'}; 
      text-decoration: ${el.underline ? 'underline' : 'none'}; 
      text-shadow: ${shadowCss};
      ${el.maxWidth ? `max-width: ${el.maxWidth}%;` : ''}
    `;

    if (el.type === 'badge') {
      return `
        <div style="${customStyle}" class="z-10 select-none">
          <span class="cover-badge-text px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-500 text-white shadow-lg border border-brand-400/40 inline-block">
            ${el.text}
          </span>
        </div>
      `;
    }

    if (el.type === 'institution') {
      return `
        <div style="${customStyle}" class="z-10 select-none">
          <span class="cover-institution-text text-xs text-slate-300 font-medium px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-black/40 backdrop-blur border border-white/10 inline-block">
            ${el.text}
          </span>
        </div>
      `;
    }

    if (el.type === 'brand') {
      return `
        <div style="${customStyle}" class="z-10 select-none">
          <div class="flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-black/50 backdrop-blur border border-white/10 text-xs font-bold text-slate-200">
            <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-brand-500 animate-pulse"></span>
            <span>${el.text}</span>
          </div>
        </div>
      `;
    }

    if (el.type === 'button') {
      return `
        <div style="${customStyle}" class="z-10 select-none">
          <button onclick="viewerNextSlide()" class="cover-button-text flex items-center gap-1.5 sm:gap-2.5 px-3.5 sm:px-7 py-1.5 sm:py-3 rounded-xl sm:rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-xl shadow-brand-500/30 hover:scale-105 transition cursor-pointer">
            <span>${el.text}</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i>
          </button>
        </div>
      `;
    }

    return `
      <div style="${customStyle}" class="z-10 select-none leading-tight ${el.id === 'title' ? 'cover-title-text' : el.id === 'subtitle' ? 'cover-subtitle-text' : 'cover-free-text'}">
        ${el.text}
      </div>
    `;
  }).join('');

  return `
    <div id="viewerCoverCanvas" class="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 aspect-video text-white w-full" style="background-color: ${cover.backgroundColor || '#0f172a'};">
      <img src="${cover.backgroundImage}" alt="Cover" class="absolute inset-0 w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1600&q=80'" />
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-950/40" style="opacity: ${cover.overlayOpacity || 0.75};"></div>

      <div class="absolute inset-0 z-10 w-full h-full">
        ${elementsHtml}
      </div>
    </div>
  `;
}

function renderViewerSlideContent(page, slide) {
  if (!slide || !slide.blocks) return '';

  let blocksHtml = slide.blocks.map(block => {
    if (block.type === 'text') {
      const hasHtml = /<[a-z][\s\S]*>/i.test(block.content || '');
      return `<div class="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm md:text-base leading-relaxed ${hasHtml ? '' : 'whitespace-pre-line'}">${block.content || ''}</div>`;
    }

    if (block.type === 'divider') {
      return `<hr class="border-t-2 border-dashed border-slate-200 dark:border-slate-800 my-6" />`;
    }

    if (block.type === 'genially') {
      const gUrl = parseGeniallyEmbed(block.metadata?.url || '');
      return `
        <div class="space-y-3 my-6">
          ${block.title ? `<div class="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white"><i data-lucide="sparkles" class="w-4 h-4 text-pink-500"></i><span>${block.title}</span></div>` : ''}
          ${block.content ? `<p class="text-xs text-slate-600 dark:text-slate-400">${block.content}</p>` : ''}
          <div class="aspect-video w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-950">
            <iframe src="${gUrl}" class="w-full h-full border-0" allowfullscreen="true" allow="fullscreen"></iframe>
          </div>
        </div>
      `;
    }

    if (block.type === 'educaplay') {
      const eUrl = parseEducaplayEmbed(block.metadata?.url || '');
      return `
        <div class="space-y-3 my-6">
          ${block.title ? `<div class="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white"><i data-lucide="gamepad-2" class="w-4 h-4 text-emerald-500"></i><span>${block.title}</span></div>` : ''}
          ${block.content ? `<p class="text-xs text-slate-600 dark:text-slate-400">${block.content}</p>` : ''}
          <div class="h-[520px] w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-950">
            <iframe src="${eUrl}" class="w-full h-full border-0" allowfullscreen="true" allow="fullscreen"></iframe>
          </div>
        </div>
      `;
    }

    if (block.type === 'math') {
      return `
        <div class="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 text-center shadow-lg space-y-2">
          ${block.content ? `<p class="text-xs text-slate-400 font-medium">${block.content}</p>` : ''}
          <div class="text-xl md:text-2xl text-amber-300 font-medium py-2">
            $$${block.metadata?.latex || ''}$$
          </div>
        </div>
      `;
    }

    if (block.type === 'video') {
      const vUrl = parseYouTubeEmbed(block.metadata?.videoUrl || '');
      return `
        <div class="space-y-3">
          ${block.title ? `<h3 class="text-base font-bold text-white">${block.title}</h3>` : ''}
          ${block.content ? `<p class="text-xs text-slate-400">${block.content}</p>` : ''}
          <div class="aspect-video rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
            <iframe src="${vUrl}" class="w-full h-full" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
          </div>
        </div>
      `;
    }

    if (block.type === 'callout') {
      const type = block.metadata?.calloutType || 'info';
      const styles = {
        tip: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200',
        info: 'bg-blue-950/40 border-blue-500/40 text-blue-200',
        warning: 'bg-amber-950/40 border-amber-500/40 text-amber-200',
        success: 'bg-brand-950/40 border-brand-500/40 text-brand-200'
      };
      return `
        <div class="p-5 rounded-3xl border ${styles[type] || styles.info} space-y-2 shadow-md">
          ${block.title ? `<div class="font-bold text-sm text-white flex items-center gap-2"><i data-lucide="info" class="w-4 h-4 text-brand-400"></i><span>${block.title}</span></div>` : ''}
          <p class="text-xs md:text-sm leading-relaxed whitespace-pre-line">${block.content}</p>
        </div>
      `;
    }

    if (block.type === 'interactive_table') {
      const meta = block.metadata || {};
      return `
        <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-5" id="itable_${block.id}">
          <div>
            <h3 class="text-base font-bold text-white mb-1">${block.title || 'Actividad Práctica'}</h3>
            <p class="text-xs text-slate-400">${block.content || 'Rellena los espacios y comprueba tus resultados.'}</p>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs border border-slate-800 rounded-2xl overflow-hidden">
              <thead class="bg-slate-950 border-b border-slate-800 text-slate-300">
                <tr>
                  ${(meta.tableHeaders || []).map(h => `<th class="p-3.5 text-center font-bold">${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 bg-slate-900/60">
                ${(meta.tableRows || []).map((row, rIdx) => `
                  <tr>
                    <td class="p-3.5 text-center font-medium text-slate-200">${row.cells[0]?.value}</td>
                    <td class="p-3.5 text-center">
                      ${row.cells[1]?.isInput ? `
                        <input 
                          type="text" 
                          data-expected="${row.cells[1]?.expectedAnswer}" 
                          onkeydown="if(event.key==='Enter') checkViewerTable('${block.id}')"
                          class="itable-input w-20 text-center font-mono font-bold text-sm bg-slate-950 border-2 border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-brand-500 transition" 
                          placeholder="?" 
                        />
                      ` : `
                        <span class="font-mono font-bold text-slate-300 text-sm">${row.cells[1]?.value}</span>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <button onclick="checkViewerTable('${block.id}')" class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition">
              <i data-lucide="check" class="w-4 h-4"></i>
              <span>Comprobar Respuestas</span>
            </button>
            <div id="itable_feedback_${block.id}" class="text-xs font-bold hidden"></div>
          </div>
        </div>
      `;
    }

    if (block.type === 'quiz_multiple') {
      const questions = block.metadata?.questions || [];
      return `
        <div class="space-y-6">
          ${block.title ? `<h3 class="text-base font-bold text-white mb-2">${block.title}</h3>` : ''}
          ${questions.map((q, qIdx) => `
            <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-4" id="quizCard_${q.id}">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 rounded-md bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold">
                  Pregunta ${qIdx + 1}
                </span>
                <span class="text-xs text-slate-400">${q.title}</span>
              </div>
              <p class="text-sm font-bold text-slate-100">${q.question}</p>

              <!-- Options -->
              <div class="space-y-2.5">
                ${(q.options || []).map((opt, oIdx) => `
                  <label class="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-brand-500/60 cursor-pointer transition text-xs text-slate-300 hover:text-white group">
                    <input type="radio" name="grp_${q.id}" onchange="checkViewerQuizOption('${block.id}', ${qIdx}, ${oIdx})" class="accent-brand-500 w-4 h-4 cursor-pointer" />
                    <span class="flex-1 font-medium">${opt.text}</span>
                  </label>
                `).join('')}
              </div>

              <!-- Instant Feedback Container -->
              <div id="quizFeedback_${q.id}" class="hidden p-4 rounded-2xl text-xs font-medium leading-relaxed transition-all"></div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (block.type === 'cloze_fill') {
      const meta = block.metadata || {};
      const words = meta.wordBank || [];
      return `
        <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-5" id="cloze_${block.id}">
          <h3 class="text-base font-bold text-white">${block.title || 'Completa la Síntesis'}</h3>
          <p class="text-xs text-slate-400">${block.content || 'Escribe las palabras adecuadas en cada espacio:'}</p>

          <div class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap gap-2 items-center">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Banco de palabras (haz clic para insertar):</span>
            ${words.map(w => `<button type="button" data-word="${encodeURIComponent(w)}" onclick="insertWordIntoFirstEmptyCloze('${block.id}', decodeURIComponent(this.dataset.word))" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-brand-500/20 hover:border-brand-500/40 text-xs font-mono font-medium text-brand-300 border border-slate-700 transition">${w}</button>`).join('')}
          </div>

          <div class="text-sm text-slate-200 leading-loose bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80">
            ${renderClozeInteractiveText(meta.clozeText || '')}
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-800">
            <button onclick="checkViewerCloze('${block.id}')" class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition">
              <i data-lucide="check" class="w-4 h-4"></i>
              <span>Verificar Respuestas</span>
            </button>
            <div id="clozeFeedback_${block.id}" class="text-xs font-bold hidden"></div>
          </div>
        </div>
      `;
    }

    if (block.type === 'accordion') {
      const items = block.metadata?.accordionItems || [];
      return `
        <div class="space-y-3">
          ${block.title ? `<h3 class="text-base font-bold text-white mb-2">${block.title}</h3>` : ''}
          ${items.map((item, idx) => `
            <div class="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-md">
              <button onclick="toggleViewerAccordion(this)" class="w-full text-left p-4 flex items-center justify-between gap-3 text-xs font-bold text-slate-100 hover:text-brand-300 transition">
                <span>${item.title}</span>
                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 transition-transform"></i>
              </button>
              <div class="p-4 pt-0 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 ${idx === 0 ? '' : 'hidden'}">
                ${item.content}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (block.type === 'objectives_list') {
      const meta = block.metadata || {};
      return `
        <div class="bg-gradient-to-br from-slate-900 to-slate-950 border border-brand-500/30 rounded-3xl p-8 shadow-2xl space-y-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/40">
              <i data-lucide="target" class="w-5 h-5"></i>
            </div>
            <div>
              <h2 class="text-lg font-bold text-white">${block.title || 'Objetivos de Aprendizaje'}</h2>
              <p class="text-xs text-slate-400">Competencias que dominarás al finalizar este módulo:</p>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-xs md:text-sm font-semibold text-brand-200">
            ${meta.mainGoal || ''}
          </div>

          <div class="space-y-2.5">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Habilidades y conocimientos clave:</span>
            ${(meta.skills || []).map(skill => `
              <div class="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"></i>
                <span>${skill}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (block.type === 'credits_team') {
      const cols = block.metadata?.creditColumns || [];
      return `
        <div class="space-y-6">
          <h2 class="text-lg font-bold text-white text-center">${block.title || 'Créditos del Proyecto'}</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${cols.map(col => `
              <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4 text-center">
                <div class="text-xs font-bold uppercase tracking-wider text-brand-400 border-b border-slate-800 pb-2">
                  ${col.category}
                </div>
                <div class="space-y-3">
                  ${(col.members || []).map(m => `
                    <div>
                      <div class="text-xs font-bold text-white">${m.name}</div>
                      <div class="text-[11px] text-slate-400">${m.role}</div>
                      ${m.institution ? `<div class="text-[10px] text-brand-300/80">${m.institution}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (block.type === 'license_matrix') {
      const meta = block.metadata || {};
      return `
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 max-w-2xl mx-auto text-center">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <i data-lucide="shield-check" class="w-6 h-6"></i>
          </div>

          <div>
            <h2 class="text-lg font-bold text-white">${block.title || 'Derechos de Autor'}</h2>
            <p class="text-xs text-slate-400 mt-1">${block.content || ''}</p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div class="text-xs font-bold text-brand-400">${meta.licenseName}</div>
            <div class="text-[11px] text-slate-400">Año: ${meta.licenseYear} • Titular: ${meta.licenseHolder}</div>
          </div>

          <div class="space-y-2 text-left">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block text-center mb-3">Matriz de Permisos del OVA:</span>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              ${(meta.permissions || []).map(p => `
                <div class="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <span class="text-slate-300">${p.action}</span>
                  <span class="font-bold text-[10px] px-2.5 py-0.5 rounded-full ${p.allowed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}">
                    ${p.allowed ? 'SÍ' : 'NO'}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }).join('');

  if (page.type === 'activity' || page.id === 'page-activities') {
    return `
      <div class="document-sheet max-w-4xl mx-auto p-8 sm:p-14 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        <!-- Top Horizontal Sheet Navigation Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-slate-200 dark:border-slate-800 select-none">
          <div class="flex items-center gap-2.5">
            <span class="px-3 py-1 rounded-xl bg-brand-500 text-white font-bold text-xs shadow-sm shadow-brand-500/25">
              Hoja ${activeSubSlideIndex + 1} de ${page.subSlides ? page.subSlides.length : 1}
            </span>
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">${slide.title || 'Actividades'}</h3>
          </div>
          ${page.subSlides && page.subSlides.length > 1 ? `
          <div class="flex items-center gap-1.5 overflow-x-auto py-1">
            <button onclick="viewerSelectSlide(${Math.max(0, activeSubSlideIndex - 1)})" ${activeSubSlideIndex === 0 ? 'disabled' : ''} class="p-1.5 rounded-lg transition ${activeSubSlideIndex === 0 ? 'opacity-30 cursor-not-allowed text-slate-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}" title="Hoja anterior">
              <i data-lucide="chevron-left" class="w-4 h-4"></i>
            </button>
            ${page.subSlides.map((s, idx) => `
              <button onclick="viewerSelectSlide(${idx})" class="px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${idx === activeSubSlideIndex ? 'bg-brand-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}">
                <i data-lucide="file-text" class="w-3 h-3"></i>
                <span>${s.title || ('Hoja ' + (idx + 1))}</span>
              </button>
            `).join('')}
            <button onclick="viewerSelectSlide(${Math.min(page.subSlides.length - 1, activeSubSlideIndex + 1)})" ${activeSubSlideIndex === page.subSlides.length - 1 ? 'disabled' : ''} class="p-1.5 rounded-lg transition ${activeSubSlideIndex === page.subSlides.length - 1 ? 'opacity-30 cursor-not-allowed text-slate-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}" title="Hoja siguiente">
              <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
          </div>
          ` : ''}
        </div>

        <!-- Sheet Body -->
        <div class="space-y-4">
          ${blocksHtml}
        </div>

        <!-- Bottom Horizontal Navigation Controls -->
        <div class="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between select-none">
          <button onclick="viewerSelectSlide(${Math.max(0, activeSubSlideIndex - 1)})" ${activeSubSlideIndex === 0 ? 'disabled' : ''} class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition ${activeSubSlideIndex === 0 ? 'opacity-0 pointer-events-none' : ''}">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            <span>Hoja Anterior</span>
          </button>
          <div class="flex items-center gap-1.5">
            ${page.subSlides ? page.subSlides.map((_, idx) => `
              <span onclick="viewerSelectSlide(${idx})" class="w-2.5 h-2.5 rounded-full cursor-pointer transition ${idx === activeSubSlideIndex ? 'bg-brand-500 scale-110 shadow-sm' : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'}"></span>
            `).join('') : ''}
          </div>
          ${page.subSlides && activeSubSlideIndex < page.subSlides.length - 1 ? `
            <button onclick="viewerSelectSlide(${activeSubSlideIndex + 1})" class="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition hover:scale-105">
              <span>Siguiente Hoja de Trabajo</span>
              <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
          ` : `
            <button onclick="viewerNextSlide()" class="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition hover:scale-105">
              <span>Continuar a ${currentProject.pages && currentProject.pages[activePageIndex + 1] ? currentProject.pages[activePageIndex + 1].title : 'Siguiente'}</span>
              <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
          `}
        </div>
      </div>
    `;
  }

  return `
    <div class="space-y-6">
      <div class="border-b border-slate-800 pb-4">
        <h2 class="text-2xl md:text-3xl font-black text-white tracking-tight">${page.title}</h2>
        ${slide.title && page.subSlides.length > 1 ? `<p class="text-xs text-brand-400 font-bold mt-1">${slide.title}</p>` : ''}
      </div>
      ${blocksHtml}
    </div>
  `;
}

function renderClozeInteractiveText(text) {
  return text.replace(/\{([^}]+)\}/g, (match, word) => {
    return `<input type="text" data-expected="${word.trim().toLowerCase()}" class="cloze-input w-28 text-center font-mono font-bold text-xs bg-slate-900 border-b-2 border-brand-500 rounded-lg px-2 py-1 text-brand-300 focus:outline-none focus:bg-slate-850 transition" placeholder="..." />`;
  });
}

function insertWordIntoFirstEmptyCloze(blockId, word) {
  const container = document.getElementById('cloze_' + blockId);
  if (!container) return;
  const inputs = container.querySelectorAll('.cloze-input');
  for (let input of inputs) {
    if (!input.value.trim()) {
      input.value = word;
      showToast(`Palabra "${word}" insertada`);
      break;
    }
  }
}

function checkViewerTable(blockId) {
  const container = document.getElementById('itable_' + blockId);
  if (!container) return;
  const inputs = container.querySelectorAll('.itable-input');
  let correctCount = 0;
  let total = inputs.length;

  inputs.forEach(input => {
    const expected = (input.getAttribute('data-expected') || '').trim();
    const val = input.value.trim();
    const isMatch = val.toLowerCase() === expected.toLowerCase() || 
                    val.replace(',', '.') === expected.replace(',', '.') ||
                    (expected.includes(',') && val === expected.replace(',', '.')) ||
                    (expected.includes('.') && val === expected.replace('.', ','));

    if (isMatch) {
      input.classList.remove('border-slate-700', 'border-rose-500', 'bg-rose-500/20', 'text-rose-200');
      input.classList.add('border-emerald-500', 'bg-emerald-500/20', 'text-emerald-200');
      correctCount++;
    } else {
      input.classList.remove('border-slate-700', 'border-emerald-500', 'bg-emerald-500/20', 'text-emerald-200');
      input.classList.add('border-rose-500', 'bg-rose-500/20', 'text-rose-200');
    }
  });

  const fb = document.getElementById('itable_feedback_' + blockId);
  if (fb) {
    fb.classList.remove('hidden', 'text-emerald-400', 'text-amber-400', 'text-rose-400');
    if (correctCount === total) {
      fb.classList.add('text-emerald-400');
      fb.innerText = `¡Excelente! Todas las respuestas son correctas (${correctCount}/${total})`;
      showToast('¡Todas las respuestas son correctas!', 'success');
      try {
        if (typeof confetti === 'function') confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
        else if (window.confetti) window.confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
    } else {
      fb.classList.add('text-amber-400');
      fb.innerText = `Has acertado ${correctCount} de ${total}. Revisa los campos resaltados en rojo.`;
      showToast(`Has acertado ${correctCount} de ${total}`, 'info');
    }
  }
}

function checkViewerQuizOption(blockId, qIdx, oIdx) {
  const page = currentProject.pages[activePageIndex];
  if (!page || !page.subSlides) return;
  const slide = page.subSlides[activeSubSlideIndex];
  if (!slide || !slide.blocks) return;
  const block = slide.blocks.find(b => b.id === blockId);
  if (!block || !block.metadata || !block.metadata.questions) return;
  const q = block.metadata.questions[qIdx];
  if (!q || !q.options || !q.options[oIdx]) return;

  const opt = q.options[oIdx];
  const fb = document.getElementById('quizFeedback_' + q.id);
  if (!fb) return;

  fb.classList.remove('hidden', 'bg-emerald-950/60', 'border-emerald-500/50', 'text-emerald-200', 'bg-rose-950/60', 'border-rose-500/50', 'text-rose-200');

  if (opt.isCorrect) {
    fb.className = 'p-4 rounded-2xl text-xs font-medium leading-relaxed transition-all bg-emerald-950/60 border border-emerald-500/50 text-emerald-200';
    fb.innerHTML = `<strong>¡Correcto!</strong> ${q.feedbackGood || '¡Excelente! Respuesta acertada.'}`;
    showToast('¡Respuesta correcta!', 'success');
    try {
      if (typeof confetti === 'function') confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      else if (window.confetti) window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (e) {}
  } else {
    fb.className = 'p-4 rounded-2xl text-xs font-medium leading-relaxed transition-all bg-rose-950/60 border border-rose-500/50 text-rose-200';
    fb.innerHTML = `<strong>¡Incorrecto!</strong> ${q.feedbackBad || 'Incorrecto. Revisa el contenido previo e inténtalo de nuevo.'}`;
  }
}

function checkViewerQuiz(qId, isCorrect, goodMsg, badMsg) {
  const fb = document.getElementById('quizFeedback_' + qId);
  if (!fb) return;
  fb.classList.remove('hidden', 'bg-emerald-950/60', 'border-emerald-500/50', 'text-emerald-200', 'bg-rose-950/60', 'border-rose-500/50', 'text-rose-200');

  if (isCorrect) {
    fb.classList.add('bg-emerald-950/60', 'border', 'border-emerald-500/50', 'text-emerald-200');
    fb.innerHTML = `<strong>¡Correcto!</strong> ${decodeURIComponent(goodMsg)}`;
    showToast('¡Respuesta correcta!', 'success');
    try {
      if (typeof confetti === 'function') confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      else if (window.confetti) window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (e) {}
  } else {
    fb.classList.add('bg-rose-950/60', 'border', 'border-rose-500/50', 'text-rose-200');
    fb.innerHTML = `<strong>¡Incorrecto!</strong> ${decodeURIComponent(badMsg)}`;
  }
}

function checkViewerCloze(blockId) {
  const container = document.getElementById('cloze_' + blockId);
  if (!container) return;
  const inputs = container.querySelectorAll('.cloze-input');
  let correct = 0;

  inputs.forEach(input => {
    const exp = (input.getAttribute('data-expected') || '').trim().toLowerCase();
    const val = input.value.trim().toLowerCase();
    const isMatch = val === exp || val.replace(',', '.') === exp.replace(',', '.');
    if (isMatch) {
      input.classList.remove('border-brand-500', 'border-rose-500', 'bg-rose-500/20');
      input.classList.add('border-emerald-500', 'bg-emerald-500/20');
      correct++;
    } else {
      input.classList.remove('border-brand-500', 'border-emerald-500', 'bg-emerald-500/20');
      input.classList.add('border-rose-500', 'bg-rose-500/20');
    }
  });

  const fb = document.getElementById('clozeFeedback_' + blockId);
  if (fb) {
    fb.classList.remove('hidden');
    fb.className = 'text-xs font-bold ' + (correct === inputs.length ? 'text-emerald-400' : 'text-amber-400');
    fb.innerText = `Puntuación: ${correct} de ${inputs.length} palabras correctas.`;
    showToast(`Completado: ${correct}/${inputs.length}`, correct === inputs.length ? 'success' : 'info');
    if (correct === inputs.length && inputs.length > 0) {
      try {
        if (typeof confetti === 'function') confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
        else if (window.confetti) window.confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
    }
  }
}

function toggleViewerAccordion(btn) {
  const content = btn.nextElementSibling;
  const icon = btn.querySelector('i');
  content.classList.toggle('hidden');
  if (content.classList.contains('hidden')) {
    icon.style.transform = 'rotate(0deg)';
  } else {
    icon.style.transform = 'rotate(180deg)';
  }
}

function toggleViewerMobileIndex() {
  const nav = document.getElementById('viewerNavSidebar');
  const backdrop = document.getElementById('viewerNavBackdrop');
  if (!nav) return;
  const isHidden = nav.classList.contains('hidden');
  if (isHidden) {
    nav.classList.remove('hidden');
    if (backdrop) backdrop.classList.remove('hidden');
  } else {
    nav.classList.add('hidden');
    if (backdrop) backdrop.classList.add('hidden');
  }
  if (window.lucide) lucide.createIcons();
}

function closeViewerMobileIndex() {
  const nav = document.getElementById('viewerNavSidebar');
  const backdrop = document.getElementById('viewerNavBackdrop');
  if (nav && window.innerWidth < 768) {
    nav.classList.add('hidden');
  }
  if (backdrop) backdrop.classList.add('hidden');
}

function viewerSelectPage(idx) {
  activePageIndex = idx;
  activeSubSlideIndex = 0;
  closeViewerMobileIndex();
  renderViewer();
  const scroll = document.getElementById('viewerContentScroll');
  if (scroll) scroll.scrollTop = 0;
}

function viewerSelectSlide(sIdx) {
  activeSubSlideIndex = sIdx;
  renderViewer();
  const scroll = document.getElementById('viewerContentScroll');
  if (scroll) scroll.scrollTop = 0;
}

function viewerNextSlide() {
  const page = currentProject.pages[activePageIndex];
  if (page.subSlides && activeSubSlideIndex < page.subSlides.length - 1) {
    activeSubSlideIndex++;
  } else if (activePageIndex < currentProject.pages.length - 1) {
    activePageIndex++;
    activeSubSlideIndex = 0;
  }
  renderViewer();
  const scroll = document.getElementById('viewerContentScroll');
  if (scroll) scroll.scrollTop = 0;
}

function viewerPrevSlide() {
  if (activeSubSlideIndex > 0) {
    activeSubSlideIndex--;
  } else if (activePageIndex > 0) {
    activePageIndex--;
    const prevPage = currentProject.pages[activePageIndex];
    activeSubSlideIndex = prevPage.subSlides ? prevPage.subSlides.length - 1 : 0;
  }
  renderViewer();
  const scroll = document.getElementById('viewerContentScroll');
  if (scroll) scroll.scrollTop = 0;
}
