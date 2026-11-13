// Testes da revisão espaçada e dos estudos de caso (lógica pura e casos reais).
import { afirmar } from './harness.js';
import {
  INTERVALOS_DIAS, CAIXA_MAX, idCartao, partesDoCartao, cartoesDe,
  registrarResposta, montarSessao, resumoDaRevisao, contarVencidos,
} from '../js/estudo/revisao.js';
import { validarCaso, dividirTexto, dadosCitados, alcancaveis, decisoesDo } from '../js/estudo/casos.js';
import { resolverDado } from '../js/content/dados.js';

const DIA = 86400000;

const CASO = {
  id: 'x:caso', norma: 'x', versao: '1', titulo: 'T', resumo: 'R', contexto: 'C {{dado:d/a}}', status: 'rascunho',
  inicio: 'q1',
  etapas: {
    q1: { tipo: 'decisao', texto: 't', pergunta: 'p', opcoes: [
      { texto: 'certa', correta: true, feedback: 'f', proxima: 'fim' },
      { texto: 'errada', feedback: 'f', proxima: 'c1' },
    ] },
    c1: { tipo: 'consequencia', texto: 't', opcoes: [{ texto: 'voltar', proxima: 'q1' }] },
    fim: { tipo: 'fim', texto: 'ok' },
  },
};

export default async function suiteEstudo(teste, ambiente) {
  teste('revisão: ids de cartão vão e voltam', () => {
    const id = idCartao('nbr6118:a-b', 2);
    afirmar.igual(id, 'nbr6118:a-b#2');
    afirmar.igual(partesDoCartao(id), { conceito: 'nbr6118:a-b', indice: 2 });
    afirmar.igual(cartoesDe([{ id: 'n:a', quiz: [{}, {}] }, { id: 'n:b' }]), ['n:a#0', 'n:a#1']);
  });

  teste('revisão: acerto sobe de caixa, erro volta para a primeira', () => {
    let e = registrarResposta(null, true, 0);
    afirmar.igual(e.caixa, 1);
    afirmar.igual(e.proxima, INTERVALOS_DIAS[1] * DIA);
    e = registrarResposta(e, true, 10);
    afirmar.igual(e.caixa, 2);
    afirmar.igual(e.proxima, 10 + INTERVALOS_DIAS[2] * DIA);
    e = registrarResposta(e, false, 20);
    afirmar.igual([e.caixa, e.acertos, e.erros], [1, 2, 1]);
    let topo = { caixa: CAIXA_MAX, proxima: 0, acertos: 9, erros: 0 };
    topo = registrarResposta(topo, true, 0);
    afirmar.igual(topo.caixa, CAIXA_MAX);
  });

  teste('revisão: sessão traz vencidos (mais atrasados primeiro) e depois novos, com limite', () => {
    const estados = {
      a: { caixa: 2, proxima: 50 }, b: { caixa: 1, proxima: 10 }, c: { caixa: 3, proxima: 500 },
    };
    const cartoes = ['a', 'b', 'c', 'n1', 'n2', 'n3'];
    afirmar.igual(montarSessao({ cartoes, estados, agora: 100, novosMax: 2 }), ['b', 'a', 'n1', 'n2']);
    afirmar.igual(montarSessao({ cartoes, estados, agora: 100, novosMax: 2, limite: 3 }), ['b', 'a', 'n1']);
    const r = resumoDaRevisao({ cartoes, estados, agora: 100 });
    afirmar.igual([r.vencidos, r.novos, r.proxima], [2, 3, 500]);
    afirmar.igual(contarVencidos(estados, 100), 2);
  });

  teste('casos: divide o texto em pedaços de texto e de dado', () => {
    afirmar.igual(dividirTexto('C{{dado:d/a.b}} mm'), [{ texto: 'C' }, { dado: 'd/a.b' }, { texto: ' mm' }]);
    afirmar.igual(dadosCitados('x {{dado: d/a }} y {{dado:d/b}}'), ['d/a', 'd/b']);
  });

  teste('casos: validador aceita o caso mínimo e acusa defeitos', () => {
    const resolver = (e) => (e === 'd/a' ? { valor: 1 } : null);
    afirmar.igual(validarCaso(CASO, { resolver }).erros, []);
    afirmar.igual([...alcancaveis(CASO)].sort(), ['c1', 'fim', 'q1']);
    afirmar.igual(decisoesDo(CASO), ['q1']);
    const semFim = { ...CASO, etapas: { ...CASO.etapas, q1: { ...CASO.etapas.q1, opcoes: CASO.etapas.q1.opcoes.map((o) => ({ ...o, proxima: 'c1' })) } } };
    afirmar.ok(validarCaso(semFim, { resolver }).erros.some((e) => e.includes('final')));
    const duasCertas = { ...CASO, etapas: { ...CASO.etapas, q1: { ...CASO.etapas.q1, opcoes: CASO.etapas.q1.opcoes.map((o) => ({ ...o, correta: true })) } } };
    afirmar.ok(validarCaso(duasCertas, { resolver }).erros.some((e) => e.includes('exatamente 1')));
    afirmar.ok(validarCaso(CASO, { resolver: () => null }).erros.some((e) => e.includes('dado inexistente')));
    afirmar.ok(validarCaso({ ...CASO, conceitos: ['x:nada'] }, { resolver }).erros.some((e) => e.includes('conceito inexistente')));
  });

  // --- Casos reais --------------------------------------------------------------------------------
  const catalogo = await ambiente.lerJSON('content/normas.json');
  for (const meta of catalogo.normas.filter((n) => n.disponivel)) {
    const raiz = `content/normas/${meta.pasta}`;
    const norma = await ambiente.lerJSON(`${raiz}/norma.json`);
    if (!norma.casos?.length) continue;
    const dados = {};
    for (const nome of norma.dados || []) dados[nome] = await ambiente.lerJSON(`${raiz}/dados/${nome}.json`);
    const conceitos = new Set((await ambiente.listarConceitos(meta.pasta)).map((s) => `${norma.id}:${s}`));

    teste(`${meta.nome}: estudos de caso passam no validador`, async () => {
      for (const slug of norma.casos) {
        const caso = await ambiente.lerJSON(`${raiz}/casos/${slug}.json`);
        afirmar.igual(caso.id, `${norma.id}:${slug}`);
        const r = validarCaso(caso, { conceitos, resolver: (e) => resolverDado(dados, e) });
        afirmar.igual(r.erros, []);
      }
    });
  }
}
