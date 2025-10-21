#!/usr/bin/env node

const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1'
});

const codebuild = new AWS.CodeBuild();
const s3 = new AWS.S3();

async function setupPhase4() {
    console.log('🚀 Setting up Phase 4: CodeBuild Integration...');
    
    try {
        // Create S3 bucket for CodeBuild artifacts
        await createArtifactBucket();
        
        // Create CodeBuild project
        await createCodeBuildProject();
        
        // Test CodeBuild project
        await testCodeBuildProject();
        
        console.log('✅ Phase 4 setup completed successfully!');
        console.log('\nWhat was created:');
        console.log('- S3 bucket for build artifacts');
        console.log('- CodeBuild project for CI/CD');
        console.log('- Test build execution');
        
    } catch (error) {
        console.error('❌ Phase 4 setup failed:', error.message);
        process.exit(1);
    }
}

async function createArtifactBucket() {
    const bucketName = `lambdadeploy-phase4-${process.env.AWS_ACCOUNT_ID || '654654270223'}`;
    
    try {
        await s3.createBucket({
            Bucket: bucketName,
            CreateBucketConfiguration: {
                LocationConstraint: process.env.AWS_REGION === 'us-east-1' ? undefined : process.env.AWS_REGION
            }
        }).promise();
        
        // Enable versioning
        await s3.putBucketVersioning({
            Bucket: bucketName,
            VersioningConfiguration: {
                Status: 'Enabled'
            }
        }).promise();
        
        console.log(`✅ Created S3 bucket: ${bucketName}`);
        return bucketName;
        
    } catch (error) {
        if (error.code === 'BucketAlreadyOwnedByYou') {
            console.log(`ℹ️ S3 bucket already exists: ${bucketName}`);
            return bucketName;
        }
        throw error;
    }
}

async function createCodeBuildProject() {
    const projectName = 'lambdadeploy-phase4-build';
    
    try {
        const project = await codebuild.createProject({
            name: projectName,
            description: 'LambdaDeploy Pipeline - Phase 4 CodeBuild Project',
            source: {
                type: 'NO_SOURCE',
                buildspec: `version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 18
    commands:
      - echo "Phase 4 - CodeBuild Integration Test"
      - echo "Installing dependencies..."
  pre_build:
    commands:
      - echo "Pre-build phase"
      - echo "Current directory: $(pwd)"
      - echo "Available commands: $(which node npm)"
  build:
    commands:
      - echo "Build phase"
      - echo "Node version: $(node --version)"
      - echo "NPM version: $(npm --version)"
      - echo "Build completed successfully!"
  post_build:
    commands:
      - echo "Post-build phase"
      - echo "Phase 4 setup complete!"
      - echo "Ready for full CI/CD pipeline"
`
            },
            artifacts: {
                type: 'NO_ARTIFACTS'
            },
            environment: {
                type: 'LINUX_CONTAINER',
                image: 'aws/codebuild/amazonlinux2-x86_64-standard:4.0',
                computeType: 'BUILD_GENERAL1_SMALL'
            },
            serviceRole: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID || '654654270223'}:role/CodeBuildServiceRole-LambdaDeploy`
        }).promise();
        
        console.log(`✅ Created CodeBuild project: ${projectName}`);
        return project;
        
    } catch (error) {
        if (error.code === 'ResourceAlreadyExistsException') {
            console.log(`ℹ️ CodeBuild project already exists: ${projectName}`);
            return { project: { name: projectName } };
        }
        throw error;
    }
}

async function testCodeBuildProject() {
    const projectName = 'lambdadeploy-phase4-build';
    
    try {
        console.log('🔨 Starting test build...');
        
        const build = await codebuild.startBuild({
            projectName: projectName
        }).promise();
        
        console.log(`✅ Test build started: ${build.build.id}`);
        console.log('📋 Build status: IN_PROGRESS');
        console.log('\nYou can monitor the build in the AWS Console:');
        console.log(`https://console.aws.amazon.com/codesuite/codebuild/projects/${projectName}/build/${build.build.id}/log`);
        
        return build;
        
    } catch (error) {
        console.error('❌ Failed to start test build:', error.message);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    setupPhase4().catch(error => {
        console.error('Phase 4 setup failed:', error);
        process.exit(1);
    });
}

module.exports = { setupPhase4 };