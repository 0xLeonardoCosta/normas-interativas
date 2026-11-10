// Geração do índice leve de uma norma (função pura, usada pelo script e pelos testes).

/** Extrai de um conceito só o necessário para busca, mapa, Pareto e grafo. */
export function entradaDoIndice(c) {
  return {
    id: c.id,
    tema: c.tema,
    titulo: c.titulo,
    resumo: c.resumo,
    status: c.status,
    pareto: c.pareto,
    tags: c.tags || [],
    ondeSeAplica: c.ondeSeAplica || [],
    conexoes: c.conexoes || [],
    temQuiz: Array.isArray(c.quiz) && c.quiz.length > 0,
    temSimulador: Array.isArray(c.simuladores) && c.simuladores.length > 0,
  };
}

export function gerarIndice(norma, conceitos) {
  const ordemTemas = norma.temas.map((t) => t.id);
  const ordenados = [...conceitos].sort(
    (a, b) => ordemTemas.indexOf(a.tema) - ordemTemas.indexOf(b.tema) || a.id.localeCompare(b.id),
  );
  return { norma: norma.id, versao: norma.versao, conceitos: ordenados.map(entradaDoIndice) };
}

/** `nbr6118:cobrimento-nominal` → { norma: 'nbr6118', slug: 'cobrimento-nominal' } */
export function partesDoId(id) {
  const i = String(id).indexOf(':');
  return i < 1 ? null : { norma: id.slice(0, i), slug: id.slice(i + 1) };
}
