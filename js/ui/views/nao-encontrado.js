import { h } from '../dom.js';
import { icone } from '../icons.js';

export function render({ erro }) {
  const falha = Boolean(erro);
  const el = h('section', { class: 'vazio' },
    h('h1', null, falha ? 'Não foi possível carregar esta tela' : 'Página não encontrada'),
    h('p', null, falha
      ? 'Verifique a conexão e tente de novo. Se você abriu o arquivo direto do disco, use um servidor local (veja o README).'
      : 'O endereço não corresponde a nenhuma tela ou conceito.'),
    h('div', { class: 'vazio-acoes' },
      falha && h('button', { class: 'botao', type: 'button', onclick: () => location.reload() }, 'Tentar de novo'),
      h('a', { class: 'botao botao-primario', href: '#/' }, icone('seta-esquerda'), 'Voltar ao mapa'),
    ),
  );
  return { el, titulo: falha ? 'Erro ao carregar' : 'Não encontrada' };
}
