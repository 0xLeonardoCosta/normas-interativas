// Testes do conteúdo: schema, conexões, índice em dia e valores normativos marcados.
import { afirmar } from './harness.js';
import { validarNorma, validarConceito, listarPendencias } from '../js/content/validate.js';
import { gerarIndice } from '../js/content/indice.js';
import { resolverDado } from '../js/content/dados.js';
import { scorePareto, ordenarPorPareto, progressoDe, resumoDeQuizzes } from '../js/content/pareto.js';
import { backlinks, montarGrafo, vizinhanca } from '../js/content/graph.js';
import { markdown } from '../js/content/markdown.js';
import * as registro from '../js/registry.js';

export default async function suiteConteudo(teste, ambiente, avisar) {
  const catalogo = await ambiente.lerJSON('content/normas.json');

  for (const meta of catalogo.normas.filter((n) => n.disponivel)) {
    const raiz = `content/normas/${meta.pasta}`;
    const norma = await ambiente.lerJSON(`${raiz}/norma.json`);
    const slugs = await ambiente.listarConceitos(meta.pasta);
    const conceitos = await Promise.all(
      slugs.map(async (arquivo) => ({ arquivo, conteudo: await ambiente.lerJSON(`${raiz}/conceitos/${arquivo}.json`) })),
    );
    // Os arquivos de valores normativos de cada norma são declarados em norma.json (`dados`).
    const NOMES_DE_DADOS = norma.dados || [];
    const dados = {};
    for (const nome of NOMES_DE_DADOS) dados[nome] = await ambiente.lerJSON(`${raiz}/dados/${nome}.json`);
    const idsFluxo = [...new Set(conceitos.map((c) => c.conteudo.fluxograma).filter(Boolean))];
    const fluxogramas = new Map();
    for (const id of idsFluxo) {
      try {
        fluxogramas.set(id, await ambiente.lerJSON(`${raiz}/fluxogramas/${id.split(':')[1]}.json`));
      } catch {
        // ausência é acusada pelo validador
      }
    }

    teste(`${meta.nome}: catálogo e norma.json coerentes`, () => {
      afirmar.igual(norma.id, meta.id);
      afirmar.igual(norma.versao, meta.versao);
      afirmar.ok(conceitos.length > 0, 'nenhum conceito encontrado');
    });

    teste(`${meta.nome}: todos os conceitos passam no validador`, () => {
      const r = validarNorma({ norma, conceitos, dados, registro, fluxogramas: new Set(fluxogramas.keys()) });
      r.avisos.forEach(avisar);
      afirmar.igual(r.erros, []);
    });

    teste(`${meta.nome}: index.json está em dia com os conceitos`, async () => {
      const salvo = await ambiente.lerJSON(`${raiz}/index.json`);
      afirmar.igual(salvo, gerarIndice(norma, conceitos.map((c) => c.conteudo)), 'rode `node tools/build-index.js`');
    });

    teste(`${meta.nome}: fluxogramas bem formados`, () => {
      for (const [id, f] of fluxogramas) {
        afirmar.igual(f.id, id);
        afirmar.ok(f.nos[f.inicio], `${id}: nó inicial inexistente`);
        for (const [chave, no] of Object.entries(f.nos)) {
          if (no.tipo === 'pergunta') {
            afirmar.ok(no.opcoes?.length >= 2, `${id}/${chave}: pergunta precisa de 2+ opções`);
            for (const o of no.opcoes) afirmar.ok(f.nos[o.proximo], `${id}/${chave}: destino inexistente "${o.proximo}"`);
          } else {
            afirmar.igual(no.tipo, 'resultado', `${id}/${chave}`);
            afirmar.ok(registro.existe('resolvedor', no.resolvedor), `${id}/${chave}: resolvedor não registrado`);
          }
        }
      }
    });

    teste(`${meta.nome}: todo valor normativo tem referência`, () => {
      for (const nome of NOMES_DE_DADOS) {
        const pendentes = listarPendencias(dados[nome], nome);
        for (const p of pendentes) afirmar.ok(p.referencia.startsWith('NBR'), `${p.caminho} sem referência`);
        if (pendentes.length) avisar(`${meta.nome}: ${pendentes.length} bloco(s) de valores aguardando validação em dados/${nome}.json`);
      }
    });
  }

  // --- Unidades da camada de conteúdo ----------------------------------------------------------
  const normaFalsa = { id: 'x1', versao: '1', temas: [{ id: 't', nome: 'T', matiz: 0 }] };
  const base = {
    id: 'x1:a', norma: 'x1', versao: '1', tema: 't', titulo: 'A', resumo: 'r', oQueE: 'o', porQueExiste: 'p',
    referencias: [{ item: 'i', descricao: 'd' }], conexoes: [],
    pareto: { importancia: 5, frequencia: 5, dificuldade: 1, tempoEstudoMin: 5 }, status: 'rascunho',
  };

  teste('validador: aceita o conceito mínimo', () => {
    afirmar.igual(validarConceito(base, { norma: normaFalsa, arquivo: 'a' }).erros, []);
  });

  teste('validador: acusa campos ausentes, resumo longo e pareto fora da faixa', () => {
    const { titulo, ...semTitulo } = base;
    afirmar.ok(validarConceito(semTitulo, { norma: normaFalsa }).erros.some((e) => e.includes('titulo')));
    afirmar.ok(validarConceito({ ...base, resumo: 'x'.repeat(281) }, { norma: normaFalsa }).erros.length === 1);
    afirmar.ok(validarConceito({ ...base, pareto: { ...base.pareto, importancia: 6 } }, { norma: normaFalsa }).erros.length === 1);
    afirmar.ok(validarConceito({ ...base, tema: 'nao-existe' }, { norma: normaFalsa }).erros.length === 1);
    afirmar.ok(validarConceito(base, { norma: normaFalsa, arquivo: 'outro-nome' }).erros.length === 1);
  });

  teste('validador: acusa conexão quebrada e apenas avisa conexão para outra norma', () => {
    const quebrado = { ...base, conexoes: [{ alvo: 'x1:nao-existe', tipo: 'relacionado' }] };
    const externo = { ...base, conexoes: [{ alvo: 'y9:outro', tipo: 'relacionado' }] };
    const r1 = validarNorma({ norma: normaFalsa, conceitos: [{ arquivo: 'a', conteudo: quebrado }] });
    const r2 = validarNorma({ norma: normaFalsa, conceitos: [{ arquivo: 'a', conteudo: externo }] });
    afirmar.ok(r1.erros.some((e) => e.includes('conexão quebrada')));
    afirmar.igual(r2.erros, []);
    afirmar.igual(r2.avisos.length, 1);
  });

  teste('dados: resolve o endereço e herda referência e pendência', () => {
    const dados = { d: { tabela: { referencia: 'NBR X, Tabela 1', pendenteValidacao: true, a: { b: 3 } }, solto: { valor: 2, unidade: 'mm', referencia: 'NBR X, item 2', pendenteValidacao: false } } };
    afirmar.igual(resolverDado(dados, 'd/tabela.a.b'), { valor: 3, referencia: 'NBR X, Tabela 1', pendenteValidacao: true });
    afirmar.igual(resolverDado(dados, 'd/solto').pendenteValidacao, false);
    afirmar.igual(resolverDado(dados, 'd/nao.existe'), null);
  });

  teste('pareto: score, ordenação e progresso', () => {
    afirmar.igual(scorePareto({ importancia: 5, frequencia: 5 }), 100);
    afirmar.igual(scorePareto({ importancia: 1, frequencia: 1 }), 20);
    const e = (id, i, f, t) => ({ id, titulo: id, pareto: { importancia: i, frequencia: f, tempoEstudoMin: t }, temQuiz: id !== 'c' });
    const lista = [e('a', 3, 3, 5), e('b', 5, 5, 20), e('c', 5, 5, 10)];
    afirmar.igual(ordenarPorPareto(lista).map((x) => x.id), ['c', 'b', 'a']);
    const p = progressoDe(lista, { lidos: { a: 1 }, quiz: { b: { acertos: 1, total: 2 } } });
    afirmar.igual([p.total, p.lidos, p.quizzes, p.totalQuizzes], [3, 1, 1, 2]);
    const q = resumoDeQuizzes(lista, { lidos: {}, quiz: { b: { acertos: 1, total: 2 }, c: { acertos: 9, total: 9 } } });
    afirmar.igual([q.total, q.respondidos, q.acertos, q.questoes, q.aproveitamento], [2, 1, 1, 2, 0.5]);
    afirmar.igual(resumoDeQuizzes(lista, { lidos: {}, quiz: {} }).aproveitamento, 0);
  });

  teste('grafo: backlinks', () => {
    const entradas = [{ id: 'a', conexoes: [{ alvo: 'b', tipo: 'influencia' }] }, { id: 'b', conexoes: [] }];
    afirmar.igual(backlinks(entradas, 'b'), [{ origem: 'a', tipo: 'influencia' }]);
    afirmar.igual(backlinks(entradas, 'a'), []);
  });

  teste('grafo: nós externos, arestas sem par duplicado e vizinhança', () => {
    const entradas = [
      { id: 'a', conexoes: [{ alvo: 'b', tipo: 'influencia' }, { alvo: 'z:fora', tipo: 'relacionado' }] },
      { id: 'b', conexoes: [{ alvo: 'a', tipo: 'depende-de' }] },
      { id: 'c', conexoes: [] },
    ];
    const g = montarGrafo(entradas);
    afirmar.igual(g.nos.map((n) => [n.id, n.externo]), [['a', false], ['b', false], ['c', false], ['z:fora', true]]);
    afirmar.igual(g.arestas, [{ origem: 'a', alvo: 'b', tipo: 'influencia' }, { origem: 'a', alvo: 'z:fora', tipo: 'relacionado' }]);
    const v = vizinhanca(g.arestas);
    afirmar.igual([...v.get('a')].sort(), ['b', 'z:fora']);
    afirmar.igual(v.has('c'), false);
  });

  teste('markdown: escapa HTML e preserva fórmulas', () => {
    afirmar.ok(!markdown('<script>x</script>').includes('<script>'));
    afirmar.ok(markdown('**a** e $x_{1}*y*$').includes('data-tex="x_{1}*y*"'));
    afirmar.ok(markdown('- um\n- dois').startsWith('<ul><li>um</li>'));
    afirmar.ok(markdown('[x](javascript:alert(1))').includes('href="#/"'));
  });
}
