import { h } from '../dom.js';
import { icone } from '../icons.js';

/** Link compacto para um conceito (usado em conexões, backlinks e "próximo passo"). */
export function linkConceito(biblioteca, id, { lido = false, rotulo } = {}) {
  const entrada = biblioteca.conceitos.get(id);
  if (!entrada) {
    // Conexão para uma norma que ainda não está na biblioteca.
    return h('span', { class: 'link-conceito indisponivel', title: 'Esta norma ainda não está disponível' },
      h('span', { class: 'link-conceito-titulo' }, id.split(':')[1].replaceAll('-', ' ')),
      h('small', null, `${id.split(':')[0].toUpperCase().replace(/^([A-Z]+)(\d)/, '$1 $2')} · em breve`),
    );
  }
  const tema = biblioteca.temaDe(id);
  return h('a', { class: 'link-conceito cor-tema', href: `#/conceito/${id}`, style: { '--tema-h': tema?.matiz } },
    h('i', { class: `ponto${lido ? ' lido' : ''}`, 'aria-hidden': 'true' }),
    h('span', { class: 'link-conceito-titulo' }, entrada.titulo, lido && h('span', { class: 'sr' }, ' (lido)')),
    h('small', null, rotulo || tema?.nome),
    icone('seta-direita', 14),
  );
}

/** Escala de 1 a 5 em pontos. */
export function escala(rotulo, valor) {
  return h('div', { class: 'escala' },
    h('span', null, rotulo),
    h('span', { class: 'escala-pontos', role: 'img', 'aria-label': `${valor} de 5` },
      [1, 2, 3, 4, 5].map((i) => h('i', { class: i <= valor ? 'cheio' : null }))),
  );
}
