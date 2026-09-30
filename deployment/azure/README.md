# Azure deployment notes

Target shape for the milestone 4 demo.

| Component | Service |
|-----------|---------|
| Backend container | Azure Container Apps (or App Service for Containers) |
| Frontend | Azure Static Web Apps, or a second Container App |
| PostgreSQL | Azure Database for PostgreSQL - Flexible Server |
| MongoDB | Azure Cosmos DB for MongoDB |
| Model artifacts | Azure Blob Storage, private container |
| Secrets | Azure Key Vault |
| Images | Azure Container Registry |
| Logs | Azure Monitor / Log Analytics |

## Steps

1. `az acr create --name healthforecastacr --sku Basic --resource-group <rg>`
2. `az acr build --registry healthforecastacr --image backend:latest ./backend`
3. Create the Flexible Server with public access disabled.
4. Store `SECRET_KEY`, `DATABASE_URL` and `MONGO_URI` in Key Vault and reference
   them from the Container App as secret references.
5. Configure the ingress health probe against `GET /health`.
6. Record the live URL and a screenshot in `docs/06-milestones/milestone-4.md`.

## Rules

- Managed identity for registry and Key Vault access - no stored credentials.
- Enable TLS-only ingress.
- Never commit a service principal secret or a connection string.
