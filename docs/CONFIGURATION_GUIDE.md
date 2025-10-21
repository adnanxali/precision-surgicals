# 🔧 Configuration Guide - GitHub Integration

This guide explains exactly what you need to configure for GitHub integration to work.

## 📝 **Step-by-Step Configuration**

### **Step 1: Update Your .env File**

Your `.env` file needs these values updated:

```bash
# Repository Configuration - REQUIRED CHANGES
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Your actual GitHub token
REPOSITORY_URL=https://github.com/yourusername/yourrepo  # Your actual repo URL
REPOSITORY_OWNER=yourusername                            # Your GitHub username
REPOSITORY_NAME=yourrepo                                 # Your repository name
BRANCH_NAME=main                                         # Branch to monitor (usually 'main')

# AWS Configuration - VERIFY THESE
AWS_REGION=us-east-1                    # Your preferred AWS region
AWS_ACCOUNT_ID=654654270223             # Your AWS account ID (verify this)

# Pipeline Configuration - CAN CUSTOMIZE
PIPELINE_NAME=lambdadeploy-github-pipeline              # Pipeline name
BUILD_PROJECT_NAME=lambdadeploy-github-build           # CodeBuild project name
ARTIFACT_BUCKET_NAME=lambdadeploy-github-artifacts     # S3 bucket for artifacts
```

### **Step 2: Create GitHub Personal Access Token**

1. **Go to GitHub Settings:**
   - Visit: https://github.com/settings/tokens
   - Click "Generate new token (classic)"

2. **Configure Token:**
   ```
   Name: AWS CodePipeline Integration
   Expiration: 90 days (or your preference)
   
   Required Scopes:
   ✅ repo (Full control of private repositories)
   ✅ admin:repo_hook (Full control of repository hooks)
   ```

3. **Copy Token:**
   - Copy the generated token immediately
   - Update your `.env` file with the real token

### **Step 3: Verify AWS Account ID**

Check your AWS account ID:

```bash
aws sts get-caller-identity --query Account --output text
```

Update the `AWS_ACCOUNT_ID` in your `.env` file if different.

### **Step 4: Repository Structure Requirements**

Your GitHub repository should have:

```
your-repo/
├── src/
│   └── lambda/
│       ├── deployment-orchestrator/
│       │   └── index.js
│       └── notification-handler/
│           └── index.js
├── infrastructure/
│   └── github-integration.yml
├── scripts/
│   └── setup-github-integration.js
├── package.json
├── buildspec.yml
└── .env
```

## 🚀 **Deployment Process**

### **Option 1: Automated Setup (Recommended)**

Run the interactive setup:

```bash
node scripts/setup-github-integration.js
```

This will:
- Read your `.env` configuration
- Prompt for missing values
- Deploy the CloudFormation stack
- Register the webhook automatically

### **Option 2: Manual Setup**

If you prefer manual control:

```bash
# 1. Deploy the stack
aws cloudformation create-stack \
  --stack-name lambdadeploy-github-integration \
  --template-body file://infrastructure/github-integration.yml \
  --parameters \
    ParameterKey=GitHubOwner,ParameterValue=YOUR_USERNAME \
    ParameterKey=GitHubRepo,ParameterValue=YOUR_REPO \
    ParameterKey=GitHubBranch,ParameterValue=main \
    ParameterKey=GitHubToken,ParameterValue=YOUR_TOKEN \
  --capabilities CAPABILITY_IAM

# 2. Wait for completion
aws cloudformation wait stack-create-complete \
  --stack-name lambdadeploy-github-integration

# 3. Get outputs
aws cloudformation describe-stacks \
  --stack-name lambdadeploy-github-integration \
  --query 'Stacks[0].Outputs'
```

## 🔍 **What Gets Created**

### **AWS Resources:**

1. **S3 Bucket**: `lambdadeploy-github-integration-pipeline-artifacts-{account-id}`
2. **CodePipeline**: `lambdadeploy-github-integration-github-pipeline`
3. **CodeBuild Project**: `lambdadeploy-github-integration-github-build`
4. **Lambda Function**: `lambdadeploy-github-integration-deployment-orchestrator`
5. **Secrets Manager**: `lambdadeploy-github-integration-github-token`
6. **IAM Roles**: Pipeline, CodeBuild, and Lambda execution roles
7. **GitHub Webhook**: Automatically registered with your repository

### **GitHub Integration:**

- **Webhook URL**: Automatically registered
- **Events**: Push events to your specified branch
- **Authentication**: HMAC with your GitHub token

## 🎯 **Testing Your Setup**

### **1. Verify Webhook Registration**

Check your GitHub repository:
- Go to Settings → Webhooks
- You should see a new webhook with AWS CodePipeline URL
- Status should be green (successful)

### **2. Test Pipeline Trigger**

Make a simple change:

```bash
# Create a test file
echo "console.log('GitHub integration test');" > test-integration.js

# Commit and push
git add test-integration.js
git commit -m "Test GitHub integration"
git push origin main
```

### **3. Monitor Pipeline Execution**

```bash
# Check pipeline status
aws codepipeline get-pipeline-state \
  --name lambdadeploy-github-integration-github-pipeline

# Watch build logs
aws logs tail /aws/codebuild/lambdadeploy-github-integration-github-build --follow
```

## 🛠️ **Configuration Examples**

### **Example .env for Personal Repository:**

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

### **Example .env for Organization Repository:**

```bash
# Repository Configuration
GITHUB_TOKEN=ghp_abcdef1234567890abcdef1234567890abcdef12
REPOSITORY_URL=https://github.com/mycompany/lambda-microservices
REPOSITORY_OWNER=mycompany
REPOSITORY_NAME=lambda-microservices
BRANCH_NAME=main

# AWS Configuration
AWS_REGION=us-west-2
AWS_ACCOUNT_ID=987654321098
```

## 🔐 **Security Considerations**

### **Environment Variables:**

- **Never commit `.env` to Git**
- Add `.env` to your `.gitignore`
- Use different tokens for different environments

### **GitHub Token Security:**

- **Rotate tokens regularly** (every 90 days)
- **Use minimal permissions** (only repo and admin:repo_hook)
- **Monitor token usage** in GitHub settings

### **AWS Permissions:**

- **Use least privilege** IAM policies
- **Enable CloudTrail** for audit logging
- **Monitor CodePipeline executions**

## 🚨 **Common Issues & Solutions**

### **Issue: Pipeline Not Triggering**

```bash
# Check webhook status
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/YOUR_OWNER/YOUR_REPO/hooks

# Verify webhook deliveries in GitHub UI
```

### **Issue: Build Failures**

```bash
# Check build logs
aws logs describe-log-groups --log-group-name-prefix /aws/codebuild/

# Get specific build logs
aws logs get-log-events \
  --log-group-name /aws/codebuild/lambdadeploy-github-integration-github-build \
  --log-stream-name YOUR_BUILD_ID
```

### **Issue: Permission Errors**

```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check IAM role policies
aws iam list-attached-role-policies --role-name CodePipelineRole
```

## 📊 **Monitoring & Observability**

### **CloudWatch Dashboards:**

The integration creates logs in:
- `/aws/codebuild/lambdadeploy-github-integration-github-build`
- `/aws/lambda/lambdadeploy-github-integration-deployment-orchestrator`
- `/aws/codepipeline/lambdadeploy-github-integration-github-pipeline`

### **Useful Monitoring Commands:**

```bash
# Pipeline execution history
aws codepipeline list-pipeline-executions \
  --pipeline-name lambdadeploy-github-integration-github-pipeline

# Recent build history
aws codebuild list-builds-for-project \
  --project-name lambdadeploy-github-integration-github-build

# Lambda function metrics
aws logs filter-log-events \
  --log-group-name /aws/lambda/lambdadeploy-github-integration-deployment-orchestrator \
  --start-time $(date -d '1 hour ago' +%s)000
```

---

## 🎯 **Quick Checklist**

Before running the setup:

- [ ] Updated `.env` with real GitHub token
- [ ] Updated `.env` with correct repository details
- [ ] Verified AWS account ID
- [ ] Confirmed AWS CLI is configured
- [ ] Repository has required structure
- [ ] GitHub token has correct permissions

Ready to proceed? Run: `node scripts/setup-github-integration.js`