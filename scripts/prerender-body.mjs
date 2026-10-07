// Crawlable HTML placed inside <div id="root"> for key SEO routes.
// React (createRoot) replaces it on load; the copy comes from the same shared
// modules the React pages render, so crawlers and users see the same content.
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const link = (to, label) => `<a href="${esc(to)}">${esc(label)}</a>`;
const rich = segments => segments.map(seg => {
  if (typeof seg === 'string') return esc(seg);
  if (seg.to) return link(seg.to, seg.label);
  return `<strong>${esc(seg.strong)}</strong>`;
}).join('');
const WRAP = 'mx-auto max-w-4xl px-4 py-10';

export function renderUkEsignBody(c, faqTitle = 'Questions teams ask about UK e-signature software') {
  const {
    UK_ESIGN_HERO: hero, UK_ESIGN_SHORT_ANSWER: short, UK_ESIGN_PROOF: proof, UK_ESIGN_COMPARISON: cmp,
    UK_ESIGN_LEVELS: levels, UK_ESIGN_LAW: law, UK_ESIGN_CHECKLIST: checklist, UK_ESIGN_SWITCH: sw,
    UK_ESIGN_INDUSTRIES: industries, UK_ESIGN_FAQS: faqs, UK_ESIGN_LAST_UPDATED: updated, UK_ESIGN_LAST_UPDATED_LABEL: updatedLabel,
  } = c;
  const parts = [];
  parts.push(`<header><p>${esc(hero.eyebrow)}</p><h1>${esc(hero.h1)}</h1><p>${esc(hero.intro)}</p><p>${esc(hero.guideNote)}</p>`
    + `<p>${link('/register', 'Start free')} · ${link('/pricing', 'See pricing')} · <a href="#uk-e-signature-comparison">Compare UK providers</a></p>`
    + `<p>Last updated <time datetime="${esc(updated)}">${esc(updatedLabel)}</time></p></header>`);
  parts.push(`<section><h2>${esc(short.title)}</h2><p>${esc(short.intro)}</p><ul>${short.items.map(item => `<li>${rich(item)}</li>`).join('')}</ul></section>`);
  parts.push(`<section><h2>What serious UK e-signature software must prove</h2>${proof.map(p => `<h3>${esc(p.title)}</h3><p>${esc(p.body)}</p>`).join('')}</section>`);
  parts.push(`<section id="uk-e-signature-comparison"><h2>${esc(cmp.title)}</h2><p>${esc(cmp.subtitle)}</p><table><thead><tr>${cmp.columns.map(col => `<th scope="col">${esc(col)}</th>`).join('')}</tr></thead><tbody>`
    + cmp.rows.map(row => `<tr><th scope="row">${esc(row.name)}</th>${row.cells.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')
    + `</tbody></table><p>${esc(cmp.footnote)}</p></section>`);
  parts.push(`<section><h2>${esc(levels.title)}</h2><p>${esc(levels.intro)}</p>${levels.items.map(i => `<h3>${esc(i.level)}</h3><p>${esc(i.body)}</p>`).join('')}<p>${rich(levels.outro)}</p></section>`);
  parts.push(`<section><h2>${esc(law.title)}</h2>${law.paragraphs.map(p => `<p>${rich(p)}</p>`).join('')}<h3>${esc(law.exceptionsTitle)}</h3><ul>${law.exceptions.map(e => `<li>${esc(e)}</li>`).join('')}</ul><p>${esc(law.disclaimer)}</p></section>`);
  parts.push(`<section><h2>${esc(checklist.title)}</h2><p>${esc(checklist.intro)}</p><ol>${checklist.items.map(i => `<li><h3>${esc(i.q)}</h3><p>${esc(i.a)}</p></li>`).join('')}</ol></section>`);
  parts.push(`<section><h2>${esc(sw.title)}</h2><p>${esc(sw.intro)}</p><ul>${sw.items.map(i => `<li>${link(i.to, i.label)}: ${esc(i.body)}</li>`).join('')}</ul></section>`);
  parts.push(`<section><h2>E-signature software for UK industries</h2><ul>${industries.map(i => `<li>${link(i.to, i.label)}: ${esc(i.body)}</li>`).join('')}</ul><p>${link('/solutions', 'All industry solutions')}</p></section>`);
  parts.push(`<section><h2>${esc(faqTitle)}</h2>${faqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</section>`);
  return `<main class="${WRAP}" data-prerendered="uk-e-signature-software">${parts.join('')}</main>`;
}

export function renderContextLinkBody(route, description, contextLink) {
  const sentence = `${esc(contextLink.before)}<a href="/uk-e-signature-software">${esc(contextLink.anchor)}</a>${esc(contextLink.after)}`;
  return `<main class="${WRAP}" data-prerendered="${esc(route)}"><p>${esc(description)}</p><p>${sentence}</p></main>`;
}

/** Homepage: brand-first H1, plain "About CivicSign" statement and descriptive link to the money page. */
export function renderHomeBody(brand, description, contextLink) {
  const sentence = `${esc(contextLink.before)}<a href="/uk-e-signature-software">${esc(contextLink.anchor)}</a>${esc(contextLink.after)}`;
  return `<main class="${WRAP}" data-prerendered="/"><h1>${esc(brand.HOME_H1)}</h1><p>${esc(description)}</p>`
    + `<section><h2>About ${esc(brand.BRAND_NAME)}</h2><p>${esc(brand.BRAND_STATEMENT)}</p></section>`
    + `<p>${sentence}</p>`
    + `<p>${link('/uk-e-signature-software', 'Compare UK e-signature software')} · ${link('/pricing', 'CivicSign pricing')} · ${link('/about', 'About CivicSign')}</p></main>`;
}

/** About page: the plain brand statement, crawlable without JavaScript. */
export function renderAboutBody(brand, description) {
  return `<main class="${WRAP}" data-prerendered="/about"><p>${esc(description)}</p>`
    + `<section><h2>About ${esc(brand.BRAND_NAME)}</h2><p>${esc(brand.BRAND_STATEMENT)}</p></section>`
    + `<p>${link('/uk-e-signature-software', 'CivicSign UK e-signature software')} · ${link('/contact', 'Contact CivicSign')}</p></main>`;
}
