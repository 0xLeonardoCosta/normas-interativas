// Grafo global: todos os conceitos e suas relações, com filtros por tema, status e Pareto.
import { h } from '../dom.js';
import { icone } from '../icons.js';
import { store } from '../../store.js';
import { carregarBiblioteca } from '../../content/loader.js';
import { criarGrafo } from '../components/grafo.js';

export async function render() {
  const biblioteca = await carregarBiblioteca();
  const temas = [...biblioteca.normas.values()].flatMap((n) => n.temas).filter((t) => t.conceitos.length);
  const filtro = { temas: new Set(temas.map((t) => t.id)), status: null, scoreMin: 0 };

  const contagem = h('p', { class: 'mapa-contagem', role: 'status' });
  const mostrarContagem = (c) => {
    contagem.textContent = c.conceitos === c.total
      ? `${c.total} conceitos · ${c.conexoes} conexões`
      : `${c.conceitos} de ${c.total} conceitos · ${c.conexoes} conexões`;
  };

  let painel = null;
  const grafo = await criarGrafo({
    biblioteca,
    obterProgresso: () => store.get().progresso,
    aoContar: mostrarContagem,
    // Em tela larga, o grafo é centrado na área livre ao lado do painel de filtros.
    recuoEsquerdo: () => (painel?.open && innerWidth > 720 ? painel.getBoundingClientRect().right : 0),
  });
  mostrarContagem(grafo.contagem());
  const aplicar = () => grafo.filtrar({ ...filtro, temas: new Set(filtro.temas) });

  // --- Filtros ----------------------------------------------------------------------------------
  const chipsTema = temas.map((t) => {
    const botao = h('button', { class: 'filtro-chip cor-tema', type: 'button', 'aria-pressed': 'true', style: { '--tema-h': t.matiz } },
      h('i', { 'aria-hidden': 'true' }), t.nome);
    botao.addEventListener('click', () => {
      const ligado = !filtro.temas.has(t.id);
      if (ligado) filtro.temas.add(t.id);
      else filtro.temas.delete(t.id);
      botao.setAttribute('aria-pressed', String(ligado));
      aplicar();
    });
    return botao;
  });

  const opcaoStatus = (valor, rotulo) =>
    h('label', { class: 'segmento' },
      h('input', { type: 'radio', name: 'grafo-status', checked: filtro.status === valor, onchange: () => { filtro.status = valor; aplicar(); } }),
      h('span', null, h('strong', null, rotulo)));

  const saidaScore = h('output', { for: 'grafo-score' }, 'todos');
  const entradaScore = h('input', { type: 'range', id: 'grafo-score', min: 0, max: 100, step: 5, value: 0 });
  entradaScore.style.setProperty('--p', '0%');
  entradaScore.addEventListener('input', () => {
    filtro.scoreMin = Number(entradaScore.value);
    saidaScore.textContent = filtro.scoreMin ? `score ≥ ${filtro.scoreMin}` : 'todos';
    entradaScore.setAttribute('aria-valuetext', saidaScore.textContent);
    entradaScore.style.setProperty('--p', `${filtro.scoreMin}%`);
    aplicar();
  });

  painel = h('details', { class: 'grafo-painel', open: !matchMedia('(max-width: 720px)').matches },
    h('summary', null, h('strong', null, 'Grafo de conhecimento'), icone('divisa', 14)),
    contagem,
    h('div', { class: 'grafo-filtros' },
      h('div', { class: 'grafo-filtro', role: 'group', 'aria-label': 'Filtrar por tema' }, h('span', { class: 'grafo-rotulo' }, 'Temas'), h('div', { class: 'filtro-chips' }, chipsTema)),
      h('fieldset', { class: 'sim-grupo' }, h('legend', null, 'Status'),
        h('div', { class: 'segmentos' }, opcaoStatus(null, 'Todos'), opcaoStatus('rascunho', 'Rascunho'), opcaoStatus('revisado', 'Revisado'))),
      h('div', { class: 'deslizante' }, h('label', { for: 'grafo-score' }, 'Prioridade (Pareto)'), saidaScore, entradaScore),
    ),
    h('ul', { class: 'grafo-legenda', 'aria-label': 'Legenda das conexões' },
      h('li', null, h('i', { class: 'depende-de' }), 'depende de'),
      h('li', null, h('i', { class: 'influencia' }), 'influencia'),
      h('li', null, h('i', { class: 'relacionado' }), 'relacionado'),
      h('li', null, h('i', { class: 'bolha' }), 'tamanho = prioridade'),
    ),
    grafo.semLayoutDeForca && h('p', { class: 'mapa-contagem' }, 'Sem conexão com a CDN: o grafo está em layout circular simples.'),
  );

  painel.addEventListener('toggle', () => grafo.enquadrar());

  const botao = (nome, rotulo, acao) =>
    h('button', { class: 'icone-btn', type: 'button', 'aria-label': rotulo, title: rotulo, onclick: acao }, icone(nome, 16));

  const el = h('section', { class: 'home grafo-tela' },
    h('h1', { class: 'sr' }, 'Grafo de conhecimento'),
    grafo.el,
    painel,
    h('div', { class: 'mapa-controles', role: 'group', 'aria-label': 'Controles do grafo' },
      botao('mais', 'Aproximar', () => grafo.zoom(1.3)),
      botao('menos', 'Afastar', () => grafo.zoom(1 / 1.3)),
      botao('enquadrar', 'Enquadrar tudo', () => grafo.enquadrar()),
    ),
    h('p', { class: 'mapa-dica grafo-dica', 'aria-hidden': 'true' }, 'Arraste os nós', h('span', null, '·'), 'passe o mouse para ver os vizinhos'),
  );

  const cancelar = store.assinar((novo, antigo) => novo.progresso !== antigo.progresso && grafo.atualizarProgresso());
  document.documentElement.classList.add('tela-cheia');

  return {
    el,
    titulo: 'Grafo',
    destruir() {
      document.documentElement.classList.remove('tela-cheia');
      cancelar();
      grafo.destruir();
    },
  };
}
