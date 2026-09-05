# 🔐 officyna-lambda

> Function Serverless (AWS Lambda) responsável pela validação de CPF, consulta ao banco de dados gerenciado (Amazon DocumentDB) e emissão de tokens JWT para autenticação de clientes no ecossistema **Officyna**.

Este repositório faz parte da entrega do **Tech Challenge (Fase 3)** da Pós-Graduação em **Arquitetura de Software** (FIAP), segregado em repositório próprio com pipeline de CI/CD automatizado conforme os requisitos de arquitetura e governança.

---

## 📑 Sumário

- [Visão Geral e Responsabilidades](#-visão-geral-e-responsabilidades)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Arquitetura e Diagrama de Sequência](#-arquitetura-e-diagrama-de-sequência)
- [Integração com Kong API Gateway](#-integração-com-kong-api-gateway)
- [Contrato da API](#-contrato-da-api)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Instalação e Execução Local](#-instalação-e-execução-local)
- [Testes Automatizados](#-testes-automatizados)
- [Infraestrutura como Código (Terraform)](#-infraestrutura-como-código-terraform)
- [Pipeline de CI/CD (GitHub Actions)](#-pipeline-de-cicd-github-actions)
- [Repositórios Relacionados](#-repositórios-relacionados)

---

## 🎯 Visão Geral e Responsabilidades

A função serverless atende aos seguintes requisitos da arquitetura:

1. **Validação de CPF**: Validação algorítmica completa de dígitos verificadores via **Módulo 11** (rejeitando strings inválidas, incompletas ou sequências repetidas).
2. **Consulta ao Amazon DocumentDB**: Comunicação segura via VPC com o cluster gerenciado na coleção `customers`, verificando se o cliente existe e se seu status está ativo (`active: true`).
3. **Geração de Token JWT**: Emissão de JSON Web Token assinado (HMAC-SHA256) compatível com o backend principal (`officyna-service`) e com o Kong API Gateway contendo as claims de identificação (`sub`, `roles: "CUSTOMER"`, `customerId`, `name`, `email`).

---

## 🛠️ Tecnologias Utilizadas

- **Runtime**: [Node.js 20.x](https://nodejs.org/) & [TypeScript](https://www.typescriptlang.org/)
- **Empacotador**: [esbuild](https://esbuild.github.io/) (bundle ultrarrápido para cold start mínimo)
- **Banco de Dados**: [Amazon DocumentDB](https://aws.amazon.com/documentdb/) (driver nativo `mongodb` v6 com pooling e TLS)
- **Criptografia & JWT**: `jsonwebtoken` (algoritmo HMAC-SHA256)
- **Testes**: [Jest](https://jestjs.io/) & [ts-jest](https://kulshekhar.github.io/ts-jest/) (100% de cobertura de código)
- **Infraestrutura**: [Terraform](https://developer.hashicorp.com/terraform) >= 1.5
- **Container**: [Docker](https://www.docker.com/) (imagem base `public.ecr.aws/lambda/nodejs:20`)
- **CI/CD**: GitHub Actions

---

## 📐 Arquitetura e Diagrama de Sequência

Diagrama de sequência arquitetural do fluxo completo de autenticação e consumo de rotas protegidas:

![Fluxo de Autenticação Serverless e Consumo de APIs - Officyna.png](docs/Fluxo%20de%20Autentica%C3%A7%C3%A3o%20Serverless%20e%20Consumo%20de%20APIs%20-%20Officyna.png)

---

## 🦍 Integração com Kong API Gateway

No ambiente de produção (cluster EKS), o **Kong API Gateway** atua como ponto único de entrada para todas as requisições externas. 

### Opção 1: Roteamento via Upstream / Function URL

No arquivo declarativo do Kong (`kong-declarative-config.yaml` / `Kong.yml`):

```yaml
_format_version: "3.0"

services:
  # Serviço para a aplicação principal
  - name: OfficynaGatewayService
    url: http://officyna-service:80
    routes:
      - name: general-route
        paths:
          - /officyna
        strip_path: true

  # Serviço para a Lambda de Autenticação Serverless
  - name: OfficynaAuthLambdaService
    url: https://<lambda-function-url-id>.lambda-url.us-east-1.on.aws
    routes:
      - name: auth-cpf-route
        paths:
          - /officyna/auth/cpf
        strip_path: true
```

### Opção 2: Plugin Nativo `aws-lambda` do Kong

```yaml
plugins:
  - name: aws-lambda
    route: auth-cpf-route
    config:
      aws_region: us-east-1
      function_name: officyna-auth-lambda
      invocation_type: RequestResponse
```

---

## 📋 Contrato da API

### `POST /auth/cpf` (ou `/officyna/auth/cpf` via Gateway)

#### Request Body
```json
{
  "cpf": "529.982.247-25"
}
```

> **Nota**: O campo `document` também é aceito como sinônimo de `cpf`. Formatos com pontuação (`529.982.247-25`) ou sem pontuação (`52998224725`) são normalizados automaticamente.

---

#### Respostas

##### ✅ `200 OK` — Autenticado com sucesso
```json
{
  "statusCode": 200,
  "message": "Autenticação realizada com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "Bearer",
  "expiresIn": 86400000,
  "customer": {
    "id": "67be5c48b29f9e31d451a92e",
    "name": "Carlos Eduardo da Silva",
    "document": "52998224725",
    "email": "carlos.silva@email.com"
  },
  "timestamp": "2026-08-30T15:30:00.000Z"
}
```

##### ❌ `400 Bad Request` — CPF inválido ou ausente
```json
{
  "statusCode": 400,
  "message": "CPF informado é inválido",
  "error": "INVALID_CPF",
  "timestamp": "2026-08-30T15:30:00.000Z"
}
```

##### ❌ `404 Not Found` — Cliente não cadastrado
```json
{
  "statusCode": 404,
  "message": "Cliente não encontrado para o CPF informado",
  "error": "CUSTOMER_NOT_FOUND",
  "timestamp": "2026-08-30T15:30:00.000Z"
}
```

##### ❌ `403 Forbidden` — Cliente inativo
```json
{
  "statusCode": 403,
  "message": "Cliente inativo no sistema",
  "error": "CUSTOMER_INACTIVE",
  "timestamp": "2026-08-30T15:30:00.000Z"
}
```

---

## 📂 Estrutura do Projeto

```
officyna-lambda/
├── .github/
│   └── workflows/
│       └── ci-cd.yml             # Pipeline CI/CD (Testes, Build, Terraform Plan & Apply)
├── certs/
│   └── global-bundle.pem         # Certificado CA da AWS RDS/DocumentDB
├── src/
│   ├── config/
│   │   └── environment.ts        # Leitura e validação de variáveis de ambiente
│   ├── database/
│   │   └── connection.ts         # Singleton de conexão MongoDB com pooling e TLS
│   ├── models/
│   │   └── customer.ts           # Interfaces dos dados de cliente
│   ├── services/
│   │   ├── auth.service.ts       # Regra de negócio: validação, consulta DB e emissão JWT
│   │   └── jwt.service.ts        # Geração e assinatura de JWT (HMAC-SHA256)
│   ├── utils/
│   │   ├── cpf-validator.ts      # Algoritmo de validação de CPF (Módulo 11)
│   │   └── response.ts           # Formatador padronizado de respostas HTTP/CORS
│   └── index.ts                  # Handler de entrada da AWS Lambda
├── terraform/
│   ├── providers.tf              # Provider AWS e Backend remoto S3
│   ├── variables.tf              # Variáveis de entrada (VPC, Subnets, Secrets)
│   ├── lambda.tf                 # Função Lambda, IAM Role, Security Group e Function URL
│   ├── outputs.tf                # Outputs (ARN e URL pública)
│   └── terraform.tfvars.example  # Exemplo de variáveis locais
├── tests/
│   ├── auth.service.test.ts      # Testes da regra de autenticação
│   ├── connection.test.ts        # Testes do gerenciador de conexão
│   ├── cpf-validator.test.ts     # Testes da validação de CPF
│   ├── environment.test.ts       # Testes da configuração de ambiente
│   ├── handler.test.ts           # Testes do handler Lambda e eventos HTTP
│   └── jwt.service.test.ts       # Testes de geração e assinatura do JWT
├── Dockerfile                    # Dockerfile multi-stage da Lambda
├── package.json                  # Dependências e scripts npm
├── tsconfig.json                 # Configuração do compilador TypeScript
└── jest.config.js                # Configuração da suíte de testes Jest
```

---

## 💻 Instalação e Execução Local

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 20 ou superior)
- [Docker](https://www.docker.com/) (opcional para rodar MongoDB local)

### 1. Clonar e Instalar Dependências
```bash
git clone https://github.com/Officyna/officyna-lambda.git
cd officyna-lambda
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
NODE_ENV=development
JWT_SECRET=officyna-secret-key-change-in-production-min-256bits
JWT_EXPIRATION=86400000
MONGODB_URI=mongodb://localhost:27017/officyna
DB_NAME=officyna
```

### 3. Executar o Build
```bash
npm run build
```

---

## 🧪 Testes Automatizados

A suíte de testes utiliza **Jest** cobrindo todos os fluxos de sucesso e exceções.

```bash
# Executa todos os testes unitários
npm test

# Executa testes com relatório de cobertura de código
npm run test:coverage
```

---

## ☁️ Infraestrutura como Código (Terraform)

Os recursos da AWS Lambda são gerenciados via Terraform dentro do diretório [`terraform/`](terraform/):

- **`aws_lambda_function.auth_lambda`**: Função provisionada com Node.js 20.x e 256MB de RAM dentro das subnets privadas da VPC.
- **`aws_security_group.lambda_sg`**: Permite conexão de saída na porta `27017` para o cluster DocumentDB.
- **`aws_iam_role.lambda_exec`**: Permissões gerenciadas `AWSLambdaVPCAccessExecutionRole` para execução na VPC e envio de logs ao CloudWatch.
- **`aws_lambda_function_url.auth_lambda_url`**: Endpoint HTTPS seguro para integração com o Kong Gateway.

### Aplicar Localmente
```bash
cd terraform
terraform init
terraform plan -var="jwt_secret=<secret>" -var="db_password=<senha>"
terraform apply -var="jwt_secret=<secret>" -var="db_password=<senha>"
```

---

## 🚀 Pipeline de CI/CD (GitHub Actions)

O workflow em [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) automatiza o ciclo completo de entrega contínua:

1. **Pull Requests para `main`**:
   - Execução de testes unitários com validação de cobertura (`npm run test:coverage`).
   - Build do bundle da função (`npm run build`).
   - Validação sintática e formatação do Terraform (`terraform fmt -check`, `terraform validate`).
   - Execução do `terraform plan` capturando o endpoint do DocumentDB via SSM Parameter Store (`/officyna/db/endpoint`).
2. **Push na branch `main`**:
   - `terraform apply -auto-approve` para deploy automático da função atualizada na AWS.
   - Publicação do ARN e URL da função no resumo do GitHub Actions.
3. **Disparo Manual (`workflow_dispatch`)**:
   - Permite aplicar (`apply`) ou destruir (`destroy`) a infraestrutura sob demanda.

### Secrets Necessários no Repositório

| Secret | Descrição |
|---|---|
| `AWS_ACCESS_KEY_ID` | Chave de acesso AWS com permissões de Lambda, IAM e EC2 |
| `AWS_SECRET_ACCESS_KEY` | Chave secreta AWS correspondente |
| `DB_PASSWORD` | Senha master do Amazon DocumentDB |
| `JWT_SECRET` | Chave secreta usada para assinar e validar os tokens JWT |

---

## 🔗 Repositórios Relacionados

- [officyna-service](https://github.com/Officyna/officyna-service) — Aplicação principal e API Core (Spring Boot / Kubernetes)
- [officyna-infra-db](https://github.com/Officyna/officyna-infra-db) — Infraestrutura do Banco de Dados Gerenciado (Amazon DocumentDB via Terraform)
- [officyna-infra-k8s](https://github.com/Officyna/officyna-infra-k8s) — Infraestrutura do Cluster Kubernetes (Amazon EKS via Terraform)
