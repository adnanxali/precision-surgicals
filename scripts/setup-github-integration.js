#!/usr/bin/env node

const { CloudFormationClient, CreateStackCommand, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');
const { SecretsManagerClient, CreateSecretCommand } = require('@aws-sdk/client-secrets-manager');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

// Load configuration from .env file
function loadEnvConfig() {
    return {
        githubOwner: process.env.REPOSITORY_OWNER,
        githubRepo: process.env.REPOSITORY_NAME,
        githubBranch: process.env.BRANCH_NAME || 'main',
        githubToken: process.env.GITHUB_TOKEN,
        awsRegion: process.env.AWS_REGION || 'us-east-1',
        awsAccountId: process.env.AWS_ACCOUNT_ID
    };
}

async function setupGitHubIntegration() {
    console.log('🚀 Setting up GitHub Integration for Lambda Deploy Pipeline\n');
    
    try {
        // Load configuration from .env
        const envConfig = loadEnvConfig();
        
        console.log('📋 Configuration loaded from .env file:');
        console.log(`Repository Owner: ${envConfig.githubOwner || 'NOT SET'}`);
        console.log(`Repository Name: ${envConfig.githubRepo || 'NOT SET'}`);
        console.log(`Branch: ${envConfig.githubBranch}`);
        console.log(`AWS Region: ${envConfig.awsRegion}`);
        console.log(`AWS Account ID: ${envConfig.awsAccountId || 'NOT SET'}`);
        console.log(`GitHub Token: ${envConfig.githubToken ? '✅ Set' : '❌ NOT SET'}\n`);
        
        // Get user inputs (with defaults from .env)
        const githubOwner = await question(`Enter your GitHub username/organization (${envConfig.githubOwner || 'required'}): `) || envConfig.githubOwner;
        const githubRepo = await question(`Enter your GitHub repository name (${envConfig.githubRepo || 'required'}): `) || envConfig.githubRepo;
        const githubBranch = await question(`Enter the branch to monitor (${envConfig.githubBranch}): `) || envConfig.githubBranch;
        const githubToken = await question(`Enter your GitHub Personal Access Token (${envConfig.githubToken ? 'using .env value' : 'required'}): `) || envConfig.githubToken;
        
        if (!githubOwner || !githubRepo || !githubToken) {
            throw new Error('GitHub owner, repository, and token are required');
        }
        
        console.log('\n📋 Configuration Summary:');
        console.log(`Repository: ${githubOwner}/${githubRepo}`);
        console.log(`Branch: ${githubBranch}`);
        console.log(`Token: ${'*'.repeat(githubToken.length)}\n`);
        
        const confirm = await question('Proceed with deployment? (y/N): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('Deployment cancelled.');
            return;
        }
        
        const cloudformation = new CloudFormationClient({ region: envConfig.awsRegion });
        const stackName = 'lambdadeploy-github-integration';
        
        console.log('🔧 Deploying GitHub integration stack...');
        
        const createStackParams = {
            StackName: stackName,
            TemplateBody: fs.readFileSync(path.join(__dirname, '../infrastructure/github-integration.yml'), 'utf8'),
            Parameters: [
                { ParameterKey: 'GitHubOwner', ParameterValue: githubOwner },
                { ParameterKey: 'GitHubRepo', ParameterValue: githubRepo },
                { ParameterKey: 'GitHubBranch', ParameterValue: githubBranch },
                { ParameterKey: 'GitHubToken', ParameterValue: githubToken }
            ],
            Capabilities: ['CAPABILITY_IAM']
        };
        
        await cloudformation.send(new CreateStackCommand(createStackParams));
        
        console.log('⏳ Waiting for stack deployment to complete...');
        
        // Wait for stack creation
        let stackStatus = 'CREATE_IN_PROGRESS';
        while (stackStatus === 'CREATE_IN_PROGRESS') {
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            const describeResponse = await cloudformation.send(new DescribeStacksCommand({
                StackName: stackName
            }));
            
            stackStatus = describeResponse.Stacks[0].StackStatus;
            console.log(`Stack status: ${stackStatus}`);
        }
        
        if (stackStatus === 'CREATE_COMPLETE') {
            console.log('\n✅ GitHub integration deployed successfully!');
            
            // Get stack outputs
            const describeResponse = await cloudformation.send(new DescribeStacksCommand({
                StackName: stackName
            }));
            
            const outputs = describeResponse.Stacks[0].Outputs || [];
            
            console.log('\n📊 Stack Outputs:');
            outputs.forEach(output => {
                console.log(`${output.OutputKey}: ${output.OutputValue}`);
            });
            
            console.log('\n🎯 Next Steps:');
            console.log('1. The webhook has been automatically registered with your GitHub repository');
            console.log('2. Push code to your repository to trigger the pipeline');
            console.log('3. Monitor the pipeline in the AWS CodePipeline console');
            console.log('\n🔗 Useful Commands:');
            console.log(`aws codepipeline get-pipeline-state --name ${stackName}-github-pipeline`);
            console.log(`aws logs tail /aws/codebuild/${stackName}-github-build --follow`);
            
        } else {
            throw new Error(`Stack deployment failed with status: ${stackStatus}`);
        }
        
    } catch (error) {
        console.error('❌ Error setting up GitHub integration:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// GitHub Personal Access Token setup instructions
function showTokenInstructions() {
    console.log('\n📝 GitHub Personal Access Token Setup:');
    console.log('1. Go to GitHub Settings > Developer settings > Personal access tokens');
    console.log('2. Click "Generate new token (classic)"');
    console.log('3. Select these scopes:');
    console.log('   - repo (Full control of private repositories)');
    console.log('   - admin:repo_hook (Full control of repository hooks)');
    console.log('4. Copy the generated token\n');
}

if (require.main === module) {
    showTokenInstructions();
    setupGitHubIntegration();
}

module.exports = { setupGitHubIntegration };