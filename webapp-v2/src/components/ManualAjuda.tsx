import React, { useState } from 'react';
import { Printer, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

// Manual e Ajuda — escrito a partir das telas e rotas realmente implementadas no
// sistema (ver nomes de botões e abas usados aqui, copiados do próprio app, não
// inventados). Seções que dependem de configuração do usuário (credenciais da
// Meta, gatilho do Cloud Scheduler) dizem isso explicitamente, nunca escondem a
// pendência. Imprimível em A4 via o botão "Imprimir / Salvar como PDF" (usa o
// diálogo de impressão do navegador, com @media print definido em index.css).

const SECTIONS = [
  { id: 'config-inicial', label: '1. Configuração inicial e conexão de canais' },
  { id: 'anuncio-julia', label: '2. Criar, aprovar e agendar um anúncio (Júlia)' },
  { id: 'anuncios-pagos', label: '3. Anúncios pagos com aprovação de orçamento' },
  { id: 'carla-atendimento', label: '4. Como a Carla recebe e conduz um atendimento' },
  { id: 'fotos-pedro-lucas', label: '5. Como fotos e dados chegam a Pedro ou Lucas' },
  { id: 'nove-agentes', label: '6. Como usar cada um dos 9 agentes' },
  { id: 'automatico-vs-manual', label: '7. O que é automático e o que exige sua ação' },
  { id: 'aprovar-tarefas', label: '8. Aprovar, corrigir, pausar e retomar tarefas' },
  { id: 'painel-resumo', label: '9. Painel de supervisão e resumo diário' },
  { id: 'vozes', label: '10. Como escolher a voz de cada agente' },
  { id: 'falhas-comuns', label: '11. Reconhecer e resolver falhas comuns' },
  { id: 'exemplo-demo', label: '12. Exemplo completo de atendimento (demonstração)' },
  { id: 'pendencias', label: '13. O que ainda depende de configuração' },
];

const SectionHeading: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <h2 id={id} className="text-lg font-serif-display font-bold text-[#181512] pt-2 scroll-mt-24">
    {children}
  </h2>
);

const Note: React.FC<{ kind: 'info' | 'warning' | 'ok'; children: React.ReactNode }> = ({ kind, children }) => {
  const styles =
    kind === 'warning'
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : kind === 'ok'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
      : 'bg-[#FAF8F5] border-[#E5DEC9] text-[#57534E]';
  const Icon = kind === 'warning' ? AlertTriangle : kind === 'ok' ? CheckCircle2 : Info;
  return (
    <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${styles}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
};

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-block px-1.5 py-0.5 rounded bg-[#181512] text-[#F9F6F0] text-[10px] font-mono font-semibold">
    {children}
  </span>
);

export const ManualAjuda: React.FC = () => {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho — oculto na impressão, ver .no-print em index.css */}
      <div className="no-print rounded-xl bg-[#181512] text-[#F9F6F0] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#2E2722] text-[#D8C5A3] border border-[#57534E]">
            Manual e Ajuda
          </span>
          <h1 className="text-xl font-serif-display font-bold text-white mt-2">
            Como usar o Escritório de Agentes da Castros Interiores
          </h1>
          <p className="text-xs text-[#A8A29E] max-w-2xl mt-1">
            Escrito a partir das telas e botões realmente implementados no sistema. Funciona no celular, no
            tablet e no computador. Use o botão ao lado para imprimir ou salvar em A4.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2.5 rounded-xl bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-2 shadow shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Salvar como PDF (A4)</span>
        </button>
      </div>

      {/* Índice — oculto na impressão (a versão impressa é sequencial) */}
      <div className="no-print flex flex-wrap gap-2 p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
              activeSection === s.id
                ? 'bg-[#9A7138] text-white border-[#9A7138]'
                : 'bg-white text-[#57534E] border-[#D6CFC5] hover:border-[#9A7138]'
            }`}
          >
            {s.label}
          </a>
        ))}
      </div>

      {/* Corpo do manual — visível tanto na tela quanto na impressão */}
      <div className="manual-print-area bg-white rounded-xl border border-[#E5DEC9] p-6 md:p-8 shadow-sm space-y-10 text-sm text-[#2E2722] leading-relaxed">
        {/* 1. CONFIGURAÇÃO INICIAL */}
        <section className="space-y-3">
          <SectionHeading id="config-inicial">1. Configuração inicial e conexão de canais</SectionHeading>
          <p>
            O sistema já vem com os nove agentes, seus retratos e suas mesas prontos — não é preciso cadastrar
            nada para começar a usar o atendimento manual, a avaliação técnica, a fabricação, o financeiro ou o
            marketing. O que precisa de configuração do responsável é apenas a parte que conecta a oficina a
            serviços externos reais:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Nome da oficina, telefone e cidade:</strong> em <strong>Configurações</strong>, no topo do
              app, preencha os campos e clique em <strong>Salvar Configurações</strong>. Esses dados aparecem nos
              relatórios PDF e nas mensagens prontas de WhatsApp.
            </li>
            <li>
              <strong>Retratos dos agentes:</strong> também em Configurações, é possível enviar/trocar a foto de
              cada um dos 9 agentes.
            </li>
            <li>
              <strong>Integração oficial do WhatsApp:</strong> veja a seção 13 — exige credenciais reais da Meta
              que só o responsável pode fornecer, nunca pelo chat.
            </li>
            <li>
              <strong>Execução de tarefas em segundo plano:</strong> veja a seção 13 — exige um gatilho externo
              (Google Cloud Scheduler) configurado fora do app.
            </li>
          </ul>
          <Note kind="info">
            Nenhuma dessas conexões é obrigatória para o dia a dia: sem elas, o sistema funciona normalmente no
            modo manual (atendimento digitado, envio de WhatsApp por link, publicações marcadas como "Envio
            manual necessário").
          </Note>
        </section>

        {/* 2. ANÚNCIO JÚLIA */}
        <section className="space-y-3">
          <SectionHeading id="anuncio-julia">2. Criar, aprovar e agendar um anúncio (Júlia)</SectionHeading>
          <p>
            Abra a mesa de <strong>Júlia</strong> (clique no cartão "Júlia Marketing e Divulgação" no Painel, ou
            em Escritório de Mesas → Mesa 7). O Anúncio Inteligente segue 12 etapas, da escolha das fotos até a
            programação da publicação. Pontos importantes:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>A Júlia nunca inventa fotos — ela usa as fotos reais já cadastradas ou enviadas pelo celular.</li>
            <li>
              Ao final, na etapa de programação, você escolhe entre{' '}
              <strong>"Planejar publicação"</strong> (modo manual) ou tentar o modo automático. O botão{' '}
              <strong>Confirmar Envio Manual</strong> só aparece quando você mesmo já postou pelo seu
              WhatsApp/Instagram e quer registrar isso — essa confirmação fica marcada como "envio manual",
              nunca como publicação automática comprovada.
            </li>
            <li>
              O status <strong>"Concluída"</strong> só aparece quando o próprio canal oficial confirmar a
              publicação de verdade (ver seção 13) — nunca aparece por um clique humano.
            </li>
            <li>
              No chat da Júlia (<strong>Conversar</strong>), pergunte sobre o status real de qualquer campanha —
              ela responde com os dados reais do calendário, nunca com suposições.
            </li>
          </ul>
        </section>

        {/* 3. ANÚNCIOS PAGOS */}
        <section className="space-y-3">
          <SectionHeading id="anuncios-pagos">3. Anúncios pagos com aprovação de orçamento</SectionHeading>
          <p>
            Diferente da publicação orgânica (grátis) da seção anterior, um anúncio pago envolve dinheiro real —
            por isso nunca é iniciado sozinho, nem pela Júlia, nem por nenhuma automação.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Na Etapa 11 do Anúncio Inteligente, ao lado de "1. Planejar Publicação" e "2. Agendar Publicação
              Automática", existe a <strong>"3. Propor Anúncio Pago"</strong>. Ela abre um formulário curto:
              objetivo (Alcance, Tráfego, Mensagens ou Conversões), público-alvo, orçamento (total ou diário) e
              duração em dias.
            </li>
            <li>
              Ao enviar, a proposta nasce sempre como <strong>"Aguardando Aprovação de Orçamento"</strong> —
              nenhum anúncio é criado, nenhum valor é reservado, nada é enviado à Meta nesse momento.
            </li>
            <li>
              A proposta aparece nas mesas de <strong>Helena</strong> (aba "5. Automação & Tarefas" → "Anúncios
              Pagos Aguardando Aprovação") e de <strong>Castro</strong> (aba "4. Anúncios Pagos"). Qualquer uma
              das duas mesas pode <strong>Aprovar Orçamento</strong> ou <strong>Rejeitar</strong>, mas sempre
              pedindo o nome de quem decidiu — nunca uma aprovação anônima.
            </li>
            <li>
              Aprovar não publica o anúncio na hora: cria uma tarefa real na fila de tarefas em segundo plano
              (mesma fila da seção 8), que só avança de verdade quando houver uma conta de anúncios da Meta
              conectada (ver seção 13). Sem isso, a tarefa falha com o motivo exato e a proposta passa para
              "Aguardando Integração" — nunca é marcada como veiculada sem essa prova.
            </li>
          </ul>
        </section>

        {/* 4. CARLA */}
        <section className="space-y-3">
          <SectionHeading id="carla-atendimento">4. Como a Carla recebe e conduz um atendimento</SectionHeading>
          <p>
            A mesa da <strong>Carla</strong> (Mesa 1) é o ponto de entrada de qualquer cliente novo, seja um
            contato manual (telefone, WhatsApp tradicional, presencial) ou — quando configurado — uma mensagem
            recebida pelo canal oficial do WhatsApp (seção 13).
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Use o campo de busca ("Buscar por nome, telefone ou número do atendimento...") para localizar um
              cliente já cadastrado antes de abrir um pedido novo — evita duplicar o mesmo atendimento.
            </li>
            <li>
              Botão <strong>Novo Atendimento</strong>: cadastro inicial com tipo de solicitação, bairro/cidade/
              endereço e a medida informada pelo cliente (a medida conferida na oficina é preenchida depois,
              por Pedro ou Lucas).
            </li>
            <li>
              Pedidos de reforma vão para <strong>Pedro</strong>; pedidos de fabricação nova vão para{' '}
              <strong>Lucas</strong> — esse encaminhamento segue as mesmas regras já cadastradas no sistema.
            </li>
            <li>
              Reclamações ficam registradas na ficha do cliente e podem ser encaminhadas à mesa responsável.
            </li>
            <li>
              A mensagem de WhatsApp pronta para enviar é sempre de <strong>envio manual</strong> (o botão abre o
              WhatsApp com o texto já preenchido) — a Carla nunca confirma pagamento sozinha a partir de uma
              mensagem do cliente ou de uma foto de comprovante.
            </li>
          </ul>
        </section>

        {/* 4. FOTOS PEDRO/LUCAS */}
        <section className="space-y-3">
          <SectionHeading id="fotos-pedro-lucas">5. Como fotos e dados chegam a Pedro ou Lucas</SectionHeading>
          <p>
            As fotos anexadas por Carla (ou enviadas direto pelo celular do cliente/oficina) ficam vinculadas ao
            mesmo atendimento em todas as etapas — nunca são duplicadas quando o pedido passa de mesa em mesa.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Pedro (Avaliação Técnica)</strong> usa as fotos para a inspeção das 11 áreas do móvel, a
              revisão na bancada da oficina e o teste de espuma/reaproveitamento — a medida conferida na oficina
              é preenchida aqui, separada da medida informada pelo cliente.
            </li>
            <li>
              <strong>Lucas (Projetos e Fabricação)</strong> usa as mesmas fotos e dados para a ficha técnica em
              milímetros, o plano de corte preliminar e o manual de montagem de 12 etapas.
            </li>
            <li>
              Cada troca de mesa fica registrada no histórico de encaminhamentos do pedido (visível na aba
              "Todos os Pedidos" da Supervisão) — nunca é um passo "invisível".
            </li>
          </ul>
        </section>

        {/* 5. NOVE AGENTES */}
        <section className="space-y-3">
          <SectionHeading id="nove-agentes">6. Como usar cada um dos 9 agentes</SectionHeading>
          <p>
            Todas as mesas ficam em <strong>Escritório de Mesas</strong> (nove cartões) ou no bloco
            "Departamentos Operacionais" do Painel. Cada uma tem um botão <strong>Conversar</strong> (chat de
            texto/voz) e uma área operacional própria:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ['Carla — Atendimento ao Cliente', 'Recepção, cadastro de novos atendimentos, coleta de fotos por ângulo e relacionamento via WhatsApp.'],
              ['Pedro — Avaliação Técnica', 'Inspeção das 11 áreas do móvel, revisão na bancada da oficina, teste de espuma e reaproveitamento.'],
              ['Lucas — Projetos e Fabricação', 'Ficha técnica em milímetros, plano de corte preliminar, manual de montagem (12 etapas) e tolerâncias de qualidade.'],
              ['Ana — Compras e Suprimentos', 'Gestão do catálogo de materiais, tecidos, espumas, fornecedores, cotações e plano de corte.'],
              ['Mila — Administração Financeira', 'Consolidação de custos internos, definição de preço de venda, condições de pagamento e PDFs A4.'],
              ['Castro (Roberto) — Estratégia e Negócio', 'Metas de vendas e rentabilidade, capacidade produtiva, mapa de gargalos e plano de ação semanal.'],
              ['Júlia — Marketing e Divulgação', '12 etapas do Anúncio Inteligente, pôsteres, carrosséis, catálogo, voz/texto, campanhas e relatório diário.'],
              ['Tapeceiro Técnico', 'Planejamento de reforma e fabricação a partir dos dados já registrados, com liberação sujeita a revisão humana.'],
              ['Helena — Supervisão Geral', 'Monitoramento integrado de prazos, cobrança de retornos, aprovação formal de decisões, automação e mediação entre mesas.'],
            ].map(([title, desc]) => (
              <div key={title} className="p-3 rounded-lg border border-[#E5DEC9] bg-[#FAF8F5]">
                <p className="text-xs font-bold text-[#181512]">{title}</p>
                <p className="text-[11px] text-[#57534E] mt-1">{desc}</p>
              </div>
            ))}
          </div>
          <Note kind="info">
            Nenhuma função foi renomeada ou redistribuída entre os agentes — cada um continua com o papel e o
            histórico que já tinha.
          </Note>
        </section>

        {/* 6. AUTOMÁTICO VS MANUAL */}
        <section className="space-y-3">
          <SectionHeading id="automatico-vs-manual">7. O que é automático e o que exige sua ação</SectionHeading>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#181512] text-[#F9F6F0]">
                <th className="py-2 px-3 text-left">Automático de verdade hoje</th>
                <th className="py-2 px-3 text-left">Exige um clique ou aprovação sua</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE6]">
              <tr className="bg-white">
                <td className="py-2 px-3 align-top">
                  Cálculo de orçamentos, consolidação financeira e geração de PDFs a partir dos dados já
                  cadastrados.
                </td>
                <td className="py-2 px-3 align-top">
                  Confirmar preço final, descontos, pagamentos e prazos ainda não autorizados — sempre pendentes
                  para a pessoa responsável (regra que a Mila já seguia e que não foi enfraquecida).
                </td>
              </tr>
              <tr className="bg-white">
                <td className="py-2 px-3 align-top">
                  Verificação de uma integração (WhatsApp/Instagram/Facebook) quando o gatilho externo estiver
                  configurado (seção 13).
                </td>
                <td className="py-2 px-3 align-top">
                  Publicar um anúncio de fato — só sai automaticamente quando o canal estiver com status{' '}
                  <strong>Conectado</strong>; sem isso, o envio é sempre manual (link/botão que você mesmo
                  aciona).
                </td>
              </tr>
              <tr className="bg-white">
                <td className="py-2 px-3 align-top">
                  Registrar uma mensagem recebida pelo canal oficial do WhatsApp (quando conectado) e vincular ao
                  atendimento certo.
                </td>
                <td className="py-2 px-3 align-top">
                  Responder automaticamente ao cliente — só acontece se você ligar "Resposta Automática da
                  Carla" no painel de Helena, e nunca enquanto a conversa estiver pausada para atendimento
                  humano.
                </td>
              </tr>
              <tr className="bg-white">
                <td className="py-2 px-3 align-top">Preencher relatórios e históricos a partir dos dados reais já no sistema.</td>
                <td className="py-2 px-3 align-top">
                  Uma mensagem do cliente ou uma foto de comprovante nunca confirmam pagamento sozinhas — alguém
                  precisa confirmar manualmente.
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 7. APROVAR/PAUSAR TAREFAS */}
        <section className="space-y-3">
          <SectionHeading id="aprovar-tarefas">8. Aprovar, corrigir, pausar e retomar tarefas</SectionHeading>
          <p>
            Abra a mesa de <strong>Helena</strong> e vá até a aba <strong>5. Automação &amp; Tarefas</strong>.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Pausar / Retomar</strong> (automação geral): interrompe o processamento de novas tarefas
              sem cancelar nem reenviar as que já foram concluídas.
            </li>
            <li>
              <strong>Ligar / Desligar</strong> (resposta automática da Carla): controla só a resposta automática
              pelo WhatsApp integrado, separada da automação geral.
            </li>
            <li>
              Cada linha da <strong>Fila de Tarefas em Segundo Plano</strong> mostra a ação, a mesa responsável,
              o horário agendado (fuso de Fortaleza), o status e o resultado comprovado ou o motivo exato da
              falha. O botão <strong>Cancelar</strong> aparece nas tarefas que ainda não terminaram.
            </li>
            <li>
              Pedidos que precisam de homologação aparecem na aba 1 do painel de Helena, com os botões{' '}
              <strong>Homologar Ficha Técnica</strong> e <strong>Homologar Orçamento</strong>.
            </li>
          </ul>
        </section>

        {/* 8. PAINEL E RESUMO */}
        <section className="space-y-3">
          <SectionHeading id="painel-resumo">9. Painel de supervisão e resumo diário</SectionHeading>
          <p>
            Ainda na mesa de Helena, a aba 5 também mostra, com dados reais:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>O status de cada integração oficial (conectado/pendente/erro/não configurado).</li>
            <li>
              Um <strong>Resumo de Hoje</strong> (fuso de Fortaleza) com o número de tarefas concluídas, com
              falha, na fila, e mensagens trocadas — mostra explicitamente "Sem atividade registrada hoje" quando
              não há nada a relatar, nunca inventa uma atividade.
            </li>
            <li>A última atividade real de cada uma das 9 mesas (ou "Sem atividade registrada").</li>
          </ul>
          <p>
            Clique em <strong>Atualizar</strong> para recarregar os dados mais recentes a qualquer momento.
          </p>
        </section>

        {/* 9. VOZES */}
        <section className="space-y-3">
          <SectionHeading id="vozes">10. Como escolher a voz de cada agente</SectionHeading>
          <p>
            Dentro do chat de qualquer agente, clique em <strong>Voz da mesa</strong> (ao lado do botão de
            mudo/ativar voz).
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>A lista mostra as vozes que o seu navegador/aparelho realmente tem disponíveis.</li>
            <li>
              Use <strong>Testar voz</strong> para ouvir uma amostra antes de decidir, e{' '}
              <strong>Salvar voz desta mesa</strong> para fixar aquela voz só para aquele agente.
            </li>
            <li>A escolha é salva no servidor e continua valendo depois de recarregar a página ou reabrir o app.</li>
          </ul>
          <Note kind="warning">
            A lista de vozes depende do navegador e do aparelho — um celular pode ter vozes diferentes de um
            computador. Se a voz salva não existir mais no aparelho que você está usando agora, o sistema avisa
            e usa uma voz em português padrão enquanto isso.
          </Note>
        </section>

        {/* 10. FALHAS COMUNS */}
        <section className="space-y-3">
          <SectionHeading id="falhas-comuns">11. Reconhecer e resolver falhas comuns</SectionHeading>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Canal mostra "Não Configurado":</strong> normal até você conectar as credenciais reais
              (seção 13) — use o envio manual enquanto isso.
            </li>
            <li>
              <strong>Canal mostra "Erro":</strong> a credencial configurada não está funcionando — confira a
              mensagem de erro exibida no painel de Helena e revise as variáveis de ambiente do servidor.
            </li>
            <li>
              <strong>Uma tarefa aparece como "Falhou":</strong> abra a linha na fila de tarefas — o motivo exato
              sempre é mostrado (ex.: integração não conectada). Depois de corrigir a causa, uma nova tentativa
              pode ser criada normalmente pelo fluxo que a originou.
            </li>
            <li>
              <strong>Nenhuma voz aparece no seletor:</strong> o navegador atual não tem (ou não suporta) síntese
              de voz — o chat continua funcionando normalmente só por texto.
            </li>
            <li>
              <strong>A fila de tarefas não está avançando sozinha:</strong> confira se o gatilho externo
              (Cloud Scheduler) está configurado — sem ele, as tarefas ficam na fila até alguém processar
              manualmente ou o gatilho ser configurado (seção 13).
            </li>
          </ul>
        </section>

        {/* 11. EXEMPLO DEMONSTRAÇÃO */}
        <section className="space-y-3">
          <SectionHeading id="exemplo-demo">12. Exemplo completo de atendimento (demonstração)</SectionHeading>
          <div className="p-4 rounded-xl border-2 border-dashed border-[#9A7138] bg-[#FAF8F5] space-y-2 text-xs">
            <p className="font-bold text-[#9A7138] uppercase tracking-wider text-[10px]">
              Exemplo demonstrativo — não é um atendimento real
            </p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                Um cliente manda mensagem pelo WhatsApp pedindo para reformar um sofá de 2 lugares. Carla abre{' '}
                <strong>Novo Atendimento</strong>, registra nome, telefone, bairro e a medida que o cliente
                informou, e pede 4 fotos do sofá.
              </li>
              <li>
                Como é reforma, o pedido segue para <strong>Pedro</strong>, que confere a medida real na oficina
                e registra os defeitos encontrados nas 11 áreas de inspeção.
              </li>
              <li>
                Mila consolida os custos e monta o orçamento; o responsável confirma o preço final e as condições
                de pagamento (nunca um passo automático).
              </li>
              <li>
                Carla usa o botão de WhatsApp para enviar a mensagem de acompanhamento já pronta ao cliente — um
                envio manual, com um clique seu.
              </li>
              <li>
                Depois que o cliente paga, alguém da equipe confirma manualmente o pagamento no sistema — nunca a
                própria mensagem do cliente ou uma foto de comprovante faz essa confirmação sozinha.
              </li>
              <li>
                Helena acompanha o andamento desse pedido na aba "Todos os Pedidos" e pode registrar uma cobrança
                de retorno se alguma mesa estiver demorando.
              </li>
            </ol>
          </div>
        </section>

        {/* 12. PENDÊNCIAS */}
        <section className="space-y-3">
          <SectionHeading id="pendencias">13. O que ainda depende de configuração</SectionHeading>
          <Note kind="warning">
            O escritório de agentes NÃO deve ser considerado "totalmente automático" até estes dois pontos
            estarem configurados e comprovados:
          </Note>
          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
              <p className="text-xs font-bold text-amber-900">1. Integração real do WhatsApp (e opcionalmente Instagram/Facebook)</p>
              <p className="text-[11px] text-amber-900 mt-1">
                O código do webhook, do envio de mensagens e da verificação de conexão já está pronto e testado
                internamente, mas só funciona com credenciais reais da Meta (WhatsApp Business Cloud API), que só
                o responsável pela oficina pode obter e configurar — nunca pelo chat. É preciso definir, como
                variáveis de ambiente do servidor: <code>WHATSAPP_VERIFY_TOKEN</code>,{' '}
                <code>WHATSAPP_APP_SECRET</code>, <code>WHATSAPP_ACCESS_TOKEN</code> e{' '}
                <code>WHATSAPP_PHONE_NUMBER_ID</code>, além de cadastrar a URL pública{' '}
                <code>/api/webhooks/whatsapp</code> no painel da Meta.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
              <p className="text-xs font-bold text-amber-900">2. Execução da fila de tarefas com o app fechado</p>
              <p className="text-[11px] text-amber-900 mt-1">
                A fila de tarefas em segundo plano já existe e já funciona quando alguém chama a rota{' '}
                <code>/api/tasks/process-due</code> (protegida por uma variável <code>BACKGROUND_TASKS_SECRET</code>).
                Mas a hospedagem atual (Cloud Run) pode desligar o servidor quando ele fica ocioso, então "rodar
                sozinho o dia inteiro" depende de configurar um Google Cloud Scheduler externo para chamar essa
                rota em intervalos regulares — isso precisa ser feito pelo responsável no Console do Google
                Cloud, fora deste app.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
              <p className="text-xs font-bold text-amber-900">3. Veiculação real de anúncios pagos</p>
              <p className="text-[11px] text-amber-900 mt-1">
                O fluxo de proposta e aprovação de orçamento (seção 3) já funciona de ponta a ponta. Mas a
                veiculação em si — a Meta de fato colocar o anúncio no ar e cobrar — exige uma conta de anúncios
                da Meta com permissão <code>ads_management</code> e um método de pagamento, configurada como{' '}
                <code>META_ADS_ACCESS_TOKEN</code> e <code>META_AD_ACCOUNT_ID</code> nas variáveis de ambiente do
                servidor. Mesmo com a conta conectada, a chamada de criação da campanha na Meta ainda não foi
                implementada — por enquanto, aprove o orçamento aqui e crie o anúncio manualmente na Meta.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
