output "alb_dns_name" {
  description = "Application URL"
  value       = "http://${aws_lb.app.dns_name}"
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "api_service_name" {
  description = "API ECS service"
  value       = aws_ecs_service.api.name
}

output "web_service_name" {
  description = "Web ECS service"
  value       = aws_ecs_service.web.name
}
