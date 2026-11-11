// Score de Pareto e progresso (funções puras).

/**
 * Score 0–100: quanto o conceito "rende" na prática.
 * Importância pesa um pouco mais que frequência; dificuldade e tempo não entram no score,
 * só no desempate (o mais rápido de aprender vem antes).
 */
export function scorePareto(p) {
  return Math.round(((0.55 * p.importancia + 0.45 * p.frequencia) / 5) * 100);
}

export function ordenarPorPareto(entradas) {
  return [...entradas].sort(
    (a, b) =>
      scorePareto(b.pareto) - scorePareto(a.pareto) ||
      a.pareto.tempoEstudoMin - b.pareto.tempoEstudoMin ||
      a.titulo.localeCompare(b.titulo, 'pt-BR'),
  );
}

/** Progresso de um conjunto de conceitos: lidos e quizzes respondidos. */
export function progressoDe(entradas, progresso) {
  const total = entradas.length;
  const lidos = entradas.filter((e) => progresso.lidos[e.id]).length;
  const comQuiz = entradas.filter((e) => e.temQuiz);
  const quizzes = comQuiz.filter((e) => progresso.quiz[e.id]).length;
  return { total, lidos, quizzes, totalQuizzes: comQuiz.length, fracao: total ? lidos / total : 0 };
}

/** Quizzes de um conjunto de conceitos: quantos foram respondidos e o aproveitamento (0 a 1). */
export function resumoDeQuizzes(entradas, progresso) {
  const comQuiz = entradas.filter((e) => e.temQuiz);
  let acertos = 0;
  let questoes = 0;
  let respondidos = 0;
  for (const e of comQuiz) {
    const q = progresso.quiz[e.id];
    if (!q) continue;
    respondidos += 1;
    acertos += q.acertos;
    questoes += q.total;
  }
  return { total: comQuiz.length, respondidos, acertos, questoes, aproveitamento: questoes ? acertos / questoes : 0 };
}
