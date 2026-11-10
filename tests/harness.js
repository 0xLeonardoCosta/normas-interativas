// Mini-harness de testes, sem dependências. Roda igual no Node e no navegador.

export const afirmar = {
  ok(valor, mensagem = 'esperava valor verdadeiro') {
    if (!valor) throw new Error(mensagem);
  },
  igual(obtido, esperado, mensagem) {
    const a = JSON.stringify(obtido);
    const b = JSON.stringify(esperado);
    if (a !== b) throw new Error(`${mensagem ? mensagem + ': ' : ''}esperava ${b}, obteve ${a}`);
  },
  aprox(obtido, esperado, tolerancia = 1e-9) {
    if (!(Math.abs(obtido - esperado) <= tolerancia)) throw new Error(`esperava ≈ ${esperado}, obteve ${obtido}`);
  },
  lanca(fn, mensagem = 'esperava um erro') {
    try {
      fn();
    } catch {
      return;
    }
    throw new Error(mensagem);
  },
};

/**
 * suites: [(teste, ambiente) => void]. `ambiente` fornece o acesso a arquivos:
 *   { lerJSON(caminhoRelativoARaiz), listarConceitos(pastaDaNorma) → [slug] }
 */
export async function rodar(suites, ambiente) {
  const casos = [];
  const avisos = [];
  const teste = (nome, fn) => casos.push({ nome, fn });
  for (const suite of suites) await suite(teste, ambiente, (m) => avisos.push(m));

  const resultados = [];
  for (const { nome, fn } of casos) {
    try {
      await fn();
      resultados.push({ nome, ok: true });
    } catch (erro) {
      resultados.push({ nome, ok: false, erro: erro?.message || String(erro) });
    }
  }
  return { resultados, avisos, falhas: resultados.filter((r) => !r.ok).length };
}
