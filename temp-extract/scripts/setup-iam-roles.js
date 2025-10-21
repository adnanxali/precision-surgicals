#!/usr/bin/env node

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1'
});

const iam = new AWS.IAM();

async function setupIAMRoles() {
    console.log('🔐 Setting up IAM roles for LambdaDeploy Pipeline...');
    
    try {
        // Create CodePipeline service role
        await createCodePipelineRole();
        
        // Create CodeBuild service role
        await createCodeBuildRole();
        
        // Create Lambda execution role
        await createLambdaRole();
        
        console.log('✅ All IAM roles created successfully!');
        console.log('\nNext steps:');
        console.log('1. Continue with Phase 3: Infrastructure Deployment');
        console.log('2. Run: npm run deploy');
        
    } catch (error) {
        console.error('❌ IAM role setup failed:', error.message);
        process.exit(1);
    }
}

async function createCodePipelineRole() {
    const roleName = 'CodePipelineServiceRole-LambdaDeploy';
    
    try {
        // Check if role already exists
        try {
            await iam.getRole({ RoleName: roleName }).promise();
            console.log(`ℹ️ Role ${roleName} already exists, skipping creation`);
            return;
        } catch (error) {
            if (error.code !== 'NoSuchEntity') {
                throw error;
            }
        }
        
        // Read trust policy
        const trustPolicy = fs.readFileSync(
            path.join(__dirname, '../infrastructure/iam/codepipeline-trust-policy.json'),
            'utf8'
        );
        
        // Create role
        await iam.createRole({
            RoleName: roleName,
            AssumeRolePolicyDocument: trustPolicy,
            Description: 'Service role for CodePipeline in LambdaDeploy Pipeline'
        }).promise();
        
        // Attach managed policies
        const policies = [
            'arn:aws:iam::aws:policy/AWSCodePipelineFullAccess',
            'arn:aws:iam::aws:policy/AmazonS3FullAccess',
            'arn:aws:iam::aws:policy/AWSCodeBuildDeveloperAccess',
            'arn:aws:iam::aws:policy/AWSLambdaRole'
        ];
        
        for (const policyArn of policies) {
            await iam.attachRolePolicy({
                RoleName: roleName,
                PolicyArn: policyArn
            }).promise();
        }
        
        console.log(`✅ Created CodePipeline service role: ${roleName}`);
        
    } catch (error) {
        console.error(`❌ Failed to create CodePipeline role: ${error.message}`);
        throw error;
    }
}

async function createCodeBuildRole() {
    const roleName = 'CodeBuildServiceRole-LambdaDeploy';
    
    try {
        // Check if role already exists
        try {
            await iam.getRole({ RoleName: roleName }).promise();
            console.log(`ℹ️ Role ${roleName} already exists, skipping creation`);
            return;
        } catch (error) {
            if (error.code !== 'NoSuchEntity') {
                throw error;
            }
        }
        
        // Read trust policy
        const trustPolicy = fs.readFileSync(
            path.join(__dirname, '../infrastructure/iam/codebuild-trust-policy.json'),
            'utf8'
        );
        
        // Create role
        await iam.createRole({
            RoleName: roleName,
            AssumeRolePolicyDocument: trustPolicy,
            Description: 'Service role for CodeBuild in LambdaDeploy Pipeline'
        }).promise();
        
        // Attach managed policies
        const policies = [
            'arn:aws:iam::aws:policy/AWSCodeBuildDeveloperAccess',
            'arn:aws:iam::aws:policy/CloudWatchLogsFullAccess',
            'arn:aws:iam::aws:policy/AmazonS3FullAccess'
        ];
        
        for (const policyArn of policies) {
            await iam.attachRolePolicy({
                RoleName: roleName,
                PolicyArn: policyArn
            }).promise();
        }
        
        // Create custom policy for Parameter Store access
        const customPolicy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Action: [
                        'ssm:GetParameter',
                        'ssm:GetParameters'
                    ],
                    Resource: `arn:aws:ssm:${process.env.AWS_REGION}:*:parameter/lambdadeploy/*`
                }
            ]
        };
        
        await iam.putRolePolicy({
            RoleName: roleName,
            PolicyName: 'ParameterStoreAccess',
            PolicyDocument: JSON.stringify(customPolicy)
        }).promise();
        
        console.log(`✅ Created CodeBuild service role: ${roleName}`);
        
    } catch (error) {
        console.error(`❌ Failed to create CodeBuild role: ${error.message}`);
        throw error;
    }
}

async function createLambdaRole() {
    const roleName = 'LambdaExecutionRole-LambdaDeploy';
    
    try {
        // Check if role already exists
        try {
            await iam.getRole({ RoleName: roleName }).promise();
            console.log(`ℹ️ Role ${roleName} already exists, skipping creation`);
            return;
        } catch (error) {
            if (error.code !== 'NoSuchEntity') {
                throw error;
            }
        }
        
        // Read trust policy
        const trustPolicy = fs.readFileSync(
            path.join(__dirname, '../infrastructure/iam/lambda-trust-policy.json'),
            'utf8'
        );
        
        // Create role
        await iam.createRole({
            RoleName: roleName,
            AssumeRolePolicyDocument: trustPolicy,
            Description: 'Execution role for Lambda functions in LambdaDeploy Pipeline'
        }).promise();
        
        // Attach managed policies
        const policies = [
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        ];
        
        for (const policyArn of policies) {
            await iam.attachRolePolicy({
                RoleName: roleName,
                PolicyArn: policyArn
            }).promise();
        }
        
        // Create custom policy for Lambda functions
        const customPolicy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Action: [
                        'codepipeline:PutJobSuccessResult',
                        'codepipeline:PutJobFailureResult',
                        'codepipeline:GetPipelineExecution'
                    ],
                    Resource: '*'
                },
                {
                    Effect: 'Allow',
                    Action: [
                        'lambda:UpdateFunctionCode',
                        'lambda:UpdateFunctionConfiguration'
                    ],
                    Resource: '*'
                },
                {
                    Effect: 'Allow',
                    Action: [
                        'ses:SendEmail'
                    ],
                    Resource: '*'
                },
                {
                    Effect: 'Allow',
                    Action: [
                        'ssm:GetParameter'
                    ],
                    Resource: `arn:aws:ssm:${process.env.AWS_REGION}:*:parameter/lambdadeploy/*`
                },
                {
                    Effect: 'Allow',
                    Action: [
                        's3:GetObject',
                        's3:PutObject'
                    ],
                    Resource: 'arn:aws:s3:::lambdadeploy-artifacts-*/*'
                }
            ]
        };
        
        await iam.putRolePolicy({
            RoleName: roleName,
            PolicyName: 'LambdaDeployPolicy',
            PolicyDocument: JSON.stringify(customPolicy)
        }).promise();
        
        console.log(`✅ Created Lambda execution role: ${roleName}`);
        
    } catch (error) {
        console.error(`❌ Failed to create Lambda role: ${error.message}`);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    setupIAMRoles().catch(error => {
        console.error('IAM setup failed:', error);
        process.exit(1);
    });
}

module.exports = { setupIAMRoles };