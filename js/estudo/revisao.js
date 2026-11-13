// Revisão espaçada das perguntas de quiz (sistema de caixas de Leitner) — funções puras.
//
// Cada pergunta de quiz vira um cartão "<idConceito>#<índice>". O estado de um cartão é
// { caixa, proxima, acertos, erros }. Acertar sobe uma caixa e afasta a próxima revisão;
// errar devolve o cartão à primeira caixa. Não há valor normativo aqui: os intervalos são
// escolha didática (docs/DECISOES.md, decisão 22).

const DIA = 24 * 60 * 60 * 1000;

/** Dias até a próxima revisão para cada caixa (índice = caixa). A caixa 0 é "nunca visto". */
export const INTERVALOS_DIAS = [0, 1, 3, 7, 16, 35];
export const CAIXA_MAX = INTERVALOS_DIAS.length - 1;

export const idCartao = (idConceito, indice) => `${idConceito}#${indice}`;

export function partesDoCartao(id) {
  const i = String(id).lastIndexOf('#');
  return i < 0 ? null : { conceito: id.slice(0, i), indice: Number(id.slice(i + 1)) };
}

/** Cartões de um conjunto de conceitos completos (com `quiz`). */
export function cartoesDe(conceitos) {
  return conceitos.flatMap((c) => (c.quiz || []).map((_, i) => idCartao(c.id, i)));
}

/** Novo estado de um cartão depois de uma resposta. */
export function registrarResposta(estado, certo, agora) {
  const atual = estado || { caixa: 0, proxima: agora, acertos: 0, erros: 0 };
  const caixa = certo ? Math.min(CAIXA_MAX, atual.caixa + 1) : 1;
  return {
    caixa,
    proxima: agora + INTERVALOS_DIAS[caixa] * DIA,
    acertos: atual.acertos + (certo ? 1 : 0),
    erros: atual.erros + (certo ? 0 : 1),
  };
}

export const vencido = (estado, agora) => Boolean(estado) && estado.proxima <= agora;

/**
 * Monta a fila de uma sessão: primeiro os cartões vencidos (os mais atrasados antes), depois até
 * `novosMax` cartões nunca vistos, na ordem em que vieram (o chamador ordena por prioridade).
 */
export function montarSessao({ cartoes, estados = {}, agora, novosMax = 5, limite = 20 }) {
  const vencidos = cartoes
    .filter((id) => vencido(estados[id], agora))
    .sort((a, b) => estados[a].proxima - estados[b].proxima);
  const novos = cartoes.filter((id) => !estados[id]).slice(0, novosMax);
  return [...vencidos, ...novos].slice(0, limite);
}

/** Números para o painel: vencidos, novos disponíveis, dominados e a data da próxima revisão. */
export function resumoDaRevisao({ cartoes, estados = {}, agora }) {
  let vencidos = 0, novos = 0, dominados = 0, proxima = null;
  for (const id of cartoes) {
    const e = estados[id];
    if (!e) { novos += 1; continue; }
    if (e.caixa >= CAIXA_MAX) dominados += 1;
    if (e.proxima <= agora) vencidos += 1;
    else if (proxima === null || e.proxima < proxima) proxima = e.proxima;
  }
  return { total: cartoes.length, vencidos, novos, dominados, proxima };
}

/** Quantos cartões já vistos estão vencidos (para o contador da navegação, sem carregar conceitos). */
export function contarVencidos(estados = {}, agora) {
  return Object.values(estados).filter((e) => vencido(e, agora)).length;
}
