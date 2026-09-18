# Gestão de Materiais — Portal de Chamados

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fxitios660-ctrl%2Fgestaodemateriais)

Portal interno para abertura e gestão de chamados (Vivo). Stack: **React** (frontend) + **FastAPI** (backend) + **MongoDB** por padrão, com backend alternativo preparado para **SQL Server 2012+**.

## Estrutura

```
/app
├── backend/
│   ├── server.py           # API FastAPI (auth, chamados, categorias, usuários, e-mail, storage)
│   ├── requirements.txt    # dependências Python
│   └── .env                # variáveis de ambiente (NÃO commitar)
└── frontend/
    ├── src/
    │   ├── App.js                    # rotas
    │   ├── context/AuthContext.js    # sessão do admin
    │   ├── lib/                      # api.js (axios) e ui.js (helpers)
    │   ├── pages/                    # Portal, TicketForm, Tracker, AdminLogin, ForgotPassword, ResetPassword, AdminDashboard
    │   └── components/               # SiteHeader, CategoryManager, UserManager, ui/ (shadcn)
    ├── package.json
    └── .env
```

## Pré-requisitos
- Python 3.11+
- Node.js **18.20.8+**; npm 10.x ou Yarn 1.x
- MongoDB rodando localmente (ou uma URI do MongoDB Atlas)

## 1) Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
# source venv/bin/activate

pip install -r requirements.txt
```

Crie o arquivo `backend/.env` (ajuste os valores):

```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="gestao_materiais"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET="troque-por-uma-chave-hex-aleatoria-de-64-caracteres"
ADMIN_EMAIL="seu-email@empresa.com"
ADMIN_PASSWORD="uma-senha-forte"
FRONTEND_URL="http://localhost:3000"
EMERGENT_EMAIL_KEY=""      # chave gerenciada da Emergent; em local os e-mails ficam apenas no log
EMAIL_FROM_NAME="Gestão de Materiais"
EMERGENT_LLM_KEY=""        # usado pelo object storage (upload de arquivos)
```

Observações importantes para rodar FORA da Emergent:
- **E-mail:** o backend aceita Emergent, Brevo, SMTP e SQL Server Database Mail opcional.
- **Upload de arquivos (Object Storage):** usa a `EMERGENT_LLM_KEY` da Emergent. Fora da plataforma o upload/download de anexos não funcionará sem substituir por um storage próprio (ex.: S3/MinIO/disco local).

Rodar o backend:

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

A API sobe em `http://localhost:8001` e todas as rotas usam o prefixo `/api`.
No primeiro start, o admin e as categorias padrão são criados automaticamente.

## 2) Frontend

```bash
cd frontend
yarn install
```

Crie `frontend/.env`:

```
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=0
```

Rodar o frontend:

```bash
yarn start
```

Abre em `http://localhost:3000`.

## Acesso ao painel admin
- Acesse diretamente `/admin/login`
- Use o `ADMIN_EMAIL` / `ADMIN_PASSWORD` definidos no ambiente
- O logo do portal sempre volta para a página inicial

## Principais funcionalidades
- Portal público de abertura de chamados (exige matrícula, e-mail e empresa)
- Formulário dinâmico por categoria + upload de anexo
- Categoria "Criação de Centros" com modelo Excel (Endereço físico, CNPJ, Inscrição Estadual)
- Número de chamado e prazo (lead time) gerados automaticamente
- Notificação por e-mail aos responsáveis (owners) da categoria
- Painel admin: dashboard, gestão de chamados (status + histórico com autor), categorias e usuários
- Perfis de acesso: `admin` (total) e `responsavel` (só vê categorias atribuídas)
- Fluxo "Esqueci a senha" e e-mail de boas-vindas com link para definir senha

## Notas técnicas
- Autenticação JWT em cookies httpOnly (access 15min / refresh 7 dias)
- Proteção contra brute force no login e throttle no "esqueci a senha"
- Cookies httpOnly + proteção de origem em operações autenticadas
- Respostas públicas de acompanhamento usam payload mínimo, sem dados internos do solicitante
- Uploads limitados a 10MB e extensões permitidas; downloads usam `nosniff`
- MongoDB: coleções `users`, `categories`, `tickets`, `counters`, `login_attempts`, `password_reset_tokens`, `password_reset_requests`



## Banco alternativo: SQL Server 2012+

O sistema continua usando **MongoDB por padrão**. A alternativa SQL foi ajustada
para **SQL Server 2012 (major 11) ou superior**, sem mudar telas, rotas ou regras
de negócio.

### Compatibilidade com o servidor corporativo

O projeto está preparado para o ambiente informado, incluindo Python 3.11,
Node 18.20.8 e Windows Server da geração 2012 R2. Nenhum script do projeto
atualiza Windows ou SQL Server. O frontend usa React Router 6.x para não exigir
Node 20.

### Drivers e conexão

O acesso SQL agora usa **pyodbc** com Microsoft ODBC Driver 17 ou 18:

```env
SQLSERVER_ODBC_DRIVER=auto
SQLSERVER_ODBC_DRIVER_PREFERENCE=17,18
```

A ordem padrão prioriza Driver 17. As consultas usam parâmetros ODBC (`?`),
`NVARCHAR`, `DATETIME2`, `SYSUTCDATETIME()` e transações compatíveis com
SQL Server 2012. Não há dependência de `ISJSON`, `JSON_VALUE` ou outros
recursos introduzidos depois de 2012.

### Script completo do banco

Execute dentro do banco reservado à aplicação:

```text
backend/sql/sqlserver2012_schema.sql
```

O script cria as tabelas equivalentes às coleções atuais:

`gm_users`, `gm_categories`, `gm_material_catalogs`, `gm_tickets`,
`gm_login_attempts`, `gm_rate_limits`, `gm_password_reset_tokens`,
`gm_password_reset_requests`, `gm_audit_logs`, `gm_email_events`,
`gm_counters` e `gm_system_settings`, além dos índices usados pelo backend.

Como o SQL Server 2012 não possui funções JSON nativas, os documentos são
armazenados em `NVARCHAR(MAX)` e validados/serializados pela camada Python.

### Criptografia das credenciais SQL

Usuário e senha em texto puro são **recusados por padrão** quando o SQL Server
é ativado. O projeto usa **AES-256-GCM** com tokens versionados `ENCv1`:

```env
SQLSERVER_REQUIRE_ENCRYPTED_CREDENTIALS=true
SQLSERVER_USER_ENCRYPTED=ENCv1:...
SQLSERVER_PASSWORD_ENCRYPTED=ENCv1:...
APP_CREDENTIAL_MASTER_KEY_FILE=E:\\CAMINHO_PROTEGIDO\\gestao-materiais.key
```

A chave mestra deve ficar fora do repositório. No Windows, o projeto inclui um
utilitário para gerar a chave e aplicar ACL NTFS à conta de serviço:

```powershell
cd backend
.\\tools\\create_credential_master_key.ps1 -ServiceAccount "DOMINIO\\ContaDoServico"
```

Depois gere os tokens com entrada oculta, sem colocar a senha na linha de comando:

```powershell
python .\\tools\\encrypt_sql_credentials.py
```

Para credenciais separadas do Database Mail, use:

```powershell
python .\\tools\\encrypt_sql_credentials.py --dbmail
```

### Preflight somente leitura

```powershell
python .\\tools\\check_server_compatibility.py
```

Esse utilitário apenas informa as versões detectadas e os Drivers ODBC
disponíveis. Ele não instala updates nem altera configurações do servidor.

### Migração MongoDB para SQL Server

A migração continua em modo de simulação por padrão:

```bash
cd backend
python migrate_mongodb_to_sqlserver.py
python migrate_mongodb_to_sqlserver.py --apply
```

O MongoDB não é apagado. A aplicação só passa a usar o SQL quando
`DB_ENGINE=sqlserver` for definido.

### Database Mail opcional

O Database Mail continua **desativado por padrão** e é independente do banco
principal. Para ativá-lo futuramente:

```env
EMAIL_PROVIDER=sqlserver_dbmail
SQLSERVER_DBMAIL_ENABLED=true
```

As credenciais desse acesso também usam tokens criptografados
`SQLSERVER_DBMAIL_USER_ENCRYPTED` e
`SQLSERVER_DBMAIL_PASSWORD_ENCRYPTED`.

O modelo compatível com SQL Server 2012 está em:

```text
backend/sql/sqlserver2012_database_mail.example.sql
```


## Deploy em produção

O projeto agora pode rodar como **um único serviço**: o React é compilado e servido pelo FastAPI no mesmo domínio.

### Docker
1. Copie as variáveis de `.env.example` para o provedor.
2. Configure obrigatoriamente `MONGO_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `FRONTEND_URL`.
3. Faça o build usando o `Dockerfile` da raiz.
4. O health check é `/api/health`.

### Render
Há um `render.yaml` pronto na raiz. Ao criar o Blueprint, informe as variáveis marcadas como `sync: false`.

### Mudanças de portabilidade
- O frontend não carrega mais scripts da Emergent.
- `REACT_APP_BACKEND_URL` virou opcional: sem ele, o frontend usa o mesmo domínio.
- O backend possui health check e valida a conexão com MongoDB no startup.
- Uploads têm fallback para disco local quando o storage da Emergent não está configurado.
- Cookies funcionam em HTTPS de produção e também em desenvolvimento local.
- As dependências Python foram reduzidas às bibliotecas realmente usadas pelo projeto.

> Em serviços com disco efêmero, configure um disco persistente em `STORAGE_DIR` ou um storage externo para preservar anexos após reinícios/deploys.

## Quality Gate

A branch de evolução inclui GitHub Actions para validar automaticamente:
- build de produção do frontend;
- compilação/import do backend;
- testes de privacidade dos serializers públicos;
- bloqueio de path traversal no storage local.

Isso reduz a chance de uma alteração visual ou de segurança chegar ao deploy quebrando o sistema.

## Catálogo de materiais e kits

Em **Admin → Categorias → Catálogo de materiais**, use **Cadastro manual** para
selecionar/criar a categoria pai e cadastrar ou editar seus sub-itens. Cada
sub-item define Unidade (contagem inteira) ou Metro (múltiplo inteiro obrigatório).
Desative o sub-item para impedir novos pedidos sem alterar chamados antigos.

**Importar Excel/CSV** aceita `.xlsx` (primeira aba) ou `.csv` com quatro colunas:

| Categoria Pai | Sub-item (Filho) | Tipo de Medida (Unidade/Metro) | Múltiplo |
| --- | --- | --- | --- |
| Drop | Drop Externo | Metro | 500 |
| Drop | Drop Interno | Metro | 100 |
| HGU | HGU Wi-Fi | Unidade | 1 |

Os botões **Modelo Excel** e **Modelo CSV** geram exemplos para preenchimento.
Limites: 5 MB, 5.000 linhas por arquivo, 5.000 sub-itens por categoria e 200
categorias (limite do portal atual). CSV aceita UTF-8 ou Windows-1252 e
separadores vírgula, ponto e vírgula ou tabulação. Fórmulas não são executadas.

A prévia valida todas as linhas antes da confirmação. Uma linha inválida bloqueia
a importação inteira. Sub-itens iguais são reconhecidos e mantidos; regras
conflitantes devem ser editadas manualmente. Os formulários, responsáveis,
prazos e anexos de categorias existentes são preservados. Uma interrupção durante
a gravação pode salvar parte das categorias; reenviar o arquivo reconhece os
itens salvos. Edições simultâneas são detectadas para evitar sobrescrever o catálogo.

Depois de cadastrar materiais, o portal mostra **Montar kit de materiais** (`/kit`).
Também é possível selecionar vários sub-itens no formulário de uma categoria.
O kit combina até 500 sub-itens em um chamado, mantém os campos das categorias
selecionadas e usa o maior prazo delas. Os controles avançam no múltiplo configurado;
um valor digitado fora do múltiplo é ajustado para cima ao sair do campo. O resumo
separa unidades de metros e exige confirmação antes do envio.

O servidor revalida IDs, disponibilidade, duplicação e quantidades, e armazena uma
cópia dos nomes e regras no chamado. O resumo aparece no painel, no relatório CSV
e na notificação administrativa. O rastreamento público continua sem expor os
itens ou dados pessoais. Responsáveis de categorias incluídas no kit podem atender
o chamado; os demais continuam sem acesso. O catálogo usa os mesmos documentos de
categorias nos adaptadores MongoDB e SQL Server, sem migração destrutiva.

Testes isolados (sem acesso a dados de produção e sem envio de e-mails):

```bash
pip install -r backend/requirements-test.txt
PYTHONPATH=backend pytest -c backend/pytest.ini backend/tests/test_security_helpers.py backend/tests/test_materials.py
CI=true npm --prefix frontend test -- --watchAll=false --runInBand
CI=true npm --prefix frontend run build
```
