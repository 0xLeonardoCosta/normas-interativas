// Simulador: abertura de fissuras de uma viga de concreto armado, calculada a partir do momento
// em serviço e da seção (estádio II). Toda a conta vem de js/calc/nbr6118/fissuracao.js.
import { h, s, numero } from '../../ui/dom.js';
import { criarMola } from '../../ui/motion.js';
import { carregarDados } from '../../content/loader.js';
import { fissuracaoDaViga } from '../../calc/nbr6118/fissuracao.js';
import { novoUid, grupo, deslizante, criarPaineis } from '../controles.js';

// Bitolas comerciais usuais (mm). Não são valores normativos: servem só às opções do simulador.
const BARRAS = [10, 12.5, 16, 20, 25, 32];
const ESTRIBOS = [5, 6.3, 8, 10];
const ACO = 'CA-50';

const SEC = { x0: 24, larg: 210, y0: 26, alt: 250 }; // área do desenho da seção
const EIXO = 330; // eixo do diagrama de tensões
const GAUGE = { x: 24, y: 318, larg: 440 };

const mm = (v, casas = 0) => `${numero(v, casas)} mm`;
const bitola = (v) => numero(v, v % 1 ? 1 : 0);

export async function montar(container) {
  const [fis, mat, anc, dur] = await Promise.all(['fissuracao', 'materiais', 'ancoragem', 'durabilidade'].map((n) => carregarDados('nbr6118', n)));
  const tabelas = { fis, mat, anc, dur };
  const uid = novoUid('sim-fis');
  const estado = { caa: 'II', Mk: 60, fck: 25, bw: 200, h: 500, iFi: 2, n: 3, c: 30, iT: 0 };

  const controles = h('div', { class: 'sim-controles' },
    grupo({
      uid, legenda: 'Ambiente', chave: 'caa', estado, aoMudar: atualizar,
      opcoes: dur.classesAgressividade.itens.map((c) => ({ valor: c.id, titulo: `CAA ${c.id}`, detalhe: `w_k ≤ ${numero(dur.aberturaFissuras.armado[c.id], 1)} mm` })),
    }),
    h('div', { class: 'sim-deslizantes' },
      deslizante({ uid, rotulo: 'Momento em serviço (combinação frequente)', chave: 'Mk', min: 10, max: 400, passo: 5, formatar: (v) => `${v} kN·m`, estado, aoMudar: atualizar }),
      deslizante({ uid, rotulo: 'Concreto', chave: 'fck', min: mat.classes.fckMin, max: mat.classes.fckMax, passo: 5, formatar: (v) => `C${v}`, estado, aoMudar: atualizar }),
    ),
    h('details', { class: 'sim-secao', open: true },
      h('summary', null, `Seção e armadura (${ACO})`),
      h('div', { class: 'sim-deslizantes' },
        deslizante({ uid, rotulo: 'Barras', chave: 'iFi', min: 0, max: BARRAS.length - 1, formatar: (i) => `φ ${bitola(BARRAS[i])} mm`, estado, aoMudar: atualizar }),
        deslizante({ uid, rotulo: 'Quantidade', chave: 'n', min: 2, max: 8, formatar: (v) => `${v} barras`, estado, aoMudar: atualizar }),
        deslizante({ uid, rotulo: 'Largura', chave: 'bw', min: 150, max: 500, passo: 10, formatar: (v) => `${numero(v / 10)} cm`, estado, aoMudar: atualizar }),
        deslizante({ uid, rotulo: 'Altura', chave: 'h', min: 300, max: 1000, passo: 50, formatar: (v) => `${numero(v / 10)} cm`, estado, aoMudar: atualizar }),
        deslizante({ uid, rotulo: 'Cobrimento', chave: 'c', min: 20, max: 55, passo: 5, formatar: (v) => mm(v), estado, aoMudar: atualizar }),
        deslizante({ uid, rotulo: 'Estribo', chave: 'iT', min: 0, max: ESTRIBOS.length - 1, formatar: (i) => `φ ${bitola(ESTRIBOS[i])} mm`, estado, aoMudar: atualizar }),
      ),
    ),
  );

  // --- Desenho ----------------------------------------------------------------------------------
  const e = {
    comprimida: s('rect', { class: 'fis-comprimida' }),
    concreto: s('rect', { class: 'sim-concreto fis-contorno' }),
    fissuras: s('g', { class: 'fis-fissuras' }),
    envolvimento: s('rect', { class: 'fis-envolvimento' }),
    estribo: s('rect', { class: 'sim-estribo' }),
    barras: s('g', { class: 'sim-barras' }),
    ln: s('g', { class: 'fis-ln' }, s('path'), s('text', { 'text-anchor': 'end' })),
    eixo: s('path', { class: 'fis-eixo' }),
    compressao: s('g', { class: 'fis-compressao' }, s('path'), s('text')),
    tracao: s('g', { class: 'fis-tracao' }, s('path'), s('text')),
    trilho: s('rect', { class: 'fis-trilho', x: GAUGE.x, y: GAUGE.y, width: GAUGE.larg, height: 10, rx: 5 }),
    medida: s('rect', { class: 'fis-medida', x: GAUGE.x, y: GAUGE.y, height: 10, rx: 5 }),
    limite: s('g', { class: 'fis-limite' }, s('path'), s('text', { 'text-anchor': 'middle' })),
    leitura: s('text', { class: 'fis-leitura', x: GAUGE.x, y: GAUGE.y - 8 }),
  };
  const titulo = s('title');
  const desenho = s('svg', { class: 'sim-desenho', viewBox: '0 0 520 346', role: 'img' }, titulo, ...Object.values(e));
  const nota = h('p', { class: 'sim-nota', role: 'status' });
  const paineis = criarPaineis();

  let atual = null;
  const molas = {
    wk: criarMola({ valor: 0, rigidez: 240, amortecimento: 26, precisao: 0.0005, aoMudar: desenhar }),
    x: criarMola({ valor: 100, rigidez: 240, amortecimento: 26, precisao: 0.05, aoMudar: desenhar }),
  };

  const definir = (el, attrs) => { for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); };

  function desenhar() {
    if (!atual) return;
    const { r, fi, fiT } = atual;
    const { bw, h: alt, c, n } = estado;
    const k = Math.min(SEC.larg / bw, SEC.alt / alt);
    const L = bw * k, A = alt * k;
    const x0 = SEC.x0 + (SEC.larg - L) / 2, y0 = SEC.y0;
    const yLN = y0 + molas.x.valor * k;
    const yBarra = y0 + r.d * k;

    definir(e.concreto, { x: x0, y: y0, width: L, height: A });
    definir(e.comprimida, { x: x0, y: y0, width: L, height: Math.max(0, yLN - y0) });

    const ck = c * k, tk = fiT * k;
    definir(e.estribo, { x: x0 + ck + tk / 2, y: y0 + ck + tk / 2, width: L - 2 * ck - tk, height: A - 2 * ck - tk, rx: 2 * tk, 'stroke-width': Math.max(1, tk) });

    const eixoLat = (c + fiT + fi / 2) * k;
    const passo = r.s * k;
    const xs = Array.from({ length: n }, (_, i) => x0 + eixoLat + i * passo);
    e.barras.replaceChildren(...xs.map((cx) => s('circle', { cx, cy: yBarra, r: Math.max(1.4, (fi / 2) * k) })));

    // Área de envolvimento da barra que governa (de canto ou interna).
    const raio = fis.regiaoDeEnvolvimento.raioEmDiametros.valor * fi * k;
    const cx = atual.r.critica.posicao === 'canto' ? xs[0] : xs[1];
    const esq = Math.min(raio, cx - x0, atual.r.critica.posicao === 'canto' ? Infinity : passo / 2);
    const dir = Math.min(raio, passo / 2);
    const cima = Math.min(raio, yBarra - y0);
    const baixo = Math.min(raio, y0 + A - yBarra);
    definir(e.envolvimento, { x: cx - esq, y: yBarra - cima, width: esq + dir, height: cima + baixo });

    // Fissuras entre as barras: sobem da face tracionada até perto da linha neutra.
    const largura = Math.min(6, 0.6 + molas.wk.valor * 9);
    const fissuras = [];
    const pontos = n >= 2 ? xs.slice(0, -1).map((v, i) => (v + xs[i + 1]) / 2) : [];
    for (const [i, fx] of pontos.entries()) {
      const topo = yLN + (y0 + A - yLN) * (0.12 + 0.1 * (i % 2));
      fissuras.push(s('path', { d: `M${fx - 2} ${y0 + A}L${fx + 2} ${(y0 + A + topo) / 2}L${fx - 1} ${topo}`, 'stroke-width': largura }));
    }
    e.fissuras.replaceChildren(...fissuras);

    // Linha neutra, atravessando a seção e o diagrama de tensões.
    e.ln.firstChild.setAttribute('d', `M${x0 - 6} ${yLN}H${EIXO + 150}`);
    definir(e.ln.lastChild, { x: EIXO + 150, y: yLN - 6 });
    e.ln.lastChild.textContent = `LN · x = ${numero(molas.x.valor / 10, 1)} cm`;

    e.eixo.setAttribute('d', `M${EIXO} ${y0}V${y0 + A}`);
    const wc = Math.min(130, r.sigmaC * 7);
    e.compressao.firstChild.setAttribute('d', `M${EIXO} ${y0}h${-wc}L${EIXO} ${yLN}z`);
    definir(e.compressao.lastChild, { x: EIXO - wc - 6, y: y0 + 12, 'text-anchor': 'end' });
    e.compressao.lastChild.textContent = `σc ${numero(r.sigmaC, 1)} MPa`;
    const ws = Math.min(160, (r.sigmaS / r.fyk) * 160);
    e.tracao.firstChild.setAttribute('d', `M${EIXO} ${yBarra}h${ws} m-7 -5 l7 5 l-7 5`);
    definir(e.tracao.lastChild, { x: EIXO + 8, y: yBarra + 18 });
    e.tracao.lastChild.textContent = `σs ${numero(r.sigmaS, 0)} MPa`;

    // Medidor: a abertura estimada contra o limite do ambiente (escala até 2 × o limite).
    const fundo = 2 * r.limite;
    const kx = GAUGE.larg / fundo;
    e.medida.setAttribute('width', Math.max(0, Math.min(GAUGE.larg, molas.wk.valor * kx)));
    e.medida.classList.toggle('excede', molas.wk.valor > r.limite);
    const xl = GAUGE.x + r.limite * kx;
    e.limite.firstChild.setAttribute('d', `M${xl} ${GAUGE.y - 4}v18`);
    definir(e.limite.lastChild, { x: xl, y: GAUGE.y + 28 });
    e.limite.lastChild.textContent = `limite ${numero(r.limite, 1)} mm`;
    e.leitura.textContent = `w_k estimado = ${numero(molas.wk.valor, 2)} mm`;
  }

  function atualizar() {
    const fi = BARRAS[estado.iFi];
    const fiT = ESTRIBOS[estado.iT];
    let r;
    try {
      r = fissuracaoDaViga(tabelas, { ...estado, aco: ACO, fi, fiT });
    } catch (erro) {
      // Mantém o último desenho, esmaecido, para não mostrar números de outra configuração como atuais.
      desenho.classList.add('desatualizado');
      paineis.el.classList.add('desatualizado');
      nota.className = 'sim-nota alerta';
      nota.textContent = `${estado.n} barras de ${bitola(fi)} mm não cabem em uma camada com essa largura. Reduza a quantidade ou aumente a largura.`;
      return;
    }
    desenho.classList.remove('desatualizado');
    paineis.el.classList.remove('desatualizado');
    atual = { r, fi, fiT };
    const b = r.critica;

    paineis.mostrar([
      { rotulo: 'Altura útil d', valor: mm(r.d) },
      { rotulo: 'Linha neutra no estádio II', valor: `x = ${numero(r.x / 10, 1)} cm`, bloco: fis.estadioII },
      { rotulo: 'Tensão no aço em serviço σs', valor: `${numero(r.sigmaS, 0)} MPa`, bloco: fis.estadioII },
      { rotulo: `Abertura estimada (barra ${b.posicao === 'canto' ? 'de canto' : 'interna'})`, valor: mm(r.wk, 2), bloco: fis.aberturaEstimada, destaque: true },
      { rotulo: 'As duas expressões', valor: `${numero(b.w1, 2)} e ${numero(b.w2, 2)} mm, vale a menor`, bloco: fis.aberturaEstimada },
      { rotulo: 'Taxa na área de envolvimento ρr', valor: `${numero(b.rhoR * 100, 2)} %`, bloco: fis.regiaoDeEnvolvimento },
      { rotulo: `Limite para CAA ${estado.caa}`, valor: mm(r.limite, 1), bloco: dur.aberturaFissuras },
      { rotulo: 'Módulo do aço Es', valor: `${numero(r.Es / 1000, 0)} GPa`, bloco: mat.moduloAco },
    ]);

    nota.className = 'sim-nota';
    if (r.sigmaS > r.fyd) {
      nota.classList.add('alerta');
      nota.textContent = 'A tensão no aço em serviço passou de fyd: essa armadura não daria conta nem do estado-limite último. Aumente a área de aço ou a altura.';
    } else if (!r.atende) {
      nota.classList.add('alerta');
      nota.textContent = 'A abertura passou do limite. Troque por mais barras de menor diâmetro, aumente a área de aço ou a altura da viga.';
    } else if (b.governa === 'w2') {
      nota.textContent = 'Atende. Aqui governa a expressão que depende da taxa de armadura em volta da barra: barras mais finas e mais próximas fecham a fissura.';
    } else {
      nota.textContent = 'Atende. Aqui governa a expressão que depende da tensão no aço: abaixar σs (mais aço ou mais altura) é o que mais fecha a fissura.';
    }
    titulo.textContent = `Seção de ${numero(estado.bw / 10)} por ${numero(estado.h / 10)} cm com ${estado.n} barras de ${bitola(fi)} mm, momento de serviço de ${estado.Mk} kN·m: linha neutra a ${numero(r.x / 10, 1)} cm, tensão no aço de ${numero(r.sigmaS, 0)} MPa e abertura estimada de ${numero(r.wk, 2)} mm, contra o limite de ${numero(r.limite, 1)} mm.`;

    molas.wk.definir(r.wk);
    molas.x.definir(r.x);
    desenhar();
  }

  container.replaceChildren(
    h('div', { class: 'simulador' },
      controles,
      h('div', { class: 'sim-palco' }, desenho, nota),
      h('div', { class: 'sim-saida' }, paineis.el, paineis.legenda),
    ),
  );
  atualizar();
  molas.wk.definir(molas.wk.alvo, { imediato: true });
  molas.x.definir(molas.x.alvo, { imediato: true });

  return () => {
    molas.wk.parar();
    molas.x.parar();
  };
}
