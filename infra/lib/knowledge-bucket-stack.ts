import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

export class KnowledgeBucketStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "KnowledgeBucket", {
      bucketName: `knowledge-${this.account}-${this.region}`,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userName = String(this.node.tryGetContext("cliUser") ?? "BarUser");
    const policy = new iam.ManagedPolicy(this, "KnowledgeBucketCliAccess", {
      description: "List/read/write objects in the knowledge bucket from the CLI profile.",
      statements: [
        new iam.PolicyStatement({
          actions: ["s3:ListBucket"],
          resources: [bucket.bucketArn],
        }),
        new iam.PolicyStatement({
          actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
          resources: [`${bucket.bucketArn}/*`],
        }),
      ],
    });

    // Imported IAM users cannot use addManagedPolicy(); attach via the policy resource.
    (policy.node.defaultChild as iam.CfnManagedPolicy).users = [userName];

    new cdk.CfnOutput(this, "BucketName", {
      value: bucket.bucketName,
    });
    new cdk.CfnOutput(this, "CliAccessPolicyArn", {
      value: policy.managedPolicyArn,
    });
  }
}
