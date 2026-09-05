# Bedrock models

Chat uses Claude Haiku 4.5 on Amazon Bedrock Converse (`anthropic.claude-haiku-4-5-20251001-v1:0`) because it is cheaper than Sonnet for learning. Embeddings use Titan Text Embeddings V2. Region is `us-east-1`. Credentials come from the AWS CLI profile `ai-advanced` (IAM user BarUser), not from committed secrets.

New AWS accounts may block `InvokeModel` until account verification finishes (often under two hours). If you see "Your account is currently being verified", wait; do not buy provisioned throughput.

Anthropic requires a one-time use-case form in the Bedrock console before Claude works. Titan does not need that form.
