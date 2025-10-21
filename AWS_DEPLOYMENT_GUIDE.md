# AWS Deployment Guide - LambdaDeploy Pipeline

This guide provides step-by-step instructions for deploying and hosting the LambdaDeploy Pipeline on AWS.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub/GitLab │───▶│  AWS CodePipeline │───▶│  AWS CodeBuild  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                         │
                                ▼                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Slack Notify  │◀───│   AWS Lambda     │◀───│   Amazon S3     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Target Service  │
                       │ (Lambda/Fargate) │
                       └──────────────────┘
```

## 🚀 Step-by-Step Deployment

### Phase 1: AWS Account Setup

1. **Create AWS Account**
   - Sign up at https://aws.amazon.com
   - Complete billing setup
   - Enable programmatic access

2. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your Access Key ID
   # Enter your Secret Access Key
   # Default region: us-east-1
   # Default output format: json
   ```

3. **Verify AWS CLI Setup**
   ```bash
   aws sts get-caller-identity
   ```

### Phase 2: IAM Permissions Setup

1. **Create IAM Role for CodePipeline**
   ```bash
   aws iam create-role --role-name CodePipelineServiceRole --assume-role-policy-document file://infrastructure/iam/codepipeline-trust-policy.json
   aws iam attach-role-policy --role-name CodePipelineServiceRole --policy-arn arn:aws:iam::aws:policy/AWSCodePipelineFullAccess
   ```

2. **Create IAM Role for CodeBuild**
   ```bash
   aws iam create-role --role-name CodeBuildServiceRole --assume-role-policy-document file://infrastructure/iam/codebuild-trust-policy.json
   aws iam attach-role-policy --role-name CodeBuildServiceRole --policy-arn arn:aws:iam::aws:policy/AWSCodeBuildDeveloperAccess
   ```

3. **Create IAM Role for Lambda**
   ```bash
   aws iam create-role --role-name LambdaExecutionRole --assume-role-policy-document file://infrastructure/iam/lambda-trust-policy.json
   aws iam attach-role-policy --role-name LambdaExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
   ```

### Phase 3: Infrastructure Deployment

1. **Deploy Core Infrastructure**
   ```bash
   # Deploy S3 buckets for artifacts
   aws cloudformation deploy \
     --template-file infrastructure/s3-buckets.yml \
     --stack-name lambdadeploy-s3 \
     --parameter-overrides BucketPrefix=lambdadeploy-$(date +%s)

   # Deploy Lambda functions
   aws cloudformation deploy \
     --template-file infrastructure/lambda-functions.yml \
     --stack-name lambdadeploy-lambda \
     --capabilities CAPABILITY_IAM
   ```

2. **Deploy CodeBuild Project**
   ```bash
   aws cloudformation deploy \
     --template-file infrastructure/codebuild-project.yml \
     --stack-name lambdadeploy-codebuild \
     --capabilities CAPABILITY_IAM \
     --parameter-overrides \
       ServiceRole=arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/CodeBuildServiceRole
   ```

3. **Deploy CodePipeline**
   ```bash
   aws cloudformation deploy \
     --template-file infrastructure/codepipeline.yml \
     --stack-name lambdadeploy-pipeline \
     --capabilities CAPABILITY_IAM \
     --parameter-overrides \
       GitHubToken=YOUR_GITHUB_TOKEN \
       RepositoryName=your-repo-name \
       BranchName=main
   ```

### Phase 4: Application Deployment

1. **Package Lambda Functions**
   ```bash
   cd src/lambda
   npm install --production
   zip -r notification-handler.zip notification-handler/
   zip -r deployment-orchestrator.zip deployment-orchestrator/
   ```

2. **Upload Lambda Code**
   ```bash
   aws lambda update-function-code \
     --function-name lambdadeploy-notification-handler \
     --zip-file fileb://notification-handler.zip

   aws lambda update-function-code \
     --function-name lambdadeploy-deployment-orchestrator \
     --zip-file fileb://deployment-orchestrator.zip
   ```

3. **Configure Environment Variables**
   ```bash
   aws lambda update-function-configuration \
     --function-name lambdadeploy-notification-handler \
     --environment Variables='{
       "SLACK_WEBHOOK_URL":"YOUR_SLACK_WEBHOOK_URL",
       "PIPELINE_NAME":"lambdadeploy-pipeline"
     }'
   ```

### Phase 5: Repository Integration

1. **Configure GitHub Webhook**
   ```bash
   # Get the webhook URL from CodePipeline
   aws codepipeline get-pipeline --name lambdadeploy-pipeline

   # Add webhook to your GitHub repository settings
   # Webhook URL: https://webhooks.amazonaws.com/trigger?t=YOUR_TOKEN
   # Content type: application/json
   # Events: Push events
   ```

2. **Test Pipeline Trigger**
   ```bash
   # Make a test commit to trigger the pipeline
   echo "# Test deployment" >> test-file.md
   git add test-file.md
   git commit -m "Test pipeline trigger"
   git push origin main
   ```

### Phase 6: Monitoring Setup

1. **Create CloudWatch Dashboard**
   ```bash
   aws cloudformation deploy \
     --template-file infrastructure/monitoring.yml \
     --stack-name lambdadeploy-monitoring
   ```

2. **Set up Alarms**
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name "Pipeline-Failure-Rate" \
     --alarm-description "Alert when pipeline failure rate is high" \
     --metric-name FailedExecutions \
     --namespace AWS/CodePipeline \
     --statistic Sum \
     --period 300 \
     --threshold 1 \
     --comparison-operator GreaterThanOrEqualToThreshold
   ```

## 🔧 Configuration Management

### Environment-Specific Deployments

1. **Development Environment**
   ```bash
   aws cloudformation deploy \
     --template-file infrastructure/environment.yml \
     --stack-name lambdadeploy-dev \
     --parameter-overrides Environment=dev
   ```

2. **Production Environment**
   ```bash
   aws cloudformation deploy \
     --template-file infrastructure/environment.yml \
     --stack-name lambdadeploy-prod \
     --parameter-overrides Environment=prod
   ```

### Secrets Management

1. **Store Sensitive Configuration**
   ```bash
   aws secretsmanager create-secret \
     --name "lambdadeploy/slack-webhook" \
     --description "Slack webhook URL for notifications" \
     --secret-string "YOUR_SLACK_WEBHOOK_URL"

   aws secretsmanager create-secret \
     --name "lambdadeploy/github-token" \
     --description "GitHub personal access token" \
     --secret-string "YOUR_GITHUB_TOKEN"
   ```

## 💰 Cost Optimization

### Resource Tagging
```bash
aws resourcegroupstaggingapi tag-resources \
  --resource-arn-list \
    "arn:aws:codepipeline:us-east-1:ACCOUNT:pipeline/lambdadeploy-pipeline" \
    "arn:aws:codebuild:us-east-1:ACCOUNT:project/lambdadeploy-build" \
  --tags \
    Project=LambdaDeploy \
    Environment=Production \
    Owner=DevOpsTeam
```

### Cost Monitoring
```bash
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://infrastructure/budget-config.json
```

## 🔍 Troubleshooting

### Common Deployment Issues

1. **IAM Permission Errors**
   ```bash
   # Check current permissions
   aws iam simulate-principal-policy \
     --policy-source-arn arn:aws:iam::ACCOUNT:role/CodePipelineServiceRole \
     --action-names codepipeline:StartPipelineExecution \
     --resource-arns "*"
   ```

2. **CloudFormation Stack Failures**
   ```bash
   # Check stack events
   aws cloudformation describe-stack-events \
     --stack-name lambdadeploy-pipeline

   # Get stack status
   aws cloudformation describe-stacks \
     --stack-name lambdadeploy-pipeline \
     --query 'Stacks[0].StackStatus'
   ```

3. **Lambda Function Errors**
   ```bash
   # Check function logs
   aws logs describe-log-groups \
     --log-group-name-prefix "/aws/lambda/lambdadeploy"

   aws logs get-log-events \
     --log-group-name "/aws/lambda/lambdadeploy-notification-handler" \
     --log-stream-name "LATEST"
   ```

## 🚀 Scaling Considerations

### Multi-Region Deployment
```bash
# Deploy to additional regions
aws cloudformation deploy \
  --template-file infrastructure/cross-region.yml \
  --stack-name lambdadeploy-us-west-2 \
  --region us-west-2
```

### High Availability Setup
```bash
# Enable cross-region replication for S3
aws s3api put-bucket-replication \
  --bucket lambdadeploy-artifacts \
  --replication-configuration file://infrastructure/s3-replication.json
```

## 📊 Performance Monitoring

### Key Metrics to Track
- Pipeline execution time
- Build success rate
- Deployment frequency
- Lambda function duration
- Cost per deployment

### Custom Metrics
```bash
aws cloudwatch put-metric-data \
  --namespace "LambdaDeploy/Pipeline" \
  --metric-data \
    MetricName=DeploymentTime,Value=120,Unit=Seconds \
    MetricName=BuildSuccess,Value=1,Unit=Count
```

## 🔄 Maintenance

### Regular Tasks
1. Update Lambda runtime versions
2. Review and rotate access keys
3. Clean up old artifacts in S3
4. Update CloudFormation templates
5. Review cost optimization opportunities

### Automated Cleanup
```bash
# Set up S3 lifecycle policies
aws s3api put-bucket-lifecycle-configuration \
  --bucket lambdadeploy-artifacts \
  --lifecycle-configuration file://infrastructure/s3-lifecycle.json
```

---

## 📞 Support

For deployment issues:
- Check AWS CloudFormation console for stack status
- Review CloudWatch logs for detailed error messages
- Contact AWS Support for service-specific issues
- Refer to AWS documentation for service limits and best practices

**Estimated Deployment Time**: 30-45 minutes
**Monthly Cost Estimate**: $10-50 (depending on usage)
**Maintenance Effort**: 2-4 hours per month