// Estudo de caso: decisões em sequência, com ramos de consequência e retorno a cada escolha.
import { h, numero } from '../dom.js';
import { icone } from '../icons.js';
import { acoes } from '../../store.js';
import { carregarBiblioteca, carregarCaso, carregarTodosOsDados } from '../../content/loader.js';
import { markdown, markdownEmLinha } from '../../content/markdown.js';
import { resolverDado } from '../../content/dados.js';
import { dividirTexto, decisoesDo } from '../../estudo/casos.js';
import { linkConceito } from '../components/card-conceito.js';
import { selo } from '../components/selo.js';

const LETRAS = 'ABCDEF';
const casas = (v) => (Number.isInteger(v) ? 0 : String(v).split('.')[1]?.length > 1 ? 2 : 1);

export async function render({ params }) {
  const id = params[0];
  const [biblioteca, caso] = await Promise.all([carregarBiblioteca(), carregarCaso(id)]);
  const dados = await carregarTodosOsDados(caso.norma);

  /** Troca os {{dado:...}} pelo valor do arquivo de dados e diz se algum ainda está em validação. */
  function comDados(texto) {
    let pendente = false;
    let referencia = '';
    const partes = dividirTexto(texto).map((p) => {
      if (p.texto != null) return p.texto;
      const d = resolverDado(dados, p.dado);
      if (!d) return '?';
      if (d.pendenteValidacao) { pendente = true; referencia = d.referencia; }
      const v = typeof d.valor === 'number' ? numero(d.valor, casas(d.valor)) : String(d.valor);
      return d.unidade ? `${v} ${d.unidade}` : v;
    });
    return { texto: partes.join(''), pendente, referencia };
  }
  const prosa = (texto) => {
    const r = comDados(texto);
    return h('div', { class: 'prosa' }, h('div', { html: markdown(r.texto) }), r.pendente && selo(r.referencia));
  };
  const emLinha = (texto) => {
    const r = comDados(texto);
    return [h('span', { html: markdownEmLinha(r.texto) }), r.pendente && selo(r.referencia, { compacto: true })];
  };

  const trilha = h('ol', { class: 'caso-trilha' });
  const palco = h('div', { class: 'caso-palco', 'aria-live': 'polite' });
  const totalDecisoes = decisoesDo(caso).length;
  let primeira = new Map(); // etapa → acertou de primeira?
  let tentativasPor = new Map(); // etapa → tentativas, somadas entre idas e voltas pelas consequências
  let limparTeclado = null;

  function irPara(idEtapa) {
    const etapa = caso.etapas[idEtapa];
    limparTeclado?.();
    const cartao = h('article', { class: `caso-etapa caso-${etapa.tipo}` });
    const revisar = (etapa.conceitos || []).length
      ? h('div', { class: 'caso-revisar' }, h('span', null, 'Revise'), etapa.conceitos.map((c) => linkConceito(biblioteca, c)))
      : null;

    if (etapa.tipo === 'fim') {
      const acertos = [...primeira.values()].filter(Boolean).length;
      acoes.concluirCaso(caso.id, acertos, totalDecisoes);
      const refazer = h('button', { class: 'botao', type: 'button', onclick: reiniciar }, icone('refazer'), 'Refazer o caso');
      cartao.append(
        prosa(etapa.texto),
        h('div', { class: 'quiz-resultado novo', role: 'status' },
          h('div', { class: 'quiz-nota' }, h('strong', null, acertos), ` de ${totalDecisoes}`),
          h('p', null, 'decisões certas na primeira tentativa'),
          refazer),
        h('div', { class: 'caso-revisar' }, h('span', null, 'Conceitos deste caso'), (caso.conceitos || []).map((c) => linkConceito(biblioteca, c))),
      );
      palco.replaceChildren(cartao);
      refazer.focus({ preventScroll: true });
      return;
    }

    if (etapa.tipo === 'consequencia') {
      const botoes = etapa.opcoes.map((o) => h('button', { class: 'botao', type: 'button', onclick: () => irPara(o.proxima) }, icone('seta-esquerda'), ...emLinha(o.texto)));
      cartao.append(h('p', { class: 'caso-rotulo' }, icone('alerta', 14), 'Consequência'), prosa(etapa.texto), revisar, h('div', { class: 'caso-acoes' }, botoes));
      palco.replaceChildren(cartao);
      botoes[0].focus({ preventScroll: true });
      cartao.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
      return;
    }

    // Decisão
    const retorno = h('div', { class: 'quiz-retorno', role: 'status' });
    let resolvida = false;
    const botoes = etapa.opcoes.map((o, k) =>
      h('button', { class: 'quiz-opcao', type: 'button', onclick: () => escolher(k) },
        h('span', { class: 'quiz-letra', 'aria-hidden': 'true' }, LETRAS[k]), ...emLinha(o.texto)));

    function escolher(k) {
      if (resolvida || botoes[k].disabled) return;
      const o = etapa.opcoes[k];
      tentativasPor.set(idEtapa, (tentativasPor.get(idEtapa) || 0) + 1);
      if (!primeira.has(idEtapa)) primeira.set(idEtapa, Boolean(o.correta));
      const fb = h('p', { class: o.correta ? 'quiz-certo' : 'quiz-errado' },
        icone(o.correta ? 'check' : 'x'), h('strong', null, o.correta ? 'Boa decisão.' : 'Repense.'), ' ', ...emLinha(o.feedback));

      if (o.correta) {
        resolvida = true;
        botoes.forEach((b, j) => { b.disabled = true; if (j === k) b.classList.add('certa'); });
        const seguir = h('button', { class: 'botao botao-primario', type: 'button', onclick: () => avancar(etapa, k) }, 'Continuar', icone('seta-direita'));
        retorno.replaceChildren(fb, seguir);
        seguir.focus({ preventScroll: true });
        return;
      }
      botoes[k].disabled = true;
      botoes[k].classList.add('errada');
      const consequencia = o.proxima !== idEtapa;
      const seguir = consequencia
        ? h('button', { class: 'botao', type: 'button', onclick: () => irPara(o.proxima) }, 'Ver o que acontece', icone('seta-direita'))
        : null;
      retorno.replaceChildren(fb, seguir || h('p', { class: 'revisao-volta' }, 'Escolha outra opção.'));
      (seguir || botoes.find((b) => !b.disabled))?.focus({ preventScroll: true });
    }

    function avancar(e, k) {
      // A decisão vai para a trilha, resumida, e o caso segue.
      trilha.append(h('li', { class: 'caso-passo' },
        h('span', { class: 'caso-passo-pergunta' }, e.pergunta),
        h('span', { class: 'caso-passo-escolha' }, icone('check', 14), ...emLinha(e.opcoes[k].texto)),
        primeira.get(idEtapa) === false && h('small', null, `acertou na ${tentativasPor.get(idEtapa)}ª tentativa`)));
      irPara(e.opcoes[k].proxima);
    }

    cartao.append(
      h('p', { class: 'caso-rotulo' }, `Decisão ${decisoesDo(caso).indexOf(idEtapa) + 1} de ${totalDecisoes}`),
      prosa(etapa.texto),
      h('h3', { class: 'quiz-pergunta' }, etapa.pergunta),
      h('div', { class: 'quiz-opcoes' }, botoes),
      retorno,
      revisar,
    );
    palco.replaceChildren(cartao);
    botoes[0].focus({ preventScroll: true });
    if (trilha.children.length) cartao.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });

    const tecla = (ev) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.key.length !== 1) return;
      const k = '123456'.includes(ev.key) ? '123456'.indexOf(ev.key) : LETRAS.toLowerCase().indexOf(ev.key.toLowerCase());
      if (k >= 0 && k < botoes.length) { ev.preventDefault(); escolher(k); }
    };
    addEventListener('keydown', tecla);
    limparTeclado = () => removeEventListener('keydown', tecla);
  }

  function reiniciar() {
    primeira = new Map();
    tentativasPor = new Map();
    trilha.replaceChildren();
    irPara(caso.inicio);
    el.scrollIntoView({ block: 'start' });
  }

  const el = h('article', { class: 'pagina caso' },
    h('a', { class: 'voltar', href: '#/praticar' }, icone('seta-esquerda'), 'Praticar'),
    h('header', { class: 'pagina-topo' },
      h('p', { class: 'caso-sobretitulo' }, 'Estudo de caso', caso.status === 'rascunho' && h('span', { class: 'chip chip-alerta', title: 'Conteúdo ainda não revisado pelo responsável técnico' }, 'Rascunho')),
      h('h1', null, caso.titulo)),
    h('div', { class: 'caso-contexto' }, prosa(caso.contexto)),
    trilha,
    palco,
  );
  irPara(caso.inicio);

  return { el, titulo: caso.titulo, destruir: () => limparTeclado?.() };
}
