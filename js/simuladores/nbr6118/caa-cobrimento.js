// Simulador: classe de agressividade → concreto mínimo e cobrimento, com corte de viga em escala.
// Toda a conta vem de js/calc/nbr6118/durabilidade.js; aqui só há interface e desenho.
import { h, s, numero } from '../../ui/dom.js';
import { criarMola } from '../../ui/motion.js';
import { selo } from '../../ui/components/selo.js';
import { legendaSelo } from '../controles.js';
import { carregarDados } from '../../content/loader.js';
import { alturaUtil, espacamentoLivre } from '../../calc/nbr6118/durabilidade.js';
import { exigenciasDeCobrimento, espacamentoMinimoHorizontal } from '../../calc/nbr6118/detalhamento.js';
import { linhasDeRequisitos } from './resolvedores.js';

// Bitolas e britas comerciais usuais (mm). Não são valores normativos desta norma: servem só às opções.
const BRITAS = [{ valor: 9.5, titulo: 'Brita 0', detalhe: 'dmáx 9,5 mm' }, { valor: 19, titulo: 'Brita 1', detalhe: 'dmáx 19 mm' }, { valor: 25, titulo: 'Brita 2', detalhe: 'dmáx 25 mm' }];
const ESTRIBOS = [5, 6.3, 8, 10];
const BARRAS = [10, 12.5, 16, 20, 25];
const LADO = 300; // área útil do desenho, em unidades do viewBox

let contador = 0;

export async function montar(container) {
  const [t, det] = await Promise.all([carregarDados('nbr6118', 'durabilidade'), carregarDados('nbr6118', 'detalhamento')]);
  const uid = `sim-caa-${++contador}`;

  const estado = { caa: 'II', elemento: 'viga-pilar', controleRigoroso: false, bw: 200, h: 500, iT: 0, iL: 2, n: 3, dmax: 19 };

  // --- Controles --------------------------------------------------------------------------------
  const grupo = (legenda, nome, opcoes, atual) =>
    h('fieldset', { class: 'sim-grupo' },
      h('legend', null, legenda),
      h('div', { class: 'segmentos' },
        opcoes.map((o) =>
          h('label', { class: 'segmento' },
            h('input', { type: 'radio', name: `${uid}-${nome}`, value: o.valor, checked: o.valor === atual, onchange: () => { estado[nome] = o.valor; atualizar(); } }),
            h('span', null, h('strong', null, o.titulo), o.detalhe && h('small', null, o.detalhe)),
          ))),
    );

  const deslizante = (rotulo, chave, { min, max, passo = 1, formatar }) => {
    const saida = h('output', { for: `${uid}-${chave}` });
    const entrada = h('input', { type: 'range', id: `${uid}-${chave}`, min, max, step: passo, value: estado[chave] });
    const mostrar = () => {
      saida.textContent = formatar(estado[chave]);
      entrada.setAttribute('aria-valuetext', saida.textContent);
      entrada.style.setProperty('--p', `${((estado[chave] - min) / (max - min)) * 100}%`);
    };
    entrada.addEventListener('input', () => { estado[chave] = Number(entrada.value); mostrar(); atualizar(); });
    mostrar();
    return h('div', { class: 'deslizante' }, h('label', { for: `${uid}-${chave}` }, rotulo), saida, entrada);
  };

  const controles = h('div', { class: 'sim-controles' },
    grupo('Ambiente', 'caa',
      t.classesAgressividade.itens.map((c) => ({ valor: c.id, titulo: `CAA ${c.id}`, detalhe: c.ambientes.join(' · ') })), estado.caa),
    grupo('Elemento', 'elemento', t.elementos.map((e) => ({ valor: e.id, titulo: e.nome })), estado.elemento),
    h('label', { class: 'alternador' },
      h('input', { type: 'checkbox', role: 'switch', onchange: (e) => { estado.controleRigoroso = e.target.checked; atualizar(); } }),
      h('i', { 'aria-hidden': 'true' }),
      h('span', null, 'Controle rigoroso de execução', h('small', null, 'Reduz a tolerância Δc')),
    ),
    grupo('Agregado graúdo', 'dmax', BRITAS, estado.dmax),
    h('details', { class: 'sim-secao', open: true },
      h('summary', null, 'Geometria da seção'),
      h('div', { class: 'sim-deslizantes' },
        deslizante('Largura', 'bw', { min: 120, max: 600, passo: 10, formatar: (v) => `${numero(v / 10)} cm` }),
        deslizante('Altura', 'h', { min: 300, max: 1000, passo: 50, formatar: (v) => `${numero(v / 10)} cm` }),
        deslizante('Estribo', 'iT', { min: 0, max: ESTRIBOS.length - 1, formatar: (i) => `φ ${numero(ESTRIBOS[i], ESTRIBOS[i] % 1 ? 1 : 0)} mm` }),
        deslizante('Barras', 'iL', { min: 0, max: BARRAS.length - 1, formatar: (i) => `φ ${numero(BARRAS[i], BARRAS[i] % 1 ? 1 : 0)} mm` }),
        deslizante('Quantidade', 'n', { min: 2, max: 6, formatar: (v) => `${v} barras` }),
      ),
    ),
  );

  // --- Desenho ----------------------------------------------------------------------------------
  const e = {
    concreto: s('rect', { class: 'sim-concreto' }),
    faixa: s('path', { class: 'sim-faixa', 'fill-rule': 'evenodd' }),
    estribo: s('rect', { class: 'sim-estribo' }),
    barras: s('g', { class: 'sim-barras' }),
    cotaC: s('g', { class: 'sim-cota sim-cota-c' }, s('path'), s('text', { 'dominant-baseline': 'middle' })),
    cotaD: s('g', { class: 'sim-cota' }, s('path'), s('text', { 'text-anchor': 'end', 'dominant-baseline': 'middle' })),
    escala: s('g', { class: 'sim-cota sim-escala' }, s('path'), s('text', { 'text-anchor': 'middle' })),
  };
  const desenho = s('svg', { class: 'sim-desenho', viewBox: '-110 -20 520 370', role: 'img' }, s('title'), ...Object.values(e));
  const nota = h('p', { class: 'sim-nota', role: 'status' });
  const paineis = h('dl', { class: 'sim-resultados', 'aria-live': 'polite' });
  const legenda = legendaSelo();

  let alvo = null; // último resultado calculado
  const mola = criarMola({ valor: 30, rigidez: 260, amortecimento: 24, precisao: 0.02, aoMudar: desenhar });

  function desenhar(c) {
    if (!alvo) return;
    const { bw, h: alt } = estado;
    const fiT = ESTRIBOS[estado.iT];
    const fiL = BARRAS[estado.iL];
    const k = Math.min(LADO / bw, LADO / alt); // px por mm: a seção é desenhada em escala
    const L = bw * k;
    const A = alt * k;
    const x0 = (LADO - L) / 2;
    const y0 = (LADO - A) / 2;
    const ck = Math.max(0, c) * k;

    for (const [chave, valor] of Object.entries({ x: x0, y: y0, width: L, height: A })) e.concreto.setAttribute(chave, valor);

    // Faixa de cobrimento: entre a face do concreto e a face externa do estribo.
    const ix = x0 + ck, iy = y0 + ck, iL = Math.max(0, L - 2 * ck), iA = Math.max(0, A - 2 * ck);
    e.faixa.setAttribute('d', `M${x0} ${y0}h${L}v${A}h${-L}z M${ix} ${iy}v${iA}h${iL}v${-iA}z`);

    const tk = fiT * k;
    const meio = tk / 2;
    for (const [chave, valor] of Object.entries({
      x: ix + meio, y: iy + meio, width: Math.max(0, iL - tk), height: Math.max(0, iA - tk), rx: 2 * tk, 'stroke-width': Math.max(1, tk),
    })) e.estribo.setAttribute(chave, valor);

    const r = (fiL / 2) * k;
    const dentroX = ix + tk + r;
    const largura = iL - 2 * tk - 2 * r;
    const yInferior = y0 + A - ck - tk - r;
    const ySuperior = iy + tk + Math.min(r, 4 * k);
    const circulos = [];
    for (let i = 0; i < estado.n; i++) {
      circulos.push(s('circle', { cx: dentroX + (largura * i) / (estado.n - 1), cy: yInferior, r: Math.max(1.2, r) }));
    }
    for (const lado of [0, 1]) {
      circulos.push(s('circle', { class: 'montagem', cx: ix + tk + 4 * k + lado * (iL - 2 * tk - 8 * k), cy: ySuperior, r: Math.max(1.2, 4 * k) }));
    }
    e.barras.replaceChildren(...circulos);

    // Cota do cobrimento (à direita, na base) e da altura útil (à esquerda).
    const xc = x0 + L + 14;
    e.cotaC.firstChild.setAttribute('d', `M${x0 + L + 4} ${y0 + A}h18 M${x0 + L + 4} ${y0 + A - ck}h18 M${xc} ${y0 + A}v${-ck}`);
    const rotuloC = e.cotaC.lastChild;
    rotuloC.setAttribute('x', xc + 12);
    rotuloC.setAttribute('y', y0 + A - ck / 2);
    rotuloC.textContent = `c = ${numero(Math.round(c))} mm`;

    const xd = x0 - 14;
    e.cotaD.firstChild.setAttribute('d', `M${x0 - 22} ${y0}h18 M${x0 - 22} ${yInferior}h18 M${xd} ${y0}V${yInferior}`);
    const rotuloD = e.cotaD.lastChild;
    rotuloD.setAttribute('x', xd - 10);
    rotuloD.setAttribute('y', (y0 + yInferior) / 2);
    rotuloD.textContent = `d = ${numero(alturaUtil({ h: alt, c, fiT, fiL }) / 10, 1)} cm`;

    const barra = 100 * k; // 10 cm
    e.escala.firstChild.setAttribute('d', `M${x0} ${LADO + 22}v8 M${x0} ${LADO + 26}h${barra} M${x0 + barra} ${LADO + 22}v8`);
    e.escala.lastChild.setAttribute('x', x0 + barra / 2);
    e.escala.lastChild.setAttribute('y', LADO + 42);
    e.escala.lastChild.textContent = '10 cm';
  }

  function atualizar() {
    const { requisitos: r, linhas } = linhasDeRequisitos(t, estado);
    alvo = r;
    const fiT = ESTRIBOS[estado.iT];
    const fiL = BARRAS[estado.iL];
    const c = r.cobrimentoNominal;
    const d = alturaUtil({ h: estado.h, c, fiT, fiL });
    const livre = espacamentoLivre({ bw: estado.bw, c, fiT, fiL, n: estado.n });
    const exig = exigenciasDeCobrimento(det, { cNom: c, fi: fiL, dmax: estado.dmax });
    const esp = espacamentoMinimoHorizontal(det, { fi: fiL, dmax: estado.dmax });
    const pend = (b) => b.pendenteValidacao !== false;

    const item = (l) =>
      h('div', { class: l.destaque ? 'destaque' : null },
        h('dt', null, l.rotulo),
        h('dd', null, l.valor, l.pendente && selo(l.referencia, { compacto: true })));
    const minimoPendente = t.cobrimentoNominal.pendenteValidacao !== false;
    paineis.replaceChildren(
      ...linhas.map(item),
      item({ rotulo: 'Cobrimento mínimo (c_nom − Δc)', valor: `${numero(r.cobrimentoMinimo)} mm`, pendente: minimoPendente, referencia: t.cobrimentoNominal.referencia }),
      item({ rotulo: 'Altura útil d', valor: `${numero(d / 10, 1)} cm` }),
      item({ rotulo: 'Espaço livre entre barras', valor: `${numero(livre, 0)} mm` }),
      item({ rotulo: 'Espaço livre mínimo', valor: `${numero(esp.minimo, 1)} mm`, pendente: pend(det.espacamentoHorizontal), referencia: det.espacamentoHorizontal.referencia }),
      item({ rotulo: 'Brita máxima para este cobrimento', valor: `${numero(exig.dmaxPermitido, 1)} mm`, pendente: pend(det.cobrimentoEAgregado), referencia: det.cobrimentoEAgregado.referencia }),
    );
    legenda.hidden = !minimoPendente && !linhas.some((l) => l.pendente)
      && ![det.espacamentoHorizontal, det.cobrimentoEAgregado, det.cobrimentoEBarra].some(pend);

    nota.className = 'sim-nota';
    if (livre < 0) {
      nota.classList.add('alerta');
      nota.textContent = 'As barras não cabem em uma camada com esta largura e este cobrimento. Reduza a quantidade ou aumente a largura.';
    } else if (livre < esp.minimo) {
      nota.classList.add('alerta');
      const motivo = { absoluto: 'pelo mínimo absoluto', diametro: 'pelo diâmetro da barra', agregado: 'pelo tamanho da brita' }[esp.governa];
      nota.textContent = `Sobram ${numero(livre, 0)} mm entre as barras, menos que o mínimo de ${numero(esp.minimo, 1)} mm (governado ${motivo}). O concreto não passaria bem entre elas.`;
    } else if (!exig.atendeBarra) {
      nota.classList.add('alerta');
      nota.textContent = `O cobrimento de ${numero(c)} mm é menor do que o exigido para uma barra de ${numero(fiL, fiL % 1 ? 1 : 0)} mm. Barras grossas pedem cobrimento maior.`;
    } else if (!exig.atendeAgregado) {
      nota.classList.add('alerta');
      nota.textContent = `A brita escolhida não cabe bem num cobrimento de ${numero(c)} mm: o limite é ${numero(exig.dmaxPermitido, 1)} mm. Use uma brita menor ou aumente o cobrimento.`;
    } else if (estado.elemento === 'laje') {
      nota.textContent = 'O cobrimento mostrado é o de laje. O desenho mantém a seção de viga apenas como referência visual de escala.';
    } else {
      nota.textContent = 'O cobrimento é medido até a face externa do estribo. Repare como a altura útil d diminui quando ele aumenta.';
    }

    desenho.querySelector('title').textContent =
      `Corte de viga de ${numero(estado.bw / 10)} por ${numero(estado.h / 10)} cm com cobrimento nominal de ${numero(c)} mm e altura útil de ${numero(d / 10, 1)} cm.`;

    // O cobrimento desliza até o novo valor com mola; a geometria responde na hora.
    if (mola.alvo === c) desenhar(mola.valor);
    else mola.definir(c);
  }

  container.replaceChildren(
    h('div', { class: 'simulador' },
      controles,
      h('div', { class: 'sim-palco' }, desenho, nota),
      h('div', { class: 'sim-saida' },
        paineis,
        legenda,
      ),
    ),
  );
  alvo = linhasDeRequisitos(t, estado).requisitos;
  mola.definir(alvo.cobrimentoNominal, { imediato: true });
  atualizar();

  return () => mola.parar();
}
