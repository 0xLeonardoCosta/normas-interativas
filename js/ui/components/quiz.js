import { h } from '../dom.js';
import { icone } from '../icons.js';
import { markdownEmLinha } from '../../content/markdown.js';

/** Quiz curto: uma pergunta por vez, com retorno imediato e explicação. */
export function criarQuiz(perguntas, { anterior, aoConcluir }) {
  const raiz = h('div', { class: 'quiz' });
  let indice = 0;
  let acertos = 0;

  const pontos = () =>
    h('div', { class: 'quiz-pontos', 'aria-hidden': 'true' },
      perguntas.map((_, i) => h('i', { class: i < indice ? 'feito' : i === indice ? 'atual' : null })));

  function mostrarPergunta() {
    const q = perguntas[indice];
    const retorno = h('div', { class: 'quiz-retorno', role: 'status' });
    const botoes = q.opcoes.map((texto, i) =>
      h('button', { class: 'quiz-opcao', type: 'button', onclick: () => responder(i) },
        h('span', { class: 'quiz-letra', 'aria-hidden': 'true' }, 'ABCDEF'[i]),
        h('span', { html: markdownEmLinha(texto) }),
      ));

    function responder(escolha) {
      const certo = escolha === q.correta;
      if (certo) acertos += 1;
      botoes.forEach((b, i) => {
        b.disabled = true;
        if (i === q.correta) b.classList.add('certa');
        else if (i === escolha) b.classList.add('errada');
      });
      const ultimo = indice === perguntas.length - 1;
      const seguir = h('button', { class: 'botao botao-primario', type: 'button', onclick: avancar },
        ultimo ? 'Ver resultado' : 'Próxima', icone('seta-direita'));
      retorno.replaceChildren(
        h('p', { class: certo ? 'quiz-certo' : 'quiz-errado' },
          icone(certo ? 'check' : 'x'), h('strong', null, certo ? 'Correto.' : 'Não é essa.'), ' ',
          h('span', { html: markdownEmLinha(q.explicacao) })),
        seguir,
      );
      seguir.focus({ preventScroll: true });
    }

    raiz.replaceChildren(
      h('div', { class: 'quiz-cabeca' }, pontos(), h('span', null, `Pergunta ${indice + 1} de ${perguntas.length}`)),
      h('h3', { class: 'quiz-pergunta', html: markdownEmLinha(q.pergunta) }),
      h('div', { class: 'quiz-opcoes' }, botoes),
      retorno,
    );
  }

  function avancar() {
    indice += 1;
    if (indice < perguntas.length) {
      mostrarPergunta();
      raiz.querySelector('.quiz-opcao')?.focus({ preventScroll: true });
    } else {
      aoConcluir?.(acertos, perguntas.length);
      mostrarResultado({ acertos, total: perguntas.length }, true);
    }
  }

  function mostrarResultado(r, agora) {
    const tudo = r.acertos === r.total;
    const refazer = h('button', { class: 'botao', type: 'button', onclick: () => { indice = 0; acertos = 0; mostrarPergunta(); raiz.querySelector('.quiz-opcao')?.focus({ preventScroll: true }); } },
      icone('refazer'), agora ? 'Refazer' : 'Responder de novo');
    raiz.replaceChildren(
      h('div', { class: `quiz-resultado${agora ? ' novo' : ''}`, role: 'status' },
        h('div', { class: 'quiz-nota' }, h('strong', null, r.acertos), ` de ${r.total}`),
        h('p', null, agora
          ? (tudo ? 'Você acertou todas.' : 'Releia a explicação das que errou e tente de novo quando quiser.')
          : 'Seu último resultado neste quiz.'),
        refazer,
      ),
    );
    if (agora) refazer.focus({ preventScroll: true });
  }

  if (anterior) mostrarResultado(anterior, false);
  else mostrarPergunta();
  return raiz;
}
