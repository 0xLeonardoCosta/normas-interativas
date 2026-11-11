// "Os 20%": conceitos ordenados pelo retorno prático (score derivado de `pareto`).
import { h } from '../dom.js';
import { icone } from '../icons.js';
import { store } from '../../store.js';
import { carregarBiblioteca } from '../../content/loader.js';
import { ordenarPorPareto, scorePareto, progressoDe } from '../../content/pareto.js';
import { escala } from '../components/card-conceito.js';

export async function render() {
  const biblioteca = await carregarBiblioteca();
  const norma = biblioteca.padrao;
  const progresso = store.get().progresso;
  const ordenados = ordenarPorPareto(norma.conceitos);
  const geral = progressoDe(norma.conceitos, progresso);
  const minutos = ordenados.filter((e) => !progresso.lidos[e.id]).reduce((s, e) => s + e.pareto.tempoEstudoMin, 0);

  const temas = h('ul', { class: 'temas-progresso', 'aria-label': 'Progresso por tema' },
    norma.temas.map((t) => {
      const p = progressoDe(t.conceitos, progresso);
      return h('li', { class: `cor-tema${p.total ? '' : ' em-breve'}`, style: { '--tema-h': t.matiz } },
        h('span', { class: 'temas-nome' }, h('i', { 'aria-hidden': 'true' }), t.nome),
        h('span', { class: 'temas-conta' }, p.total ? `${p.lidos}/${p.total}` : 'em breve'),
        h('div', { class: 'progresso-barra', role: 'img', 'aria-label': p.total ? `${p.lidos} de ${p.total} lidos` : 'em breve' },
          h('i', { style: { transform: `scaleX(${p.fracao})` } })),
      );
    }));

  const cards = h('ol', { class: 'pareto-lista' },
    ordenados.map((e, i) => {
      const tema = biblioteca.temaDe(e.id);
      const lido = Boolean(progresso.lidos[e.id]);
      const quiz = progresso.quiz[e.id];
      return h('li', { style: { '--i': i } },
        h('a', { class: `pareto-card cor-tema${lido ? ' lido' : ''}`, href: `#/conceito/${e.id}`, 'data-heroi': e.id, style: { '--tema-h': tema?.matiz } },
          h('span', { class: 'pareto-posicao', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
          h('div', { class: 'pareto-corpo' },
            h('div', { class: 'pareto-meta' },
              h('span', { class: 'chip chip-tema' }, h('i', { 'aria-hidden': 'true' }), tema?.nome),
              h('span', { class: 'conceito-tempo' }, icone('relogio', 14), `${e.pareto.tempoEstudoMin} min`),
              lido && h('span', { class: 'pareto-lido' }, icone('check', 14), 'Lido'),
              quiz && h('span', { class: 'pareto-lido' }, `Quiz ${quiz.acertos}/${quiz.total}`),
            ),
            h('h2', null, e.titulo),
            h('p', null, e.resumo),
            e.ondeSeAplica.length > 0 && h('ul', { class: 'pareto-aplicacoes', 'aria-label': 'Aplicações práticas' },
              e.ondeSeAplica.map((a) => h('li', null, a))),
          ),
          h('div', { class: 'pareto-medidas' },
            h('div', { class: 'pareto-score', title: 'Score: 55% importância + 45% frequência' },
              h('strong', null, scorePareto(e.pareto)), h('span', null, 'score')),
            escala('Importância', e.pareto.importancia),
            escala('Frequência', e.pareto.frequencia),
            escala('Dificuldade', e.pareto.dificuldade),
          ),
        ),
      );
    }));

  const el = h('section', { class: 'pagina pareto' },
    h('header', { class: 'pagina-topo' },
      h('h1', null, `Os 20% da ${norma.nome}`),
      h('p', null, 'Os conceitos que mais aparecem no dia a dia de projeto, em ordem de retorno. Comece pelo topo: importância e frequência definem a posição; em caso de empate, o mais rápido de aprender vem primeiro.'),
      h('p', { class: 'pareto-resumo' },
        h('strong', null, `${geral.lidos} de ${geral.total}`), ' conceitos lidos',
        minutos > 0 && [h('span', null, '·'), `cerca de ${minutos} min para concluir`]),
    ),
    temas,
    cards,
  );

  return { el, titulo: `Os 20% da ${norma.nome}` };
}
