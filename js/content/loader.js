// Carregamento do conteúdo (JSON) com cache e pré-carregamento.
// Única parte da camada de conteúdo que conhece `fetch`.
import { partesDoId } from './indice.js';

const BASE = new URL('../../content/', import.meta.url);
const cache = new Map();

function lerJSON(caminho) {
  if (!cache.has(caminho)) {
    const pedido = fetch(new URL(caminho, BASE))
      .then((r) => {
        if (!r.ok) throw new Error(`Falha ao carregar ${caminho} (${r.status})`);
        return r.json();
      })
      .catch((erro) => {
        cache.delete(caminho);
        throw erro;
      });
    cache.set(caminho, pedido);
  }
  return cache.get(caminho);
}

let biblioteca = null;

/**
 * Carrega o catálogo e, para cada norma disponível, `norma.json` + `index.json`.
 * Devolve { normas: Map, conceitos: Map(id → entrada do índice), padrao }.
 */
export function carregarBiblioteca() {
  biblioteca ??= (async () => {
    const catalogo = await lerJSON('normas.json');
    const normas = new Map();
    const conceitos = new Map();
    await Promise.all(
      catalogo.normas.filter((n) => n.disponivel).map(async (meta) => {
        const [norma, indice] = await Promise.all([
          lerJSON(`normas/${meta.pasta}/norma.json`),
          lerJSON(`normas/${meta.pasta}/index.json`),
        ]);
        const temas = new Map(norma.temas.map((t) => [t.id, { ...t, conceitos: [] }]));
        for (const entrada of indice.conceitos) {
          conceitos.set(entrada.id, entrada);
          temas.get(entrada.tema)?.conceitos.push(entrada);
        }
        normas.set(norma.id, { ...norma, pasta: meta.pasta, temas: [...temas.values()], conceitos: indice.conceitos });
      }),
    );
    const padrao = normas.get(catalogo.normas.find((n) => n.disponivel)?.id);
    return {
      normas,
      conceitos,
      padrao,
      temaDe(id) {
        const entrada = conceitos.get(id);
        return entrada && normas.get(partesDoId(id).norma)?.temas.find((t) => t.id === entrada.tema);
      },
    };
  })().catch((erro) => {
    biblioteca = null;
    throw erro;
  });
  return biblioteca;
}

async function pastaDe(normaId) {
  const b = await carregarBiblioteca();
  const norma = b.normas.get(normaId);
  if (!norma) throw new Error(`Norma não disponível: ${normaId}`);
  return norma.pasta;
}

export async function carregarConceito(id) {
  const partes = partesDoId(id);
  if (!partes) throw new Error(`Id inválido: ${id}`);
  return lerJSON(`normas/${await pastaDe(partes.norma)}/conceitos/${partes.slug}.json`);
}

/** Aquece o cache ao passar o mouse ou focar um link de conceito. */
export function preCarregarConceito(id) {
  carregarConceito(id).catch(() => {});
}

export async function carregarDados(normaId, nome) {
  return lerJSON(`normas/${await pastaDe(normaId)}/dados/${nome}.json`);
}

export async function carregarFluxograma(id) {
  const partes = partesDoId(id);
  if (!partes) throw new Error(`Id inválido: ${id}`);
  return lerJSON(`normas/${await pastaDe(partes.norma)}/fluxogramas/${partes.slug}.json`);
}
