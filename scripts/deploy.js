#!/usr/bin/env node

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1'
});

const cloudformation = new AWS.CloudFormation();
const ssm = new AWS.SSM();

async function deploy() {
    console.log('🚀 Starting LambdaDeploy Pipeline deployment...');

    try {
        // Validate environment variables
        await validateEnvironment();

        // Store secrets in Parameter Store
        await storeSecrets();

        // Deploy CloudFormation stack
        await deployStack();

        console.log('✅ Deployment completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Configure your GitHub repository webhook');
        console.log('2. Push code to trigger the first pipeline execution');
        console.log('3. Monitor the pipeline in AWS Console');

    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

async function validateEnvironment() {
    console.log('🔍 Validating environment configuration...');

    const required = [
        'AWS_REGION',
        'GITHUB_TOKEN',
        'REPOSITORY_OWNER',
        'REPOSITORY_NAME',
        'SLACK_WEBHOOK_URL'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    console.log('✅ Environment validation passed');
}

async function storeSecrets() {
    console.log('🔐 Storing secrets in Parameter Store...');

    const secrets = [
        {
            name: '/lambdadeploy/slack-webhook-url',
            value: process.env.SLACK_WEBHOOK_URL,
            description: 'Slack webhook URL for notifications'
        },
        {
            name: '/lambdadeploy/github-token',
            value: process.env.GITHUB_TOKEN,
            description: 'GitHub personal access token'
        }
    ];

    for (const secret of secrets) {
        try {
            await ssm.putParameter({
                Name: secret.name,
                Value: secret.value,
                Type: 'SecureString',
                Description: secret.description,
                Overwrite: true
            }).promise();

            console.log(`✅ Stored parameter: ${secret.name}`);
        } catch (error) {
            console.error(`❌ Failed to store parameter ${secret.name}:`, error.message);
            throw error;
        }
    }
}

async function deployStack() {
    console.log('☁️ Deploying CloudFormation stack...');

    const stackName = `lambdadeploy-codebuild-${process.env.NODE_ENV || 'dev'}`;
    const templatePath = path.join(__dirname, '../infrastructure/add-codebuild.yml');

    if (!fs.existsSync(templatePath)) {
        throw new Error(`CloudFormation template not found: ${templatePath}`);
    }

    const templateBody = fs.readFileSync(templatePath, 'utf8');

    const parameters = [
        {
            ParameterKey: 'ArtifactBucketName',
            ParameterValue: process.env.ARTIFACT_BUCKET_NAME || 'lambdadeploy-artifacts'
        }
    ];

    try {
        // Check if stack exists
        let stackExists = false;
        try {
            await cloudformation.describeStacks({ StackName: stackName }).promise();
            stackExists = true;
        } catch (error) {
            if (error.code !== 'ValidationError') {
                throw error;
            }
        }

        let operation;
        if (stackExists) {
            console.log(`📝 Updating existing stack: ${stackName}`);
            operation = cloudformation.updateStack({
                StackName: stackName,
                TemplateBody: templateBody,
                Parameters: parameters,
                Capabilities: ['CAPABILITY_NAMED_IAM']
            }).promise();
        } else {
            console.log(`🆕 Creating new stack: ${stackName}`);
            operation = cloudformation.createStack({
                StackName: stackName,
                TemplateBody: templateBody,
                Parameters: parameters,
                Capabilities: ['CAPABILITY_NAMED_IAM'],
                Tags: [
                    { Key: 'Project', Value: 'LambdaDeploy' },
                    { Key: 'Environment', Value: process.env.NODE_ENV || 'development' }
                ]
            }).promise();
        }

        await operation;

        // Wait for stack operation to complete
        console.log('⏳ Waiting for stack operation to complete...');
        const waitFor = stackExists ? 'stackUpdateComplete' : 'stackCreateComplete';
        await cloudformation.waitFor(waitFor, { StackName: stackName }).promise();

        // Get stack outputs
        const stackInfo = await cloudformation.describeStacks({ StackName: stackName }).promise();
        const outputs = stackInfo.Stacks[0].Outputs || [];

        console.log('✅ Stack deployment completed');
        console.log('\n📋 Stack Outputs:');
        outputs.forEach(output => {
            console.log(`  ${output.OutputKey}: ${output.OutputValue}`);
        });

        return outputs;

    } catch (error) {
        if (error.code === 'ValidationError' && error.message.includes('No updates')) {
            console.log('ℹ️ No changes detected in stack');
            return [];
        }
        throw error;
    }
}

// Run deployment if called directly
if (require.main === module) {
    deploy().catch(error => {
        console.error('Deployment failed:', error);
        process.exit(1);
    });
}

module.exports = { deploy };