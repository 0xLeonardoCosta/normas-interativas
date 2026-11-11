// Controles compartilhados pelos simuladores: grupo de opções, deslizante, alternador e painéis de resultado.
// Cada controle escreve em `estado[chave]` e chama `aoMudar()`; o simulador redesenha no mesmo quadro.
import { h } from '../ui/dom.js';
import { selo } from '../ui/components/selo.js';

let contador = 0;
export const novoUid = (prefixo) => `${prefixo}-${++contador}`;

/** Opções mutuamente exclusivas. opcoes: [{ valor, titulo, detalhe? }] */
export function grupo({ uid, legenda, chave, opcoes, estado, aoMudar }) {
  return h('fieldset', { class: 'sim-grupo' },
    h('legend', null, legenda),
    h('div', { class: 'segmentos' },
      opcoes.map((o) =>
        h('label', { class: 'segmento' },
          h('input', {
            type: 'radio', name: `${uid}-${chave}`, value: o.valor, checked: o.valor === estado[chave],
            onchange: () => { estado[chave] = o.valor; aoMudar(); },
          }),
          h('span', null, h('strong', null, o.titulo), o.detalhe && h('small', null, o.detalhe)),
        ))),
  );
}

export function deslizante({ uid, rotulo, chave, min, max, passo = 1, formatar, estado, aoMudar }) {
  const saida = h('output', { for: `${uid}-${chave}` });
  const entrada = h('input', { type: 'range', id: `${uid}-${chave}`, min, max, step: passo, value: estado[chave] });
  const mostrar = () => {
    saida.textContent = formatar(estado[chave]);
    entrada.setAttribute('aria-valuetext', saida.textContent);
    entrada.style.setProperty('--p', `${((estado[chave] - min) / (max - min)) * 100}%`);
  };
  entrada.addEventListener('input', () => { estado[chave] = Number(entrada.value); mostrar(); aoMudar(); });
  mostrar();
  return h('div', { class: 'deslizante' }, h('label', { for: `${uid}-${chave}` }, rotulo), saida, entrada);
}

export function alternador({ rotulo, detalhe, chave, estado, aoMudar }) {
  return h('label', { class: 'alternador' },
    h('input', { type: 'checkbox', role: 'switch', checked: estado[chave], onchange: (e) => { estado[chave] = e.target.checked; aoMudar(); } }),
    h('i', { 'aria-hidden': 'true' }),
    h('span', null, rotulo, detalhe && h('small', null, detalhe)),
  );
}

/**
 * Painel de resultados. `bloco` é o trecho de dados de onde o número veio: enquanto ele estiver
 * com pendenteValidacao, o resultado carrega o selo "valor em validação".
 */
export function criarPaineis() {
  const el = h('dl', { class: 'sim-resultados', 'aria-live': 'polite' });
  return {
    el,
    mostrar(linhas) {
      el.replaceChildren(...linhas.map((l) =>
        h('div', { class: l.destaque ? 'destaque' : null },
          h('dt', null, l.rotulo),
          h('dd', null, l.valor, l.bloco && l.bloco.pendenteValidacao !== false && selo(l.bloco.referencia, { compacto: true })))));
    },
  };
}

export const legendaSelo = () =>
  h('p', { class: 'legenda-selo' }, selo(), ' Números normativos ainda não conferidos com a norma.');
