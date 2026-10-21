# Castros Interiores — Avaliação de Estofados

Aplicativo interno para avaliação de estofados: cadastro do atendimento, fotos
organizadas por área, análise de defeitos (com apoio de IA), revisão técnica,
reaproveitamento de materiais, propostas de reforma, orçamento e geração de
relatórios em PDF (interno e para o cliente).

## Como rodar

Requer Node.js 18+ (testado com Node 22).

```bash
npm install
cp .env.example .env    # edite o .env com seus valores
npm run seed             # cria o usuário responsável inicial
npm start                # inicia o servidor em http://localhost:3000
```

Acesse `http://localhost:3000` no navegador do computador ou do celular (na
mesma rede). A interface é responsiva e funciona nos dois.

### Primeiro acesso

O comando `npm run seed` cria um usuário inicial usando `ADMIN_USERNAME` e
`ADMIN_PASSWORD` do `.env` (ou `admin` / `castros123` se não forem definidos).
**Troque a senha** definindo `ADMIN_PASSWORD` no `.env` antes de rodar o seed
em produção — o seed só cria o usuário se ainda não existir nenhum.

## Variáveis de ambiente (`.env`)

| Variável | Para que serve |
|---|---|
| `PORT` | Porta do servidor (padrão 3000) |
| `SESSION_SECRET` | Segredo para assinar a sessão de login — use um valor longo e aleatório |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Usuário inicial criado pelo `npm run seed` |
| `ANTHROPIC_API_KEY` | Chave da API da Anthropic (Claude), necessária para a análise automática de fotos |
| `ANTHROPIC_MODEL` | Modelo Claude usado na análise (padrão `claude-sonnet-5`) |

**Sem `ANTHROPIC_API_KEY` configurada**, o botão "Analisar fotos" mostra a
mensagem "IA não configurada" — o sistema nunca inventa um resultado de
análise. Para ativar a análise automática, defina `ANTHROPIC_API_KEY` no
`.env` e reinicie o servidor.

## Fluxo de uso

1. **Novo atendimento** — cadastra cliente, móvel e informações relatadas (pode
   salvar incompleto e continuar depois).
2. **Fotos** — envia fotos por categoria (frente, costas, laterais, assento,
   encosto, braços, pés/base, parte inferior, detalhes de defeitos, estrutura
   interna).
3. **Analisar fotos** — roda a análise automática por IA (sugestão preliminar,
   nunca uma aprovação).
4. **Análise e revisão** — o responsável confirma, edita ou descarta cada
   achado, e só então marca a análise como revisada.
5. **Reaproveitamento** — avalia cada componente do móvel (madeira, pés,
   ferragens, mecanismos, molas, percintas, espumas, enchimentos, tecido,
   zíperes, acabamentos).
6. **Propostas** — monta até três propostas (essencial, recomendada, completa).
7. **Custos** — lança itens de orçamento (materiais cadastrados em "Materiais e
   serviços" ou itens livres), define o preço de venda.
8. **Viabilidade** — registra o parecer final (vantajosa / viável com
   ressalvas / pouco vantajosa / dados insuficientes).
9. **Relatório** — gera os PDFs interno e do cliente, e conclui o atendimento
   (exige revisão prévia).

O histórico de alterações de cada atendimento fica disponível na aba
"Histórico".

## O que foi verificado

- Cadastro, edição e persistência de atendimentos incompletos.
- Upload de múltiplas fotos por categoria, com persistência em disco e
  isolamento total entre atendimentos diferentes.
- Fotos e dados exigem login (sessão autenticada) — acesso direto sem sessão é
  redirecionado para o login.
- Fluxo de análise sem `ANTHROPIC_API_KEY`: mostra erro claro, não fabrica
  resultado.
- Registro manual de achados, confirmação/edição/descarte, revisão do
  responsável e bloqueio de conclusão sem revisão.
- Reaproveitamento, propostas, itens de orçamento (com valores pendentes
  tratados como "pendente", nunca como zero) e parecer de viabilidade.
- Geração dos dois PDFs (interno e cliente), com numeração de página e aviso
  de avaliação preliminar quando ainda não revisada.
- Reinício do servidor preserva todos os dados (SQLite em arquivo).

## O que falta configurar

- **`ANTHROPIC_API_KEY`**: sem ela, a análise automática por IA não funciona —
  é a única integração externa do sistema e precisa dessa chave para ficar
  ativa.
- **Senha do usuário responsável**: troque `ADMIN_PASSWORD` no `.env` antes de
  usar em produção (ou crie outros usuários diretamente no banco, se
  necessário).
- **Logotipo, CNPJ, endereço e assinatura**: não foram incluídos nos PDFs
  (nenhum dado foi inventado); se desejar, podem ser adicionados depois.
- **Hospedagem**: este guia cobre uso local/rede interna. Para acesso externo
  seguro, é preciso configurar HTTPS e um domínio/servidor próprio.

## Arquitetura

- Node.js + Express, páginas renderizadas no servidor (EJS) + CSS responsivo.
- Banco de dados SQLite (`better-sqlite3`), arquivo em `data/castros.db`.
- Fotos armazenadas em `data/uploads/<atendimento>/`, servidas apenas para
  usuários autenticados.
- Sessão de login via `express-session` (cookie assinado por `SESSION_SECRET`).
- PDFs gerados com `pdfkit`.
- Integração de IA com a API da Anthropic (Claude), chamada apenas pelo
  servidor — a chave nunca é exposta ao navegador.
