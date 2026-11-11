// Roteador por hash com View Transitions (e fallback sem animação).
import { movimentoReduzido } from './ui/motion.js';

/**
 * rotas: [{ nome, padrao: RegExp, carregar: () => import(...) }]
 * Cada módulo de tela exporta `render(ctx)` → { el, titulo, heroi?, destruir? }.
 */
export function criarRoteador({ rotas, naoEncontrada, saida, contexto, aoNavegar }) {
  let vez = 0;
  let atual = null; // { caminho, visao }
  let profundidade = 0;
  const rolagens = new Map();

  const barra = document.createElement('div');
  barra.className = 'carregando-barra';
  document.body.append(barra);

  function lerCaminho() {
    const hash = location.hash;
    if (!hash || hash === '#') return '/';
    return hash.startsWith('#/') ? decodeURIComponent(hash.slice(1)) : null;
  }

  function casar(caminho) {
    for (const rota of rotas) {
      const m = caminho.match(rota.padrao);
      if (m) return { rota, params: m.slice(1) };
    }
    return { rota: naoEncontrada, params: [caminho] };
  }

  async function navegar() {
    const caminho = lerCaminho();
    if (caminho == null) return; // âncoras comuns (#conteudo) não são rotas
    if (atual?.caminho === caminho) return;

    const minhaVez = ++vez;
    const { rota, params } = casar(caminho);
    const atraso = setTimeout(() => barra.classList.add('ativa'), 140);

    let visao;
    try {
      const modulo = await rota.carregar();
      visao = await modulo.render({ ...contexto, params, caminho });
    } catch (erro) {
      console.error(erro);
      const modulo = await naoEncontrada.carregar();
      visao = await modulo.render({ ...contexto, params: [caminho], caminho, erro });
    }
    clearTimeout(atraso);
    barra.classList.remove('ativa');
    if (minhaVez !== vez) {
      visao.destruir?.();
      return;
    }

    const anterior = atual;
    if (anterior) rolagens.set(anterior.caminho, scrollY);
    const heroi = visao.heroi || anterior?.visao.heroi;
    const marcados = [];
    const marcar = () => {
      if (!heroi) return;
      const el = document.querySelector(`[data-heroi="${CSS.escape(heroi)}"]`);
      if (el) {
        el.style.viewTransitionName = 'conceito-heroi';
        marcados.push(el);
      }
    };

    const trocar = () => {
      for (const el of marcados.splice(0)) el.style.viewTransitionName = '';
      anterior?.visao.destruir?.();
      saida.replaceChildren(visao.el);
      atual = { caminho, visao };
      profundidade += 1;
      document.title = visao.titulo ? `${visao.titulo} · Normas Interativas` : 'Normas Interativas';
      scrollTo(0, visao.heroi ? 0 : rolagens.get(caminho) || 0);
      aoNavegar?.({ rota, caminho });
      marcar();
    };

    if (anterior && document.startViewTransition && !movimentoReduzido()) {
      marcar();
      const transicao = document.startViewTransition(trocar);
      transicao.finished.finally(() => {
        for (const el of marcados.splice(0)) el.style.viewTransitionName = '';
      });
    } else {
      trocar();
      marcados.splice(0).forEach((el) => (el.style.viewTransitionName = ''));
    }
    if (anterior) saida.focus({ preventScroll: true });
  }

  // A rolagem é restaurada aqui (por rota); a restauração automática do navegador atrapalha.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  addEventListener('hashchange', navegar);

  return {
    iniciar: navegar,
    ir(caminho) {
      location.hash = `#${caminho}`;
    },
    /** Volta na história do app; se entrou direto por link, vai para o início. */
    voltar() {
      if (profundidade > 1) history.back();
      else location.hash = '#/';
    },
    get caminho() {
      return atual?.caminho;
    },
  };
}
