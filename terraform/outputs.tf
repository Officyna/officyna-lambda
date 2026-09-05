output "lambda_arn" {
  description = "ARN da funcao Lambda provisionada"
  value       = aws_lambda_function.auth_lambda.arn
}

output "lambda_function_name" {
  description = "Nome da funcao Lambda"
  value       = aws_lambda_function.auth_lambda.function_name
}

output "lambda_function_url" {
  description = "URL publica da funcao Lambda para consumo via Kong Gateway ou HTTP"
  value       = aws_lambda_function_url.auth_lambda_url.function_url
}
