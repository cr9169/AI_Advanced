# Infra (CDK)

Low-cost S3 bucket for knowledge files. **Do not deploy until you mean to create AWS resources.**

Profile: `ai-advanced`. Region: `us-east-1`.

```powershell
cd infra
npm install
npx cdk synth
```

From the repo root:

```powershell
npm run cdk:synth
```

Deploy (creates a versioned private bucket `knowledge-{account}-us-east-1`):

```powershell
cd infra
npx cdk bootstrap aws://ACCOUNT/us-east-1 --profile ai-advanced
npx cdk deploy --profile ai-advanced
```

No RDS, Lambda, or OpenSearch in this stack.
