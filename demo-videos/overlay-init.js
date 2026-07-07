/* CivicSign demo overlay v3 — SaaS explainer style: chapters, blur spotlight, bold callouts. */
(() => {
  if (typeof window.__csShowStep === "function") return;

  const TOTAL = 28;

  const css = document.createElement("style");
  css.textContent = `
    #cs-demo-step {
      position: fixed; z-index: 2147483646;
      min-width: 360px; max-width: 560px;
      padding: 18px 24px; border-radius: 16px;
      background: #ffffff;
      border: none;
      box-shadow: 0 20px 60px rgba(15,23,32,.22), 0 0 0 1px rgba(20,184,166,.12);
      color: #0f1720;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      pointer-events: none; opacity: 0;
      transition: opacity .35s ease, top .5s cubic-bezier(.22,1,.36,1), left .5s cubic-bezier(.22,1,.36,1);
    }
    #cs-demo-step.centered {
      top: 32px; left: 50%; transform: translateX(-50%);
      max-width: 780px;
    }
    #cs-demo-step.visible { opacity: 1; }
    #cs-demo-step .row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
    #cs-demo-step .num {
      display: inline-block; padding: 5px 14px;
      border-radius: 999px; background: linear-gradient(135deg, #e6faf8, #ccfbf1);
      font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
      color: #0d9488;
    }
    #cs-demo-step .action {
      display: inline-block; padding: 5px 12px;
      border-radius: 8px; background: #0f1720;
      font-size: 10px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase;
      color: #fff;
    }
    #cs-demo-step h3 { margin: 0; font-size: 22px; font-weight: 800; line-height: 1.2; color: #0f1720; }
    #cs-demo-step p { margin: 10px 0 0; font-size: 15px; color: #475569; line-height: 1.5; }
    #cs-demo-arrow {
      position: fixed; z-index: 2147483645; pointer-events: none;
      opacity: 0; transition: opacity .35s ease;
    }
    #cs-demo-arrow.visible { opacity: 1; }
    #cs-demo-arrow svg { overflow: visible; filter: drop-shadow(0 3px 6px rgba(20,184,166,.4)); }
    #cs-demo-cursor {
      position: fixed; width: 34px; height: 34px; z-index: 2147483647;
      pointer-events: none; transform: translate(-5px, -5px);
      transition: left .55s cubic-bezier(.22,1,.36,1), top .55s cubic-bezier(.22,1,.36,1);
      filter: drop-shadow(0 3px 10px rgba(15,23,32,.3));
    }
    #cs-demo-cursor::before {
      content: ""; position: absolute; inset: 0;
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='34' height='34' viewBox='0 0 24 24'%3E%3Cpath fill='%2314b8a6' stroke='%23fff' stroke-width='1.5' d='M5 3l3 18 4-8 5 1z'/%3E%3C/svg%3E") center/contain no-repeat;
    }
    #cs-demo-cursor.click::after {
      content: ""; position: absolute; left: -4px; top: -4px; width: 44px; height: 44px;
      border: 3px solid #14b8a6; border-radius: 50%;
      animation: cs-click-ring .7s ease-out forwards;
    }
    @keyframes cs-click-ring {
      from { transform: scale(.25); opacity: 1; }
      to { transform: scale(1.6); opacity: 0; }
    }
    .cs-demo-highlight {
      position: relative; z-index: 2147483640 !important;
      outline: 4px solid #14b8a6 !important;
      outline-offset: 6px !important;
      box-shadow: 0 0 0 10px rgba(20,184,166,.18), 0 0 48px rgba(20,184,166,.5) !important;
      animation: cs-pulse 1.5s ease-in-out infinite !important;
      border-radius: 8px;
    }
    @keyframes cs-pulse {
      0%, 100% { outline-color: #14b8a6; }
      50% { outline-color: #0d9488; box-shadow: 0 0 0 14px rgba(20,184,166,.25), 0 0 64px rgba(20,184,166,.6) !important; }
    }
    #cs-demo-dim {
      position: fixed; inset: 0; z-index: 2147483638; pointer-events: none;
      background: rgba(15,23,32,.55);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      opacity: 0; transition: opacity .35s ease;
    }
    #cs-demo-dim.on { opacity: 1; }
    #cs-demo-brighten {
      position: fixed; inset: 0; z-index: 2147483637; pointer-events: none;
      background: rgba(255,255,255,.04); mix-blend-mode: screen;
    }
    #cs-demo-progress {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 2147483644;
      height: 6px; background: rgba(15,23,32,.15); pointer-events: none;
    }
    #cs-demo-progress .fill {
      height: 100%; width: 0%;
      background: linear-gradient(90deg, #14b8a6, #0d9488);
      transition: width .6s cubic-bezier(.22,1,.36,1);
      box-shadow: 0 0 12px rgba(20,184,166,.5);
    }
    #cs-demo-brand {
      position: fixed; bottom: 18px; left: 24px; z-index: 2147483644;
      display: flex; align-items: center; gap: 10px; pointer-events: none;
      padding: 10px 18px; border-radius: 12px;
      background: rgba(255,255,255,.92);
      box-shadow: 0 8px 24px rgba(15,23,32,.12);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #cs-demo-brand .name { font-size: 15px; font-weight: 800; color: #0d9488; }
    #cs-demo-brand .plan { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #64748b; }
    #cs-demo-chapter {
      position: fixed; inset: 0; z-index: 2147483648; pointer-events: none;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #0f1720 0%, #134e4a 45%, #0d3d3a 100%);
      opacity: 0; transition: opacity .5s ease;
    }
    #cs-demo-chapter.visible { opacity: 1; }
    #cs-demo-chapter .inner { text-align: center; max-width: 1100px; padding: 48px; }
    #cs-demo-chapter .phase {
      display: inline-block; margin-bottom: 20px; padding: 10px 22px;
      border-radius: 999px; background: rgba(20,184,166,.2); border: 1px solid rgba(20,184,166,.4);
      font-size: 13px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #7de8dc;
    }
    #cs-demo-chapter h2 {
      margin: 0; font-size: 56px; font-weight: 800; line-height: 1.08;
      color: #fff; letter-spacing: -.03em;
    }
    #cs-demo-chapter p {
      margin: 22px auto 0; max-width: 760px;
      font-size: 24px; color: rgba(255,255,255,.78); line-height: 1.45;
    }
    #cs-demo-benefit {
      position: fixed; z-index: 2147483646; pointer-events: none;
      padding: 12px 20px; border-radius: 14px;
      background: #fff; box-shadow: 0 12px 36px rgba(15,23,32,.18);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px; font-weight: 600; color: #334155;
      opacity: 0; transition: opacity .35s ease;
      max-width: 320px;
    }
    #cs-demo-benefit.visible { opacity: 1; }
    #cs-demo-benefit::before {
      content: ""; position: absolute; top: -8px; left: 28px;
      border: 8px solid transparent; border-bottom-color: #fff;
    }
    #cs-demo-benefit .tag {
      display: block; margin-bottom: 4px;
      font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #0d9488;
    }
  `;
  document.head.appendChild(css);

  const brighten = document.createElement("div");
  brighten.id = "cs-demo-brighten";
  document.body.appendChild(brighten);

  const dim = document.createElement("div");
  dim.id = "cs-demo-dim";
  document.body.appendChild(dim);

  const progress = document.createElement("div");
  progress.id = "cs-demo-progress";
  progress.innerHTML = '<div class="fill"></div>';
  document.body.appendChild(progress);

  const brand = document.createElement("div");
  brand.id = "cs-demo-brand";
  brand.innerHTML = '<span class="name">CivicSign</span><span class="plan">Pro · UK eIDAS</span>';
  document.body.appendChild(brand);

  const chapter = document.createElement("div");
  chapter.id = "cs-demo-chapter";
  chapter.innerHTML = '<div class="inner"></div>';
  document.body.appendChild(chapter);

  const benefit = document.createElement("div");
  benefit.id = "cs-demo-benefit";
  document.body.appendChild(benefit);

  const arrow = document.createElement("div");
  arrow.id = "cs-demo-arrow";
  arrow.innerHTML = `<svg width="44" height="80" viewBox="0 0 44 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 0 L22 58 M22 58 L8 44 M22 58 L36 44" stroke="#14b8a6" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="22" cy="72" r="7" fill="#14b8a6"/>
  </svg>`;
  document.body.appendChild(arrow);

  const step = document.createElement("div");
  step.id = "cs-demo-step";
  step.className = "centered";
  document.body.appendChild(step);

  const cursor = document.createElement("div");
  cursor.id = "cs-demo-cursor";
  cursor.style.left = "960px";
  cursor.style.top = "540px";
  document.body.appendChild(cursor);

  let highlighted = null;

  function setProgress(num) {
    const pct = Math.min(100, Math.round((num / TOTAL) * 100));
    progress.querySelector(".fill").style.width = `${pct}%`;
  }

  function clearArrow() { arrow.classList.remove("visible"); }
  function clearBenefit() { benefit.classList.remove("visible"); }

  function placeArrow(stepRect, targetRect) {
    const ax = targetRect.left + targetRect.width / 2 - 22;
    const ay = stepRect.bottom + 6;
    const h = Math.max(52, targetRect.top - stepRect.bottom - 10);
    arrow.style.left = `${ax}px`;
    arrow.style.top = `${ay}px`;
    arrow.style.height = `${h}px`;
    const svg = arrow.querySelector("svg");
    if (svg) {
      svg.setAttribute("height", String(h));
      const path = svg.querySelector("path");
      if (path) {
        const lineEnd = Math.max(22, h - 16);
        path.setAttribute("d", `M22 0 L22 ${lineEnd} M22 ${lineEnd} L8 ${lineEnd - 14} M22 ${lineEnd} L36 ${lineEnd - 14}`);
      }
      const circle = svg.querySelector("circle");
      if (circle) circle.setAttribute("cy", String(h - 8));
    }
    arrow.classList.add("visible");
  }

  function placeBenefit(el, text) {
    if (!text) { clearBenefit(); return; }
    const r = el.getBoundingClientRect();
    benefit.innerHTML = `<span class="tag">Why it matters</span>${text}`;
    benefit.style.left = `${Math.max(20, r.left)}px`;
    benefit.style.top = `${r.bottom + 18}px`;
    benefit.classList.add("visible");
  }

  function positionStepNear(el) {
    step.classList.remove("centered");
    step.style.transform = "none";
    step.classList.add("visible");

    const r = el.getBoundingClientRect();
    const sw = Math.min(560, Math.max(360, r.width + 140));
    let left = r.left + r.width / 2 - sw / 2;
    left = Math.max(20, Math.min(left, window.innerWidth - sw - 20));

    step.style.width = `${sw}px`;
    step.style.left = `${left}px`;

    const stepH = step.offsetHeight || 120;
    let top = r.top - stepH - 64;
    if (top < 20) top = r.bottom + 64;

    step.style.top = `${top}px`;

    requestAnimationFrame(() => {
      const stepRect = step.getBoundingClientRect();
      if (stepRect.bottom < r.top - 8) placeArrow(stepRect, r);
      else clearArrow();
    });
  }

  function positionStepCenter() {
    clearArrow();
    clearBenefit();
    step.classList.add("centered");
    step.style.width = "";
    step.style.left = "";
    step.style.top = "";
    step.style.transform = "";
    step.classList.add("visible");
  }

  function renderStep(num, title, subtitle, action) {
    const actionHtml = action ? `<span class="action">${action}</span>` : "";
    step.innerHTML = `<div class="row"><span class="num">Step ${num} of ${TOTAL}</span>${actionHtml}</div><h3>${title}</h3>${subtitle ? `<p>${subtitle}</p>` : ""}`;
    setProgress(num);
  }

  window.__csShowChapter = (phase, headline, subtext) => {
    window.__csClearHighlight();
    step.classList.remove("visible");
    clearBenefit();
    const inner = chapter.querySelector(".inner");
    inner.innerHTML = `<div class="phase">${phase}</div><h2>${headline}</h2>${subtext ? `<p>${subtext}</p>` : ""}`;
    chapter.classList.add("visible");
  };

  window.__csHideChapter = () => {
    chapter.classList.remove("visible");
  };

  window.__csShowStep = (num, title, subtitle, action) => {
    window.__csShowStepAt(num, title, subtitle, null, action, null);
  };

  window.__csShowStepAt = (num, title, subtitle, selector, action, benefitText) => {
    renderStep(num, title, subtitle, action);

    if (selector) {
      window.__csHighlight(selector);
      const el = document.querySelector(selector);
      if (el) {
        positionStepNear(el);
        placeBenefit(el, benefitText);
      }
    } else {
      window.__csClearHighlight();
      positionStepCenter();
    }
  };

  window.__csMoveCursor = (x, y, click) => {
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
    if (click) {
      cursor.classList.remove("click");
      void cursor.offsetWidth;
      cursor.classList.add("click");
    }
  };

  window.__csClearHighlight = () => {
    if (highlighted) {
      highlighted.classList.remove("cs-demo-highlight");
      highlighted = null;
    }
    dim.classList.remove("on");
    clearArrow();
    clearBenefit();
  };

  window.__csHighlight = (selector) => {
    if (highlighted) highlighted.classList.remove("cs-demo-highlight");
    const el = document.querySelector(selector);
    if (!el) return false;
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    el.classList.add("cs-demo-highlight");
    highlighted = el;
    dim.classList.add("on");
    const r = el.getBoundingClientRect();
    window.__csMoveCursor(r.left + r.width / 2, r.top + r.height / 2);
    return true;
  };

  window.__csRepositionStep = (selector) => {
    const el = document.querySelector(selector);
    if (el) positionStepNear(el);
  };

  window.__csDemoReady = true;
})();