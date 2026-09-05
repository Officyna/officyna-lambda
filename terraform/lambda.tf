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
  vpc_id      = var.vpc_id

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

  tags = {
    Name = "${var.project_name}-sg"
  }
}

# 5. Criação da Função AWS Lambda
resource "aws_lambda_function" "auth_lambda" {
  function_name    = var.project_name
  role             = aws_iam_role.lambda_exec.arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  memory_size      = 256
  timeout          = 15

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      NODE_ENV           = "production"
      JWT_SECRET         = var.jwt_secret
      JWT_EXPIRATION     = var.jwt_expiration
      DOCDB_ENDPOINT     = var.docdb_endpoint
      DB_USERNAME        = var.db_username
      DB_PASSWORD        = var.db_password
      DB_NAME            = var.db_name
      DOCDB_TLS          = "true"
      DOCDB_TLS_CA_FILE  = "certs/global-bundle.pem"
      MONGODB_URI        = var.docdb_endpoint != "" ? "mongodb://${var.db_username}:${urlencode(var.db_password)}@${var.docdb_endpoint}:27017/${var.db_name}?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false" : ""
    }
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

# 7. Permissão pública para invocação da Function URL
resource "aws_lambda_permission" "auth_lambda_url_public" {
  statement_id           = "FunctionURLAllowPublicAccess"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.auth_lambda.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

