variable "aws_region" {
  description = "Região da AWS"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Nome do recurso da função Lambda"
  type        = string
  default     = "officyna-auth-lambda"
}

variable "vpc_id" {
  description = "ID da VPC existente onde o DocumentDB está provisionado"
  type        = string
  default     = "vpc-01198adba51551838"
}

variable "subnet_ids" {
  description = "Lista de subnets privadas para execução da Lambda na VPC"
  type        = list(string)
  default     = ["subnet-094a4756371abb5f2", "subnet-0a04000aa0846c777"]
}

variable "jwt_secret" {
  description = "Secret chave para assinatura do token JWT"
  type        = string
  sensitive   = true
}

variable "jwt_expiration" {
  description = "Tempo de expiração do token JWT em milissegundos (padrão 30min = 1800000ms)"
  type        = string
  default     = "1800000"
}

variable "db_username" {
  description = "Usuário do Amazon DocumentDB"
  type        = string
  default     = "officynasoatdbuser"
}

variable "db_password" {
  description = "Senha do Amazon DocumentDB"
  type        = string
  sensitive   = true
}

variable "docdb_endpoint" {
  description = "Endpoint do cluster Amazon DocumentDB"
  type        = string
  default     = ""
}

variable "db_name" {
  description = "Nome da base de dados no DocumentDB"
  type        = string
  default     = "officyna"
}
