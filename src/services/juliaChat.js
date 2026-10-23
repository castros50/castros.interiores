// Chat de verdade com a Júlia: o usuário escreve (ou fala) em português natural e a Júlia
// executa as ações reais (criar campanha, preencher lâmina, planejar publicação...) através
// de tool-use da API da Claude, chamando as funções de src/services/juliaAcoes.js.
// Nenhuma ação é simulada: toda ferramenta grava direto no banco já usado pelas telas manuais.

const db = require('../db/db');
const acoes = require('./juliaAcoes');

const MAX_RODADAS_FERRAMENTA = 6;
const HISTORICO_MAXIMO = 20;

const TOOLS = [
  {
    name: 'listar_fotos',
    description: 'Lista as fotos já salvas na biblioteca de marketing (id, título, legenda, tag). Use antes de escolher um foto_id para confirmar que ele existe e corresponde ao que o usuário descreveu.',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'listar_campanhas',
    description: 'Lista as campanhas já existentes (id, nome, formato). Use para encontrar o id de uma campanha que o usuário mencionou pelo nome.',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'obter_campanha',
    description: 'Retorna todos os dados atuais de uma campanha: texto, hashtags, lâminas do carrossel, itens de catálogo e agenda. Use antes de editar algo para saber o que já está preenchido.',
    input_schema: {
      type: 'object',
      properties: { campanha_id: { type: 'integer' } },
      required: ['campanha_id']
    }
  },
  {
    name: 'criar_campanha',
    description: 'Cria uma nova campanha de marketing vazia (as 5 lâminas do carrossel já nascem em branco).',
    input_schema: {
      type: 'object',
      properties: { nome: { type: 'string', description: 'Nome curto para identificar a campanha internamente.' } },
      required: ['nome']
    }
  },
  {
    name: 'editar_campanha',
    description: 'Atualiza os dados gerais de uma campanha já existente (objetivo, público-alvo, formato, título, texto, hashtags, texto do botão, número de WhatsApp). Envie somente os campos que devem mudar.',
    input_schema: {
      type: 'object',
      properties: {
        campanha_id: { type: 'integer' },
        objetivo: { type: 'string' },
        publico_alvo: { type: 'string' },
        formato: { type: 'string', enum: acoes.FORMATOS },
        titulo: { type: 'string' },
        texto: { type: 'string' },
        hashtags: { type: 'string' },
        cta_texto: { type: 'string' },
        whatsapp_numero: { type: 'string' }
      },
      required: ['campanha_id']
    }
  },
  {
    name: 'definir_lamina',
    description: 'Preenche uma das 5 lâminas (ordem 1 a 5) do carrossel de uma campanha: título, corpo do texto, foto (pelo id) e tema visual.',
    input_schema: {
      type: 'object',
      properties: {
        campanha_id: { type: 'integer' },
        ordem: { type: 'integer', minimum: 1, maximum: 5 },
        titulo: { type: 'string' },
        corpo: { type: 'string' },
        foto_id: { type: 'integer', description: 'Id de uma foto já existente na biblioteca (confirme com listar_fotos).' },
        tema: { type: 'string', enum: acoes.TEMAS_VALIDOS }
      },
      required: ['campanha_id', 'ordem']
    }
  },
  {
    name: 'definir_poster',
    description: 'Define a foto e o tema visual do pôster único da campanha.',
    input_schema: {
      type: 'object',
      properties: {
        campanha_id: { type: 'integer' },
        foto_id: { type: 'integer' },
        tema: { type: 'string', enum: acoes.TEMAS_VALIDOS }
      },
      required: ['campanha_id']
    }
  },
  {
    name: 'criar_item_catalogo',
    description: 'Adiciona um produto ao catálogo em PDF de uma campanha.',
    input_schema: {
      type: 'object',
      properties: {
        campanha_id: { type: 'integer' },
        titulo: { type: 'string' },
        categoria: { type: 'string' },
        colecao: { type: 'string' },
        descricao: { type: 'string' },
        medidas: { type: 'string' },
        cores: { type: 'string' },
        preco_texto: { type: 'string', description: 'Texto livre de preço, só se o usuário informou um valor real. Nunca invente preço.' },
        destaque: { type: 'string' }
      },
      required: ['campanha_id', 'titulo']
    }
  },
  {
    name: 'adicionar_foto_item_catalogo',
    description: 'Vincula uma foto já existente na biblioteca a um produto do catálogo.',
    input_schema: {
      type: 'object',
      properties: { item_id: { type: 'integer' }, foto_id: { type: 'integer' } },
      required: ['item_id', 'foto_id']
    }
  },
  {
    name: 'planejar_publicacao',
    description: 'Planeja uma publicação na agenda (não publica nada automaticamente — é só um planejamento para envio manual).',
    input_schema: {
      type: 'object',
      properties: {
        campanha_id: { type: 'integer' },
        titulo: { type: 'string' },
        canal: { type: 'string', enum: acoes.CANAIS },
        data: { type: 'string', description: 'Data no formato AAAA-MM-DD, se o usuário informou.' },
        hora: { type: 'string', description: 'Hora no formato HH:MM, se o usuário informou.' }
      },
      required: ['campanha_id', 'titulo']
    }
  }
];

const SYSTEM_PROMPT = `Você é a Júlia, a assistente de marketing e divulgação da Castros Interiores, uma oficina de
reforma de estofados. Você conversa em português do Brasil, em tom simpático e direto, e executa de
verdade as ações do módulo de marketing através das ferramentas disponíveis — você não finge que fez
algo, você realmente chama a ferramenta.

Regras obrigatórias, sempre:
- Nunca invente preço, prazo, telefone, endereço ou qualquer dado que o usuário não tenha informado.
  Se faltar um dado necessário para uma ferramenta, pergunte antes de chamar a ferramenta.
- Antes de sobrescrever um campo que já está preenchido com um conteúdo diferente (por exemplo, o
  título ou o texto de uma campanha que já tem conteúdo), confirme primeiro com o usuário em texto,
  explicando o que está lá hoje — a menos que o usuário já tenha pedido claramente para substituir.
  Use obter_campanha para checar o que já existe antes de editar.
- Antes de usar um foto_id, confirme com listar_fotos que ele existe e faz sentido com o que o
  usuário descreveu — nunca invente um id de foto.
- Nenhuma publicação é enviada automaticamente a redes sociais ou WhatsApp — planejar_publicacao só
  registra um plano para envio manual depois. Deixe isso claro se o usuário parecer achar que é
  automático.
- Depois de executar as ações necessárias, responda ao usuário em texto corrido, de forma breve,
  confirmando o que foi feito (ou pedindo a informação que faltou). Não devolva JSON — responda só
  com a mensagem de chat mesmo.
- Esta conversa é exibida como texto simples, sem markdown: não use **negrito**, #, ou listas com
  asterisco. Para listar itens, use quebras de linha com hífen (- item).
- Se o usuário pedir algo fora do que as ferramentas permitem, explique a limitação sem inventar
  que fez algo que não fez.`;

function carregarHistorico(campanhaId) {
  return db.prepare('SELECT remetente, texto FROM julia_chat_mensagens WHERE campanha_id IS ? ORDER BY criado_em DESC LIMIT ?')
    .all(campanhaId || null, HISTORICO_MAXIMO)
    .reverse();
}

function salvarMensagem(campanhaId, remetente, texto, usuarioId) {
  const info = db.prepare('INSERT INTO julia_chat_mensagens (campanha_id, remetente, texto, criado_por) VALUES (?, ?, ?, ?)')
    .run(campanhaId || null, remetente, texto, usuarioId || null);
  return info.lastInsertRowid;
}

function executarFerramenta(nome, input, usuarioId, campanhaIdAtual) {
  try {
    switch (nome) {
      case 'listar_fotos': return { resultado: acoes.listarFotos(), novaCampanhaId: null };
      case 'listar_campanhas': return { resultado: acoes.listarCampanhas(), novaCampanhaId: null };
      case 'obter_campanha': return { resultado: acoes.obterCampanha(input.campanha_id), novaCampanhaId: null };
      case 'criar_campanha': {
        const r = acoes.criarCampanha({ nome: input.nome });
        return { resultado: r, novaCampanhaId: r.ok ? r.campanhaId : null };
      }
      case 'editar_campanha': {
        const { campanha_id, ...campos } = input;
        return { resultado: acoes.editarCampanha(campanha_id, campos), novaCampanhaId: null };
      }
      case 'definir_lamina': {
        const { campanha_id, ...campos } = input;
        return { resultado: acoes.definirLamina(campanha_id, campos), novaCampanhaId: null };
      }
      case 'definir_poster': {
        const { campanha_id, ...campos } = input;
        return { resultado: acoes.definirPoster(campanha_id, campos), novaCampanhaId: null };
      }
      case 'criar_item_catalogo': {
        const { campanha_id, ...campos } = input;
        return { resultado: acoes.criarItemCatalogo(campanha_id, campos), novaCampanhaId: null };
      }
      case 'adicionar_foto_item_catalogo':
        return { resultado: acoes.adicionarFotoItemCatalogo(input.item_id, input.foto_id), novaCampanhaId: null };
      case 'planejar_publicacao': {
        const { campanha_id, ...campos } = input;
        return { resultado: acoes.planejarPublicacao(campanha_id, campos, usuarioId), novaCampanhaId: null };
      }
      default:
        return { resultado: { ok: false, erro: 'Ferramenta desconhecida: ' + nome }, novaCampanhaId: null };
    }
  } catch (e) {
    return { resultado: { ok: false, erro: 'Erro ao executar a ação: ' + e.message }, novaCampanhaId: null };
  }
}

async function conversar({ campanhaId, mensagem, usuarioId }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { status: 'nao_configurado', erro: 'ANTHROPIC_API_KEY não foi definida no servidor.' };
  }
  if (!mensagem || !mensagem.trim()) {
    return { status: 'erro', erro: 'Escreva ou fale uma mensagem antes de enviar.' };
  }

  const idMensagemUsuario = salvarMensagem(campanhaId, 'usuario', mensagem.trim(), usuarioId);

  const modelo = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  const historico = carregarHistorico(campanhaId);
  const messages = historico.map(m => ({ role: m.remetente === 'usuario' ? 'user' : 'assistant', content: m.texto }));

  let campanhaIdAtual = campanhaId || null;
  let ultimaResposta = null;

  try {
    for (let rodada = 0; rodada <= MAX_RODADAS_FERRAMENTA; rodada++) {
      const resposta = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelo,
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages
        })
      });

      if (!resposta.ok) {
        let detalhe = '';
        try { detalhe = JSON.stringify(await resposta.json()); } catch (_) { /* ignorar */ }
        return { status: 'erro', erro: 'Serviço de IA retornou erro (HTTP ' + resposta.status + '). ' + detalhe };
      }

      const dados = await resposta.json();
      ultimaResposta = dados;
      messages.push({ role: 'assistant', content: dados.content });

      if (dados.stop_reason !== 'tool_use') break;

      const usosFerramenta = dados.content.filter(b => b.type === 'tool_use');
      const resultadosFerramenta = [];
      for (const uso of usosFerramenta) {
        const { resultado, novaCampanhaId } = executarFerramenta(uso.name, uso.input || {}, usuarioId, campanhaIdAtual);
        if (novaCampanhaId) campanhaIdAtual = novaCampanhaId;
        resultadosFerramenta.push({
          type: 'tool_result',
          tool_use_id: uso.id,
          content: JSON.stringify(resultado)
        });
      }
      messages.push({ role: 'user', content: resultadosFerramenta });

      if (rodada === MAX_RODADAS_FERRAMENTA) {
        return { status: 'erro', erro: 'A Júlia tentou várias ações em sequência e não concluiu — tente dividir o pedido em partes menores.' };
      }
    }
  } catch (e) {
    return { status: 'erro', erro: 'Falha de conexão com o serviço de IA: ' + e.message };
  }

  if (campanhaIdAtual !== (campanhaId || null)) {
    db.prepare('UPDATE julia_chat_mensagens SET campanha_id = ? WHERE id = ?').run(campanhaIdAtual, idMensagemUsuario);
  }

  const texto = (ultimaResposta.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  const textoFinal = texto || 'Feito.';
  salvarMensagem(campanhaIdAtual, 'julia', textoFinal, usuarioId);

  return { status: 'concluida', texto: textoFinal, campanhaId: campanhaIdAtual, modelo };
}

module.exports = { conversar, TOOLS };
