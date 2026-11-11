// Markdown simples → HTML seguro. Suporta: parágrafos, listas (-), **negrito**, *itálico*,
// `código`, [links](url) e fórmulas $...$ / $$...$$ (renderizadas depois pelo KaTeX).

const escapar = (t) =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function emLinha(texto) {
  // Fórmulas saem primeiro para que * e _ dentro delas não virem ênfase.
  const formulas = [];
  let t = texto.replace(/\$\$([^$]+)\$\$|\$([^$\n]+)\$/g, (_, bloco, linha) => {
    formulas.push({ tex: bloco ?? linha, bloco: bloco != null });
    return `\u0000${formulas.length - 1}\u0000`;
  });
  t = escapar(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, rotulo, url) => {
      const seguro = /^(#\/|https?:\/\/)/.test(url) ? url : '#/';
      const externo = seguro.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${seguro}"${externo}>${rotulo}</a>`;
    });
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => {
    const f = formulas[+i];
    return `<span class="formula${f.bloco ? ' formula-bloco' : ''}" data-tex="${escapar(f.tex)}">${escapar(f.tex)}</span>`;
  });
}

export function markdown(texto) {
  if (!texto) return '';
  const blocos = String(texto).replace(/\r\n/g, '\n').split(/\n{2,}/);
  return blocos
    .map((bloco) => {
      const linhas = bloco.split('\n');
      if (linhas.every((l) => /^\s*-\s+/.test(l))) {
        return `<ul>${linhas.map((l) => `<li>${emLinha(l.replace(/^\s*-\s+/, ''))}</li>`).join('')}</ul>`;
      }
      return `<p>${emLinha(linhas.join(' '))}</p>`;
    })
    .join('');
}

export const markdownEmLinha = (texto) => emLinha(String(texto ?? ''));

const KATEX = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist';
let katexPronto = null;

function carregarKatex() {
  katexPronto ??= (async () => {
    const folha = document.createElement('link');
    folha.rel = 'stylesheet';
    folha.href = `${KATEX}/katex.min.css`;
    document.head.append(folha);
    return (await import(`${KATEX}/katex.mjs`)).default;
  })();
  return katexPronto;
}

/** Baixa o KaTeX antes de ser preciso (ao passar o mouse em um conceito), para a fórmula não piscar em TeX. */
export function aquecerFormulas() {
  carregarKatex().catch(() => {
    katexPronto = null;
  });
}

/** Renderiza as fórmulas dentro de `raiz`. O KaTeX só é baixado se houver fórmula. */
export async function renderizarFormulas(raiz) {
  const alvos = raiz.querySelectorAll('.formula[data-tex]');
  if (!alvos.length) return;
  carregarKatex();
  try {
    const katex = await katexPronto;
    for (const el of alvos) {
      katex.render(el.dataset.tex, el, { throwOnError: false, displayMode: el.classList.contains('formula-bloco') });
      el.removeAttribute('data-tex');
    }
  } catch (erro) {
    katexPronto = null; // sem rede: a fórmula fica legível em TeX puro
    console.warn('KaTeX indisponível', erro);
  }
}
