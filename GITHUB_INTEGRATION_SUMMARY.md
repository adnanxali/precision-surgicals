# 🎉 GitHub Integration - Complete Setup Guide

## 🎯 **What You're Getting**

A fully automated CI/CD pipeline that:
- **Triggers automatically** when you push code to GitHub
- **Builds and tests** your Lambda functions
- **Deploys to AWS** without manual intervention
- **Sends notifications** about deployment status
- **Manages secrets securely** using AWS Secrets Manager

## 📋 **What You Need to Do**

### **Step 1: Update Your .env File**

Your current `.env` has placeholder values. Update these **REQUIRED** fields:

```bash
# CHANGE THESE VALUES:
GITHUB_TOKEN=your_actual_github_token_here          # ← Get from GitHub
REPOSITORY_OWNER=YOUR_USERNAME                       # ← Your GitHub username
REPOSITORY_NAME=YOUR_REPO_NAME                       # ← Your repository name

# VERIFY THESE VALUES:
AWS_ACCOUNT_ID=654654270223                         # ← Confirm this is correct
AWS_REGION=us-east-1                                # ← Your preferred region
```

### **Step 2: Create GitHub Personal Access Token**

1. **Go to:** https://github.com/settings/tokens
2. **Click:** "Generate new token (classic)"
3. **Name:** "AWS CodePipeline Integration"
4. **Select scopes:**
   - ✅ `repo` (Full control of private repositories)
   - ✅ `admin:repo_hook` (Full control of repository hooks)
5. **Copy the token** and update your `.env` file

### **Step 3: Install Dependencies**

```bash
npm install
```

### **Step 4: Validate Configuration**

```bash
npm run validate-config
```

This will check:
- ✅ All required environment variables are set
- ✅ GitHub token format is correct
- ✅ AWS CLI is configured properly
- ✅ Required files exist

### **Step 5: Deploy GitHub Integration**

```bash
npm run setup-github
```

This will:
- Read your `.env` configuration
- Deploy AWS resources (CodePipeline, CodeBuild, Lambda, etc.)
- Register webhook with your GitHub repository
- Set up secure token storage

## 🔍 **Detailed Configuration**

### **Your Current .env Status:**

```bash
# Repository Configuration - UPDATE THESE VALUES
GITHUB_TOKEN=your_actual_github_token_here          # ❌ NEEDS UPDATE
REPOSITORY_URL=https://github.com/YOUR_USERNAME/YOUR_REPO_NAME  # ❌ NEEDS UPDATE
BRANCH_NAME=main                                    # ✅ OK
REPOSITORY_OWNER=YOUR_USERNAME                      # ❌ NEEDS UPDATE
REPOSITORY_NAME=YOUR_REPO_NAME                      # ❌ NEEDS UPDATE

# AWS Configuration - VERIFY THESE
AWS_REGION=us-east-1                               # ✅ OK
AWS_ACCOUNT_ID=654654270223                        # ❓ VERIFY THIS

# Other settings are optional and can stay as-is
```

### **Example of Properly Configured .env:**

```bash
# Repository Configuration
GITHUB_TOKEN=ghp_1234567890abcdef1234567890abcdef12345678
REPOSITORY_URL=https://github.com/johnsmith/my-lambda-app
REPOSITORY_OWNER=johnsmith
REPOSITORY_NAME=my-lambda-app
BRANCH_NAME=main

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
```

## 🚀 **What Gets Created**

When you run the setup, these AWS resources are created:

1. **CodePipeline**: `lambdadeploy-github-integration-github-pipeline`
2. **CodeBuild Project**: `lambdadeploy-github-integration-github-build`
3. **S3 Bucket**: `lambdadeploy-github-integration-pipeline-artifacts-{account-id}`
4. **Lambda Function**: `lambdadeploy-github-integration-deployment-orchestrator`
5. **Secrets Manager**: `lambdadeploy-github-integration-github-token`
6. **IAM Roles**: Pipeline, CodeBuild, and Lambda execution roles
7. **GitHub Webhook**: Automatically registered with your repository

## 🎮 **Testing Your Setup**

After deployment, test it:

```bash
# Make a simple change
echo "console.log('GitHub integration test');" > test-integration.js

# Commit and push
git add test-integration.js
git commit -m "Test GitHub integration"
git push origin main
```

**What should happen:**
1. GitHub webhook triggers AWS CodePipeline
2. CodePipeline starts the build process
3. CodeBuild runs tests and builds your code
4. Lambda deployment orchestrator updates your functions
5. You get notifications about the deployment status

## 🔍 **Monitoring Commands**

```bash
# Check pipeline status
aws codepipeline get-pipeline-state \
  --name lambdadeploy-github-integration-github-pipeline

# Watch build logs
aws logs tail /aws/codebuild/lambdadeploy-github-integration-github-build --follow

# Check recent executions
aws codepipeline list-pipeline-executions \
  --pipeline-name lambdadeploy-github-integration-github-pipeline \
  --max-items 5
```

## 🛠️ **Troubleshooting**

### **Common Issues:**

**"Pipeline not triggering"**
- Check webhook in GitHub repo settings
- Verify GitHub token permissions
- Confirm branch name matches configuration

**"Build failures"**
- Check CodeBuild logs in CloudWatch
- Verify `package.json` scripts exist
- Ensure all dependencies are listed

**"Permission errors"**
- Verify AWS CLI is configured: `aws sts get-caller-identity`
- Check IAM role policies in AWS console

### **Useful Commands:**

```bash
# Validate your configuration
npm run validate-config

# Check AWS account
aws sts get-caller-identity

# List webhooks
aws codepipeline list-webhooks

# Manual pipeline trigger
aws codepipeline start-pipeline-execution \
  --name lambdadeploy-github-integration-github-pipeline
```

## 📚 **Available Scripts**

```bash
npm run validate-config    # Check configuration before setup
npm run setup-github      # Deploy GitHub integration
npm run test              # Run tests
npm run build             # Build and test
npm run lint              # Check code style
```

## 🎯 **Quick Checklist**

Before running setup:

- [ ] Updated `GITHUB_TOKEN` in `.env`
- [ ] Updated `REPOSITORY_OWNER` in `.env`
- [ ] Updated `REPOSITORY_NAME` in `.env`
- [ ] Verified `AWS_ACCOUNT_ID` in `.env`
- [ ] Confirmed AWS CLI is configured
- [ ] Ran `npm install`
- [ ] Ran `npm run validate-config`

## 🚀 **Ready to Go?**

If everything looks good:

```bash
npm run setup-github
```

The setup will guide you through the process and show you exactly what's happening at each step.

---

## 🎉 **What's Next?**

Once GitHub integration is working, you can:

1. **Add more environments** (dev/staging/prod)
2. **Implement approval gates** for production deployments
3. **Set up monitoring dashboards** in CloudWatch
4. **Add Slack/Teams notifications**
5. **Implement rollback capabilities**

Your pipeline will be production-ready and fully automated! 🚀