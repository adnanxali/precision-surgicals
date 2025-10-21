# LambdaDeploy Pipeline

A modern, serverless CI/CD solution built on AWS that automates code deployment, reduces infrastructure costs, and improves developer productivity.

## 🚀 Project Overview

LambdaDeploy Pipeline transforms traditional manual deployment processes into a fully automated, event-driven workflow using AWS serverless technologies.

### Key Features

- **Automated CI/CD**: Triggered by Git commits, no manual intervention required
- **Serverless Architecture**: Pay-per-use model with AWS Lambda and CodeBuild
- **Integrated Testing**: Automated test execution with early error detection
- **Slack Notifications**: Real-time deployment status updates
- **Cost Effective**: No persistent infrastructure, only runs when needed
- **Scalable**: Handles multiple concurrent deployments seamlessly

### Architecture Components

- **AWS CodePipeline**: Orchestrates the entire deployment workflow
- **AWS CodeBuild**: Handles building, testing, and packaging
- **AWS Lambda**: Custom orchestration and notification logic
- **Amazon S3**: Artifact storage and static website hosting
- **AWS CloudFormation**: Infrastructure as Code
- **Slack Integration**: Team notifications and status updates

## 📋 Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 18+ installed
- Git repository (GitHub/GitLab)
- Slack workspace with webhook URL
- AWS account with billing enabled

## 🛠️ Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd lambdadeploy-pipeline
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your AWS and Slack credentials
   ```

4. **Deploy infrastructure**
   ```bash
   npm run deploy
   ```

5. **Connect your Git repository**
   - Update `pipeline-config.json` with your repository details
   - Push changes to trigger first deployment

## 📁 Project Structure

```
lambdadeploy-pipeline/
├── src/
│   ├── lambda/              # Lambda function code
│   ├── pipeline/            # CodePipeline configurations
│   └── app/                 # Sample application code
├── infrastructure/          # CloudFormation templates
├── scripts/                 # Deployment and utility scripts
├── tests/                   # Test suites
└── docs/                    # Additional documentation
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
AWS_REGION=us-east-1
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
GITHUB_TOKEN=your_github_token
REPOSITORY_URL=https://github.com/username/repo
BRANCH_NAME=main
```

### Pipeline Configuration

Edit `pipeline-config.json` to customize your deployment pipeline:

```json
{
  "repositoryUrl": "https://github.com/username/repo",
  "branch": "main",
  "buildSpec": "buildspec.yml",
  "deploymentTarget": "lambda",
  "notifications": {
    "slack": true,
    "email": false
  }
}
```

## 🚀 Deployment Process

The pipeline follows these stages:

1. **Source**: Triggered by Git commit
2. **Build**: CodeBuild compiles and tests code
3. **Test**: Automated test execution
4. **Deploy**: Serverless deployment to AWS
5. **Notify**: Slack notification with status

## 📊 Monitoring & Logging

- CloudWatch Logs for all Lambda functions
- CodePipeline execution history
- Cost tracking through AWS Cost Explorer
- Performance metrics in CloudWatch

## 🔍 Troubleshooting

### Common Issues

1. **Pipeline fails to start**
   - Check IAM permissions
   - Verify repository webhook configuration

2. **Build failures**
   - Review CodeBuild logs in CloudWatch
   - Validate buildspec.yml syntax

3. **Deployment errors**
   - Check Lambda function logs
   - Verify CloudFormation stack status

## 📈 Cost Optimization

This solution reduces costs by:
- Using serverless components (pay-per-execution)
- Eliminating persistent build servers
- Optimizing resource allocation
- Implementing efficient caching strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Create an issue in this repository
- Contact the DevOps team via Slack
- Check the troubleshooting guide in `/docs`

---

Built with ❤️ by the DevOps Intern Team