terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  backend "s3" {
    bucket = "officyna-terraform-state-995093551820-us-east-1-an"
    key    = "lambda/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "Officyna"
      Environment = "Production"
      ManagedBy   = "Terraform"
      Module      = "officyna-lambda"
    }
  }
}
