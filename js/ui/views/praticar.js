// Praticar: revisão espaçada das perguntas de quiz e lista de estudos de caso.
import { h } from '../dom.js';
import { icone } from '../icons.js';
import { store, acoes } from '../../store.js';
import { carregarBiblioteca, carregarConceito, carregarCaso } from '../../content/loader.js';
import { ordenarPorPareto } from '../../content/pareto.js';
import { markdownEmLinha } from '../../content/markdown.js';
import {
  cartoesDe, partesDoCartao, registrarResposta, montarSessao, resumoDaRevisao, INTERVALOS_DIAS,
} from '../../estudo/revisao.js';

const DATA = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
const LETRAS = 'ABCDEF';

function quandoVolta(proxima, agora) {
  const dias = Math.round((proxima - agora) / 86400000);
  return dias <= 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`;
}

export async function render() {
  const biblioteca = await carregarBiblioteca();
  const norma = biblioteca.padrao;
  const el = h('section', { class: 'pagina praticar' });
  const areaRevisao = h('div', { class: 'revisao' });
  const areaCasos = h('ul', { class: 'casos-lista' });
  let sessaoAtiva = false;
  let limparTeclado = null;

  // Cartões elegíveis: perguntas dos conceitos já lidos ou com quiz respondido, por ordem de Pareto.
  async function cartoesElegiveis() {
    const { lidos, quiz, revisao } = store.get().progresso;
    const vistos = new Set(Object.keys(revisao || {}).map((id) => partesDoCartao(id)?.conceito));
    const ids = ordenarPorPareto(norma.conceitos)
      .filter((e) => e.temQuiz && (lidos[e.id] || quiz[e.id] || vistos.has(e.id)))
      .map((e) => e.id);
    const conceitos = await Promise.all(ids.map((id) => carregarConceito(id)));
    return { conceitos: new Map(conceitos.map((c) => [c.id, c])), cartoes: cartoesDe(conceitos) };
  }

  async function pintarPainel() {
    if (sessaoAtiva) return;
    const { cartoes, conceitos } = await cartoesElegiveis();
    const agora = Date.now();
    const estados = store.get().progresso.revisao || {};
    const r = resumoDaRevisao({ cartoes, estados, agora });
    const fila = montarSessao({ cartoes, estados, agora });

    if (!cartoes.length) {
      areaRevisao.replaceChildren(
        h('div', { class: 'revisao-vazia' },
          h('p', null, 'A revisão usa as perguntas dos conceitos que você já leu. Leia um conceito e volte aqui.'),
          h('a', { class: 'botao', href: '#/pareto' }, 'Começar pelos 20%', icone('seta-direita'))),
      );
      return;
    }

    const numero = (valor, rotulo) => h('div', { class: 'progresso-numero' }, h('strong', null, valor), h('span', null, rotulo));
    const comecar = h('button', { class: 'botao botao-primario', type: 'button', disabled: !fila.length, onclick: () => iniciarSessao(fila, conceitos) },
      icone('praticar'), fila.length ? `Revisar ${fila.length} ${fila.length === 1 ? 'cartão' : 'cartões'}` : 'Nada para hoje');
    areaRevisao.replaceChildren(
      h('div', { class: 'progresso-geral revisao-numeros' },
        numero(r.vencidos, 'para revisar hoje'),
        numero(r.novos, 'perguntas novas'),
        numero(r.dominados, 'dominadas'),
        numero(r.proxima && !r.vencidos ? DATA.format(r.proxima) : r.vencidos ? 'hoje' : '–', 'próxima revisão'),
      ),
      h('div', { class: 'revisao-acao' },
        comecar,
        h('p', null, `Acertou, a pergunta volta mais tarde (${INTERVALOS_DIAS.slice(1).join(', ')} dias). Errou, ela volta amanhã.`)),
    );
  }

  function iniciarSessao(fila, conceitos) {
    sessaoAtiva = true;
    const ordem = [...fila];
    const repetidos = new Set();
    let i = 0;
    let acertos = 0;
    let respondidos = 0;

    function mostrar() {
      const id = ordem[i];
      const { conceito: idConceito, indice } = partesDoCartao(id);
      const c = conceitos.get(idConceito);
      const q = c.quiz[indice];
      const tema = biblioteca.temaDe(idConceito);
      const retorno = h('div', { class: 'quiz-retorno', role: 'status' });
      let respondido = false;

      const botoes = q.opcoes.map((texto, k) =>
        h('button', { class: 'quiz-opcao', type: 'button', onclick: () => responder(k) },
          h('span', { class: 'quiz-letra', 'aria-hidden': 'true' }, LETRAS[k]),
          h('span', { html: markdownEmLinha(texto) })));

      function responder(escolha) {
        if (respondido) return;
        respondido = true;
        const certo = escolha === q.correta;
        const agora = Date.now();
        const novo = registrarResposta(store.get().progresso.revisao?.[id], certo, agora);
        acoes.gravarCartao(id, novo);
        respondidos += 1;
        if (certo) acertos += 1;
        else if (!repetidos.has(id)) {
          repetidos.add(id);
          ordem.push(id); // errou: aparece de novo no fim desta sessão
        }
        botoes.forEach((b, k) => {
          b.disabled = true;
          if (k === q.correta) b.classList.add('certa');
          else if (k === escolha) b.classList.add('errada');
        });
        const ultimo = i === ordem.length - 1;
        const seguir = h('button', { class: 'botao botao-primario', type: 'button', onclick: avancar },
          ultimo ? 'Concluir' : 'Próxima', icone('seta-direita'));
        retorno.replaceChildren(
          h('p', { class: certo ? 'quiz-certo' : 'quiz-errado' },
            icone(certo ? 'check' : 'x'), h('strong', null, certo ? 'Correto.' : 'Não é essa.'), ' ',
            h('span', { html: markdownEmLinha(q.explicacao) })),
          h('p', { class: 'revisao-volta' }, `Esta pergunta volta ${quandoVolta(novo.proxima, agora)}.`),
          seguir,
        );
        seguir.focus({ preventScroll: true });
      }

      areaRevisao.replaceChildren(
        h('div', { class: 'quiz revisao-cartao' },
          h('div', { class: 'quiz-cabeca' },
            h('div', { class: 'progresso-barra revisao-barra', 'aria-hidden': 'true' }, h('i', { style: { transform: `scaleX(${i / ordem.length})` } })),
            h('span', null, `${i + 1} de ${ordem.length}`)),
          h('a', { class: 'revisao-origem cor-tema', href: `#/conceito/${idConceito}`, style: { '--tema-h': tema?.matiz } },
            h('i', { 'aria-hidden': 'true' }), c.titulo),
          h('h3', { class: 'quiz-pergunta', html: markdownEmLinha(q.pergunta) }),
          h('div', { class: 'quiz-opcoes' }, botoes),
          retorno,
          h('button', { class: 'botao botao-fantasma revisao-sair', type: 'button', onclick: encerrar }, 'Encerrar sessão'),
        ),
      );
      botoes[0].focus({ preventScroll: true });

      // Teclado: 1–4 ou A–D respondem; Enter avança.
      limparTeclado?.();
      const tecla = (e) => {
        if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea')) return;
        const k = '123456'.indexOf(e.key) >= 0 ? '123456'.indexOf(e.key) : LETRAS.toLowerCase().indexOf(e.key.toLowerCase());
        if (!respondido && k >= 0 && k < botoes.length && e.key.length === 1) {
          e.preventDefault();
          responder(k);
        }
      };
      addEventListener('keydown', tecla);
      limparTeclado = () => removeEventListener('keydown', tecla);
    }

    function avancar() {
      i += 1;
      if (i < ordem.length) mostrar();
      else concluir();
    }

    function concluir() {
      limparTeclado?.();
      const voltar = h('button', { class: 'botao botao-primario', type: 'button', onclick: encerrar }, 'Voltar ao painel');
      areaRevisao.replaceChildren(
        h('div', { class: 'quiz-resultado novo', role: 'status' },
          h('div', { class: 'quiz-nota' }, h('strong', null, acertos), ` de ${respondidos}`),
          h('p', null, acertos === respondidos ? 'Sessão sem erros.' : 'As que você errou voltam amanhã.'),
          voltar),
      );
      voltar.focus({ preventScroll: true });
    }

    function encerrar() {
      limparTeclado?.();
      sessaoAtiva = false;
      pintarPainel();
    }

    mostrar();
  }

  async function pintarCasos() {
    const ids = (norma.casos || []).map((slug) => `${norma.id}:${slug}`);
    const casos = await Promise.all(ids.map((id) => carregarCaso(id).catch(() => null)));
    const feitos = store.get().progresso.casos || {};
    areaCasos.replaceChildren(...casos.filter(Boolean).map((c) => {
      const f = feitos[c.id];
      return h('li', null,
        h('a', { class: 'caso-cartao', href: `#/caso/${c.id}` },
          h('div', { class: 'caso-cartao-topo' },
            h('h3', null, c.titulo),
            c.status === 'rascunho' && h('span', { class: 'chip chip-alerta', title: 'Conteúdo ainda não revisado pelo responsável técnico' }, 'Rascunho')),
          h('p', null, c.resumo),
          h('small', null, f ? `Concluído · ${f.acertos} de ${f.total} decisões certas de primeira` : `${Object.values(c.etapas).filter((e) => e.tipo === 'decisao').length} decisões`),
          icone('seta-direita', 16)));
    }));
  }

  el.replaceChildren(
    h('header', { class: 'pagina-topo' },
      h('h1', null, 'Praticar'),
      h('p', null, 'Revise o que já leu no momento certo e treine decisões de projeto em casos.')),
    h('section', { class: 'praticar-bloco', 'aria-labelledby': 'tit-revisao' },
      h('h2', { id: 'tit-revisao' }, 'Revisão espaçada'),
      areaRevisao),
    h('section', { class: 'praticar-bloco', 'aria-labelledby': 'tit-casos' },
      h('h2', { id: 'tit-casos' }, 'Estudos de caso'),
      areaCasos),
  );
  await Promise.all([pintarPainel(), pintarCasos()]);

  const cancelar = store.assinar((novo, antigo) => {
    if (novo.progresso === antigo.progresso) return;
    if (novo.progresso.casos !== antigo.progresso.casos) pintarCasos();
    if (novo.progresso.lidos !== antigo.progresso.lidos) pintarPainel();
  });

  return {
    el,
    titulo: 'Praticar',
    destruir() {
      cancelar();
      limparTeclado?.();
    },
  };
}
