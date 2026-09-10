# 1. Empacota o bundle gerado pelo build e o certificado CA
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/../lambda.zip"

  source {
    content  = fileexists("${path.module}/../dist/index.js") ? file("${path.module}/../dist/index.js") : "// placeholder"
    filename = "index.js"
  }

  source {
    content  = fileexists("${path.module}/../certs/global-bundle.pem") ? file("${path.module}/../certs/global-bundle.pem") : ""
    filename = "certs/global-bundle.pem"
  }
}

# 1. Busca a VPC pelo projeto
data "aws_vpc" "selected" {
  filter {
    name   = "tag:Project"
    values = ["Officyna"]
  }
}


# 2. Busca todas as subnets privadas associadas a essa VPC que tenham a tag Type = private
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected.id]
  }

  tags = {
    Type = "private"
  }
}

# 2. IAM Role para execução da Lambda
resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# 3. Políticas de permissão para CloudWatch Logs e VPC Execution
resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# 4. Security Group da Lambda (permite saída para o DocumentDB na porta 27017 e HTTPS na 443)
resource "aws_security_group" "lambda_sg" {
  name        = "${var.project_name}-sg"
  description = "Security group para a Lambda de autenticacao com acesso ao DocumentDB"
  vpc_id      = data.aws_vpc.selected.id

  egress {
    description = "Acesso ao DocumentDB"
    from_port   = 27017
    to_port     = 27017
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    description = "HTTPS para servicos AWS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Resolução de DNS"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-sg"
  }
}

# 5. Criação da Função AWS Lambda
resource "aws_lambda_function" "auth_lambda" {
  function_name = var.project_name
  role          = aws_iam_role.lambda_exec.arn

  runtime = "nodejs20.x"

  # Handler do New Relic
  handler = "newrelic-lambda-wrapper.handler"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  memory_size = 256
  timeout     = 15

  # New Relic Lambda Layer
  #
  # Coloque aqui o ARN da Layer Node.js 20
  # correspondente a us-east-1 e à arquitetura da Lambda.
  layers = [
    var.new_relic_layer_arn
  ]

  vpc_config {
    subnet_ids         = data.aws_subnets.private.ids # <--- Lista automática de IDs
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      # ==========================================
      # Aplicacao
      # ==========================================
      NODE_ENV       = "production"
      JWT_SECRET     = var.jwt_secret
      JWT_EXPIRATION = var.jwt_expiration

      # ==========================================
      # DocumentDB
      # ==========================================
      DOCDB_ENDPOINT    = var.docdb_endpoint
      DB_USERNAME       = var.db_username
      DB_PASSWORD       = var.db_password
      DB_NAME           = var.db_name
      DOCDB_TLS         = "true"
      DOCDB_TLS_CA_FILE = "certs/global-bundle.pem"

      MONGODB_URI = var.docdb_endpoint != "" ? "mongodb://${var.db_username}:${urlencode(var.db_password)}@${var.docdb_endpoint}:27017/${var.db_name}?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false&authMechanism=SCRAM-SHA-1" : ""

      # ==========================================
      # New Relic
      # ==========================================

      NEW_RELIC_LAMBDA_HANDLER              = "index.handler"
      NEW_RELIC_LICENSE_KEY                 = var.new_relic_license_key
      NEW_RELIC_ACCOUNT_ID                  = var.new_relic_account_id
      NEW_RELIC_APM_LAMBDA_MODE             = "true"
      NEW_RELIC_DISTRIBUTED_TRACING_ENABLED = "true"
      NEW_RELIC_TRUSTED_ACCOUNT_KEY         = var.new_relic_account_id
      NEW_RELIC_EXEC_WRAPPER                = "/opt/othervendor/newrelic-lambda-wrapper"
    }
  }

  tags = {
    "NR.Apm.Lambda.Mode" = "true"
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_vpc_access
  ]
}


# 6. Function URL pública (para invocação direta / integração com Kong Gateway)
resource "aws_lambda_function_url" "auth_lambda_url" {
  function_name      = aws_lambda_function.auth_lambda.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = true
    allow_origins     = ["*"]
    allow_methods     = ["*"]
    allow_headers     = ["*"]
    max_age           = 86400
  }
}

# 7. Permissão pública para o endpoint da Function URL
resource "aws_lambda_permission" "auth_lambda_invoke_public" {
  statement_id           = "AllowPublicInvokeViaUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.auth_lambda.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}


