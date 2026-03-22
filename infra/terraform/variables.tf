variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Project name prefix"
  default     = "grindforge"
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "prod"
}

variable "api_image" {
  type        = string
  description = "Full ECR image URI for API service"
}

variable "web_image" {
  type        = string
  description = "Full ECR image URI for web service"
}

variable "mongodb_uri" {
  type        = string
  description = "MongoDB connection URI"
  sensitive   = true
}

variable "jwt_access_secret" {
  type        = string
  description = "JWT access secret"
  sensitive   = true
}

variable "jwt_refresh_secret" {
  type        = string
  description = "JWT refresh secret"
  sensitive   = true
}

variable "gemini_api_key" {
  type        = string
  description = "Gemini API key"
  default     = ""
  sensitive   = true
}

variable "desired_count" {
  type        = number
  description = "Desired ECS tasks for each service"
  default     = 1
}
