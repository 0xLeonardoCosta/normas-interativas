// Painel de progresso: visão geral, próximo passo e situação por tema.
import { h } from '../dom.js';
import { icone } from '../icons.js';
import { store, acoes } from '../../store.js';
import { carregarBiblioteca } from '../../content/loader.js';
import { ordenarPorPareto, progressoDe, resumoDeQuizzes } from '../../content/pareto.js';
import { linkConceito } from '../components/card-conceito.js';

const ANEL = 2 * Math.PI * 26;

function anel(fracao, rotulo) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('class', 'anel');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', rotulo);
  svg.innerHTML = `<circle class="anel-trilho" cx="32" cy="32" r="26"/><circle class="anel-valor" cx="32" cy="32" r="26" transform="rotate(-90 32 32)" stroke-dasharray="0 ${ANEL}"/>`;
  // O arco "enche" depois de entrar na tela.
  requestAnimationFrame(() => svg.lastChild.setAttribute('stroke-dasharray', `${fracao * ANEL} ${ANEL}`));
  return svg;
}

export async function render() {
  const biblioteca = await carregarBiblioteca();
  const norma = biblioteca.padrao;
  const el = h('section', { class: 'pagina progresso' });

  function pintar() {
    const progresso = store.get().progresso;
    const geral = progressoDe(norma.conceitos, progresso);
    const quizzes = resumoDeQuizzes(norma.conceitos, progresso);
    const fila = ordenarPorPareto(norma.conceitos);
    const proximo = fila.find((e) => !progresso.lidos[e.id]);
    const minutos = fila.filter((e) => !progresso.lidos[e.id]).reduce((soma, e) => soma + e.pareto.tempoEstudoMin, 0);
    const semProgresso = geral.lidos === 0 && quizzes.respondidos === 0 && !Object.keys(progresso.checklist || {}).length;

    const numero = (valor, rotulo) => h('div', { class: 'progresso-numero' }, h('strong', null, valor), h('span', null, rotulo));

    const temas = norma.temas.map((t) => {
      const p = progressoDe(t.conceitos, progresso);
      const q = resumoDeQuizzes(t.conceitos, progresso);
      const restante = t.conceitos.filter((e) => !progresso.lidos[e.id]).reduce((soma, e) => soma + e.pareto.tempoEstudoMin, 0);
      if (!p.total) {
        return h('li', { class: 'tema-cartao em-breve cor-tema', style: { '--tema-h': t.matiz } },
          h('div', { class: 'tema-cartao-topo' }, h('div', null, h('h2', null, t.nome), h('p', null, 'Em breve'))));
      }
      return h('li', { class: 'tema-cartao cor-tema', style: { '--tema-h': t.matiz } },
        h('div', { class: 'tema-cartao-topo' },
          anel(p.fracao, `${p.lidos} de ${p.total} conceitos lidos`),
          h('div', null,
            h('h2', null, t.nome),
            h('p', null, `${p.lidos} de ${p.total} lidos`,
              q.total > 0 && ` · ${q.respondidos} de ${q.total} quizzes`,
              q.respondidos > 0 && ` · ${Math.round(q.aproveitamento * 100)}% de acerto`),
            h('p', { class: 'tema-cartao-tempo' }, restante ? `cerca de ${restante} min para concluir` : 'tema concluído'),
          ),
        ),
        h('div', { class: 'tema-cartao-lista' },
          ordenarPorPareto(t.conceitos).map((e) => {
            const quiz = progresso.quiz[e.id];
            return linkConceito(biblioteca, e.id, {
              lido: Boolean(progresso.lidos[e.id]),
              rotulo: quiz ? `quiz ${quiz.acertos}/${quiz.total}` : e.temQuiz ? 'quiz pendente' : `${e.pareto.tempoEstudoMin} min`,
            });
          })),
      );
    });

    // Apagar pede confirmação no próprio botão, sem diálogo.
    let armado = null;
    const apagar = h('button', { class: 'botao botao-perigo', type: 'button', disabled: semProgresso }, icone('refazer', 16), h('span', null, 'Apagar progresso'));
    apagar.addEventListener('click', () => {
      if (armado) {
        clearTimeout(armado);
        acoes.limparProgresso();
        return;
      }
      apagar.lastChild.textContent = 'Clique de novo para confirmar';
      armado = setTimeout(() => {
        armado = null;
        apagar.lastChild.textContent = 'Apagar progresso';
      }, 4000);
    });

    el.replaceChildren(
      h('header', { class: 'pagina-topo' },
        h('h1', null, 'Seu progresso'),
        h('p', null, `${norma.nome}:${norma.versao}. O progresso fica salvo apenas neste navegador.`),
      ),
      h('div', { class: 'progresso-geral' },
        numero(`${geral.lidos}/${geral.total}`, 'conceitos lidos'),
        numero(`${quizzes.respondidos}/${quizzes.total}`, 'quizzes respondidos'),
        numero(quizzes.respondidos ? `${Math.round(quizzes.aproveitamento * 100)}%` : '–', 'acerto nos quizzes'),
        numero(minutos ? `${minutos} min` : '0', 'de estudo restantes'),
        h('div', { class: 'progresso-barra', role: 'img', 'aria-label': `${Math.round(geral.fracao * 100)}% dos conceitos lidos` },
          h('i', { style: { transform: `scaleX(${geral.fracao})` } })),
      ),
      proximo
        ? h('div', { class: 'progresso-proximo' }, h('h2', null, geral.lidos ? 'Continue por aqui' : 'Comece por aqui'), linkConceito(biblioteca, proximo.id, { rotulo: `${proximo.pareto.tempoEstudoMin} min` }))
        : h('div', { class: 'progresso-proximo' }, h('h2', null, 'Tudo lido'), h('p', null, 'Você leu todos os conceitos disponíveis. Refaça os quizzes para fixar.')),
      h('ul', { class: 'tema-cartoes' }, temas),
      h('footer', { class: 'progresso-fim' }, apagar),
    );
  }

  pintar();
  const cancelar = store.assinar((novo, antigo) => novo.progresso !== antigo.progresso && pintar());

  return { el, titulo: 'Progresso', destruir: cancelar };
}
