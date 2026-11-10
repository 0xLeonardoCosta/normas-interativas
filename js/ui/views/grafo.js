import { h } from '../dom.js';
import { icone } from '../icons.js';

// Fase 2: grafo global com layout de força. A rota já existe para os links não quebrarem.
export function render() {
  const el = h('section', { class: 'vazio' },
    h('span', { class: 'chip' }, 'Em breve'),
    h('h1', null, 'Grafo de conhecimento'),
    h('p', null, 'Uma visão de todos os conceitos e das relações entre eles, com filtros por tema e por prioridade. Chega na próxima fase. Por enquanto, as conexões aparecem no fim de cada conceito.'),
    h('div', { class: 'vazio-acoes' },
      h('a', { class: 'botao botao-primario', href: '#/' }, icone('mapa'), 'Explorar o mapa'),
    ),
  );
  return { el, titulo: 'Grafo' };
}
