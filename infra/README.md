# Infra (CDK)

Private S3 bucket for knowledge originals, plus an IAM managed policy attached to IAM user `BarUser` (`s3:ListBucket`, `GetObject`, `PutObject`, `DeleteObject`).

**No RDS, Lambda, or OpenSearch.** Query/ingest run on your PC against Docker pgvector.

From the repo root (`npm install` already covers this workspace):

```powershell
npm run cdk:synth
```

Deploy (creates `knowledge-{account}-us-east-1`):

```powershell
npx cdk bootstrap aws://ACCOUNT/us-east-1 --profile ai-advanced
npx cdk deploy --profile ai-advanced
```

Do not deploy unless you intend to create that bucket.
