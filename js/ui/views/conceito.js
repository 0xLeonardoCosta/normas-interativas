// Página de conceito: blocos de leitura, valores, simulador, fluxograma, quiz, referências e conexões.
import { h, numero } from '../dom.js';
import { icone } from '../icons.js';
import { store, acoes } from '../../store.js';
import { carregarBiblioteca, carregarConceito, carregarDados, carregarFluxograma } from '../../content/loader.js';
import { markdown, markdownEmLinha, renderizarFormulas } from '../../content/markdown.js';
import { resolverDado } from '../../content/dados.js';
import { backlinks, conexoesPorTipo } from '../../content/graph.js';
import { ordenarPorPareto } from '../../content/pareto.js';
import { partesDoId } from '../../content/indice.js';
import { obter } from '../../registry.js';
import { selo } from '../components/selo.js';
import { linkConceito } from '../components/card-conceito.js';
import { criarQuiz } from '../components/quiz.js';
import { criarFluxograma } from '../components/fluxograma.js';

const prosa = (texto) => h('div', { class: 'prosa', html: markdown(texto) });
const lista = (itens, classe) => h('ul', { class: classe }, itens.map((t) => h('li', { html: markdownEmLinha(t) })));

function secao(titulo, corpo, { classe = '', icone: nomeIcone } = {}) {
  if (!corpo) return null;
  return h('section', { class: `bloco ${classe}`.trim() },
    h('h2', null, nomeIcone && icone(nomeIcone, 18), titulo),
    corpo,
  );
}

export async function render({ params, voltar }) {
  const id = params[0];
  const [biblioteca, c] = await Promise.all([carregarBiblioteca(), carregarConceito(id)]);
  const norma = biblioteca.normas.get(partesDoId(id).norma);
  const tema = biblioteca.temaDe(id);
  const limpezas = [];
  const progresso = () => store.get().progresso;
  const lido = (alvo) => Boolean(progresso().lidos[alvo]);

  // --- Valores normativos (sempre vindos de dados/*.json, com selo enquanto não validados) -------
  let tabelaValores = null;
  if (c.valores?.length) {
    const arquivos = [...new Set(c.valores.map((v) => v.dado.split('/')[0]))];
    const dados = Object.fromEntries(await Promise.all(arquivos.map(async (a) => [a, await carregarDados(norma.id, a)])));
    const linhas = c.valores.map((v) => ({ ...v, r: resolverDado(dados, v.dado) })).filter((v) => v.r);
    tabelaValores = h('div', null,
      h('table', { class: 'valores' },
        h('tbody', null, linhas.map(({ rotulo, unidade, r }) =>
          h('tr', null,
            h('th', { scope: 'row' }, rotulo),
            h('td', { class: 'valor' },
              typeof r.valor === 'number' ? numero(r.valor, Number.isInteger(r.valor) ? 0 : String(r.valor).split('.')[1].length) : r.valor,
              (unidade || r.unidade) && ` ${unidade || r.unidade}`,
              r.pendenteValidacao && selo(r.referencia, { compacto: true })),
            h('td', { class: 'ref' }, r.referencia.replace(/^NBR \d+:\d+, /, '')),
          )))),
      linhas.some((v) => v.r.pendenteValidacao) && h('p', { class: 'legenda-selo' }, selo(), ' Conferir com a norma antes de usar.'),
    );
  }

  // --- Componentes interativos (carregados sob demanda pelo registro) ---------------------------
  const simuladores = (c.simuladores || []).map((idSim) => {
    const caixa = h('div', { class: 'interativo carregando', 'aria-busy': 'true' });
    obter('simulador', idSim)
      .then((m) => m.montar(caixa, { conceito: c }))
      .then((limpar) => limpezas.push(limpar))
      .catch((erro) => {
        console.error(erro);
        caixa.replaceChildren(h('p', { class: 'interativo-erro' }, 'Não foi possível carregar o simulador.'));
      })
      .finally(() => {
        caixa.classList.remove('carregando');
        caixa.removeAttribute('aria-busy');
      });
    return caixa;
  });

  let fluxograma = null;
  if (c.fluxograma) {
    fluxograma = h('div', { class: 'interativo carregando' });
    carregarFluxograma(c.fluxograma)
      .then((def) => fluxograma.replaceChildren(criarFluxograma(def)))
      .catch((erro) => {
        console.error(erro);
        fluxograma.replaceChildren(h('p', { class: 'interativo-erro' }, 'Não foi possível carregar o fluxograma.'));
      })
      .finally(() => fluxograma.classList.remove('carregando'));
  }

  // --- Conexões e backlinks ---------------------------------------------------------------------
  const todas = [...biblioteca.conceitos.values()];
  const grupos = conexoesPorTipo(c.conexoes);
  const apontam = backlinks(todas, id).filter((b) => !c.conexoes.some((x) => x.alvo === b.origem));
  const conexoes = (grupos.length || apontam.length) ? h('div', { class: 'conexoes' },
    grupos.map((g) => h('div', { class: 'conexoes-grupo' },
      h('h3', null, g.rotulo),
      g.alvos.map((alvo) => linkConceito(biblioteca, alvo, { lido: lido(alvo) })))),
    apontam.length > 0 && h('div', { class: 'conexoes-grupo' },
      h('h3', null, 'Apontam para cá'),
      apontam.map((b) => linkConceito(biblioteca, b.origem, { lido: lido(b.origem) }))),
  ) : null;

  // --- Progresso --------------------------------------------------------------------------------
  const botaoLido = h('button', { class: 'botao-lido', type: 'button', onclick: () => acoes.marcarLido(id, !lido(id)) });
  function pintarLido() {
    const feito = lido(id);
    botaoLido.setAttribute('aria-pressed', String(feito));
    botaoLido.replaceChildren(h('i', { 'aria-hidden': 'true' }), icone('check', 16), h('span', null, feito ? 'Lido' : 'Marcar como lido'));
  }
  pintarLido();
  limpezas.push(store.assinar((novo, antigo) => novo.progresso.lidos !== antigo.progresso.lidos && pintarLido()));

  const fila = ordenarPorPareto(norma.conceitos).filter((e) => e.id !== id);
  const proximo = fila.find((e) => !lido(e.id)) || fila[0];

  const quiz = c.quiz?.length
    ? criarQuiz(c.quiz, { anterior: progresso().quiz[id], aoConcluir: (acertos, total) => acoes.registrarQuiz(id, acertos, total) })
    : null;

  const checklist = c.checklist?.length
    ? h('ul', { class: 'checklist' }, c.checklist.map((t, i) =>
        h('li', null, h('label', null,
          h('input', {
            type: 'checkbox',
            checked: (progresso().checklist?.[id] || []).includes(i),
            onchange: (e) => acoes.marcarChecklist(id, i, e.target.checked),
          }),
          h('span', { html: markdownEmLinha(t) })))))
    : null;

  const el = h('article', { class: 'conceito cor-tema', style: { '--tema-h': tema?.matiz } },
    h('button', { class: 'voltar', type: 'button', onclick: voltar }, icone('seta-esquerda', 16), 'Voltar', h('kbd', null, 'Esc')),
    h('header', { class: 'conceito-topo', 'data-heroi': id },
      h('div', { class: 'conceito-meta' },
        h('span', { class: 'chip chip-tema' }, h('i', { 'aria-hidden': 'true' }), tema?.nome),
        h('span', { class: 'chip' }, `${norma.nome}:${c.versao}`),
        c.status === 'rascunho' && h('span', { class: 'chip chip-alerta', title: 'Conteúdo ainda não revisado pelo responsável técnico' }, 'Rascunho'),
        h('span', { class: 'conceito-tempo' }, icone('relogio', 14), `${c.pareto.tempoEstudoMin} min`),
      ),
      h('h1', null, c.titulo),
      h('p', { class: 'conceito-resumo' }, c.resumo),
    ),
    secao('O que é', prosa(c.oQueE)),
    secao('Por que existe', prosa(c.porQueExiste), { classe: 'bloco-porque', icone: 'ideia' }),
    secao('Onde se aplica', c.ondeSeAplica?.length ? lista(c.ondeSeAplica, 'marcadores') : null),
    secao('Quando usar', c.quandoUsar ? prosa(c.quandoUsar) : null),
    secao('Valores da norma', tabelaValores),
    secao('Simulador', simuladores.length ? h('div', null, simuladores) : null, { classe: 'bloco-largo' }),
    secao('Fluxograma de decisão', fluxograma),
    secao('Exemplos', c.exemplos?.length ? h('div', null, c.exemplos.map((e) =>
      h('div', { class: 'exemplo' }, h('h3', null, e.titulo), prosa(e.texto)))) : null),
    secao('Erros comuns', c.errosComuns?.length ? lista(c.errosComuns, 'erros') : null, { icone: 'alerta' }),
    secao('Checklist', checklist),
    secao('Teste o que você entendeu', quiz),
    secao('Referências normativas', h('ul', { class: 'referencias' }, c.referencias.map((r) =>
      h('li', null, h('strong', null, r.item), h('span', null, r.descricao))))),
    secao('Conexões', conexoes),
    h('footer', { class: 'conceito-fim' },
      botaoLido,
      proximo && h('div', { class: 'proximo' }, h('span', null, 'Próximo pelo Pareto'), linkConceito(biblioteca, proximo.id, { lido: lido(proximo.id) })),
    ),
  );

  renderizarFormulas(el);

  return {
    el,
    titulo: c.titulo,
    heroi: id,
    destruir: () => limpezas.forEach((f) => typeof f === 'function' && f()),
  };
}
