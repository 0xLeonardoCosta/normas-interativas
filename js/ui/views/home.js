// Home: o mapa mental ocupa a tela inteira, como um canvas.
import { h } from '../dom.js';
import { icone } from '../icons.js';
import { store, acoes } from '../../store.js';
import { carregarBiblioteca } from '../../content/loader.js';
import { progressoDe } from '../../content/pareto.js';
import { criarMapa } from '../components/mapa-mental.js';

export async function render() {
  const biblioteca = await carregarBiblioteca();
  const norma = biblioteca.padrao;
  const lembrado = store.get().mapa;

  const mapa = criarMapa({
    norma,
    obterProgresso: () => store.get().progresso,
    expandidosIniciais: lembrado.expandidos,
    vistaInicial: lembrado.vista,
  });

  const contagem = h('p', { class: 'mapa-contagem' });
  const barra = h('i');
  function atualizarResumo() {
    const p = progressoDe(norma.conceitos, store.get().progresso);
    contagem.textContent = p.lidos === 0
      ? `${p.total} conceitos para explorar`
      : `${p.lidos} de ${p.total} conceitos lidos`;
    barra.style.transform = `scaleX(${p.fracao})`;
  }
  atualizarResumo();

  const botao = (nome, rotulo, acao) =>
    h('button', { class: 'icone-btn', type: 'button', 'aria-label': rotulo, title: rotulo, onclick: acao }, icone(nome, 16));

  const el = h('section', { class: 'home' },
    h('h1', { class: 'sr' }, `Mapa mental da ${norma.nome}`),
    mapa.el,
    h('div', { class: 'mapa-info' },
      h('p', { class: 'mapa-titulo' }, h('strong', null, `${norma.nome}:${norma.versao}`), ` ${norma.titulo}`),
      contagem,
      h('div', { class: 'progresso-barra', 'aria-hidden': 'true' }, barra),
    ),
    h('div', { class: 'mapa-controles', role: 'group', 'aria-label': 'Controles do mapa' },
      botao('mais', 'Aproximar', () => mapa.zoom(1.3)),
      botao('menos', 'Afastar', () => mapa.zoom(1 / 1.3)),
      botao('enquadrar', 'Enquadrar tudo', () => mapa.enquadrar()),
    ),
    h('p', { class: 'mapa-dica', 'aria-hidden': 'true' },
      'Arraste para mover', h('span', null, '·'), 'role para aproximar', h('span', null, '·'), h('kbd', null, '←↑↓→'), ' navegam'),
  );

  const cancelar = store.assinar((novo, antigo) => {
    if (novo.progresso !== antigo.progresso) {
      mapa.atualizarProgresso();
      atualizarResumo();
    }
  });

  // Setas funcionam mesmo antes de o mapa receber foco.
  function aoTeclar(e) {
    if (!e.key.startsWith('Arrow') || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const ativo = document.activeElement;
    if (mapa.contem(ativo) || document.querySelector('dialog[open]')) return;
    if (ativo && ativo !== document.body && ativo.id !== 'conteudo') return;
    e.preventDefault();
    mapa.focar();
  }
  addEventListener('keydown', aoTeclar);
  document.documentElement.classList.add('tela-cheia');

  return {
    el,
    titulo: `Mapa da ${norma.nome}`,
    destruir() {
      acoes.lembrarMapa(mapa.estado());
      document.documentElement.classList.remove('tela-cheia');
      removeEventListener('keydown', aoTeclar);
      cancelar();
      mapa.destruir();
    },
  };
}
