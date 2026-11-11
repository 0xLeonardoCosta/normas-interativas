import { h } from '../dom.js';

/**
 * Selo "valor em validação": marca todo número normativo ainda não conferido com a norma.
 * `compacto` mostra só o ponto (com texto para leitores de tela), para uso em espaços pequenos.
 */
export function selo(referencia, { compacto = false } = {}) {
  const dica = `Valor em validação pelo responsável técnico${referencia ? ` (${referencia})` : ''}`;
  return h('span', { class: `selo${compacto ? ' selo-compacto' : ''}`, title: dica },
    h('i', { 'aria-hidden': 'true' }),
    h('span', { class: compacto ? 'sr' : null }, 'valor em validação'),
  );
}
