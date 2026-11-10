// Mapa mental em SVG: raiz → temas → conceitos, com expandir/recolher animado por mola,
// pan/zoom (js/ui/panzoom.js) e navegação completa por teclado.
import { h, s } from '../dom.js';
import { criarMola } from '../motion.js';
import { criarPanZoom } from '../panzoom.js';
import { layoutMapa, caixaDe } from './mapa-layout.js';
import { progressoDe, ordenarPorPareto } from '../../content/pareto.js';

const ANEL = 2 * Math.PI * 6;
const limitar = (v, a, b) => Math.min(b, Math.max(a, v));

export function criarMapa({ norma, obterProgresso, expandidosIniciais, vistaInicial }) {
  const estreito = matchMedia('(max-width: 720px)');
  const fonte = getComputedStyle(document.body).fontFamily;
  const tela = document.createElement('canvas').getContext('2d');
  const medir = (texto, estilo) => {
    tela.font = `${estilo} ${fonte}`;
    return Math.ceil(tela.measureText(texto).width * 1.04); // folga para a troca de fonte
  };

  const idRaiz = `${norma.id}:raiz`;
  // Dentro de cada tema, os conceitos seguem a ordem de estudo sugerida (Pareto).
  const temas = norma.temas.map((t) => ({ ...t, conceitos: ordenarPorPareto(t.conceitos), chave: `${norma.id}:tema:${t.id}` }));
  let expandidos = new Set(expandidosIniciais ?? (estreito.matches ? [] : temas.filter((t) => t.conceitos.length).slice(0, 1).map((t) => t.chave)));

  const gArestas = s('g', { class: 'mapa-arestas' });
  const gNos = s('g');
  const cena = s('g', null, gArestas, gNos);
  const svg = s('svg', { class: 'mapa-svg', role: 'group', 'aria-label': `Mapa mental da ${norma.nome}. Use as setas para navegar entre os nós.` }, cena);
  const area = h('div', { class: 'mapa-area' }, svg);

  // --- Nós ------------------------------------------------------------------------------------
  const itens = new Map(); // id → { el, aresta, atual:{x,y,o}, de, para, dados }
  const larguras = {};

  function criarNos() {
    gNos.replaceChildren();
    gArestas.replaceChildren();
    itens.clear();

    const wRaiz = medir(norma.nome, '600 16px') + 44;
    larguras.raiz = wRaiz;
    const raiz = s('g', { class: 'mapa-no mapa-raiz', role: 'button', 'data-no': idRaiz, 'aria-label': `${norma.nome}: ${norma.titulo}. Enquadrar o mapa` },
      s('rect', { class: 'mapa-fundo', x: -wRaiz / 2, y: -23, width: wRaiz, height: 46, rx: 23 }),
      s('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, norma.nome),
    );
    raiz.addEventListener('click', () => enquadrar(true));
    registrar(idRaiz, raiz, null, { tipo: 'raiz' });

    temas.forEach((tema, i) => {
      const lado = estreito.matches || i < Math.ceil(temas.length / 2) ? 1 : -1;
      const temFilhos = tema.conceitos.length > 0;
      const wNome = medir(tema.nome, '500 14px');
      const wMeta = Math.max(medir('em breve', '400 12px'), medir(`${tema.conceitos.length}/${tema.conceitos.length}`, '400 12px'));
      const seta = temFilhos ? 18 : 0;
      const w = 12 + 16 + 8 + wNome + 10 + wMeta + seta + 12;
      const inicio = -w / 2 + 12 + (lado < 0 ? seta : 0);
      const anel = s('circle', { class: 'mapa-anel-valor', cx: inicio + 8, cy: 0, r: 6, transform: `rotate(-90 ${inicio + 8} 0)`, 'stroke-dasharray': `0 ${ANEL}` });
      const meta = s('text', { class: 'mapa-meta', x: inicio + 24 + wNome + 10, 'dominant-baseline': 'central' });
      const xSeta = lado > 0 ? w / 2 - 17 : -w / 2 + 17;
      const el = s('g', {
        class: `mapa-no mapa-tema cor-tema${temFilhos ? '' : ' em-breve'}`, role: 'button', 'data-no': tema.chave, style: { '--tema-h': tema.matiz },
        'aria-disabled': temFilhos ? null : 'true',
      },
        s('title', null, temFilhos ? tema.descricao : `${tema.nome}: em breve`),
        s('rect', { class: 'mapa-fundo', x: -w / 2, y: -20, width: w, height: 40, rx: 11 }),
        s('circle', { class: 'mapa-anel', cx: inicio + 8, cy: 0, r: 6 }),
        anel,
        s('text', { class: 'mapa-nome', x: inicio + 24, 'dominant-baseline': 'central' }, tema.nome),
        meta,
        temFilhos && s('g', { transform: `translate(${xSeta} 0)${lado < 0 ? ' scale(-1 1)' : ''}` },
          s('path', { class: 'mapa-seta', d: 'M-2.5 -4.5 L2 0 L-2.5 4.5' })),
      );
      el.addEventListener('click', () => temFilhos && alternar(tema.chave));
      registrar(tema.chave, el, idRaiz, { tipo: 'tema', tema, anel, meta, lado, w, temFilhos });

      for (const c of tema.conceitos) {
        const wTexto = medir(c.titulo, '400 13.5px');
        const wc = 26 + wTexto + 12;
        const link = s('a', { class: 'mapa-no mapa-conceito cor-tema', href: `#/conceito/${c.id}`, 'data-no': c.id, style: { '--tema-h': tema.matiz } },
          s('rect', { class: 'mapa-fundo', x: -wc / 2, y: -14, width: wc, height: 28, rx: 8 }),
          s('circle', { class: 'mapa-ponto', cx: lado * (-wc / 2 + 12), cy: 0, r: 4.5 }),
          s('text', { x: lado * (-wc / 2 + 26), 'text-anchor': lado > 0 ? 'start' : 'end', 'dominant-baseline': 'central' }, c.titulo),
        );
        registrar(c.id, link, tema.chave, { tipo: 'conceito', conceito: c, tema, w: wc, lado });
      }
    });
    atualizarProgresso();
  }

  function registrar(id, el, pai, dados) {
    el.setAttribute('tabindex', '-1');
    let aresta = null;
    if (pai) {
      aresta = s('path', { class: `mapa-aresta${dados.tipo === 'conceito' ? ' cor-tema' : ''}` });
      if (dados.tipo === 'conceito') aresta.style.setProperty('--tema-h', dados.tema.matiz);
      gArestas.append(aresta);
    }
    gNos.append(el);
    itens.set(id, { id, el, aresta, pai, dados, atual: null, de: null, para: null });
  }

  // --- Layout e animação ------------------------------------------------------------------------
  let plano = new Map();

  function calcularLayout() {
    return layoutMapa({
      raiz: { id: idRaiz, w: larguras.raiz },
      temas: temas.map((t) => ({ id: t.chave, w: itens.get(t.chave).dados.w, filhos: t.conceitos.map((c) => ({ id: c.id, w: itens.get(c.id).dados.w })) })),
      expandidos,
      umLado: estreito.matches,
    });
  }

  const mola = criarMola({ valor: 1, rigidez: 190, amortecimento: 23, precisao: 0.002, aoMudar: pintar });

  function pintar(t, fim) {
    for (const item of itens.values()) {
      const { de, para } = item;
      if (!para) continue;
      const a = (item.atual = {
        x: de.x + (para.x - de.x) * t,
        y: de.y + (para.y - de.y) * t,
        o: limitar(de.o + (para.o - de.o) * t, 0, 1),
      });
      item.el.setAttribute('transform', `translate(${a.x.toFixed(2)} ${a.y.toFixed(2)})`);
      item.el.setAttribute('opacity', a.o.toFixed(3));
      if (fim && t === 1 && para.o === 0) item.el.style.display = 'none';
    }
    for (const item of itens.values()) {
      if (!item.aresta || !item.atual) continue;
      const p = itens.get(item.pai);
      const lado = plano.get(item.id).lado;
      const x1 = p.atual.x + (lado * plano.get(item.pai).w) / 2;
      const x2 = item.atual.x - (lado * plano.get(item.id).w) / 2;
      const mx = (x1 + x2) / 2;
      item.aresta.setAttribute('d', `M${x1.toFixed(1)} ${p.atual.y.toFixed(1)}C${mx.toFixed(1)} ${p.atual.y.toFixed(1)} ${mx.toFixed(1)} ${item.atual.y.toFixed(1)} ${x2.toFixed(1)} ${item.atual.y.toFixed(1)}`);
      item.aresta.setAttribute('opacity', item.atual.o.toFixed(3));
    }
  }

  function aplicarLayout(animado) {
    plano = calcularLayout();
    for (const item of itens.values()) {
      const no = plano.get(item.id);
      item.para = { x: no.x, y: no.y, o: no.visivel ? 1 : 0 };
      item.de = animado && item.atual ? { ...item.atual } : { ...item.para };
      if (no.visivel) item.el.style.display = '';
      item.el.classList.toggle('oculto', !no.visivel);
      if (item.dados.tipo === 'tema' && item.dados.temFilhos) {
        const aberto = expandidos.has(item.id);
        item.el.setAttribute('aria-expanded', String(aberto));
        item.el.classList.toggle('aberto', aberto);
      }
    }
    mola.definir(0, { imediato: true });
    if (animado) mola.definir(1);
    else mola.definir(1, { imediato: true });
  }

  function alternar(chave) {
    if (expandidos.has(chave)) expandidos.delete(chave);
    else expandidos.add(chave);
    aplicarLayout(true);
    if (expandidos.has(chave)) garantirVisivel([chave, ...itens.get(chave).dados.tema.conceitos.map((c) => c.id)]);
  }

  // --- Vista (pan/zoom) -------------------------------------------------------------------------
  // A vista lembrada só vale se a tela continua no mesmo modo (amplo/estreito).
  if (vistaInicial && vistaInicial.estreito !== estreito.matches) vistaInicial = null;
  const panzoom = criarPanZoom(area, {
    inicial: vistaInicial ?? undefined,
    aoMudar: (v) => cena.setAttribute('transform', `translate(${v.x.toFixed(2)} ${v.y.toFixed(2)}) scale(${v.k.toFixed(4)})`),
  });
  let enquadrado = Boolean(vistaInicial);

  function enquadrar(animado) {
    const r = area.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const b = caixaDe(plano);
    const margem = estreito.matches ? 20 : 56;
    const k = limitar(Math.min((r.width - 2 * margem) / b.w, (r.height - 2 * margem) / b.h), estreito.matches ? 0.8 : 0.6, 1);
    let x = r.width / 2 - (b.x + b.w / 2) * k;
    if (b.w * k > r.width - 2 * margem) x = margem - b.x * k; // não coube: começa pela raiz
    const y = r.height / 2 - (b.y + b.h / 2) * k;
    if (animado) panzoom.irPara({ x, y, k });
    else panzoom.definir({ x, y, k });
    enquadrado = true;
  }

  /** Desloca a vista o mínimo necessário para os nós indicados aparecerem. */
  function garantirVisivel(ids) {
    const r = area.getBoundingClientRect();
    const v = panzoom.vista;
    const b = caixaDe(plano, ids);
    if (!Number.isFinite(b.w)) return;
    const margem = estreito.matches ? 16 : 32;
    // Se o grupo não cabe na largura, afasta um pouco (até um limite ainda legível).
    let k = v.k;
    if (ids.length > 1 && b.w * k > r.width - 2 * margem) k = Math.min(k, Math.max(0.72, (r.width - 2 * margem) / b.w));
    const ox = v.x + (b.x + b.w / 2) * (v.k - k);
    const oy = v.y + (b.y + b.h / 2) * (v.k - k);
    const x0 = b.x * k + ox, x1 = (b.x + b.w) * k + ox;
    const y0 = b.y * k + oy, y1 = (b.y + b.h) * k + oy;
    let dx = 0, dy = 0;
    const lado = plano.get(ids[0])?.lado ?? 1;
    if (x1 - x0 > r.width - 2 * margem) dx = lado >= 0 ? margem - x0 : r.width - margem - x1;
    else if (x0 < margem) dx = margem - x0;
    else if (x1 > r.width - margem) dx = r.width - margem - x1;
    if (y1 - y0 > r.height - 2 * margem) dy = r.height / 2 - (y0 + y1) / 2;
    else if (y0 < margem) dy = margem - y0;
    else if (y1 > r.height - margem) dy = r.height - margem - y1;
    if (dx || dy || k !== v.k) panzoom.irPara({ x: ox + dx, y: oy + dy, k });
  }

  // --- Progresso --------------------------------------------------------------------------------
  function atualizarProgresso() {
    const progresso = obterProgresso();
    for (const item of itens.values()) {
      const d = item.dados;
      if (d.tipo === 'tema') {
        if (!d.temFilhos) {
          d.meta.textContent = 'em breve';
          item.el.setAttribute('aria-label', `${d.tema.nome}, em breve`);
          continue;
        }
        const p = progressoDe(d.tema.conceitos, progresso);
        d.meta.textContent = `${p.lidos}/${p.total}`;
        d.anel.setAttribute('stroke-dasharray', `${(p.fracao * ANEL).toFixed(2)} ${ANEL}`);
        item.el.setAttribute('aria-label', `${d.tema.nome}, ${p.lidos} de ${p.total} conceitos lidos`);
      } else if (d.tipo === 'conceito') {
        const lido = Boolean(progresso.lidos[d.conceito.id]);
        item.el.classList.toggle('lido', lido);
        item.el.setAttribute('aria-label', `${d.conceito.titulo}${lido ? ', lido' : ''}`);
      }
    }
  }

  // --- Teclado ----------------------------------------------------------------------------------
  let foco = idRaiz;

  function focar(id) {
    const item = itens.get(id);
    if (!item || !plano.get(id)?.visivel) return;
    itens.get(foco)?.el.setAttribute('tabindex', '-1');
    foco = id;
    item.el.setAttribute('tabindex', '0');
    item.el.focus({ preventScroll: true });
    garantirVisivel([id]);
  }

  function irmaos(id) {
    const no = plano.get(id);
    return [...plano.values()].filter((n) => n.pai === no.pai && n.lado === no.lado && n.visivel).sort((a, b) => a.y - b.y).map((n) => n.id);
  }

  function aoTeclar(e) {
    const el = e.target instanceof Element && e.target.closest('[data-no]');
    const id = el ? el.dataset.no : foco;
    const no = plano.get(id);
    if (!no) return;
    const item = itens.get(id);
    const paraFora = no.lado >= 0 ? 'ArrowRight' : 'ArrowLeft';
    const paraDentro = no.lado >= 0 ? 'ArrowLeft' : 'ArrowRight';
    let tratou = true;

    if (e.key === 'Enter' || e.key === ' ') {
      if (no.tipo === 'conceito') return; // o link navega sozinho
      item.el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    } else if (e.key === '+' || e.key === '=') panzoom.zoom(1.25);
    else if (e.key === '-') panzoom.zoom(0.8);
    else if (e.key === '0') enquadrar(true);
    else if (e.key === 'Home') focar(idRaiz);
    else if (no.tipo === 'raiz') {
      const lado = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      const alvo = lado && [...plano.values()].filter((n) => n.tipo === 'tema' && n.lado === lado).sort((a, b) => a.y - b.y);
      if (alvo?.length) focar(alvo[Math.floor((alvo.length - 1) / 2)].id);
      else tratou = false;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const lista = irmaos(id);
      const proximo = lista[lista.indexOf(id) + (e.key === 'ArrowDown' ? 1 : -1)];
      if (proximo) focar(proximo);
    } else if (e.key === paraDentro) {
      if (no.tipo === 'tema' && expandidos.has(id)) alternar(id);
      else focar(no.pai);
    } else if (e.key === paraFora && no.tipo === 'tema' && item.dados.temFilhos) {
      if (!expandidos.has(id)) alternar(id);
      focar(item.dados.tema.conceitos[0].id);
    } else tratou = false;

    if (tratou) e.preventDefault();
  }
  svg.addEventListener('keydown', aoTeclar);
  svg.addEventListener('focusin', (e) => {
    const el = e.target instanceof Element && e.target.closest('[data-no]');
    if (el && el.dataset.no !== foco) {
      itens.get(foco)?.el.setAttribute('tabindex', '-1');
      foco = el.dataset.no;
      el.setAttribute('tabindex', '0');
    }
  });

  // --- Ciclo de vida ----------------------------------------------------------------------------
  function reconstruir() {
    criarNos();
    aplicarLayout(false);
    itens.get(foco)?.el.setAttribute('tabindex', '0');
  }
  reconstruir();

  const observador = new ResizeObserver(() => {
    if (!enquadrado) enquadrar(false);
  });
  observador.observe(area);

  const aoMudarLargura = () => {
    expandidos = new Set([...expandidos]);
    reconstruir();
    enquadrar(false);
  };
  estreito.addEventListener('change', aoMudarLargura);
  // As larguras foram medidas com a fonte de reserva: mede de novo quando a fonte final chegar.
  let vivo = true;
  document.fonts?.ready.then(() => {
    if (!vivo) return;
    const visto = panzoom.vista;
    reconstruir();
    panzoom.definir(visto);
  });

  return {
    el: area,
    atualizarProgresso,
    enquadrar: () => enquadrar(true),
    zoom: (f) => panzoom.zoom(f),
    focar: () => focar(foco),
    contem: (el) => svg.contains(el),
    teclar: aoTeclar,
    estado: () => ({ expandidos: [...expandidos], vista: { ...panzoom.vista, estreito: estreito.matches } }),
    destruir() {
      vivo = false;
      mola.parar();
      panzoom.destruir();
      observador.disconnect();
      estreito.removeEventListener('change', aoMudarLargura);
    },
  };
}
