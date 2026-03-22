# Infrastructure Guide

## Overview
This folder contains Terraform configuration for deploying GrindForge on AWS ECS Fargate behind a single Application Load Balancer.

Traffic routing:
- /api/* and /socket.io/* -> API ECS service
- everything else -> Web ECS service

## Prerequisites
- Terraform >= 1.6
- AWS CLI configured
- Existing MongoDB URI (MongoDB Atlas or self-managed)
- ECR images for:
  - grindforge-server
  - grindforge-client

## Quick Start
1. Copy terraform vars template:
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars

2. Update values in terraform.tfvars.

3. Deploy:
   cd terraform
   terraform init
   terraform apply

4. Get endpoint:
   terraform output alb_dns_name

## CI/CD Deployment
GitHub Actions workflow deploy-aws.yml builds and pushes images, then applies Terraform.

Required GitHub repository settings:
- Variables:
  - AWS_REGION
- Secrets:
  - AWS_ROLE_TO_ASSUME
  - MONGODB_URI
  - JWT_ACCESS_SECRET
  - JWT_REFRESH_SECRET
  - GEMINI_API_KEY

## Notes
- Set secure cookie strategy according to your domain and HTTPS setup.
- For production-grade scale, move secrets to AWS Secrets Manager or SSM Parameter Store.
