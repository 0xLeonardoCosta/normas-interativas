import { h } from '../dom.js';
import { icone } from '../icons.js';
import { selo } from './selo.js';
import { obter } from '../../registry.js';

/**
 * Fluxograma de decisão interativo. A definição vem do conteúdo (JSON):
 * nós "pergunta" com opções que definem variáveis, e um nó "resultado" cujo
 * resolvedor (registrado em js/registry.js) calcula a resposta a partir das variáveis.
 */
export function criarFluxograma(def) {
  const lista = h('ol', { class: 'fluxo-passos' });
  const raiz = h('div', { class: 'fluxo' }, def.descricao && h('p', { class: 'fluxo-descricao' }, def.descricao), lista);
  let caminho = []; // [{ no, opcao }]

  function variaveis() {
    return Object.assign({}, ...caminho.map((p) => def.nos[p.no].opcoes[p.opcao].define || {}));
  }

  function desenhar(focar) {
    const itens = caminho.map((passo, i) => {
      const no = def.nos[passo.no];
      return h('li', { class: 'fluxo-passo respondido' },
        h('button', { type: 'button', class: 'fluxo-refazer', 'aria-label': `Alterar a resposta: ${no.texto}`, onclick: () => { caminho = caminho.slice(0, i); desenhar(true); } },
          h('span', { class: 'fluxo-texto' }, no.texto),
          h('span', { class: 'fluxo-resposta' }, icone('check', 14), no.opcoes[passo.opcao].rotulo),
        ),
      );
    });

    const idAtual = caminho.length ? def.nos[caminho.at(-1).no].opcoes[caminho.at(-1).opcao].proximo : def.inicio;
    const atual = def.nos[idAtual];
    let ultimo;

    if (atual.tipo === 'pergunta') {
      ultimo = h('li', { class: 'fluxo-passo atual' },
        h('p', { class: 'fluxo-texto' }, atual.texto),
        atual.ajuda && h('p', { class: 'fluxo-ajuda' }, atual.ajuda),
        h('div', { class: 'fluxo-opcoes' },
          atual.opcoes.map((o, i) =>
            h('button', { class: 'botao', type: 'button', onclick: () => { caminho.push({ no: idAtual, opcao: i }); desenhar(true); } }, o.rotulo)),
        ),
      );
    } else {
      const corpo = h('div', { class: 'fluxo-linhas', role: 'status' }, h('p', { class: 'fluxo-ajuda' }, 'Calculando…'));
      ultimo = h('li', { class: 'fluxo-passo resultado' },
        h('p', { class: 'fluxo-texto' }, atual.texto),
        corpo,
        h('button', { class: 'botao', type: 'button', onclick: () => { caminho = []; desenhar(true); } }, icone('refazer'), 'Recomeçar'),
      );
      preencher(corpo, atual.resolvedor, variaveis());
    }

    lista.replaceChildren(...itens, ultimo);
    if (focar) ultimo.querySelector('.fluxo-opcoes button, button')?.focus({ preventScroll: true });
  }

  async function preencher(corpo, idResolvedor, vars) {
    try {
      const modulo = await obter('resolvedor', idResolvedor);
      const { linhas } = await modulo.resolver(vars);
      corpo.replaceChildren(
        h('dl', null, linhas.map((l) =>
          h('div', { class: l.destaque ? 'destaque' : null },
            h('dt', null, l.rotulo),
            h('dd', null, l.valor, l.pendente && selo(l.referencia, { compacto: true })),
          ))),
        linhas.some((l) => l.pendente) && h('p', { class: 'legenda-selo' }, selo(), ' Conferir com a norma antes de usar.'),
      );
    } catch (erro) {
      console.error(erro);
      corpo.replaceChildren(h('p', { class: 'fluxo-ajuda' }, 'Não foi possível calcular o resultado.'));
    }
  }

  desenhar(false);
  return raiz;
}
