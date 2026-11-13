// Ponto de entrada: liga o shell (topo, tema, atalhos) ao roteador.
import { store, acoes } from './store.js';
import { criarRoteador } from './router.js';
import { carregarBiblioteca, preCarregarConceito } from './content/loader.js';
import { iconeHTML } from './ui/icons.js';
import { aquecerFormulas } from './content/markdown.js';
import { contarVencidos } from './estudo/revisao.js';

for (const el of document.querySelectorAll('[data-icone]')) el.outerHTML = iconeHTML(el.dataset.icone, 16);

const ehMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
if (ehMac) document.querySelector('[data-atalho-busca]').textContent = '⌘K';

// --- Tema ---------------------------------------------------------------------------------------
const botaoTema = document.querySelector('[data-acao="tema"]');
const TEMAS = { sistema: ['monitor', 'do sistema'], claro: ['sol', 'claro'], escuro: ['lua', 'escuro'] };

function aplicarTema(tema) {
  const raiz = document.documentElement;
  if (tema === 'sistema') delete raiz.dataset.tema;
  else raiz.dataset.tema = tema;
  const [icone, nome] = TEMAS[tema] || TEMAS.sistema;
  botaoTema.innerHTML = iconeHTML(icone, 16);
  botaoTema.setAttribute('aria-label', `Tema ${nome}. Alternar tema`);
  botaoTema.title = `Tema ${nome}`;
}
aplicarTema(store.get().tema);
store.assinar((novo, antigo) => novo.tema !== antigo.tema && aplicarTema(novo.tema));

export function alternarTema() {
  const ordem = Object.keys(TEMAS);
  acoes.definirTema(ordem[(ordem.indexOf(store.get().tema) + 1) % ordem.length]);
}
botaoTema.addEventListener('click', alternarTema);

// --- Contador de revisões vencidas no link "Praticar" ---------------------------------------------
const contador = document.querySelector('[data-contador="revisao"]');
function atualizarContador() {
  const n = contarVencidos(store.get().progresso.revisao, Date.now());
  contador.textContent = n > 99 ? '99+' : String(n);
  contador.hidden = n === 0;
  contador.closest('a').setAttribute('aria-label', n ? `Praticar, ${n} ${n === 1 ? 'revisão pendente' : 'revisões pendentes'}` : 'Praticar');
}
atualizarContador();
store.assinar((novo, antigo) => novo.progresso.revisao !== antigo.progresso.revisao && atualizarContador());
setInterval(atualizarContador, 60000);

// --- Rotas --------------------------------------------------------------------------------------
const saida = document.getElementById('conteudo');
const roteador = criarRoteador({
  saida,
  rotas: [
    { nome: 'home', padrao: /^\/$/, carregar: () => import('./ui/views/home.js') },
    { nome: 'pareto', padrao: /^\/pareto$/, carregar: () => import('./ui/views/pareto.js') },
    { nome: 'grafo', padrao: /^\/grafo$/, carregar: () => import('./ui/views/grafo.js') },
    { nome: 'progresso', padrao: /^\/progresso$/, carregar: () => import('./ui/views/progresso.js') },
    { nome: 'praticar', padrao: /^\/praticar$/, carregar: () => import('./ui/views/praticar.js') },
    { nome: 'praticar', padrao: /^\/caso\/([a-z0-9]+:[a-z0-9-]+)$/, carregar: () => import('./ui/views/caso.js') },
    { nome: 'conceito', padrao: /^\/conceito\/([a-z0-9]+:[a-z0-9-]+)$/, carregar: () => import('./ui/views/conceito.js') },
  ],
  naoEncontrada: { nome: 'nao-encontrada', carregar: () => import('./ui/views/nao-encontrado.js') },
  contexto: { voltar: () => roteador.voltar() },
  aoNavegar({ rota }) {
    for (const link of document.querySelectorAll('[data-nav]')) {
      if (link.dataset.nav === rota.nome) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  },
});

// --- Busca (⌘K / Ctrl+K) --------------------------------------------------------------------------
let paleta = null;
async function abrirBusca() {
  paleta ??= import('./ui/components/command-palette.js').then((m) => m.criarPaleta({ roteador, alternarTema }));
  (await paleta).abrir();
}
document.querySelector('[data-acao="buscar"]').addEventListener('click', abrirBusca);

addEventListener('keydown', (e) => {
  const digitando = e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]');
  if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    abrirBusca();
  } else if (e.key === '/' && !digitando && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    abrirBusca();
  } else if (e.key === 'Escape' && !e.defaultPrevented && !digitando && !document.querySelector('dialog[open]')) {
    if (roteador.caminho && roteador.caminho !== '/') roteador.voltar();
  }
});

// --- Pré-carregamento ao passar o mouse ou focar ---------------------------------------------------
function aquecer(e) {
  const link = e.target instanceof Element && e.target.closest('a[href^="#/conceito/"]');
  if (!link) return;
  preCarregarConceito(decodeURIComponent(link.getAttribute('href').slice('#/conceito/'.length)));
  aquecerFormulas();
}
document.addEventListener('pointerover', aquecer, { passive: true });
document.addEventListener('focusin', aquecer);
document.addEventListener('touchstart', aquecer, { passive: true });

document.querySelector('[data-acao="pular"]').addEventListener('click', (e) => {
  e.preventDefault();
  saida.focus();
});

carregarBiblioteca().catch(() => {}); // erros são tratados por cada tela
roteador.iniciar();

// Com o navegador ocioso, deixa a busca pronta para abrir sem espera.
(globalThis.requestIdleCallback || ((f) => setTimeout(f, 1200)))(() => {
  import('./ui/components/command-palette.js').catch(() => {});
});
