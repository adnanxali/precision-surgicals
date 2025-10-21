# Fix IAM Permissions for LambdaDeploy Pipeline

## Current Issue
Your `devops-admin` user lacks the necessary permissions to:
- View CodePipeline executions
- Read CloudWatch Logs
- Access Lambda functions
- Manage IAM policies

## Required AWS Managed Policies

Ask your AWS administrator to attach these policies to your `devops-admin` user:

### 1. CodePipeline Access
```bash
aws iam attach-user-policy \
  --user-name devops-admin \
  --policy-arn arn:aws:iam::aws:policy/AWSCodePipelineFullAccess
```

### 2. CloudWatch Logs Access
```bash
aws iam attach-user-policy \
  --user-name devops-admin \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsReadOnlyAccess
```

### 3. Lambda Access
```bash
aws iam attach-user-policy \
  --user-name devops-admin \
  --policy-arn arn:aws:iam::aws:policy/AWSLambdaReadOnlyAccess
```

### 4. CodeBuild Access
```bash
aws iam attach-user-policy \
  --user-name devops-admin \
  --policy-arn arn:aws:iam::aws:policy/AWSCodeBuildReadOnlyAccess
```

### 5. CloudFormation Access (for stack deployment)
```bash
aws iam attach-user-policy \
  --user-name devops-admin \
  --policy-arn arn:aws:iam::aws:policy/AWSCloudFormationFullAccess
```

### 6. IAM Read Access (to check policies)
```bash
aws iam attach-user-policy \
  --user-name devops-admin \
  --policy-arn arn:aws:iam::aws:policy/IAMReadOnlyAccess
```

## Alternative: Custom Policy

If you prefer a more restrictive approach, create this custom policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "codepipeline:ListPipelineExecutions",
                "codepipeline:GetPipelineState",
                "codepipeline:GetPipeline",
                "codebuild:BatchGetBuilds",
                "codebuild:ListBuilds",
                "logs:DescribeLogStreams",
                "logs:DescribeLogGroups",
                "logs:GetLogEvents",
                "lambda:ListFunctions",
                "lambda:GetFunction",
                "lambda:GetFunctionConfiguration",
                "cloudformation:DescribeStacks",
                "cloudformation:DescribeStackResources",
                "iam:ListAttachedUserPolicies",
                "iam:ListUserPolicies"
            ],
            "Resource": "*"
        }
    ]
}
```

## Quick Test Commands

After permissions are fixed, test with:

```bash
# Test pipeline access
aws codepipeline list-pipelines

# Test logs access
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda"

# Test Lambda access
aws lambda list-functions

# Run the logs viewer again
node scripts/view-logs.js all
```

## Next Steps

1. Contact your AWS administrator to add these permissions
2. Wait a few minutes for permissions to propagate
3. Test the commands above
4. Continue with the pipeline setup once permissions are working