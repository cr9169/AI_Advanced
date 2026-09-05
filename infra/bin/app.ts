import * as cdk from "aws-cdk-lib";
import { KnowledgeBucketStack } from "../lib/knowledge-bucket-stack.js";

const app = new cdk.App();

new KnowledgeBucketStack(app, "AiAdvancedKnowledge", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.AWS_REGION ?? process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});
