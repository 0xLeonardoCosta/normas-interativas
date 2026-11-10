// Gera content/normas/<pasta>/index.json a partir dos conceitos (Node, sem dependências).
// Uso: node tools/build-index.js
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gerarIndice } from '../js/content/indice.js';

const raiz = new URL('../content/', import.meta.url);
const lerJSON = async (url) => JSON.parse(await readFile(url, 'utf8'));

const catalogo = await lerJSON(new URL('normas.json', raiz));

for (const meta of catalogo.normas.filter((n) => n.disponivel)) {
  const pasta = new URL(`normas/${meta.pasta}/`, raiz);
  const norma = await lerJSON(new URL('norma.json', pasta));
  const arquivos = (await readdir(fileURLToPath(new URL('conceitos/', pasta)))).filter((a) => a.endsWith('.json')).sort();
  const conceitos = await Promise.all(arquivos.map((a) => lerJSON(new URL(`conceitos/${a}`, pasta))));
  const indice = gerarIndice(norma, conceitos);
  await writeFile(new URL('index.json', pasta), JSON.stringify(indice, null, 2) + '\n');
  console.log(`${meta.nome}: ${indice.conceitos.length} conceito(s) → content/normas/${meta.pasta}/index.json`);
}
