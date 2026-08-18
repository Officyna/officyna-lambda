# officyna-lambda

Function Serverless (AWS Lambda) responsável pela autenticação via CPF da
aplicação [officyna-service](https://github.com/Officyna/officyna-service).

Parte do Tech Challenge da Pós Tech (Arquitetura de Software Orientada a
Serviços) — repositório separado conforme requisito de segregação de
infraestrutura em repositórios próprios com CI/CD (issue #158).

## Status

🚧 Repositório criado como parte da governança inicial (issue #141). A
função ainda não foi implementada — runtime, estrutura de pastas, CI/CD e
deploy serão definidos e adicionados aqui.

## Responsabilidade da função

De acordo com os requisitos do Tech Challenge, esta Lambda deve:

- Validar o CPF do cliente recebido via API Gateway;
- Consultar a existência e o status do cliente na base de dados;
- Gerar e devolver um token JWT válido para consumo das APIs protegidas do
  [officyna-service](https://github.com/Officyna/officyna-service).

## Repositórios relacionados

- [officyna-service](https://github.com/Officyna/officyna-service) — aplicação principal
- [officyna-infra-k8s](https://github.com/Officyna/officyna-infra-k8s) — cluster Kubernetes (EKS)
- [officyna-infra-db](https://github.com/Officyna/officyna-infra-db) — banco de dados gerenciado (DocumentDB)

## Regras de proteção da branch `main`

- Bloqueada para commits diretos.
- Merge somente via Pull Request.
