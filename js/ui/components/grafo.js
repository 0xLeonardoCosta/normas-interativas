// Grafo de conhecimento em SVG: layout de força (d3-force), arrastar nós, pan/zoom,
// destaque de vizinhos e filtros. O d3-force cuida só das posições; o desenho é próprio.
import { h, s } from '../dom.js';
import { animar, movimentoReduzido } from '../motion.js';
import { criarPanZoom } from '../panzoom.js';
import { scorePareto } from '../../content/pareto.js';
import { montarGrafo, vizinhanca, ROTULO_CONEXAO } from '../../content/graph.js';

const D3_FORCE = 'https://cdn.jsdelivr.net/npm/d3-force@3.0.0/+esm';
const raioDe = (no) => (no.externo ? 7 : 8 + (scorePareto(no.entrada.pareto) / 100) * 10);
const rotuloExterno = (id) => {
  const [norma, slug] = id.split(':');
  return `${slug.replaceAll('-', ' ')} (${norma.toUpperCase().replace(/^([A-Z]+)(\d)/, '$1 $2')})`;
};

/** Quebra um rótulo longo em até duas linhas, perto do meio. */
function quebrar(texto) {
  if (texto.length <= 22) return [texto];
  const meio = texto.length / 2;
  let corte = -1;
  for (let i = texto.indexOf(' '); i !== -1; i = texto.indexOf(' ', i + 1)) {
    if (corte === -1 || Math.abs(i - meio) < Math.abs(corte - meio)) corte = i;
  }
  return corte === -1 ? [texto] : [texto.slice(0, corte), texto.slice(corte + 1)];
}

/**
 * biblioteca: resultado de carregarBiblioteca(). obterProgresso: () => progresso do store.
 * Devolve { el, filtrar(filtro), zoom, enquadrar, atualizarProgresso, contagem(), destruir }.
 */
export async function criarGrafo({ biblioteca, obterProgresso, aoContar, recuoEsquerdo = () => 0 }) {
  const d3 = await import(D3_FORCE).catch(() => null); // sem CDN: layout circular estático
  const { nos, arestas } = montarGrafo([...biblioteca.conceitos.values()]);
  const porId = new Map(nos.map((n) => [n.id, n]));
  const vizinhos = vizinhanca(arestas);

  const gArestas = s('g', { class: 'grafo-arestas' });
  const gNos = s('g');
  const cena = s('g', null, gArestas, gNos);
  const svg = s('svg', { class: 'mapa-svg grafo-svg', role: 'group', 'aria-label': 'Grafo de conceitos. Use Tab ou as setas para percorrer os nós.' },
    s('defs', null,
      s('marker', { id: 'grafo-seta', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
        s('path', { class: 'grafo-ponta', d: 'M1 1.5 L9 5 L1 8.5 z' }))),
    cena);
  const area = h('div', { class: 'mapa-area grafo-area' }, svg);

  // --- Elementos --------------------------------------------------------------------------------
  nos.forEach((no, i) => {
    no.r = raioDe(no);
    // Posição inicial em espiral: determinística e já espalhada.
    const ang = i * 2.39996;
    const dist = 40 * Math.sqrt(i + 0.5);
    no.x = Math.cos(ang) * dist;
    no.y = Math.sin(ang) * dist;
    no.visivel = true;
    const tema = no.externo ? null : biblioteca.temaDe(no.id);
    const titulo = no.externo ? rotuloExterno(no.id) : no.entrada.titulo;
    const conteudo = [
      s('title', null, no.externo ? `${titulo}: norma ainda não disponível` : no.entrada.resumo),
      s('circle', { class: 'grafo-bolha', r: no.r }),
      s('text', { 'text-anchor': 'middle' }, quebrar(titulo).map((linha, j) => s('tspan', { x: 0, y: no.r + 15 + j * 14 }, linha))),
    ];
    no.el = no.externo
      ? s('g', { class: 'grafo-no externo', 'data-no': no.id }, conteudo)
      : s('a', { class: 'grafo-no cor-tema', href: `#/conceito/${no.id}`, 'data-no': no.id, style: { '--tema-h': tema?.matiz } }, conteudo);
    gNos.append(no.el);
  });
  for (const a of arestas) {
    a.source = porId.get(a.origem);
    a.target = porId.get(a.alvo);
    a.el = s('path', { class: `grafo-aresta ${a.tipo}`, 'marker-end': a.tipo === 'relacionado' ? null : 'url(#grafo-seta)' },
      s('title', null, `${ROTULO_CONEXAO[a.tipo]}`));
    gArestas.append(a.el);
  }

  function atualizarProgresso() {
    const { lidos } = obterProgresso();
    for (const no of nos) if (!no.externo) no.el.classList.toggle('lido', Boolean(lidos[no.id]));
  }
  atualizarProgresso();

  // --- Desenho ----------------------------------------------------------------------------------
  function pintar() {
    for (const no of nos) no.el.setAttribute('transform', `translate(${no.x.toFixed(1)} ${no.y.toFixed(1)})`);
    for (const a of arestas) {
      const { source: o, target: d } = a;
      const dx = d.x - o.x;
      const dy = d.y - o.y;
      const dist = Math.hypot(dx, dy) || 1;
      // A linha vai de borda a borda, para a seta encostar no círculo.
      const x1 = o.x + (dx / dist) * (o.r + 3);
      const y1 = o.y + (dy / dist) * (o.r + 3);
      const x2 = d.x - (dx / dist) * (d.r + 4);
      const y2 = d.y - (dy / dist) * (d.r + 4);
      a.el.setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`);
    }
  }

  const panzoom = criarPanZoom(area, {
    min: 0.3,
    max: 2.5,
    aoMudar: (v) => cena.setAttribute('transform', `translate(${v.x.toFixed(2)} ${v.y.toFixed(2)}) scale(${v.k.toFixed(4)})`),
  });

  function vistaParaCaber() {
    const visiveis = nos.filter((n) => n.visivel);
    const r = area.getBoundingClientRect();
    if (!visiveis.length || !r.width) return { x: r.width / 2, y: r.height / 2, k: 1 };
    const x0 = Math.min(...visiveis.map((n) => n.x - n.r - 70));
    const x1 = Math.max(...visiveis.map((n) => n.x + n.r + 70));
    const y0 = Math.min(...visiveis.map((n) => n.y - n.r - 20));
    const y1 = Math.max(...visiveis.map((n) => n.y + n.r + 46));
    const margem = r.width < 720 ? 16 : 40;
    const recuo = recuoEsquerdo(); // espaço ocupado pelo painel de filtros
    const largura = r.width - recuo;
    const k = Math.min(1.1, Math.max(0.3, Math.min((largura - 2 * margem) / (x1 - x0), (r.height - 2 * margem) / (y1 - y0))));
    return { x: recuo + largura / 2 - ((x0 + x1) / 2) * k, y: r.height / 2 - ((y0 + y1) / 2) * k, k };
  }
  const enquadrar = (suave = true) => (suave ? panzoom.irPara(vistaParaCaber()) : panzoom.definir(vistaParaCaber()));

  // --- Simulação --------------------------------------------------------------------------------
  let sim = null;
  let pararLaco = null;
  function configurar() {
    const ativos = nos.filter((n) => n.visivel);
    const ligacoes = arestas.filter((a) => a.source.visivel && a.target.visivel);
    if (!d3) {
      ativos.forEach((n, i) => {
        const ang = (i / ativos.length) * 2 * Math.PI - Math.PI / 2;
        const raio = 60 + ativos.length * 16;
        n.x = Math.cos(ang) * raio;
        n.y = Math.sin(ang) * raio * 0.75;
      });
      return;
    }
    sim?.stop();
    sim = d3.forceSimulation(ativos)
      .force('ligacao', d3.forceLink(ligacoes).distance((a) => 130 + a.source.r + a.target.r).strength(0.45))
      .force('carga', d3.forceManyBody().strength(-700).distanceMax(700))
      .force('colisao', d3.forceCollide().radius((n) => n.r + 52).strength(0.9))
      // A nuvem acompanha o formato da tela: mais larga em paisagem, mais alta em retrato.
      .force('x', d3.forceX(0).strength(innerWidth < innerHeight ? 0.09 : 0.045))
      .force('y', d3.forceY(0).strength(innerWidth < innerHeight ? 0.04 : 0.07))
      .stop();
  }

  /** Avança a simulação quadro a quadro até esfriar (usa o laço de rAF compartilhado). */
  function aquecer(alfa = 0.5) {
    if (!sim) return pintar();
    sim.alpha(Math.max(sim.alpha(), alfa));
    if (movimentoReduzido()) {
      while (sim.alpha() > sim.alphaMin()) sim.tick();
      return pintar();
    }
    pararLaco ??= animar(() => {
      sim.tick();
      pintar();
      if (sim.alpha() < sim.alphaMin() && !arrasto) {
        pararLaco = null;
        return false;
      }
      return true;
    });
  }

  // --- Destaque de vizinhos -------------------------------------------------------------------
  let destacado = null;
  function destacar(id) {
    if (id === destacado) return;
    destacado = id;
    area.classList.toggle('com-destaque', Boolean(id));
    const perto = id ? vizinhos.get(id) || new Set() : null;
    for (const no of nos) no.el.classList.toggle('ativo', Boolean(id) && (no.id === id || perto.has(no.id)));
    for (const a of arestas) a.el.classList.toggle('ativo', Boolean(id) && (a.origem === id || a.alvo === id));
  }
  const noDe = (e) => {
    const el = e.target instanceof Element && e.target.closest('[data-no]');
    return el ? porId.get(el.dataset.no) : null;
  };
  svg.addEventListener('pointerover', (e) => !arrasto && e.pointerType !== 'touch' && destacar(noDe(e)?.id || null));
  svg.addEventListener('pointerleave', () => {
    if (!arrasto) destacar(noDe({ target: document.activeElement })?.id || null);
  });
  svg.addEventListener('focusin', (e) => destacar(noDe(e)?.id || null));
  svg.addEventListener('focusout', () => destacar(null));

  // --- Arrastar nós -----------------------------------------------------------------------------
  let arrasto = null; // { no, id, inicio, moveu }
  const local = (e) => {
    const r = area.getBoundingClientRect();
    const v = panzoom.vista;
    return { x: (e.clientX - r.left - v.x) / v.k, y: (e.clientY - r.top - v.y) / v.k };
  };
  function aoDescer(e) {
    const no = noDe(e);
    if (!no || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.stopPropagation(); // o fundo não deve iniciar o pan
    arrasto = { no, id: e.pointerId, inicio: { x: e.clientX, y: e.clientY }, moveu: false };
    destacar(no.id);
  }
  function aoMover(e) {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    if (!arrasto.moveu) {
      if (Math.hypot(e.clientX - arrasto.inicio.x, e.clientY - arrasto.inicio.y) < 5) return;
      arrasto.moveu = true;
      area.classList.add('arrastando');
      try {
        arrasto.no.el.setPointerCapture(e.pointerId);
      } catch {
        // sem captura, o arrasto segue pelos eventos da janela
      }
    }
    const p = local(e);
    arrasto.no.fx = arrasto.no.x = p.x;
    arrasto.no.fy = arrasto.no.y = p.y;
    if (sim) {
      sim.alphaTarget(0.25);
      aquecer(0.25);
    } else pintar();
  }
  function aoSoltar(e) {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    const { no, moveu } = arrasto;
    arrasto = null;
    area.classList.remove('arrastando');
    no.fx = no.fy = null;
    sim?.alphaTarget(0);
    if (moveu) {
      // O arrasto não deve virar clique no link do nó.
      const engolir = (c) => {
        c.preventDefault();
        c.stopPropagation();
      };
      addEventListener('click', engolir, { capture: true, once: true });
      setTimeout(() => removeEventListener('click', engolir, true), 80);
    }
    if (e.pointerType === 'touch') destacar(null);
  }
  svg.addEventListener('pointerdown', aoDescer);
  addEventListener('pointermove', aoMover);
  addEventListener('pointerup', aoSoltar);
  addEventListener('pointercancel', aoSoltar);
  // Links em SVG são arrastáveis por padrão; isso disputaria com o arrasto do nó.
  svg.addEventListener('dragstart', (e) => e.preventDefault());

  // --- Teclado ----------------------------------------------------------------------------------
  svg.addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=') return panzoom.zoom(1.25);
    if (e.key === '-') return panzoom.zoom(0.8);
    if (e.key === '0') return enquadrar();
    const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
    const atual = noDe(e);
    if (!dir || !atual) return;
    e.preventDefault();
    // Vai para o nó navegável mais próximo dentro de um cone na direção da seta.
    let melhor = null;
    for (const no of nos) {
      if (no === atual || !no.visivel || no.externo) continue;
      const dx = no.x - atual.x;
      const dy = no.y - atual.y;
      const frente = dx * dir[0] + dy * dir[1];
      const lado = Math.abs(dx * dir[1] - dy * dir[0]);
      if (frente <= 0 || lado > frente * 1.6) continue;
      const custo = frente + lado * 2;
      if (!melhor || custo < melhor.custo) melhor = { no, custo };
    }
    melhor?.no.el.focus({ preventScroll: true });
  });

  // --- Filtros ----------------------------------------------------------------------------------
  function filtrar({ temas, status, scoreMin }) {
    for (const no of nos) {
      if (no.externo) continue;
      const e = no.entrada;
      no.visivel = (!temas || temas.has(e.tema)) && (!status || e.status === status) && scorePareto(e.pareto) >= (scoreMin || 0);
    }
    // Um nó externo só aparece se algum vizinho visível aponta para ele.
    for (const no of nos) {
      if (no.externo) no.visivel = [...(vizinhos.get(no.id) || [])].some((id) => porId.get(id).visivel && !porId.get(id).externo);
    }
    for (const no of nos) {
      no.el.classList.toggle('oculto', !no.visivel);
      if (no.visivel) no.el.removeAttribute('aria-hidden');
      else no.el.setAttribute('aria-hidden', 'true');
      if (!no.externo) no.el.setAttribute('tabindex', no.visivel ? '0' : '-1');
    }
    for (const a of arestas) a.el.classList.toggle('oculto', !(a.source.visivel && a.target.visivel));
    configurar();
    aquecer(0.6);
    clearTimeout(filtrar.espera);
    filtrar.espera = setTimeout(() => enquadrar(), movimentoReduzido() ? 0 : 420);
    aoContar?.(contagem());
  }

  function contagem() {
    return {
      conceitos: nos.filter((n) => n.visivel && !n.externo).length,
      conexoes: arestas.filter((a) => a.source.visivel && a.target.visivel).length,
      total: nos.filter((n) => !n.externo).length,
    };
  }

  // --- Ciclo de vida ----------------------------------------------------------------------------
  configurar();
  if (sim) for (let i = 0; i < 260; i++) sim.tick(); // chega acomodado: sem "explosão" na entrada
  pintar();

  const observador = new ResizeObserver(() => {
    if (area.getBoundingClientRect().width > 0) enquadrar(false);
  });
  observador.observe(area);

  return {
    el: area,
    filtrar,
    contagem,
    atualizarProgresso,
    enquadrar,
    zoom: (f) => panzoom.zoom(f),
    semLayoutDeForca: !d3,
    destruir() {
      clearTimeout(filtrar.espera);
      observador.disconnect();
      sim?.stop();
      pararLaco?.();
      panzoom.destruir();
      removeEventListener('pointermove', aoMover);
      removeEventListener('pointerup', aoSoltar);
      removeEventListener('pointercancel', aoSoltar);
    },
  };
}
