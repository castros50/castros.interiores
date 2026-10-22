-- Castros Interiores - Avaliação de Estofados
-- Schema SQLite

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nome TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS atendimentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho',
  cliente_nome TEXT,
  cliente_telefone TEXT,
  tipo_movel TEXT,
  quantidade_pecas TEXT,
  medidas TEXT,
  tempo_uso TEXT,
  defeitos_relatados TEXT,
  servico_desejado TEXT,
  historico_reformas TEXT,
  preferencia_tecido TEXT,
  observacoes TEXT,
  responsavel_nome TEXT,
  revisado_em TEXT,
  preco_venda REAL,
  proposta_selecionada_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS fotos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atendimento_id INTEGER NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  arquivo TEXT NOT NULL,
  hash TEXT,
  legenda TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analises_ia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atendimento_id INTEGER NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
  modelo TEXT,
  status TEXT NOT NULL, -- concluida | erro
  resultado_json TEXT,
  erro TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS achados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atendimento_id INTEGER NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  descricao TEXT NOT NULL,
  foto_id INTEGER REFERENCES fotos(id),
  origem TEXT NOT NULL, -- observado_foto | relatado_cliente | suspeita | confirmado_oficina | nao_avaliavel
  gravidade TEXT NOT NULL DEFAULT 'nao_avaliavel', -- leve | moderada | grave | nao_avaliavel
  intervencao_sugerida TEXT,
  inspecao_necessaria TEXT,
  gerado_por_ia INTEGER NOT NULL DEFAULT 0,
  analise_ia_id INTEGER REFERENCES analises_ia(id),
  status_revisao TEXT NOT NULL DEFAULT 'pendente', -- pendente | confirmado | editado | descartado
  versao INTEGER NOT NULL DEFAULT 1,
  substituido_por INTEGER REFERENCES achados(id),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reaproveitamento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atendimento_id INTEGER NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
  componente TEXT NOT NULL,
  condicao TEXT,
  possibilidade TEXT NOT NULL DEFAULT 'pendente', -- candidato | recuperavel | substituicao | pendente
  reparo_necessario TEXT,
  criterio_aprovacao TEXT,
  efeito_custo TEXT,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(atendimento_id, componente)
);

CREATE TABLE IF NOT EXISTS propostas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atendimento_id INTEGER NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- essencial | recomendada | completa
  servicos TEXT,
  manter TEXT,
  recuperar TEXT,
  substituir TEXT,
  pendencias TEXT,
  beneficios TEXT,
  limitacoes TEXT,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(atendimento_id, tipo)
);

CREATE TABLE IF NOT EXISTS materiais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  unidade TEXT NOT NULL,
  custo_unitario REAL,
  fornecedor TEXT,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orcamento_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atendimento_id INTEGER NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- material | mao_obra | terceirizado | transporte | outro
  material_id INTEGER REFERENCES materiais(id),
  descricao TEXT NOT NULL,
  quantidade TEXT, -- texto para permitir "quantidade a levantar"
  unidade TEXT,
  custo_unitario REAL, -- null = pendente
  subtotal REAL, -- null = pendente
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS parecer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atendimento_id INTEGER UNIQUE NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
  conclusao TEXT NOT NULL, -- vantajosa | viavel_com_ressalvas | pouco_vantajosa | dados_insuficientes
  texto TEXT,
  preliminar INTEGER NOT NULL DEFAULT 1,
  preco_movel_novo REAL,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS historico_versoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  atendimento_id INTEGER NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
  entidade TEXT NOT NULL, -- atendimento | foto | achado | reaproveitamento | proposta | orcamento | parecer
  entidade_id INTEGER,
  acao TEXT NOT NULL,
  snapshot_json TEXT,
  motivo TEXT,
  criado_por INTEGER REFERENCES users(id),
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fotos_atendimento ON fotos(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_achados_atendimento ON achados(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_reaproveitamento_atendimento ON reaproveitamento(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_atendimento ON orcamento_itens(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_historico_atendimento ON historico_versoes(atendimento_id);
