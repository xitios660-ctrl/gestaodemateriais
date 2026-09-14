# Gestão de Materiais — Portal de Chamados

Portal interno para abertura e gestão de chamados (Vivo). Stack: **React** (frontend) + **FastAPI** (backend) + **MongoDB**.

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
- Node.js 18+ e **Yarn** (não use npm)
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
CORS_ORIGINS="*"
JWT_SECRET="troque-por-uma-chave-hex-aleatoria-de-64-caracteres"
ADMIN_EMAIL="seu-email@empresa.com"
ADMIN_PASSWORD="uma-senha-forte"
FRONTEND_URL="http://localhost:3000"
EMERGENT_EMAIL_KEY=""      # chave gerenciada da Emergent; em local os e-mails ficam apenas no log
EMAIL_FROM_NAME="Gestão de Materiais"
EMERGENT_LLM_KEY=""        # usado pelo object storage (upload de arquivos)
```

Observações importantes para rodar FORA da Emergent:
- **E-mail (Resend gerenciado):** a `EMERGENT_EMAIL_KEY` é provisionada dentro da plataforma Emergent. Fora dela o envio real não funciona; o código apenas registra o link no log (útil para testes). Para enviar de verdade fora da Emergent, troque a função de envio por uma conta própria de e-mail (ex.: Resend/SMTP).
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
- Clique no **logo** (topo) ou acesse `/admin/login`
- Use o `ADMIN_EMAIL` / `ADMIN_PASSWORD` definidos no `.env`

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
- MongoDB: coleções `users`, `categories`, `tickets`, `counters`, `login_attempts`, `password_reset_tokens`, `password_reset_requests`
