// Acesso aos dados normativos (content/normas/<norma>/dados/*.json).
// Um "dado" é endereçado por "arquivo/caminho.com.pontos", ex.: "durabilidade/deltaC.padrao".

/**
 * Resolve um endereço e devolve { valor, unidade?, referencia, pendenteValidacao }.
 * `referencia` e `pendenteValidacao` são herdados do ancestral mais próximo que os declare,
 * para que uma tabela inteira possa ser marcada de uma vez.
 */
export function resolverDado(dados, endereco) {
  const [arquivo, caminho = ''] = String(endereco).split('/');
  let no = dados?.[arquivo];
  if (no == null) return null;
  let referencia;
  let pendente;
  const herdar = (n) => {
    if (n && typeof n === 'object') {
      if (typeof n.referencia === 'string') referencia = n.referencia;
      if (typeof n.pendenteValidacao === 'boolean') pendente = n.pendenteValidacao;
    }
  };
  herdar(no);
  for (const parte of caminho.split('.').filter(Boolean)) {
    no = no?.[parte];
    if (no == null) return null;
    herdar(no);
  }
  const folha = no && typeof no === 'object' ? no : { valor: no };
  if (!('valor' in folha)) return null;
  return { valor: folha.valor, unidade: folha.unidade, referencia, pendenteValidacao: pendente !== false };
}
