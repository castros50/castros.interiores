// Integração real com a API da Anthropic (Claude) para análise de fotos de estofados.
// A chave de API fica apenas no servidor (variável de ambiente ANTHROPIC_API_KEY).
// Esta função NUNCA inventa um resultado: sem chave configurada ou em caso de erro
// na chamada/validação da resposta, ela retorna um status explícito de falha.

const AREAS_VALIDAS = [
  'estrutura', 'base_e_pes', 'assento', 'encosto', 'bracos',
  'revestimento_e_costuras', 'espumas_e_enchimentos', 'percintas_molas_e_sustentacao',
  'ferragens', 'mecanismos_retrateis_ou_reclinaveis', 'forro_inferior_e_acabamentos'
];
const ORIGENS_VALIDAS = ['observado_foto', 'relatado_cliente', 'suspeita', 'confirmado_oficina', 'nao_avaliavel'];
const GRAVIDADES_VALIDAS = ['leve', 'moderada', 'grave', 'nao_avaliavel'];

const SYSTEM_PROMPT = `Você é o agente analista de reforma de estofados da Castros Interiores.
Sua função é APOIAR um responsável humano, nunca substituí-lo. Nenhuma conclusão sua é uma aprovação final.

Sua missão em cada atendimento:
- Identificar defeitos visíveis nas fotos enviadas.
- Organizar os problemas por área do móvel.
- Registrar suspeitas e limitações com honestidade.
- Indicar verificações/testes necessários na oficina.
- Avaliar possibilidades de recuperação e reaproveitamento dos materiais, sempre sujeitas a inspeção.
- Propor serviços possíveis, sem compromisso de preço ou prazo.
- Apoiar (sem decidir) a viabilidade da reforma.

REGRAS OBRIGATÓRIAS (nunca as quebre):
1. Classifique cada informação com a ORIGEM correta: "observado_foto", "relatado_cliente", "suspeita", "confirmado_oficina" ou "nao_avaliavel". Você, como IA, só pode usar "observado_foto", "suspeita" ou "nao_avaliavel" — "relatado_cliente" e "confirmado_oficina" são preenchidos pelo humano depois.
2. NUNCA afirme que a estrutura interna está boa apenas pela aparência externa.
3. NUNCA determine por foto: densidade da espuma, resistência da madeira, odores, infestação (cupim, traça, mofo oculto) ou funcionamento de peças ocultas/mecanismos internos. Isso é sempre "nao_avaliavel" com pedido de inspeção.
4. NÃO confunda estampa do tecido, sombra, sujeira superficial ou objetos apoiados sobre o móvel com dano estrutural. Se houver dúvida, registre como "suspeita" e explique o motivo da dúvida.
5. Quando uma área estiver encoberta (por almofadas, objetos, ângulo ruim) ou sem foto suficiente, registre a limitação explicitamente no campo "limitacao" e diga qual foto seria necessária.
6. NUNCA invente medidas, preços, quantidades, percentual de economia ou estimativa de vida útil.
7. NUNCA recomende reaproveitar um componente visivelmente comprometido só para reduzir custo.
8. NÃO oriente o cliente a desmontar mecanismos ou mover móveis pesados sem assistência da oficina.
9. Gravidade "grave" só deve ser usada para dano claramente visível e inequívoco; na dúvida, use "moderada" ou "nao_avaliavel".
10. Seja conciso e factual. Não use linguagem de venda.

Responda SOMENTE com um JSON válido, sem texto antes ou depois, seguindo exatamente este formato:
{
  "achados": [
    {
      "area": "estrutura|base_e_pes|assento|encosto|bracos|revestimento_e_costuras|espumas_e_enchimentos|percintas_molas_e_sustentacao|ferragens|mecanismos_retrateis_ou_reclinaveis|forro_inferior_e_acabamentos",
      "descricao": "descrição objetiva do que foi visto",
      "origem": "observado_foto|suspeita|nao_avaliavel",
      "gravidade": "leve|moderada|grave|nao_avaliavel",
      "intervencao_sugerida": "texto curto ou null",
      "inspecao_necessaria": "texto curto descrevendo o que a oficina deve verificar, ou null",
      "foto_referencia": "categoria da foto usada como referência (ex: assento, encosto) ou null",
      "limitacao": "texto explicando limitação de visibilidade, ou null"
    }
  ],
  "observacoes_gerais": "texto curto com limitações gerais da análise, ou null"
}`;

function mapExtensaoParaMime(nomeArquivo) {
  const ext = (nomeArquivo.split('.').pop() || '').toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return null;
}

function validarResultado(json) {
  if (!json || !Array.isArray(json.achados)) {
    throw new Error('Formato inesperado: campo "achados" ausente ou inválido.');
  }
  for (const a of json.achados) {
    if (!AREAS_VALIDAS.includes(a.area)) throw new Error('Área inválida retornada pela IA: ' + a.area);
    if (!ORIGENS_VALIDAS.includes(a.origem)) throw new Error('Origem inválida retornada pela IA: ' + a.origem);
    if (!GRAVIDADES_VALIDAS.includes(a.gravidade)) throw new Error('Gravidade inválida retornada pela IA: ' + a.gravidade);
    if (!a.descricao || typeof a.descricao !== 'string') throw new Error('Achado sem descrição válida.');
  }
  return json;
}

function extrairJson(texto) {
  const inicio = texto.indexOf('{');
  const fim = texto.lastIndexOf('}');
  if (inicio === -1 || fim === -1) throw new Error('Resposta da IA não contém JSON.');
  return JSON.parse(texto.slice(inicio, fim + 1));
}

async function avaliarFotos({ atendimento, fotos }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      status: 'nao_configurado',
      erro: 'ANTHROPIC_API_KEY não foi definida no servidor. Configure a chave no arquivo .env para ativar a análise automática.'
    };
  }
  if (!fotos || fotos.length === 0) {
    return { status: 'erro', erro: 'Nenhuma foto disponível para análise.' };
  }

  const modelo = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  const contexto = [
    'Dados do atendimento informados pelo cliente/atendente (use como contexto, não como fato visual):',
    'Tipo de móvel: ' + (atendimento.tipo_movel || 'não informado'),
    'Quantidade de peças: ' + (atendimento.quantidade_pecas || 'não informado'),
    'Defeitos relatados pelo cliente: ' + (atendimento.defeitos_relatados || 'não informado'),
    'Serviço desejado: ' + (atendimento.servico_desejado || 'não informado')
  ].join('\n');

  const conteudo = [{ type: 'text', text: contexto }];
  for (const foto of fotos) {
    const mime = mapExtensaoParaMime(foto.arquivo);
    if (!mime || !foto.base64) continue;
    conteudo.push({ type: 'text', text: 'Foto a seguir — categoria: ' + foto.categoria + (foto.legenda ? (' — legenda: ' + foto.legenda) : '') });
    conteudo.push({ type: 'image', source: { type: 'base64', media_type: mime, data: foto.base64 } });
  }

  let resposta;
  try {
    resposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: conteudo }]
      })
    });
  } catch (e) {
    return { status: 'erro', erro: 'Falha de conexão com o serviço de IA: ' + e.message };
  }

  if (!resposta.ok) {
    let detalhe = '';
    try { detalhe = JSON.stringify(await resposta.json()); } catch (_) { /* ignorar */ }
    return { status: 'erro', erro: 'Serviço de IA retornou erro (HTTP ' + resposta.status + '). ' + detalhe };
  }

  let dados;
  try {
    dados = await resposta.json();
  } catch (e) {
    return { status: 'erro', erro: 'Resposta da IA não pôde ser interpretada: ' + e.message };
  }

  const textoResposta = (dados.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  if (!textoResposta) {
    return { status: 'erro', erro: 'A IA não retornou conteúdo de texto analisável.' };
  }

  try {
    const json = extrairJson(textoResposta);
    const validado = validarResultado(json);
    return { status: 'concluida', resultado: validado, modelo };
  } catch (e) {
    return { status: 'erro', erro: 'Não foi possível validar a resposta da IA: ' + e.message, brutoParaLog: textoResposta.slice(0, 2000) };
  }
}

module.exports = { avaliarFotos, AREAS_VALIDAS, ORIGENS_VALIDAS, GRAVIDADES_VALIDAS };
