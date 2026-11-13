// Simulador genérico: a mesma viga, as mesmas cargas, combinadas para cada estado-limite.
// Serve a qualquer norma que descreva suas ações em dados/acoes.json no formato padrão
// (ver js/calc/comum/combinacoes.js). Registro: paraNorma('<id da norma>').
import { h, s, numero } from '../../ui/dom.js';
import { criarMola } from '../../ui/motion.js';
import { carregarDados } from '../../content/loader.js';
import { combinacoesDaViga, categoriaDeUso, momentoBiapoiada } from '../../calc/comum/combinacoes.js';
import { novoUid, grupo, deslizante, criarPaineis } from '../controles.js';

const L = 520;
const BX = 20; // início das barras
const UTIL = 330; // largura máxima das barras
const Y_BARRAS = 140;
const LINHA = 58;

export const paraNorma = (normaId) => ({ montar: (container) => montar(container, normaId) });

async function montar(container, normaId) {
  const t = await carregarDados(normaId, 'acoes');
  const combos = t.combinacoes.itens;
  const uid = novoUid('sim-comb');
  const estado = { vao: 6, g: 20, q: 10, categoria: t.fatoresDeCombinacao.itens[0].id };

  const controles = h('div', { class: 'sim-controles' },
    h('div', { class: 'sim-deslizantes' },
      deslizante({ uid, rotulo: 'Vão da viga', chave: 'vao', min: 3, max: 12, passo: 0.5, formatar: (v) => `${numero(v, 1)} m`, estado, aoMudar: atualizar }),
      deslizante({ uid, rotulo: 'Carga permanente g', chave: 'g', min: 2, max: 60, formatar: (v) => `${v} kN/m`, estado, aoMudar: atualizar }),
      deslizante({ uid, rotulo: 'Carga variável q', chave: 'q', min: 0, max: 60, formatar: (v) => `${v} kN/m`, estado, aoMudar: atualizar }),
    ),
    grupo({
      uid, legenda: 'Uso da carga variável', chave: 'categoria', estado, aoMudar: atualizar,
      opcoes: t.fatoresDeCombinacao.itens.map((c) => ({
        valor: c.id, titulo: c.nome,
        detalhe: `ψ0 ${numero(c.psi0, 1)} · ψ1 ${numero(c.psi1, 1)} · ψ2 ${numero(c.psi2, 1)}`,
      })),
    }),
  );

  // --- Desenho ----------------------------------------------------------------------------------
  const viga = s('g', { class: 'comb-viga' },
    s('path', { class: 'comb-carga-g' }),
    s('path', { class: 'comb-carga-q' }),
    s('rect', { class: 'sim-concreto', x: 60, y: 74, width: 400, height: 12, rx: 2 }),
    s('path', { class: 'comb-apoio', d: 'M60 86l-9 15h18z M460 86l-9 15h18z M44 104h32 M444 104h32' }),
    s('g', { class: 'sim-cota' }, s('path', { d: 'M60 114v8 M460 114v8 M60 118H460' }), s('text', { class: 'comb-vao', x: 260, y: 134, 'text-anchor': 'middle' })),
  );
  const linhas = combos.map((c, i) => {
    const y = Y_BARRAS + i * LINHA + 18;
    return {
      g: s('g', { class: `comb-linha comb-${c.id}` },
        s('text', { class: 'comb-nome', x: BX, y: y - 6 }, c.nome),
        s('rect', { class: 'comb-perm', x: BX, y, height: 20, rx: 3 }),
        s('rect', { class: 'comb-var', y, height: 20, rx: 3 }),
        s('text', { class: 'comb-valor', y: y + 14 }),
      ),
      molaG: null,
      molaQ: null,
    };
  });
  const titulo = s('title');
  const altura = Y_BARRAS + combos.length * LINHA + 4;
  const desenho = s('svg', { class: 'sim-desenho', viewBox: `0 0 ${L} ${altura}`, role: 'img' }, titulo, viga, ...linhas.map((l) => l.g));
  const nota = h('p', { class: 'sim-nota', role: 'status' });
  const paineis = criarPaineis();

  let atual = null;
  const escala = criarMola({ valor: 100, rigidez: 180, amortecimento: 28, precisao: 0.05, aoMudar: desenhar });
  for (const l of linhas) {
    l.molaG = criarMola({ valor: 0, rigidez: 260, amortecimento: 26, precisao: 0.01, aoMudar: desenhar });
    l.molaQ = criarMola({ valor: 0, rigidez: 260, amortecimento: 26, precisao: 0.01, aoMudar: desenhar });
  }

  function desenhar() {
    if (!atual) return;
    const k = UTIL / Math.max(1, escala.valor);
    linhas.forEach((l, i) => {
      const [, perm, vari, valor] = l.g.children;
      const wG = Math.max(0, l.molaG.valor * k);
      const wQ = Math.max(0, l.molaQ.valor * k);
      perm.setAttribute('width', wG);
      vari.setAttribute('x', BX + wG);
      vari.setAttribute('width', wQ);
      valor.setAttribute('x', BX + wG + wQ + 8);
      const r = atual.r[combos[i].id];
      valor.textContent = `${numero(r.valor, 1)} kN/m · M ${numero(momentoBiapoiada(r.valor, estado.vao), 0)} kN·m`;
    });
  }

  /** Carga distribuída desenhada como faixa de setas sobre a viga. */
  function carga(el, topo, base, passo = 25) {
    if (base - topo < 1) return el.setAttribute('d', '');
    let d = `M60 ${topo}H460`;
    for (let x = 60; x <= 460; x += passo) d += ` M${x} ${topo}V${base} m-3 -5 l3 5 l3 -5`;
    el.setAttribute('d', d);
  }

  function atualizar() {
    const r = combinacoesDaViga(t, estado);
    const cat = categoriaDeUso(t, estado.categoria);
    atual = { r };

    // Cargas características sobre a viga: g embaixo, q em cima, alturas proporcionais.
    const total = estado.g + estado.q;
    const kc = 48 / 120; // px por kN/m
    const hG = Math.max(4, estado.g * kc);
    const hQ = estado.q * kc;
    carga(viga.children[0], 70 - hG, 70);
    carga(viga.children[1], 70 - hG - hQ, 70 - hG - 2, 25);
    viga.querySelector('.comb-vao').textContent = `L = ${numero(estado.vao, 1)} m · cargas características g + q = ${total} kN/m`;

    const parcela = (res, papel) => res.parcelas.filter((p) => (papel === 'g' ? p.papel === 'permanente' : p.papel !== 'permanente')).reduce((s2, p) => s2 + p.parcela, 0);
    const maior = Math.max(...combos.map((c) => r[c.id].valor));
    const alvoEscala = Math.max(20, Math.ceil(maior / 20) * 20);
    if (escala.alvo !== alvoEscala) escala.definir(alvoEscala);
    linhas.forEach((l, i) => {
      const res = r[combos[i].id];
      l.molaG.definir(parcela(res, 'g'));
      l.molaQ.definir(parcela(res, 'q'));
    });

    paineis.mostrar(combos.map((c, i) => ({
      rotulo: `${c.nome}: ${c.uso}`,
      valor: `${numero(r[c.id].valor, 1)} kN/m · ${numero(momentoBiapoiada(r[c.id].valor, estado.vao), 0)} kN·m`,
      bloco: c.principal.includes('gama') ? t.ponderacao : t.fatoresDeCombinacao,
      destaque: i === 0,
    })).concat([{ rotulo: 'Regras de combinação', valor: t.combinacoes.referencia, bloco: t.combinacoes }]));

    const [elu, ...els] = combos.map((c) => r[c.id].valor);
    nota.className = 'sim-nota';
    nota.textContent = estado.q === 0
      ? 'Sem carga variável, as combinações de serviço ficam iguais à carga permanente; só o ELU a majora.'
      : `As mesmas cargas valem ${numero(elu, 1)} kN/m para romper a viga, mas só ${numero(els[0], 1)} kN/m acontecem com frequência e ${numero(els[els.length - 1], 1)} kN/m ficam por longos períodos. Por isso cada verificação usa a sua combinação.`;
    titulo.textContent = `Viga biapoiada de ${numero(estado.vao, 1)} m com g = ${estado.g} kN/m e q = ${estado.q} kN/m (${cat.nome}). ${combos.map((c) => `${c.nome}: ${numero(r[c.id].valor, 1)} kN/m`).join('; ')}.`;
    desenhar();
  }

  container.replaceChildren(
    h('div', { class: 'simulador' },
      controles,
      h('div', { class: 'sim-palco' }, desenho, h('ul', { class: 'comb-legenda', 'aria-hidden': 'true' },
        h('li', null, h('i', { class: 'comb-perm' }), 'parcela permanente'),
        h('li', null, h('i', { class: 'comb-var' }), 'parcela variável')), nota),
      h('div', { class: 'sim-saida' }, paineis.el, paineis.legenda),
    ),
  );
  atualizar();
  escala.definir(escala.alvo, { imediato: true });
  for (const l of linhas) {
    l.molaG.definir(l.molaG.alvo, { imediato: true });
    l.molaQ.definir(l.molaQ.alvo, { imediato: true });
  }

  return () => {
    escala.parar();
    for (const l of linhas) { l.molaG.parar(); l.molaQ.parar(); }
  };
}
