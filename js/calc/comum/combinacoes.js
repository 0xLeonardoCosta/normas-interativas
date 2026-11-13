// Combinações de ações — motor genérico, válido para qualquer norma que combine ações de forma
// linear (NBR 6118/8681, Eurocode, ACI...). Funções puras, sem DOM, sem fetch.
//
// Nenhum coeficiente nem regra de norma está neste arquivo. A norma descreve, nos seus dados:
//   - os coeficientes de cada ação (ex.: { gama: 1.4, psi0: 0.5, psi1: 0.4, psi2: 0.3 });
//   - cada combinação como a lista de coeficientes que multiplicam cada papel:
//       { permanente: ['gama'], principal: ['gama'], secundarias: ['gama', 'psi0'] }
//     Lista vazia = fator 1 (a ação entra com seu valor característico).
//
// Papéis: todas as ações permanentes entram juntas; entre as variáveis, cada uma é tentada como
// principal e as demais entram como secundárias. Vale a tentativa de maior resultado.
//
// TODO-NORMA: a regra "cada variável como principal, vale a maior" deve ser confirmada para cada
// norma que usar este motor. Para a NBR 6118:2023, itens 11.8.2 e 11.8.3.

function exigir(condicao, mensagem) {
  if (!condicao) throw new RangeError(mensagem);
}

const PAPEIS = ['permanente', 'principal', 'secundarias'];

/** Produto dos coeficientes nomeados em `nomes`, lidos da ação. */
export function fator(acao, nomes = []) {
  return nomes.reduce((produto, nome) => {
    const v = acao.coeficientes?.[nome];
    exigir(Number.isFinite(v), `coeficiente "${nome}" ausente na ação ${acao.id ?? '(sem id)'}`);
    return produto * v;
  }, 1);
}

/**
 * Combina ações conforme a definição de uma combinação.
 * acoes: [{ id, tipo: 'permanente' | 'variavel', valor, coeficientes: { nome: número } }]
 * Devolve { valor, principal (id ou null), parcelas: [{ id, papel, valor, fator, parcela }] }.
 */
export function combinar(definicao, acoes) {
  for (const papel of PAPEIS) exigir(Array.isArray(definicao?.[papel]), `combinação sem a regra do papel "${papel}"`);
  exigir(Array.isArray(acoes), 'ações devem ser uma lista');
  for (const a of acoes) {
    exigir(a.tipo === 'permanente' || a.tipo === 'variavel', `tipo de ação desconhecido: ${a.tipo}`);
    exigir(Number.isFinite(a.valor) && a.valor >= 0, `valor inválido na ação ${a.id}`);
  }

  const permanentes = acoes.filter((a) => a.tipo === 'permanente');
  const variaveis = acoes.filter((a) => a.tipo === 'variavel');

  const parcela = (acao, papel) => {
    const f = fator(acao, definicao[papel]);
    return { id: acao.id, papel, valor: acao.valor, fator: f, parcela: acao.valor * f };
  };

  const tentativas = (variaveis.length ? variaveis : [null]).map((principal) => {
    const parcelas = [
      ...permanentes.map((a) => parcela(a, 'permanente')),
      ...variaveis.map((a) => parcela(a, a === principal ? 'principal' : 'secundarias')),
    ];
    return { valor: parcelas.reduce((s, p) => s + p.parcela, 0), principal: principal?.id ?? null, parcelas };
  });

  return tentativas.reduce((maior, t) => (t.valor > maior.valor ? t : maior));
}

/** Aplica todas as combinações de uma norma às mesmas ações. Devolve { [idCombinacao]: resultado }. */
export function combinarTodas(definicoes, acoes) {
  return Object.fromEntries(definicoes.map((d) => [d.id, combinar(d, acoes)]));
}

// --- Dados no formato padrão de ações ---------------------------------------------------------
// Uma norma que queira usar o simulador genérico descreve, em dados/acoes.json:
//   ponderacao.permanente.valor, ponderacao.variavel.valor,
//   fatoresDeCombinacao.itens[{ id, nome, psi0, psi1, psi2 }], combinacoes.itens[definição].

/** Fatores ψ de uma categoria de uso. */
export function categoriaDeUso(t, id) {
  const c = t.fatoresDeCombinacao.itens.find((i) => i.id === id);
  exigir(c, `categoria de uso desconhecida: ${id}`);
  return c;
}

/** Ações de uma viga com uma carga permanente g e uma variável q, com os ψ da categoria de uso. */
export function acoesDaViga(t, { g, q, categoria }) {
  const c = categoriaDeUso(t, categoria);
  return [
    { id: 'g', tipo: 'permanente', valor: g, coeficientes: { gama: t.ponderacao.permanente.valor } },
    { id: 'q', tipo: 'variavel', valor: q, coeficientes: { gama: t.ponderacao.variavel.valor, psi0: c.psi0, psi1: c.psi1, psi2: c.psi2 } },
  ];
}

/** Todas as combinações da norma aplicadas às ações da viga. */
export function combinacoesDaViga(t, entrada) {
  return combinarTodas(t.combinacoes.itens, acoesDaViga(t, entrada));
}

// --- Estática (não normativa)-------------------------------------------------------------------

/** Momento máximo de uma viga biapoiada com carga uniforme: M = p · L² / 8. */
export function momentoBiapoiada(p, vao) {
  exigir(Number.isFinite(p) && p >= 0 && Number.isFinite(vao) && vao > 0, 'momentoBiapoiada: entradas inválidas');
  return (p * vao * vao) / 8;
}
