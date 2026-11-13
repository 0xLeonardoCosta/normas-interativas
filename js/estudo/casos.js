// Estudos de caso com decisões ramificadas — validação e utilidades puras.
//
// Formato (content/normas/<pasta>/casos/<slug>.json):
// {
//   id: "nbr6118:<slug>", norma, versao, titulo, resumo, contexto (markdown), status,
//   conceitos: [ids], inicio: "<etapa>",
//   etapas: {
//     "<etapa>": {
//       tipo: "decisao" | "consequencia" | "fim",
//       texto (markdown), pergunta?,
//       opcoes?: [{ texto, correta?: bool, feedback, proxima: "<etapa>" }],
//       conceitos?: [ids]
//     }
//   }
// }
// Textos aceitam {{dado:arquivo/caminho}} para citar valores normativos dos arquivos de dados.

const TIPOS = ['decisao', 'consequencia', 'fim'];
const PADRAO_DADO = /\{\{dado:([^}]+)\}\}/g;

/** Endereços de dados citados em um texto. */
export function dadosCitados(texto) {
  return [...String(texto || '').matchAll(PADRAO_DADO)].map((m) => m[1].trim());
}

/**
 * Divide um texto em pedaços de texto e de dado: [{ texto } | { dado: endereço }].
 * A interface resolve cada dado (valor, unidade, selo) com resolverDado.
 */
export function dividirTexto(texto) {
  const saida = [];
  let ultimo = 0;
  for (const m of String(texto || '').matchAll(PADRAO_DADO)) {
    if (m.index > ultimo) saida.push({ texto: texto.slice(ultimo, m.index) });
    saida.push({ dado: m[1].trim() });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < String(texto || '').length) saida.push({ texto: texto.slice(ultimo) });
  return saida;
}

/** Textos de um caso que podem citar dados (contexto, etapas, perguntas, opções e feedbacks). */
function textosDe(caso) {
  const textos = [caso.contexto];
  for (const e of Object.values(caso.etapas || {})) {
    textos.push(e.texto, e.pergunta);
    for (const o of e.opcoes || []) textos.push(o.texto, o.feedback);
  }
  return textos.filter(Boolean);
}

/** Etapas alcançáveis a partir do início. */
export function alcancaveis(caso) {
  const vistos = new Set();
  const fila = [caso.inicio];
  while (fila.length) {
    const id = fila.shift();
    if (vistos.has(id) || !caso.etapas?.[id]) continue;
    vistos.add(id);
    for (const o of caso.etapas[id].opcoes || []) fila.push(o.proxima);
  }
  return vistos;
}

/**
 * Valida um caso. ctx: { conceitos: Set de ids existentes, resolver(endereco) → dado|null }.
 * Devolve { erros, avisos }.
 */
export function validarCaso(caso, { conceitos = new Set(), resolver = () => null } = {}) {
  const erros = [];
  const avisos = [];
  const erro = (m) => erros.push(`${caso?.id || '(caso sem id)'}: ${m}`);

  for (const campo of ['id', 'norma', 'versao', 'titulo', 'resumo', 'contexto', 'inicio', 'etapas', 'status']) {
    if (caso?.[campo] == null || caso[campo] === '') erro(`campo obrigatório ausente: ${campo}`);
  }
  if (erros.length) return { erros, avisos };
  if (!['rascunho', 'revisado'].includes(caso.status)) erro(`status inválido: ${caso.status}`);
  if (!caso.etapas[caso.inicio]) erro(`etapa inicial inexistente: ${caso.inicio}`);

  for (const [id, e] of Object.entries(caso.etapas)) {
    if (!TIPOS.includes(e.tipo)) erro(`${id}: tipo inválido "${e.tipo}"`);
    if (!e.texto) erro(`${id}: sem texto`);
    if (e.tipo === 'fim') {
      if (e.opcoes?.length) erro(`${id}: etapa final não tem opções`);
      continue;
    }
    if (!e.opcoes?.length) erro(`${id}: precisa de opções`);
    if (e.tipo === 'decisao') {
      if (!e.pergunta) erro(`${id}: decisão sem pergunta`);
      if ((e.opcoes || []).length < 2) erro(`${id}: decisão precisa de 2+ opções`);
      if ((e.opcoes || []).filter((o) => o.correta).length !== 1) erro(`${id}: decisão precisa de exatamente 1 opção correta`);
    }
    for (const [i, o] of (e.opcoes || []).entries()) {
      if (!o.texto) erro(`${id}, opção ${i + 1}: sem texto`);
      if (!caso.etapas[o.proxima]) erro(`${id}, opção ${i + 1}: destino inexistente "${o.proxima}"`);
      if (e.tipo === 'decisao' && !o.feedback) erro(`${id}, opção ${i + 1}: sem feedback`);
    }
    for (const c of e.conceitos || []) if (!conceitos.has(c)) erro(`${id}: conceito inexistente ${c}`);
  }
  for (const c of caso.conceitos || []) if (!conceitos.has(c)) erro(`conceito inexistente ${c}`);

  const alcance = alcancaveis(caso);
  if (![...alcance].some((id) => caso.etapas[id].tipo === 'fim')) erro('nenhuma etapa final é alcançável');
  for (const id of Object.keys(caso.etapas)) if (!alcance.has(id)) avisos.push(`${caso.id}: etapa inalcançável ${id}`);

  for (const endereco of textosDe(caso).flatMap(dadosCitados)) {
    if (!resolver(endereco)) erro(`dado inexistente: ${endereco}`);
  }
  return { erros, avisos };
}

/** Decisões do caminho principal (para a nota): etapas do tipo "decisao" alcançáveis. */
export function decisoesDo(caso) {
  return [...alcancaveis(caso)].filter((id) => caso.etapas[id].tipo === 'decisao');
}
