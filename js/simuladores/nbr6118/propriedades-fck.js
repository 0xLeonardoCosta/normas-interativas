// Simulador: como o fck muda as outras propriedades do concreto (tração e módulo de elasticidade).
// Toda a conta vem de js/calc/nbr6118/materiais.js; aqui só há interface e desenho.
import { h, s, numero } from '../../ui/dom.js';
import { carregarDados } from '../../content/loader.js';
import {
  grupoDeResistencia,
  resistenciaDeCalculo,
  resistenciaTracao,
  tracaoDeCalculo,
  moduloElasticidade,
} from '../../calc/nbr6118/materiais.js';
import { novoUid, grupo, deslizante, criarPaineis } from '../controles.js';

const L = 460;
const A = 190;
const M = { e: 46, d: 64, t: 24, b: 28 };

/** Gráfico de linhas simples: séries em função do fck, com marcador no valor atual. */
function criarGrafico({ titulo, unidade, fckMin, fckMax, limite, yMax, series, casas }) {
  const x = (fck) => M.e + ((fck - fckMin) / (fckMax - fckMin)) * (L - M.e - M.d);
  const y = (v) => A - M.b - (v / yMax) * (A - M.t - M.b);
  const eixos = s('g', { class: 'graf-eixos' },
    s('path', { d: `M${M.e} ${M.t}V${A - M.b}H${L - M.d}` }),
    [0, 0.5, 1].map((f) => [
      s('path', { class: 'graf-grade', d: `M${M.e} ${y(yMax * f)}H${L - M.d}` }),
      s('text', { x: M.e - 6, y: y(yMax * f), 'text-anchor': 'end', 'dominant-baseline': 'middle' }, numero(yMax * f, yMax < 10 ? 1 : 0)),
    ]),
    [fckMin, limite, fckMax].map((f) => s('text', { x: x(f), y: A - M.b + 15, 'text-anchor': 'middle' }, String(f))),
    s('text', { class: 'graf-titulo', x: M.e, y: 12 }, `${titulo} (${unidade})`),
    s('text', { x: L - M.d, y: A - 2, 'text-anchor': 'end' }, 'fck (MPa)'),
    s('path', { class: 'graf-limite', d: `M${x(limite)} ${M.t}V${A - M.b}` }),
  );
  const faixa = s('path', { class: 'graf-faixa' });
  const linhas = series.map((se) => s('path', { class: `graf-linha ${se.classe || ''}`.trim() }));
  const cursor = s('path', { class: 'graf-cursor' });
  const pontos = series.map((se) => s('g', { class: `graf-ponto ${se.classe || ''}`.trim() }, s('circle', { r: 4 }), s('text', { x: 8, 'dominant-baseline': 'middle' })));
  const titulo2 = s('title');
  const el = s('svg', { class: 'sim-desenho graf', viewBox: `0 0 ${L} ${A}`, role: 'img' }, titulo2, eixos, faixa, ...linhas, cursor, ...pontos);

  const amostras = [];
  for (let f = fckMin; f <= fckMax; f += 2.5) amostras.push(f);
  const caminho = (f) => amostras.map((fck, i) => `${i ? 'L' : 'M'}${x(fck).toFixed(1)} ${y(f(fck)).toFixed(1)}`).join('');

  return {
    el,
    /** fns: uma função fck → valor por série. faixaEntre: [iInferior, iSuperior] opcional. */
    desenhar(fck, fns, faixaEntre) {
      fns.forEach((f, i) => linhas[i].setAttribute('d', caminho(f)));
      if (faixaEntre) {
        const [a, b] = faixaEntre;
        const volta = [...amostras].reverse().map((v) => `L${x(v).toFixed(1)} ${y(fns[b](v)).toFixed(1)}`).join('');
        faixa.setAttribute('d', `${caminho(fns[a])}${volta}Z`);
      }
      cursor.setAttribute('d', `M${x(fck)} ${M.t}V${A - M.b}`);
      // Rótulos dos pontos: afastados na vertical quando as curvas ficam próximas.
      const ys = fns.map((f) => y(f(fck)));
      const ordem = ys.map((v, i) => i).sort((i, j) => ys[i] - ys[j]);
      const rotulos = [];
      ordem.forEach((i, k) => {
        rotulos[i] = k === 0 ? ys[i] : Math.max(ys[i], rotulos[ordem[k - 1]] + 13);
      });
      fns.forEach((f, i) => {
        pontos[i].setAttribute('transform', `translate(${x(fck)} ${ys[i]})`);
        const texto = pontos[i].lastChild;
        texto.setAttribute('y', rotulos[i] - ys[i]);
        texto.textContent = `${series[i].nome} ${numero(f(fck), casas)}`;
      });
      titulo2.textContent = `${titulo} em função do fck. Para fck de ${fck} MPa: ${fns.map((f, i) => `${series[i].nome} ${numero(f(fck), casas)} ${unidade}`).join(', ')}.`;
    },
  };
}

export async function montar(container) {
  const t = await carregarDados('nbr6118', 'materiais');
  const uid = novoUid('sim-fck');
  const { fckMin, fckMax, limiteGrupoI } = t.classes;
  const agregados = Object.entries(t.moduloElasticidade.alfaE);
  const estado = { fck: 30, agregado: agregados.find(([, a]) => a.valor === 1)?.[0] || agregados[0][0] };

  const controles = h('div', { class: 'sim-controles' },
    h('div', { class: 'sim-deslizantes' },
      deslizante({ uid, rotulo: 'Resistência característica', chave: 'fck', min: fckMin, max: fckMax, passo: 5, formatar: (v) => `C${v} · ${v} MPa`, estado, aoMudar: atualizar }),
    ),
    grupo({
      uid, legenda: 'Agregado graúdo', chave: 'agregado', estado, aoMudar: atualizar,
      opcoes: agregados.map(([id, a]) => ({ valor: id, titulo: a.nome, detalhe: `αE = ${numero(a.valor, 1)}` })),
    }),
  );

  // Os eixos não mudam com o agregado: o teto do módulo usa o maior αE.
  const maiorAgregado = agregados.reduce((a, b) => (b[1].valor > a[1].valor ? b : a))[0];
  const tetoTracao = Math.ceil(resistenciaTracao(t, fckMax).superior);
  const tetoModulo = Math.ceil(moduloElasticidade(t, fckMax, maiorAgregado).inicial / 10000) * 10;

  const grafTracao = criarGrafico({
    titulo: 'Resistência à tração', unidade: 'MPa', fckMin, fckMax, limite: limiteGrupoI, yMax: tetoTracao, casas: 2,
    series: [{ nome: 'sup', classe: 'fraca' }, { nome: 'média' }, { nome: 'inf', classe: 'fraca' }],
  });
  const grafModulo = criarGrafico({
    titulo: 'Módulo de elasticidade', unidade: 'GPa', fckMin, fckMax, limite: limiteGrupoI, yMax: tetoModulo, casas: 1,
    series: [{ nome: 'Eci' }, { nome: 'Ecs', classe: 'fraca' }],
  });

  const nota = h('p', { class: 'sim-nota', role: 'status' });
  const paineis = criarPaineis();

  function atualizar() {
    const { fck, agregado } = estado;
    const tr = resistenciaTracao(t, fck);
    const mod = moduloElasticidade(t, fck, agregado);

    grafTracao.desenhar(fck, [(f) => resistenciaTracao(t, f).superior, (f) => resistenciaTracao(t, f).media, (f) => resistenciaTracao(t, f).inferior], [2, 0]);
    grafModulo.desenhar(fck, [(f) => moduloElasticidade(t, f, agregado).inicial / 1000, (f) => moduloElasticidade(t, f, agregado).secante / 1000]);

    paineis.mostrar([
      { rotulo: 'Classe', valor: `C${fck} · grupo ${grupoDeResistencia(t, fck)}`, bloco: t.classes },
      { rotulo: 'Compressão de cálculo fcd', valor: `${numero(resistenciaDeCalculo(t, fck), 1)} MPa`, bloco: t.coeficientesPonderacao },
      { rotulo: 'Tração média fct,m', valor: `${numero(tr.media, 2)} MPa`, bloco: t.resistenciaTracao, destaque: true },
      { rotulo: 'Tração característica (inf. a sup.)', valor: `${numero(tr.inferior, 2)} a ${numero(tr.superior, 2)} MPa`, bloco: t.resistenciaTracao },
      { rotulo: 'Tração de cálculo fctd', valor: `${numero(tracaoDeCalculo(t, fck), 2)} MPa`, bloco: t.resistenciaTracao },
      { rotulo: 'Módulo inicial Eci e secante Ecs', valor: `${numero(mod.inicial / 1000, 1)} e ${numero(mod.secante / 1000, 1)} GPa`, bloco: t.moduloElasticidade },
    ]);

    if (fck === fckMin) {
      nota.textContent = 'Aumente o fck e compare: a compressão cresce na mesma proporção, mas a tração e o módulo crescem mais devagar.';
    } else {
      const base = { tr: resistenciaTracao(t, fckMin).media, mod: moduloElasticidade(t, fckMin, agregado).inicial };
      nota.textContent = `Em relação ao C${fckMin}: compressão × ${numero(fck / fckMin, 2)}, tração × ${numero(tr.media / base.tr, 2)}, módulo × ${numero(mod.inicial / base.mod, 2)}. Mais resistência não traz rigidez na mesma proporção.`;
    }
  }

  container.replaceChildren(
    h('div', { class: 'simulador' },
      controles,
      h('div', { class: 'sim-palco sim-palco-graficos' }, grafTracao.el, grafModulo.el, nota),
      h('div', { class: 'sim-saida' }, paineis.el, paineis.legenda),
    ),
  );
  atualizar();
  return () => {};
}
