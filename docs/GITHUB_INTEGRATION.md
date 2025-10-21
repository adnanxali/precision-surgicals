# GitHub Integration Setup Guide

This guide will help you integrate your Lambda deployment pipeline with GitHub for automatic deployments on code pushes.

## 🎯 What You'll Get

- **Automatic deployments** when you push to your main branch
- **GitHub webhook integration** with AWS CodePipeline
- **Secure token management** using AWS Secrets Manager
- **Build and test automation** with CodeBuild
- **Deployment notifications** and status tracking

## 📋 Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **GitHub Personal Access Token**: With appropriate permissions
3. **AWS CLI**: Configured with appropriate permissions
4. **Node.js**: Version 18 or higher

## 🚀 Quick Setup

### Step 1: Create GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a descriptive name like "AWS CodePipeline Integration"
4. Select these scopes:
   - `repo` (Full control of private repositories)
   - `admin:repo_hook` (Full control of repository hooks)
5. Click "Generate token" and copy it immediately

### Step 2: Deploy GitHub Integration

Run the setup script:

```bash
node scripts/setup-github-integration.js
```

You'll be prompted for:
- GitHub username/organization
- Repository name
- Branch to monitor (default: main)
- Personal access token

### Step 3: Add GitHub Actions (Optional)

If you want additional CI/CD features, commit the provided GitHub Actions workflow:

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions workflow"
git push origin main
```

## 🔧 Manual Setup (Alternative)

If you prefer manual setup:

### 1. Deploy the CloudFormation Stack

```bash
aws cloudformation create-stack \
  --stack-name lambdadeploy-github-integration \
  --template-body file://infrastructure/github-integration.yml \
  --parameters \
    ParameterKey=GitHubOwner,ParameterValue=your-username \
    ParameterKey=GitHubRepo,ParameterValue=your-repo \
    ParameterKey=GitHubBranch,ParameterValue=main \
    ParameterKey=GitHubToken,ParameterValue=your-token \
  --capabilities CAPABILITY_IAM
```

### 2. Wait for Deployment

```bash
aws cloudformation wait stack-create-complete \
  --stack-name lambdadeploy-github-integration
```

### 3. Get Stack Outputs

```bash
aws cloudformation describe-stacks \
  --stack-name lambdadeploy-github-integration \
  --query 'Stacks[0].Outputs'
```

## 🔍 Monitoring Your Pipeline

### View Pipeline Status

```bash
aws codepipeline get-pipeline-state \
  --name lambdadeploy-github-integration-github-pipeline
```

### Monitor Build Logs

```bash
aws logs tail /aws/codebuild/lambdadeploy-github-integration-github-build --follow
```

### Check Recent Executions

```bash
aws codepipeline list-pipeline-executions \
  --pipeline-name lambdadeploy-github-integration-github-pipeline \
  --max-items 5
```

## 🎮 Testing Your Setup

### 1. Make a Test Change

Create a simple change in your repository:

```bash
echo "console.log('Pipeline test');" >> src/lambda/test-function.js
git add .
git commit -m "Test pipeline integration"
git push origin main
```

### 2. Watch the Magic Happen

1. Check your GitHub repository - you should see a webhook has been added
2. Monitor the AWS CodePipeline console
3. Watch the build logs in CloudWatch
4. Verify your Lambda functions are updated

## 🛠️ Troubleshooting

### Common Issues

**Pipeline not triggering:**
- Verify webhook is registered in GitHub repository settings
- Check GitHub token permissions
- Ensure the branch name matches your configuration

**Build failures:**
- Check CodeBuild logs in CloudWatch
- Verify your `package.json` scripts exist
- Ensure all dependencies are listed

**Deployment failures:**
- Check Lambda execution role permissions
- Verify function names and configurations
- Review CloudWatch logs for the deployment orchestrator

### Debug Commands

```bash
# Check webhook status
aws codepipeline list-webhooks

# View detailed pipeline execution
aws codepipeline get-pipeline-execution \
  --pipeline-name lambdadeploy-github-integration-github-pipeline \
  --pipeline-execution-id <execution-id>

# Check secrets
aws secretsmanager describe-secret \
  --secret-id lambdadeploy-github-integration-github-token
```

## 🔐 Security Best Practices

1. **Token Rotation**: Regularly rotate your GitHub personal access tokens
2. **Least Privilege**: Only grant necessary permissions to the token
3. **Secrets Management**: Never commit tokens to your repository
4. **Branch Protection**: Consider enabling branch protection rules
5. **Review Permissions**: Regularly audit IAM roles and policies

## 🚀 Next Steps

Once GitHub integration is working:

1. **Add Environment Variables**: Configure different environments (dev/staging/prod)
2. **Implement Approval Gates**: Add manual approval steps for production
3. **Enhanced Notifications**: Set up Slack or Teams notifications
4. **Monitoring Dashboards**: Create CloudWatch dashboards
5. **Rollback Capabilities**: Implement automatic rollback on failures

## 📚 Additional Resources

- [AWS CodePipeline User Guide](https://docs.aws.amazon.com/codepipeline/)
- [GitHub Webhooks Documentation](https://docs.github.com/en/developers/webhooks-and-events/webhooks)
- [AWS Lambda Deployment Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

---

Need help? Check the troubleshooting section or review the pipeline logs in the AWS console.