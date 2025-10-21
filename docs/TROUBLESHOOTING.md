# LambdaDeploy Pipeline Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the LambdaDeploy Pipeline.

## 🔍 Quick Diagnostics

### Check Pipeline Status
```bash
# View recent pipeline executions
node scripts/view-logs.js pipeline

# Check current pipeline status
aws codepipeline get-pipeline-state --name lambdadeploy-pipeline
```

### Check Build Logs
```bash
# View recent build logs
node scripts/view-logs.js build

# Get specific build logs
aws logs get-log-events --log-group-name /aws/codebuild/lambdadeploy-build --log-stream-name <stream-name>
```

### Check Lambda Function Logs
```bash
# View all Lambda logs
node scripts/view-logs.js lambda

# Check specific function
aws logs describe-log-streams --log-group-name /aws/lambda/lambdadeploy-notification-handler
```

## 🚨 Common Issues and Solutions

### 1. Pipeline Fails to Start

**Symptoms:**
- Pipeline doesn't trigger on Git push
- Webhook not working
- Source stage fails

**Possible Causes:**
- GitHub webhook not configured
- Invalid GitHub token
- Repository permissions

**Solutions:**
```bash
# Check webhook configuration
aws codepipeline list-webhooks

# Verify GitHub token permissions
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Re-register webhook
aws codepipeline register-webhook-with-third-party --webhook-name lambdadeploy-webhook
```

### 2. Build Stage Failures

**Symptoms:**
- Build fails with dependency errors
- Test failures
- Linting errors

**Common Solutions:**
```bash
# Check buildspec.yml syntax
aws codebuild validate-project --project-name lambdadeploy-build

# Test build locally
npm install
npm run lint
npm test
npm run build
```

**Build Environment Issues:**
```yaml
# Update buildspec.yml if needed
version: 0.2
env:
  variables:
    NODE_ENV: production
phases:
  install:
    runtime-versions:
      nodejs: 18  # Ensure correct Node.js version
```

### 3. Deployment Failures

**Symptoms:**
- Deploy stage fails
- Lambda function not updated
- Timeout errors

**Check Lambda Function Status:**
```bash
# Get function configuration
aws lambda get-function --function-name lambdadeploy-app

# Check function logs
aws logs get-log-events --log-group-name /aws/lambda/lambdadeploy-deployment-orchestrator --log-stream-name LATEST
```

**Common Fixes:**
```bash
# Update function manually if needed
aws lambda update-function-code \
  --function-name lambdadeploy-app \
  --zip-file fileb://app.zip

# Check IAM permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT:role/LambdaExecutionRole \
  --action-names lambda:UpdateFunctionCode \
  --resource-arns "*"
```

### 4. Notification Issues

**Symptoms:**
- No Slack notifications
- Email notifications not working
- Notification handler errors

**Debug Slack Integration:**
```bash
# Test Slack webhook manually
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message"}' \
  $SLACK_WEBHOOK_URL

# Check notification handler logs
aws logs get-log-events \
  --log-group-name /aws/lambda/lambdadeploy-notification-handler \
  --log-stream-name LATEST
```

**Fix Notification Configuration:**
```bash
# Update Slack webhook URL in Parameter Store
aws ssm put-parameter \
  --name "/lambdadeploy/slack-webhook-url" \
  --value "YOUR_NEW_WEBHOOK_URL" \
  --type "SecureString" \
  --overwrite
```

### 5. Permission Errors

**Symptoms:**
- Access denied errors
- IAM permission failures
- Cross-service access issues

**Check IAM Roles:**
```bash
# List roles
aws iam list-roles --query 'Roles[?contains(RoleName, `lambdadeploy`)]'

# Check role policies
aws iam list-attached-role-policies --role-name CodePipelineServiceRole
aws iam list-role-policies --role-name CodePipelineServiceRole
```

**Common Permission Fixes:**
```bash
# Attach missing policies
aws iam attach-role-policy \
  --role-name CodePipelineServiceRole \
  --policy-arn arn:aws:iam::aws:policy/AWSCodePipelineFullAccess

# Create custom policy if needed
aws iam create-policy \
  --policy-name LambdaDeployCustomPolicy \
  --policy-document file://custom-policy.json
```

### 6. Resource Limits and Quotas

**Symptoms:**
- Throttling errors
- Timeout issues
- Resource exhaustion

**Check Service Limits:**
```bash
# Check Lambda limits
aws service-quotas get-service-quota \
  --service-code lambda \
  --quota-code L-B99A9384  # Concurrent executions

# Check CodeBuild limits
aws service-quotas get-service-quota \
  --service-code codebuild \
  --quota-code L-ACCF6C0D  # Concurrent builds
```

**Optimize Resources:**
```bash
# Increase Lambda timeout
aws lambda update-function-configuration \
  --function-name lambdadeploy-deployment-orchestrator \
  --timeout 300

# Optimize build environment
# Update buildspec.yml to use smaller compute type if needed
```

## 🔧 Advanced Troubleshooting

### Enable Debug Logging

**For Lambda Functions:**
```javascript
// Add to Lambda function code
console.log('DEBUG:', JSON.stringify(event, null, 2));
console.log('DEBUG:', JSON.stringify(context, null, 2));
```

**For CodeBuild:**
```yaml
# Add to buildspec.yml
env:
  variables:
    CODEBUILD_LOG_LEVEL: DEBUG
```

### Monitor Resource Usage

**CloudWatch Metrics:**
```bash
# Get pipeline metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/CodePipeline \
  --metric-name PipelineExecutionSuccess \
  --dimensions Name=PipelineName,Value=lambdadeploy-pipeline \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum

# Get Lambda metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=lambdadeploy-notification-handler \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-02T00:00:00Z \
  --period 300 \
  --statistics Average,Maximum
```

### Network and Connectivity Issues

**VPC Configuration (if applicable):**
```bash
# Check VPC endpoints
aws ec2 describe-vpc-endpoints

# Check security groups
aws ec2 describe-security-groups --group-names lambdadeploy-sg
```

**DNS Resolution:**
```bash
# Test from Lambda function
nslookup hooks.slack.com
nslookup github.com
```

## 📊 Performance Optimization

### Build Performance
- Use build caching in buildspec.yml
- Optimize Docker images
- Parallelize test execution

### Lambda Performance
- Increase memory allocation
- Use provisioned concurrency for critical functions
- Optimize cold start times

### Pipeline Performance
- Use parallel actions where possible
- Optimize artifact sizes
- Implement efficient caching strategies

## 🆘 Getting Help

### AWS Support Resources
- AWS Support Center
- AWS Developer Forums
- AWS Documentation

### Community Resources
- GitHub Issues
- Stack Overflow (tag: aws-codepipeline)
- AWS re:Post

### Internal Support
- DevOps team Slack channel
- Internal documentation wiki
- Team knowledge base

## 📝 Logging Best Practices

### Structured Logging
```javascript
// Use structured logging in Lambda functions
const log = {
  timestamp: new Date().toISOString(),
  level: 'INFO',
  message: 'Pipeline execution started',
  pipelineName: 'lambdadeploy-pipeline',
  executionId: 'abc123'
};
console.log(JSON.stringify(log));
```

### Log Retention
```bash
# Set appropriate log retention
aws logs put-retention-policy \
  --log-group-name /aws/lambda/lambdadeploy-notification-handler \
  --retention-in-days 30
```

### Log Analysis
```bash
# Use CloudWatch Insights for log analysis
aws logs start-query \
  --log-group-name /aws/lambda/lambdadeploy-notification-handler \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/'
```

---

## 🔄 Recovery Procedures

### Pipeline Recovery
1. Identify failed stage
2. Check logs for root cause
3. Fix underlying issue
4. Retry pipeline execution or restart from failed stage

### Data Recovery
1. Check S3 artifact bucket for backups
2. Restore from previous successful deployment
3. Use CloudFormation stack rollback if needed

### Emergency Procedures
1. Stop pipeline if causing issues
2. Rollback to previous version
3. Implement hotfix if critical
4. Post-incident review and documentation