# AWS deployment notes

Target shape for the milestone 4 demo.

| Component | Service |
|-----------|---------|
| Backend container | ECS Fargate (or App Runner for a simpler demo) |
| Frontend | Amplify Hosting, or the same ECS service behind the ALB |
| PostgreSQL | RDS for PostgreSQL |
| MongoDB | DocumentDB, or MongoDB Atlas |
| Model artifacts | S3 bucket, versioned, private |
| Secrets | AWS Secrets Manager |
| Images | ECR |
| Logs | CloudWatch Logs |

## Steps

1. `aws ecr create-repository --repository-name healthforecast-backend`
2. Build and push both images.
3. Create the RDS instance in a private subnet. No public access.
4. Store `SECRET_KEY`, `DATABASE_URL` and `MONGO_URI` in Secrets Manager and
   reference them from the task definition - never as plaintext environment
   variables in the task JSON.
5. Put an Application Load Balancer in front, health check `GET /health`.
6. Record the live URL and a screenshot in `docs/06-milestones/milestone-4.md`.

## Rules

- The S3 model bucket blocks all public access.
- Enable encryption at rest on RDS, DocumentDB and S3.
- Never commit an AWS access key. Use IAM roles.
