// Registro central de componentes interativos, endereçados por id.
// O conteúdo (JSON) cita apenas ids; o código correspondente é carregado sob demanda.
//
// Tipos:
//   simulador  → módulo com `montar(container, ctx)` que devolve uma função de limpeza
//   diagrama   → idem
//   resolvedor → módulo com `resolver(variaveis, ctx)` que devolve as linhas de resultado de um fluxograma

const registros = { simulador: new Map(), diagrama: new Map(), resolvedor: new Map() };

export function registrar(tipo, id, carregar) {
  if (!registros[tipo]) throw new Error(`Tipo de registro desconhecido: ${tipo}`);
  registros[tipo].set(id, carregar);
}

export const existe = (tipo, id) => registros[tipo]?.has(id) ?? false;

export async function obter(tipo, id) {
  const carregar = registros[tipo]?.get(id);
  return carregar ? carregar() : null;
}

// --- NBR 6118 ---------------------------------------------------------------------------------
registrar('simulador', 'nbr6118:caa-cobrimento', () => import('./simuladores/nbr6118/caa-cobrimento.js'));
registrar('resolvedor', 'nbr6118:requisitos-durabilidade', () => import('./simuladores/nbr6118/resolvedores.js'));
