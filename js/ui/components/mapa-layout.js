// Layout do mapa mental (função pura): árvore horizontal, temas à direita e à esquerda da raiz.

export const MEDIDAS = {
  amplo: { raizH: 46, temaH: 40, conceitoH: 34, vaoTema: 14, vao1: 96, vao2: 56 },
  estreito: { raizH: 42, temaH: 40, conceitoH: 36, vaoTema: 12, vao1: 44, vao2: 30 },
};

/**
 * raiz: { id, w } · temas: [{ id, w, filhos: [{ id, w }] }] · expandidos: Set de ids de tema.
 * `umLado` põe todos os temas à direita (telas estreitas).
 * Devolve Map(id → { tipo, x, y, w, h, lado, pai, visivel }), com (x, y) no centro do nó.
 * Conceitos de temas fechados ficam "guardados" na posição do tema, invisíveis.
 */
export function layoutMapa({ raiz, temas, expandidos, umLado = false }) {
  const m = umLado ? MEDIDAS.estreito : MEDIDAS.amplo;
  const nos = new Map();
  nos.set(raiz.id, { id: raiz.id, tipo: 'raiz', x: 0, y: 0, w: raiz.w, h: m.raizH, lado: 0, pai: null, visivel: true });

  const naDireita = umLado ? temas.length : Math.ceil(temas.length / 2);
  const lados = [[1, temas.slice(0, naDireita)], [-1, temas.slice(naDireita)]];

  for (const [lado, lista] of lados) {
    if (!lista.length) continue;
    const maiorTema = Math.max(...lista.map((t) => t.w));
    const blocos = lista.map((tema) => {
      const aberto = expandidos.has(tema.id) && tema.filhos.length > 0;
      return { tema, aberto, altura: aberto ? Math.max(m.temaH, tema.filhos.length * m.conceitoH) : m.temaH };
    });
    const total = blocos.reduce((soma, b) => soma + b.altura, 0) + m.vaoTema * (blocos.length - 1);
    const xTema = raiz.w / 2 + m.vao1;
    const xConceito = xTema + maiorTema + m.vao2;
    let y = -total / 2;

    for (const { tema, aberto, altura } of blocos) {
      const cy = y + altura / 2;
      const tx = lado * (xTema + tema.w / 2);
      nos.set(tema.id, { id: tema.id, tipo: 'tema', x: tx, y: cy, w: tema.w, h: m.temaH, lado, pai: raiz.id, visivel: true });
      const topo = cy - (tema.filhos.length * m.conceitoH) / 2;
      tema.filhos.forEach((filho, i) => {
        nos.set(filho.id, {
          id: filho.id, tipo: 'conceito', w: filho.w, h: m.conceitoH, lado, pai: tema.id, visivel: aberto,
          x: aberto ? lado * (xConceito + filho.w / 2) : tx,
          y: aberto ? topo + (i + 0.5) * m.conceitoH : cy,
        });
      });
      y += altura + m.vaoTema;
    }
  }
  return nos;
}

/** Caixa envolvente dos nós visíveis (ou de um subconjunto de ids). */
export function caixaDe(nos, ids) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const no of nos.values()) {
    if (!no.visivel || (ids && !ids.includes(no.id))) continue;
    x0 = Math.min(x0, no.x - no.w / 2);
    x1 = Math.max(x1, no.x + no.w / 2);
    y0 = Math.min(y0, no.y - no.h / 2);
    y1 = Math.max(y1, no.y + no.h / 2);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
