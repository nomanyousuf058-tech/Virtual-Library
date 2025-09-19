#!/bin/bash
echo "Deploying Virtual Library Platform to Production..."

# Build and push Docker images
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml push

# Kubernetes deployment
kubectl apply -f infra/kubernetes/production/

# Database migration
kubectl exec -it deployment/backend -- npm run typeorm migration:run

echo "Deployment completed successfully!"