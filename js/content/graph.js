// Relações entre conceitos, calculadas a partir do índice (funções puras).

export const ROTULO_CONEXAO = {
  'depende-de': 'Depende de',
  influencia: 'Influencia',
  relacionado: 'Relacionado',
};

/** Conceitos que apontam para `id` (backlinks). */
export function backlinks(entradas, id) {
  const saida = [];
  for (const e of entradas) {
    for (const x of e.conexoes || []) {
      if (x.alvo === id) saida.push({ origem: e.id, tipo: x.tipo });
    }
  }
  return saida;
}

/** Agrupa as conexões de saída por tipo, na ordem de ROTULO_CONEXAO. */
export function conexoesPorTipo(conexoes) {
  return Object.keys(ROTULO_CONEXAO)
    .map((tipo) => ({ tipo, rotulo: ROTULO_CONEXAO[tipo], alvos: conexoes.filter((x) => x.tipo === tipo).map((x) => x.alvo) }))
    .filter((g) => g.alvos.length);
}
