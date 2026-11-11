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

/**
 * Grafo de conhecimento a partir das entradas do índice.
 * Nós: um por conceito, mais um nó "externo" para cada alvo que não está na biblioteca
 * (conceito de norma ainda não disponível). Arestas: uma por par, sem duplicar o par inverso.
 */
export function montarGrafo(entradas) {
  const ids = new Set(entradas.map((e) => e.id));
  const nos = entradas.map((e) => ({ id: e.id, entrada: e, externo: false }));
  const arestas = [];
  const vistos = new Set();
  for (const e of entradas) {
    for (const x of e.conexoes || []) {
      if (!ids.has(x.alvo)) {
        ids.add(x.alvo);
        nos.push({ id: x.alvo, entrada: null, externo: true });
      }
      const par = [e.id, x.alvo].sort().join(' ');
      if (vistos.has(par)) continue;
      vistos.add(par);
      arestas.push({ origem: e.id, alvo: x.alvo, tipo: x.tipo });
    }
  }
  return { nos, arestas };
}

/** Mapa id → Set de ids vizinhos. */
export function vizinhanca(arestas) {
  const mapa = new Map();
  const ligar = (a, b) => (mapa.get(a) || mapa.set(a, new Set()).get(a)).add(b);
  for (const { origem, alvo } of arestas) {
    ligar(origem, alvo);
    ligar(alvo, origem);
  }
  return mapa;
}
