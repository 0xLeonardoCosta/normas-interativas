// Busca global (⌘K / Ctrl+K): conceitos + ações, toda operável pelo teclado.
import { h } from '../dom.js';
import { icone } from '../icons.js';
import { carregarBiblioteca, preCarregarConceito } from '../../content/loader.js';
import { ordenarPorPareto } from '../../content/pareto.js';

const FUSE = 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.mjs';
const semAcento = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export async function criarPaleta({ roteador, alternarTema }) {
  const biblioteca = await carregarBiblioteca();
  const conceitos = [...biblioteca.conceitos.values()].map((e) => ({
    tipo: 'conceito',
    id: e.id,
    titulo: e.titulo,
    detalhe: biblioteca.temaDe(e.id)?.nome,
    matiz: biblioteca.temaDe(e.id)?.matiz,
    resumo: e.resumo,
    tags: e.tags,
    acao: () => roteador.ir(`/conceito/${e.id}`),
  }));
  const acoes = [
    { tipo: 'acao', id: 'ir-mapa', titulo: 'Abrir o mapa', icone: 'mapa', acao: () => roteador.ir('/') },
    { tipo: 'acao', id: 'ir-pareto', titulo: 'Abrir Os 20%', icone: 'alvo', acao: () => roteador.ir('/pareto') },
    { tipo: 'acao', id: 'tema', titulo: 'Alternar tema claro / escuro', icone: 'sol', acao: alternarTema },
  ];
  const tudo = [...conceitos, ...acoes];
  const sugestoes = [...ordenarPorPareto([...biblioteca.conceitos.values()]).slice(0, 5).map((e) => conceitos.find((c) => c.id === e.id)), ...acoes];

  // Fuse.js faz a busca aproximada; se a CDN falhar, cai para uma busca simples por trecho.
  let fuse = null;
  import(FUSE)
    .then((m) => {
      fuse = new m.default(tudo, {
        keys: [{ name: 'titulo', weight: 3 }, { name: 'tags', weight: 2 }, { name: 'detalhe', weight: 1 }, { name: 'resumo', weight: 1 }],
        threshold: 0.38,
        ignoreLocation: true,
        ignoreDiacritics: true,
        getFn: (obj, caminho) => {
          const v = obj[Array.isArray(caminho) ? caminho[0] : caminho];
          return Array.isArray(v) ? v.map(semAcento) : v == null ? '' : semAcento(v);
        },
      });
    })
    .catch(() => {});

  function buscar(termo) {
    const q = semAcento(termo.trim());
    if (!q) return sugestoes;
    if (fuse) return fuse.search(q, { limit: 8 }).map((r) => r.item);
    return tudo.filter((i) => semAcento(`${i.titulo} ${i.detalhe || ''} ${(i.tags || []).join(' ')} ${i.resumo || ''}`).includes(q)).slice(0, 8);
  }

  const entrada = h('input', {
    type: 'text', class: 'paleta-entrada', placeholder: 'Buscar conceitos, temas ou ações', autocomplete: 'off', spellcheck: 'false',
    role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'paleta-lista', 'aria-autocomplete': 'list', 'aria-label': 'Buscar',
  });
  const listaEl = h('ul', { class: 'paleta-lista', id: 'paleta-lista', role: 'listbox', 'aria-label': 'Resultados' });
  const dialogo = h('dialog', { class: 'paleta', 'aria-label': 'Busca' },
    h('div', { class: 'paleta-topo' }, icone('busca', 18), entrada, h('kbd', null, 'Esc')),
    listaEl,
    h('div', { class: 'paleta-rodape', 'aria-hidden': 'true' },
      h('span', null, h('kbd', null, '↑'), h('kbd', null, '↓'), ' navegar'),
      h('span', null, h('kbd', null, '↵'), ' abrir'),
    ),
  );
  document.body.append(dialogo);

  let resultados = [];
  let ativo = 0;

  function marcar(i, rolar = true) {
    ativo = Math.max(0, Math.min(resultados.length - 1, i));
    [...listaEl.children].forEach((li, j) => li.setAttribute('aria-selected', String(j === ativo)));
    const atual = listaEl.children[ativo];
    if (atual) {
      entrada.setAttribute('aria-activedescendant', atual.id);
      if (rolar) atual.scrollIntoView({ block: 'nearest' });
      if (resultados[ativo].tipo === 'conceito') preCarregarConceito(resultados[ativo].id);
    } else entrada.removeAttribute('aria-activedescendant');
  }

  function desenhar() {
    resultados = buscar(entrada.value);
    if (!resultados.length) {
      listaEl.replaceChildren(h('li', { class: 'paleta-vazio', role: 'presentation' }, `Nada encontrado para “${entrada.value.trim()}”.`));
      entrada.removeAttribute('aria-activedescendant');
      return;
    }
    listaEl.replaceChildren(...resultados.map((r, i) =>
      h('li', {
        id: `paleta-item-${i}`, role: 'option', class: `paleta-item${r.tipo === 'conceito' ? ' cor-tema' : ''}`, style: { '--tema-h': r.matiz },
        onclick: () => escolher(i), onpointermove: () => i !== ativo && marcar(i, false),
      },
        r.tipo === 'conceito' ? h('i', { class: 'ponto', 'aria-hidden': 'true' }) : icone(r.icone, 16),
        h('span', { class: 'paleta-titulo' }, r.titulo),
        r.detalhe && h('small', null, r.detalhe),
      )));
    marcar(0);
  }

  function escolher(i) {
    const item = resultados[i];
    if (!item) return;
    fechar();
    item.acao();
  }

  function fechar() {
    if (!dialogo.open) return;
    dialogo.classList.add('saindo');
    setTimeout(() => {
      dialogo.classList.remove('saindo');
      dialogo.close();
    }, 110);
  }

  entrada.addEventListener('input', desenhar);
  entrada.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); marcar(ativo + 1 >= resultados.length ? 0 : ativo + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); marcar(ativo - 1 < 0 ? resultados.length - 1 : ativo - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); escolher(ativo); }
  });
  dialogo.addEventListener('cancel', (e) => { e.preventDefault(); fechar(); });
  dialogo.addEventListener('click', (e) => e.target === dialogo && fechar()); // clique no fundo

  return {
    abrir() {
      if (dialogo.open) return fechar();
      entrada.value = '';
      desenhar();
      dialogo.showModal();
      entrada.focus();
    },
    fechar,
  };
}
