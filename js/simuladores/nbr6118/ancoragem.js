// Simulador: comprimento de ancoragem de uma barra tracionada, desenhado em escala.
// Toda a conta vem de js/calc/nbr6118/{materiais,ancoragem}.js; aqui só há interface e desenho.
import { h, s, numero } from '../../ui/dom.js';
import { criarMola } from '../../ui/motion.js';
import { carregarDados } from '../../content/loader.js';
import { tracaoDeCalculo, escoamentoDeCalculo, categoriaDeAco } from '../../calc/nbr6118/materiais.js';
import { resistenciaAderencia, comprimentoBasico, comprimentoNecessario } from '../../calc/nbr6118/ancoragem.js';
import { novoUid, grupo, deslizante, alternador, criarPaineis } from '../controles.js';

// Bitolas comerciais usuais (mm). Não são valores normativos desta norma: servem só ao desenho.
const BARRAS = [8, 10, 12.5, 16, 20, 25, 32];
const L = 520; // largura do viewBox
const X0 = 70; // seção a partir da qual a barra precisa estar ancorada
const UTIL = L - X0 - 40;
const Y = 112; // eixo da barra

const bitola = (v) => numero(v, v % 1 ? 1 : 0);
const cm = (mm) => `${numero(mm / 10, 0)} cm`;

export async function montar(container) {
  const [mat, anc] = await Promise.all([carregarDados('nbr6118', 'materiais'), carregarDados('nbr6118', 'ancoragem')]);
  const uid = novoUid('sim-anc');
  const { fckMin, limiteGrupoI } = mat.classes;
  const estado = { fck: 25, iFi: 3, aco: mat.acos.itens.find((a) => a.superficie === 'nervurada')?.id || mat.acos.itens[0].id, zona: 'boa', gancho: false, razao: 100 };

  const controles = h('div', { class: 'sim-controles' },
    h('div', { class: 'sim-deslizantes' },
      deslizante({ uid, rotulo: 'Concreto', chave: 'fck', min: fckMin, max: limiteGrupoI, passo: 5, formatar: (v) => `C${v}`, estado, aoMudar: atualizar }),
      deslizante({ uid, rotulo: 'Barra', chave: 'iFi', min: 0, max: BARRAS.length - 1, formatar: (i) => `φ ${bitola(BARRAS[i])} mm`, estado, aoMudar: atualizar }),
      deslizante({ uid, rotulo: 'Armadura calculada / existente', chave: 'razao', min: 30, max: 100, passo: 5, formatar: (v) => `${v}%`, estado, aoMudar: atualizar }),
    ),
    grupo({
      uid, legenda: 'Aço', chave: 'aco', estado, aoMudar: atualizar,
      opcoes: mat.acos.itens.map((a) => ({ valor: a.id, titulo: a.id, detalhe: anc.eta1[a.superficie]?.nome })),
    }),
    grupo({
      uid, legenda: 'Posição da barra na concretagem', chave: 'zona', estado, aoMudar: atualizar,
      opcoes: Object.entries(anc.eta2).filter(([, v]) => v && typeof v === 'object').map(([id, v]) => ({ valor: id, titulo: v.nome })),
    }),
    alternador({ rotulo: 'Gancho na extremidade', detalhe: 'Reduz o comprimento reto necessário', chave: 'gancho', estado, aoMudar: atualizar }),
  );

  // --- Desenho ----------------------------------------------------------------------------------
  const e = {
    concreto: s('rect', { class: 'sim-concreto', x: 28, y: 52, width: L - 44, height: 120, rx: 3 }),
    secao: s('path', { class: 'anc-secao', d: `M${X0} 40V184` }),
    barra: s('path', { class: 'anc-barra' }),
    ancorado: s('path', { class: 'anc-ancorado' }),
    cotaNec: s('g', { class: 'sim-cota sim-cota-c' }, s('path'), s('text', { 'text-anchor': 'middle' })),
    cotaLb: s('g', { class: 'sim-cota anc-cota-lb' }, s('path'), s('text', { 'text-anchor': 'middle' })),
    escala: s('g', { class: 'sim-cota sim-escala' }, s('path'), s('text', { 'text-anchor': 'middle' })),
    forca: s('g', { class: 'sim-cota anc-forca' }, s('path', { d: `M${X0 - 8} ${Y - 18}H12 m9 -5 l-9 5 l9 5` }), s('text', { x: 12, y: Y - 28 }, 'tração')),
  };
  const titulo = s('title');
  const desenho = s('svg', { class: 'sim-desenho', viewBox: `0 0 ${L} 232`, role: 'img' }, titulo, e.concreto, e.secao, e.barra, e.ancorado, e.forca, e.cotaLb, e.cotaNec, e.escala);
  const nota = h('p', { class: 'sim-nota', role: 'status' });
  const paineis = criarPaineis();

  let atual = null; // último resultado calculado
  // Duas molas: o comprimento mostrado e o alcance do desenho (a escala se ajusta sem saltos).
  const molas = {
    nec: criarMola({ valor: 600, rigidez: 240, amortecimento: 26, precisao: 0.05, aoMudar: desenhar }),
    alcance: criarMola({ valor: 1000, rigidez: 180, amortecimento: 28, precisao: 0.05, aoMudar: desenhar }),
  };

  function desenhar() {
    if (!atual) return;
    const k = UTIL / Math.max(1, molas.alcance.valor); // px por mm
    const fi = BARRAS[estado.iFi];
    const esp = Math.max(3, fi * k);
    const fim = X0 + molas.nec.valor * k;
    const raio = Math.max(8, 4 * fi * k);
    const ponta = estado.gancho ? `H${fim - raio}a${raio} ${raio} 0 0 0 ${raio} ${-raio}v${-Math.max(6, 6 * fi * k)}` : `H${fim}`;
    e.barra.setAttribute('d', `M8 ${Y}${ponta}`);
    e.barra.setAttribute('stroke-width', esp);
    e.ancorado.setAttribute('d', `M${X0} ${Y}${ponta}`);
    e.ancorado.setAttribute('stroke-width', esp);

    const cota = (g, y, comprimento, texto) => {
      const x1 = X0 + comprimento * k;
      g.firstChild.setAttribute('d', `M${X0} ${y - 5}v10 M${x1} ${y - 5}v10 M${X0} ${y}H${x1}`);
      g.lastChild.setAttribute('x', Math.max(X0 + 44, (X0 + x1) / 2));
      g.lastChild.setAttribute('y', y - 9);
      g.lastChild.textContent = texto;
    };
    cota(e.cotaNec, 160, molas.nec.valor, `necessário: ${cm(atual.nec.lbNec)}`);
    cota(e.cotaLb, 82, atual.basico.lb, `básico: ${cm(atual.basico.lb)}`);

    const passo = molas.alcance.alvo > 2400 ? 1000 : molas.alcance.alvo > 1200 ? 500 : 200;
    e.escala.firstChild.setAttribute('d', `M${X0} 204v8 M${X0} 208h${passo * k} M${X0 + passo * k} 204v8`);
    e.escala.lastChild.setAttribute('x', X0 + (passo * k) / 2);
    e.escala.lastChild.setAttribute('y', 226);
    e.escala.lastChild.textContent = passo >= 1000 ? `${passo / 1000} m` : `${passo / 10} cm`;
  }

  function atualizar() {
    const fi = BARRAS[estado.iFi];
    const aco = categoriaDeAco(mat, estado.aco);
    const fctd = tracaoDeCalculo(mat, estado.fck);
    const fyd = escoamentoDeCalculo(mat, estado.aco);
    const ader = resistenciaAderencia(anc, { fctd, superficie: aco.superficie, zona: estado.zona, fi });
    const basico = comprimentoBasico(anc, { fi, fyd, fbd: ader.fbd });
    const nec = comprimentoNecessario(anc, { lb: basico.lb, fi, gancho: estado.gancho, razaoAs: estado.razao / 100 });
    atual = { basico, nec };

    paineis.mostrar([
      { rotulo: 'Aderência de cálculo fbd', valor: `${numero(ader.fbd, 2)} MPa`, bloco: anc.eta1 },
      { rotulo: 'Coeficientes η1 · η2 · η3', valor: `${numero(ader.eta1, 2)} · ${numero(ader.eta2, 1)} · ${numero(ader.eta3, 2)}`, bloco: anc.eta1 },
      { rotulo: 'Escoamento de cálculo fyd', valor: `${numero(fyd, 0)} MPa`, bloco: mat.coeficientesPonderacao },
      { rotulo: 'Comprimento básico', valor: `${cm(basico.lb)} · ${numero(basico.lb / fi, 0)} φ`, bloco: anc.comprimentoBasico },
      { rotulo: 'Comprimento necessário', valor: cm(nec.lbNec), bloco: anc.comprimentoMinimo, destaque: true },
      { rotulo: 'Comprimento mínimo', valor: cm(nec.minimo), bloco: anc.comprimentoMinimo },
    ]);

    nota.className = 'sim-nota';
    if (nec.governaMinimo) {
      nota.textContent = 'O comprimento mínimo está governando: sobrar ainda mais armadura não encurta a ancoragem.';
    } else if (estado.gancho) {
      nota.textContent = 'O gancho ajuda a segurar a barra e encurta o trecho reto. A redução só vale se o cobrimento lateral exigido pela norma para o gancho for atendido.';
    } else if (estado.zona === 'ma') {
      nota.textContent = 'Em má aderência o concreto junto à barra fica menos compacto (a água e o ar sobem na concretagem), e a mesma barra precisa de mais comprimento.';
    } else {
      nota.textContent = 'A barra precisa de comprimento suficiente para passar toda a sua força ao concreto por aderência. Aumente o fck ou reduza a bitola e veja o comprimento encolher.';
    }
    titulo.textContent = `Barra de ${bitola(fi)} mm ancorada em concreto C${estado.fck}: comprimento básico de ${cm(basico.lb)} e comprimento necessário de ${cm(nec.lbNec)}${estado.gancho ? ', com gancho' : ''}.`;

    const alcance = Math.ceil((Math.max(basico.lb, nec.lbNec) * 1.12) / 200) * 200;
    if (molas.alcance.alvo !== alcance) molas.alcance.definir(alcance);
    if (molas.nec.alvo !== nec.lbNec) molas.nec.definir(nec.lbNec);
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
  molas.alcance.definir(molas.alcance.alvo, { imediato: true });
  molas.nec.definir(molas.nec.alvo, { imediato: true });

  return () => {
    molas.nec.parar();
    molas.alcance.parar();
  };
}
