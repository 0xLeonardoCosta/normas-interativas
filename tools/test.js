// Roda o validador de conteúdo e os testes de cálculo no Node (sem dependências).
// Uso: node tools/test.js
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { rodar } from '../tests/harness.js';
import suiteCalculo from '../tests/calc.test.js';
import suiteMateriais from '../tests/materiais.test.js';
import suiteConteudo from '../tests/conteudo.test.js';

const raiz = new URL('../', import.meta.url);

const ambiente = {
  async lerJSON(caminho) {
    return JSON.parse(await readFile(new URL(caminho, raiz), 'utf8'));
  },
  async listarConceitos(pasta) {
    const arquivos = await readdir(fileURLToPath(new URL(`content/normas/${pasta}/conceitos/`, raiz)));
    return arquivos.filter((a) => a.endsWith('.json')).map((a) => a.slice(0, -5)).sort();
  },
};

const { resultados, avisos, falhas } = await rodar([suiteCalculo, suiteMateriais, suiteConteudo], ambiente);

for (const r of resultados) console.log(`${r.ok ? '  ok  ' : ' FALHA'}  ${r.nome}${r.ok ? '' : `\n         ${r.erro}`}`);
for (const a of avisos) console.log(` aviso  ${a}`);
console.log(`\n${resultados.length - falhas} de ${resultados.length} testes passaram.`);
process.exit(falhas ? 1 : 0);
