// Validador de conteúdo: schema dos conceitos + integridade das conexões.
// Funções puras, sem DOM e sem fetch — rodam no navegador (tests.html) e no Node (tools/test.js).
import { partesDoId } from './indice.js';
import { resolverDado } from './dados.js';

export const TIPOS_CONEXAO = ['depende-de', 'influencia', 'relacionado'];
export const STATUS = ['rascunho', 'revisado'];

const OBRIGATORIOS = [
  'id', 'norma', 'versao', 'tema', 'titulo', 'resumo', 'oQueE', 'porQueExiste',
  'referencias', 'conexoes', 'pareto', 'status',
];
const OPCIONAIS = [
  'ondeSeAplica', 'quandoUsar', 'errosComuns', 'exemplos', 'diagramas', 'fluxograma',
  'simuladores', 'quiz', 'checklist', 'tags', 'valores',
];

const ehTexto = (v) => typeof v === 'string' && v.trim().length > 0;
const ehLista = (v, checar) => Array.isArray(v) && v.every(checar);
const nota = (v) => Number.isInteger(v) && v >= 1 && v <= 5;

/**
 * Valida um conceito isolado.
 * ctx: { norma (norma.json), arquivo? (slug do arquivo), dados? ({nome: json}), registro? ({existe(tipo,id)}),
 *        fluxogramas? (Set de ids) }
 */
export function validarConceito(c, ctx) {
  const erros = [];
  const avisos = [];
  const erro = (m) => erros.push(m);

  if (!c || typeof c !== 'object' || Array.isArray(c)) return { erros: ['não é um objeto JSON'], avisos };

  for (const campo of OBRIGATORIOS) if (!(campo in c)) erro(`campo obrigatório ausente: ${campo}`);
  for (const campo of Object.keys(c)) {
    if (!OBRIGATORIOS.includes(campo) && !OPCIONAIS.includes(campo)) avisos.push(`campo desconhecido: ${campo}`);
  }

  const partes = partesDoId(c.id);
  if (!partes || !/^[a-z0-9]+:[a-z0-9]+(-[a-z0-9]+)*$/.test(c.id || '')) {
    erro(`id inválido (esperado "norma:slug-em-minusculas"): ${c.id}`);
  } else {
    if (partes.norma !== ctx.norma.id) erro(`namespace do id (${partes.norma}) difere da norma (${ctx.norma.id})`);
    if (ctx.arquivo && partes.slug !== ctx.arquivo) erro(`slug do id (${partes.slug}) difere do nome do arquivo (${ctx.arquivo})`);
  }
  if ('norma' in c && c.norma !== ctx.norma.id) erro(`norma "${c.norma}" difere de "${ctx.norma.id}"`);
  if ('versao' in c && c.versao !== ctx.norma.versao) erro(`versao "${c.versao}" difere de "${ctx.norma.versao}"`);
  if ('tema' in c && !ctx.norma.temas.some((t) => t.id === c.tema)) erro(`tema inexistente: ${c.tema}`);

  for (const campo of ['titulo', 'resumo', 'oQueE', 'porQueExiste']) {
    if (campo in c && !ehTexto(c[campo])) erro(`${campo} deve ser texto não vazio`);
  }
  if (ehTexto(c.resumo) && c.resumo.length > 280) erro(`resumo com ${c.resumo.length} caracteres (máximo 280)`);
  if ('status' in c && !STATUS.includes(c.status)) erro(`status inválido: ${c.status}`);

  if ('referencias' in c) {
    if (!ehLista(c.referencias, (r) => r && ehTexto(r.item) && ehTexto(r.descricao))) {
      erro('referencias deve ser lista de { item, descricao }');
    } else if (c.referencias.length === 0) erro('referencias não pode ser vazia');
  }

  if ('conexoes' in c) {
    if (!ehLista(c.conexoes, (x) => x && ehTexto(x.alvo) && TIPOS_CONEXAO.includes(x.tipo))) {
      erro(`conexoes deve ser lista de { alvo, tipo: ${TIPOS_CONEXAO.join(' | ')} }`);
    } else {
      const vistos = new Set();
      for (const x of c.conexoes) {
        if (!partesDoId(x.alvo)) erro(`conexão com alvo sem namespace: ${x.alvo}`);
        if (x.alvo === c.id) erro('conexão aponta para o próprio conceito');
        if (vistos.has(x.alvo)) erro(`conexão duplicada: ${x.alvo}`);
        vistos.add(x.alvo);
      }
    }
  }

  if ('pareto' in c) {
    const p = c.pareto || {};
    for (const k of ['importancia', 'frequencia', 'dificuldade']) {
      if (!nota(p[k])) erro(`pareto.${k} deve ser inteiro de 1 a 5`);
    }
    if (!(Number.isFinite(p.tempoEstudoMin) && p.tempoEstudoMin > 0)) erro('pareto.tempoEstudoMin deve ser número positivo');
  }

  for (const campo of ['ondeSeAplica', 'errosComuns', 'checklist', 'tags', 'diagramas', 'simuladores']) {
    if (campo in c && !ehLista(c[campo], ehTexto)) erro(`${campo} deve ser lista de textos`);
  }
  if ('quandoUsar' in c && !ehTexto(c.quandoUsar)) erro('quandoUsar deve ser texto');
  if ('fluxograma' in c && !ehTexto(c.fluxograma)) erro('fluxograma deve ser o id de um fluxograma');
  if ('exemplos' in c && !ehLista(c.exemplos, (e) => e && ehTexto(e.titulo) && ehTexto(e.texto))) {
    erro('exemplos deve ser lista de { titulo, texto }');
  }

  if ('quiz' in c) {
    if (!Array.isArray(c.quiz)) erro('quiz deve ser lista');
    else c.quiz.forEach((q, i) => {
      const ok = q && ehTexto(q.pergunta) && ehLista(q.opcoes, ehTexto) && q.opcoes.length >= 2 &&
        Number.isInteger(q.correta) && q.correta >= 0 && q.correta < q.opcoes.length && ehTexto(q.explicacao);
      if (!ok) erro(`quiz[${i}] inválido: precisa de pergunta, opcoes (≥ 2), correta (índice) e explicacao`);
    });
  }

  if ('valores' in c) {
    if (!ehLista(c.valores, (v) => v && ehTexto(v.rotulo) && ehTexto(v.dado))) {
      erro('valores deve ser lista de { rotulo, dado, unidade? }');
    } else if (ctx.dados) {
      for (const v of c.valores) {
        const r = resolverDado(ctx.dados, v.dado);
        if (!r) erro(`valores: dado não encontrado: ${v.dado}`);
        else if (!ehTexto(r.referencia)) erro(`valores: dado sem referência normativa: ${v.dado}`);
      }
    }
  }

  if (ctx.registro) {
    for (const id of c.simuladores || []) if (!ctx.registro.existe('simulador', id)) erro(`simulador não registrado: ${id}`);
    for (const id of c.diagramas || []) if (!ctx.registro.existe('diagrama', id)) erro(`diagrama não registrado: ${id}`);
  }
  if (ctx.fluxogramas && ehTexto(c.fluxograma) && !ctx.fluxogramas.has(c.fluxograma)) {
    erro(`fluxograma inexistente: ${c.fluxograma}`);
  }

  return { erros, avisos };
}

/**
 * Valida uma norma inteira. `conceitos`: [{ arquivo, conteudo }].
 * `idsExternos`: ids de conceitos de outras normas já carregadas (para conexões entre normas).
 */
export function validarNorma({ norma, conceitos, dados, registro, fluxogramas, idsExternos = new Set() }) {
  const erros = [];
  const avisos = [];
  const ids = new Set();

  if (!ehTexto(norma?.id) || !ehTexto(norma?.versao) || !Array.isArray(norma?.temas)) {
    return { erros: ['norma.json precisa de id, versao e temas[]'], avisos };
  }
  for (const t of norma.temas) {
    if (!ehTexto(t.id) || !ehTexto(t.nome) || !Number.isFinite(t.matiz)) erros.push(`norma.json: tema inválido (${t.id})`);
  }

  for (const { arquivo, conteudo } of conceitos) {
    const r = validarConceito(conteudo, { norma, arquivo, dados, registro, fluxogramas });
    erros.push(...r.erros.map((m) => `${arquivo}: ${m}`));
    avisos.push(...r.avisos.map((m) => `${arquivo}: ${m}`));
    if (ids.has(conteudo?.id)) erros.push(`${arquivo}: id duplicado ${conteudo.id}`);
    ids.add(conteudo?.id);
  }

  for (const { arquivo, conteudo } of conceitos) {
    for (const x of Array.isArray(conteudo?.conexoes) ? conteudo.conexoes : []) {
      const partes = partesDoId(x?.alvo);
      if (!partes) continue;
      if (partes.norma === norma.id) {
        if (!ids.has(x.alvo)) erros.push(`${arquivo}: conexão quebrada → ${x.alvo}`);
      } else if (!idsExternos.has(x.alvo)) {
        avisos.push(`${arquivo}: conexão para norma ainda não disponível → ${x.alvo}`);
      }
    }
  }

  return { erros, avisos };
}

/** Marca como pendente todo valor normativo ainda não validado (para o relatório de testes). */
export function listarPendencias(dados, prefixo = '') {
  const saida = [];
  (function andar(no, caminho) {
    if (!no || typeof no !== 'object') return;
    if (no.pendenteValidacao === true) saida.push({ caminho, referencia: no.referencia || '(sem referência)' });
    for (const [k, v] of Object.entries(no)) andar(v, caminho ? `${caminho}.${k}` : k);
  })(dados, prefixo);
  return saida;
}
