# FinPilot

### AI-Native Personal Financial Intelligence Platform

FinPilot is a full-stack financial intelligence platform designed to transform raw financial activity into meaningful insights, financial health signals, budgeting intelligence, and AI-assisted financial understanding.

Instead of treating personal finance as a collection of transactions and charts, FinPilot combines deterministic financial logic with machine learning, retrieval, and LLM-powered intelligence.

---

## ✨ What is FinPilot?

Managing money generates a large amount of financial data but often provides very little understanding.

FinPilot is built around a simple idea:

> **Don't just show users what happened with their money — help them understand why it happened and what they can learn from it.**

FinPilot brings together:

* 💳 Accounts and transactions
* 📊 Financial dashboards
* 🏷️ Intelligent transaction categorization
* 📥 Statement importing
* 🎯 Budget management
* 🧠 Financial insights
* ❤️ Financial health scoring
* 🔎 Retrieval-Augmented Generation (RAG)
* 🤖 AI-powered financial narratives
* 📈 Financial trends and analysis

---

## 🧠 Product Architecture

```text
                         ┌──────────────────────┐
                         │      FinPilot        │
                         │   Financial Layer    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Financial Data     │
                         │ Accounts / Txns      │
                         │ Budgets / Categories │
                         └──────────┬───────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │     Financial Intelligence  │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
        Categorization        Health Score          Insights
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   ▼
                         ┌──────────────────────┐
                         │   AI Intelligence   │
                         │      RAG + LLM      │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   User Understanding │
                         │  Explain / Discover  │
                         │   Analyze / Plan     │
                         └──────────────────────┘
```

---

## 🏗️ Architecture

FinPilot follows a modular full-stack architecture.

```text
FinPilot
│
├── finpilot-backend
│   ├── dashboard
│   ├── finance
│   ├── identity
│   ├── intelligence
│   ├── planning
│   └── platform
│
└── finpilot-frontend
    ├── components
    ├── features
    ├── lib
    └── store
```

### Backend Flow

```text
HTTP Request
     │
     ▼
Controller
     │
     ▼
Service
     │
     ├──────────────► Repository
     │                    │
     │                    ▼
     │               PostgreSQL
     │
     └──────────────► Intelligence / ML
```

---

## ⚙️ Technology Stack

### Frontend

| Technology     | Purpose                     |
| -------------- | --------------------------- |
| React          | UI                          |
| TypeScript     | Type safety                 |
| Vite           | Development/build tooling   |
| React Router   | Application routing         |
| TanStack Query | Server-state management     |
| Zustand        | Client authentication state |
| Recharts       | Financial visualization     |
| Tailwind CSS   | Styling                     |

### Backend

| Technology      | Purpose                     |
| --------------- | --------------------------- |
| Java 21         | Backend language            |
| Spring Boot     | Application framework       |
| Spring Security | Authentication/security     |
| JWT             | Token-based authentication  |
| Spring Data JPA | Persistence                 |
| PostgreSQL      | Relational database         |
| Flyway          | Database migrations         |
| OpenCSV         | Statement importing         |
| Maven           | Dependency/build management |

### AI / Intelligence

| Technology            | Purpose                     |
| --------------------- | --------------------------- |
| OpenAI                | LLM-powered intelligence    |
| Embeddings            | Semantic representation     |
| RAG                   | Financial-context retrieval |
| Naive Bayes           | Transaction categorization  |
| Vector/math utilities | ML support                  |

---

## 🚀 Core Features

### 🔐 Authentication

* User registration
* Login
* JWT authentication
* Refresh tokens
* Protected application routes
* User management

### 💳 Financial Accounts

Manage financial accounts and associate transactions with their corresponding account context.

### 💰 Transactions

FinPilot provides transaction management with:

* Income
* Expenses
* Categories
* Transaction history
* Transaction updates
* Transaction deletion
* Financial summaries

### 🧠 Intelligent Categorization

FinPilot includes a machine-learning based transaction categorization layer.

```text
Transaction
     │
     ▼
Text Representation
     │
     ▼
Naive Bayes Classifier
     │
     ▼
Predicted Category
```

### 📥 Statement Import

Financial statements can be imported and processed through the backend statement-import pipeline.

```text
Statement
    │
    ▼
CSV Processing
    │
    ▼
Validation
    │
    ▼
Transaction Processing
    │
    ▼
Financial Data
```

### 🎯 Budgets

Users can create and manage budgets and compare financial activity against planned spending.

### 📊 Dashboard

The dashboard brings together financial information including:

* Total balance
* Income
* Expenses
* Savings
* Monthly trends
* Budget information
* Spending categories
* Recent transactions

---

## 🧠 Financial Intelligence

FinPilot goes beyond basic CRUD financial management.

The intelligence layer contains:

```text
intelligence/
│
├── client/
│   ├── EmbeddingClient
│   └── OpenAiClient
│
├── controller/
├── dto/
│
└── service/
    ├── FinanceRagService
    ├── HealthScoreService
    ├── InsightService
    └── NarrativeService
```

This creates a separation between:

```text
Financial Computation
        ↓
Financial Intelligence
        ↓
AI Interaction
```

---

## 🔎 Retrieval-Augmented Generation

FinPilot contains a financial RAG service designed to provide financial context to AI interactions.

```text
User Question
      │
      ▼
Financial Context
      │
      ▼
Relevant Data Retrieval
      │
      ▼
Context Construction
      │
      ▼
LLM
      │
      ▼
Grounded Response
```

---

## ❤️ Financial Health

FinPilot includes a dedicated financial health scoring service.

```text
Income
  +
Expenses
  +
Savings
  +
Budget Behaviour
  +
Financial Patterns
        │
        ▼
Financial Health
```

---

## 💡 Insights & Narratives

FinPilot contains dedicated services for:

* Financial insights
* Financial narratives
* Health signals
* Contextual analysis

These services form the foundation for an AI-native financial experience.

---

## 🗄️ Database

FinPilot uses PostgreSQL with Flyway migrations.

Current migration structure:

```text
V1__create_users_table.sql
V2__create_refresh_tokens_table.sql
V3__create_accounts_table.sql
V4__create_categories_table.sql
V5__create_transactions_table.sql
V6__create_budgets_table.sql
V7__add_transaction_updated_at.sql
```

Database structure is controlled through Flyway migrations.

---

## 📁 Project Structure

```text
FinPilot/
│
├── finpilot-backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com/finpilot/finpilotbackend/
│   │   │   │       ├── dashboard/
│   │   │   │       ├── finance/
│   │   │   │       ├── identity/
│   │   │   │       ├── intelligence/
│   │   │   │       ├── planning/
│   │   │   │       └── platform/
│   │   │   └── resources/
│   │   │       ├── application.properties
│   │   │       └── db/migration/
│   │   └── test/
│   └── pom.xml
│
├── finpilot-frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── accounts/
│   │   │   ├── auth/
│   │   │   ├── budgets/
│   │   │   ├── dashboard/
│   │   │   ├── insights/
│   │   │   ├── marketing/
│   │   │   └── transactions/
│   │   ├── lib/
│   │   ├── store/
│   │   └── App.tsx
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🔐 Environment Configuration

Create the required environment variables locally:

```env
DB_USERNAME=
DB_PASSWORD=

APP_JWT_SECRET=

OPENAI_API_KEY=

APP_CORS_ALLOWED_ORIGINS=
```

Never commit real credentials, API keys, JWT secrets, or database passwords.

---

## 🛠️ Local Development

### Clone

```bash
git clone https://github.com/khaddeshivam/FinPilot.git
cd FinPilot
```

### Backend

```bash
cd finpilot-backend
```

#### Windows

```powershell
.\mvnw.cmd spring-boot:run
```

#### macOS / Linux

```bash
./mvnw spring-boot:run
```

Backend:

```text
http://localhost:8080
```

### Frontend

Open another terminal:

```bash
cd finpilot-frontend
npm install
npm run dev
```

---

## 🧪 Testing

The backend contains automated tests covering:

* ML classification
* Vector mathematics
* Category prediction
* Statement importing
* Transactions
* Financial RAG
* Financial health
* Insights
* Budgets

### Windows

```powershell
.\mvnw.cmd test
```

### macOS / Linux

```bash
./mvnw test
```

---

## 🔒 Security

FinPilot uses:

* Spring Security
* JWT authentication
* Refresh tokens
* Protected API endpoints
* Environment-based secrets
* Database validation
* Global exception handling

Sensitive configuration is intentionally externalized from source code.

---

## 🗺️ Roadmap

### Current Foundation

* [x] Authentication
* [x] JWT security
* [x] Accounts
* [x] Transactions
* [x] Categories
* [x] Statement import
* [x] Budgets
* [x] Dashboard
* [x] ML categorization
* [x] Financial insights
* [x] Financial health
* [x] RAG foundation
* [x] AI integration
---

## 🎯 Engineering Principles

### Deterministic Financial Logic

Financial calculations should be performed by application logic rather than delegated blindly to an LLM.

### Grounded AI

AI responses should be based on relevant financial context.

### Modular Architecture

Domain responsibilities should remain separated as the application grows.

### Security First

Authentication, authorization, secrets, and financial data access are treated as first-class concerns.

### Explainability

Financial intelligence should help users understand the reasoning behind an insight rather than simply presenting an unexplained result.

---

## 📌 Project Status

FinPilot is an actively developed full-stack project exploring the intersection of:

```text
Financial Software
        +
Backend Engineering
        +
Machine Learning
        +
Retrieval-Augmented Generation
        +
Generative AI
        +
Modern Web Applications
```

---

## 👨‍💻 Author

**Shivam Khadde**

Computer Engineering
Full-Stack Development • Java Backend • AI/GenAI

[GitHub](https://github.com/khaddeshivam)

---

## ⭐ FinPilot

> **From financial data to financial understanding.**
