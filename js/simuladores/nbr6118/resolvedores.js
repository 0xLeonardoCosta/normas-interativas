// Resolvedores de fluxograma da NBR 6118: transformam as respostas em linhas de resultado.
import { carregarDados } from '../../content/loader.js';
import { classeAgressividade, requisitosDurabilidade, limiteAberturaFissuras } from '../../calc/nbr6118/durabilidade.js';
import { numero } from '../../ui/dom.js';

/** Linhas de apresentação dos requisitos de durabilidade (usadas no fluxograma e no simulador). */
export function linhasDeRequisitos(t, entrada) {
  const r = requisitosDurabilidade(t, entrada);
  const classe = classeAgressividade(t, entrada.caa);
  const linha = (rotulo, valor, bloco, extra = {}) => ({
    rotulo,
    valor,
    referencia: bloco.referencia,
    pendente: bloco.pendenteValidacao !== false,
    ...extra,
  });
  const dc = entrada.controleRigoroso ? t.deltaC.controleRigoroso : t.deltaC.padrao;
  return {
    requisitos: r,
    classe,
    linhas: [
      linha('Classe de agressividade', `${classe.id} · ${classe.agressividade}`, t.classesAgressividade),
      linha('Classe mínima de concreto', `C${r.classeConcretoMin}`, t.qualidadeConcreto),
      linha('Relação a/c máxima', numero(r.relacaoAcMax, 2), t.qualidadeConcreto),
      linha('Cobrimento nominal', `${numero(r.cobrimentoNominal)} mm`, t.cobrimentoNominal, { destaque: true }),
      linha('Tolerância de execução Δc', `${numero(r.deltaC)} mm`, dc),
      linha('Abertura máxima de fissuras', `${numero(limiteAberturaFissuras(t, entrada.caa), 1)} mm`, t.aberturaFissuras),
    ],
  };
}

export async function resolver(variaveis) {
  return linhasDeRequisitos(await carregarDados('nbr6118', 'durabilidade'), variaveis);
}
