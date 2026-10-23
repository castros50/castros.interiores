// Central de Agentes — consulta a um "departamento" (persona de IA) da Castros Interiores.
// Cada departamento é uma especialização de prompt sobre o mesmo modelo Claude já usado
// na análise de fotos. A chave de API é a mesma (ANTHROPIC_API_KEY), só no servidor.

const DEPARTAMENTOS = [
  {
    id: 'julia_marketing',
    nome: 'Júlia',
    rotulo: 'Júlia — Marketing e Divulgação',
    papel: 'Marketing, publicidade e divulgação',
    resumo: 'Textos para redes sociais, anúncios, posts de antes/depois e campanhas de divulgação.',
    quickPrompts: [
      { label: 'Post de Antes/Depois deste estofado', prompt: 'Com base nos dados deste atendimento, crie uma publicação atraente para Instagram e status do WhatsApp da Castros Interiores destacando o potencial de transformação artesanal deste móvel.' },
      { label: 'Campanha de valorização de reforma artesanal', prompt: 'Elabore um roteiro de divulgação explicando por que reformar um estofado de estrutura nobre na Castros Interiores é vantajoso e como funciona a avaliação técnica.' },
      { label: 'Mensagem de captação para clientes antigos', prompt: 'Crie uma mensagem elegante e persuasiva para clientes antigos da Castros Interiores sobre a temporada de renovação de estofados.' }
    ]
  },
  {
    id: 'carla_atendimento',
    nome: 'Carla',
    rotulo: 'Carla — Atendimento ao Cliente',
    papel: 'Recepção e relacionamento com o cliente',
    resumo: 'Mensagens de boas-vindas, atualização de andamento e triagem inicial do cliente.',
    quickPrompts: [
      { label: 'Boas-vindas e orientação de fotos', prompt: 'Redija uma mensagem acolhedora em nome da Carla confirmando o cadastro deste atendimento e orientando quais fotos adicionais ajudariam na avaliação.' },
      { label: 'Atualização de andamento', prompt: 'Escreva um comunicado cordial para o cliente informando o status atual deste atendimento e os próximos passos da avaliação.' },
      { label: 'Roteiro de triagem inicial', prompt: 'Monte um checklist rápido de perguntas para completar as informações de uso, medidas e preferência de tecido deste cliente.' }
    ]
  },
  {
    id: 'pedro_avaliacao',
    nome: 'Pedro',
    rotulo: 'Pedro — Avaliação Técnica',
    papel: 'Avaliação técnica do estofado',
    resumo: 'Pareceres técnicos sobre defeitos, estrutura e plano de verificação na oficina.',
    quickPrompts: [
      { label: 'Resumo técnico de pontos de atenção', prompt: 'Com base nos achados já registrados deste atendimento, apresente um parecer técnico sobre os pontos críticos que devem ser conferidos na abertura do estofado na oficina.' },
      { label: 'Plano de verificação de estrutura e espumas', prompt: 'Liste o protocolo técnico para conferência presencial de madeiramento, percintas, molas e teste físico da espuma deste estofado.' },
      { label: 'Comparativo das propostas de reforma', prompt: 'Explique tecnicamente a diferença de escopo e durabilidade entre as propostas essencial, recomendada e completa para este móvel.' }
    ]
  },
  {
    id: 'ana_compras',
    nome: 'Ana',
    rotulo: 'Ana — Compras e Suprimentos',
    papel: 'Compras, materiais e fornecedores',
    resumo: 'Listas de compra, pedidos de cotação e checklist de recebimento de materiais.',
    quickPrompts: [
      { label: 'Lista de compra e cotação de insumos', prompt: 'Com base no móvel e no orçamento deste atendimento, monte a relação de insumos necessários e indique o que depende de confirmação no plano de corte.' },
      { label: 'Pedido de cotação para fornecedores', prompt: 'Elabore uma mensagem formal em nome da Ana solicitando cotação e prazo de entrega dos materiais deste atendimento.' },
      { label: 'Checklist de recebimento de materiais', prompt: 'Crie um checklist prático de conferência de lote, largura de rolo de tecido e densidade das espumas no recebimento.' }
    ]
  },
  {
    id: 'mila_financeiro',
    nome: 'Mila',
    rotulo: 'Mila — Administração Financeira',
    papel: 'Custos, orçamento e financeiro',
    resumo: 'Análise de composição de custos, mensagens comerciais e auditoria de pendências.',
    quickPrompts: [
      { label: 'Análise de composição de custos', prompt: 'Analise os itens lançados no orçamento deste atendimento, verifique pendências de quantidade ou preço e oriente o fechamento financeiro sem inventar números.' },
      { label: 'Mensagem comercial do orçamento', prompt: 'Elabore uma mensagem comercial elegante em nome da Mila para acompanhar o envio do relatório ao cliente, destacando transparência.' },
      { label: 'Auditoria de pendências financeiras', prompt: 'Verifique as pendências financeiras e cadastrais deste atendimento antes da homologação final.' }
    ]
  }
];

function buscarDepartamento(id) {
  return DEPARTAMENTOS.find(d => d.id === id) || null;
}

const REGRAS_GERAIS = `Você é parte da "Central de Agentes" da Castros Interiores, uma oficina de reforma de estofados.
Regras obrigatórias, sempre:
- Nunca invente preços, prazos, telefone, endereço, CNPJ ou dados cadastrais que não foram informados no contexto — se faltar, diga que está pendente de confirmação pelo responsável.
- Nunca afirme algo técnico sobre o estado do móvel que não esteja nos dados fornecidos.
- Seus textos são sugestões para o responsável revisar antes de enviar ao cliente ou publicar — nunca finalize nada em nome da empresa sozinho.
- Seja objetivo e use linguagem natural em português do Brasil.

Responda SOMENTE com um JSON válido, sem texto antes ou depois, neste formato:
{
  "agentTitle": "nome e papel de quem está respondendo",
  "technicalAnalysis": "resposta ou plano, em texto corrido",
  "recommendedActions": ["próximo passo 1", "próximo passo 2"],
  "clientMessageSuggestion": "texto pronto para WhatsApp/divulgação, ou null se não aplicável"
}`;

function montarContextoAtendimento(atendimento) {
  if (!atendimento) return 'Nenhum atendimento selecionado — responda de forma genérica para a oficina.';
  const linhas = [
    'Número: ' + atendimento.numero,
    'Status: ' + atendimento.status,
    'Cliente: ' + (atendimento.cliente_nome || 'não informado'),
    'Tipo de móvel: ' + (atendimento.tipo_movel || 'não informado'),
    'Defeitos relatados: ' + (atendimento.defeitos_relatados || 'não informado'),
    'Serviço desejado: ' + (atendimento.servico_desejado || 'não informado')
  ];
  if (atendimento.achados && atendimento.achados.length) {
    linhas.push('Achados registrados: ' + atendimento.achados.map(a => a.area + ' — ' + a.descricao).join('; '));
  }
  if (atendimento.orcamentoItens && atendimento.orcamentoItens.length) {
    const pendentes = atendimento.orcamentoItens.filter(i => i.subtotal === null).length;
    linhas.push('Itens de orçamento: ' + atendimento.orcamentoItens.length + ' lançado(s), ' + pendentes + ' pendente(s) de valor.');
  }
  if (atendimento.preco_venda !== null && atendimento.preco_venda !== undefined) {
    linhas.push('Preço de venda definido: R$ ' + atendimento.preco_venda);
  }
  return linhas.join('\n');
}

function extrairJson(texto) {
  const inicio = texto.indexOf('{');
  const fim = texto.lastIndexOf('}');
  if (inicio === -1 || fim === -1) throw new Error('Resposta da IA não contém JSON.');
  return JSON.parse(texto.slice(inicio, fim + 1));
}

async function consultarDepartamento({ departamentoId, prompt, atendimento }) {
  const dept = buscarDepartamento(departamentoId);
  if (!dept) return { status: 'erro', erro: 'Departamento desconhecido.' };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { status: 'nao_configurado', erro: 'ANTHROPIC_API_KEY não foi definida no servidor.' };
  }
  if (!prompt || !prompt.trim()) {
    return { status: 'erro', erro: 'Escreva uma solicitação antes de acionar o departamento.' };
  }

  const modelo = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  const systemPrompt = REGRAS_GERAIS + '\n\nVocê está respondendo como ' + dept.nome + ' (' + dept.papel + ').';
  const contexto = 'Contexto do atendimento:\n' + montarContextoAtendimento(atendimento) + '\n\nSolicitação do responsável:\n' + prompt;

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
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: contexto }]
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

  const texto = (dados.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  if (!texto) return { status: 'erro', erro: 'A IA não retornou conteúdo de texto.' };

  try {
    const json = extrairJson(texto);
    if (!json.agentTitle || !json.technicalAnalysis) throw new Error('Resposta incompleta da IA.');
    return { status: 'concluida', resultado: json, modelo };
  } catch (e) {
    return { status: 'erro', erro: 'Não foi possível validar a resposta da IA: ' + e.message };
  }
}

module.exports = { DEPARTAMENTOS, buscarDepartamento, consultarDepartamento };
