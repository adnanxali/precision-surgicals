#!/usr/bin/env node

require('dotenv').config();
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

async function validateConfiguration() {
    console.log('🔍 Validating GitHub Integration Configuration\n');
    
    const errors = [];
    const warnings = [];
    
    // Check required environment variables
    const requiredVars = {
        'REPOSITORY_OWNER': process.env.REPOSITORY_OWNER,
        'REPOSITORY_NAME': process.env.REPOSITORY_NAME,
        'GITHUB_TOKEN': process.env.GITHUB_TOKEN,
        'AWS_REGION': process.env.AWS_REGION,
        'AWS_ACCOUNT_ID': process.env.AWS_ACCOUNT_ID
    };
    
    console.log('📋 Environment Variables:');
    for (const [key, value] of Object.entries(requiredVars)) {
        if (!value || value.includes('dummy') || value.includes('test-user')) {
            console.log(`❌ ${key}: ${value || 'NOT SET'}`);
            errors.push(`${key} is not properly configured`);
        } else if (key === 'GITHUB_TOKEN') {
            console.log(`✅ ${key}: ${'*'.repeat(value.length)} (${value.length} chars)`);
        } else {
            console.log(`✅ ${key}: ${value}`);
        }
    }
    
    // Validate GitHub token format
    if (process.env.GITHUB_TOKEN) {
        if (!process.env.GITHUB_TOKEN.startsWith('ghp_') && !process.env.GITHUB_TOKEN.startsWith('github_pat_')) {
            warnings.push('GitHub token format looks unusual. Modern tokens start with "ghp_" or "github_pat_"');
        }
        if (process.env.GITHUB_TOKEN.length < 40) {
            warnings.push('GitHub token seems too short. Personal access tokens are typically 40+ characters');
        }
    }
    
    // Validate AWS configuration
    try {
        console.log('\n🔐 AWS Configuration:');
        const sts = new STSClient({ region: process.env.AWS_REGION });
        const identity = await sts.send(new GetCallerIdentityCommand({}));
        
        console.log(`✅ AWS Account ID: ${identity.Account}`);
        console.log(`✅ AWS User/Role: ${identity.Arn}`);
        
        if (identity.Account !== process.env.AWS_ACCOUNT_ID) {
            warnings.push(`AWS Account ID mismatch: .env has ${process.env.AWS_ACCOUNT_ID}, but AWS CLI is using ${identity.Account}`);
        }
        
    } catch (error) {
        console.log(`❌ AWS CLI Error: ${error.message}`);
        errors.push('AWS CLI is not properly configured or lacks permissions');
    }
    
    // Check repository URL format
    if (process.env.REPOSITORY_URL) {
        const expectedUrl = `https://github.com/${process.env.REPOSITORY_OWNER}/${process.env.REPOSITORY_NAME}`;
        if (process.env.REPOSITORY_URL !== expectedUrl) {
            warnings.push(`Repository URL mismatch. Expected: ${expectedUrl}, Got: ${process.env.REPOSITORY_URL}`);
        }
    }
    
    // Check for required files
    console.log('\n📁 Required Files:');
    const requiredFiles = [
        'infrastructure/github-integration.yml',
        'scripts/setup-github-integration.js',
        'package.json',
        'buildspec.yml'
    ];
    
    const fs = require('fs');
    for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
            console.log(`✅ ${file}`);
        } else {
            console.log(`❌ ${file}`);
            errors.push(`Missing required file: ${file}`);
        }
    }
    
    // Summary
    console.log('\n📊 Validation Summary:');
    
    if (errors.length === 0) {
        console.log('✅ Configuration looks good!');
        
        if (warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            warnings.forEach(warning => console.log(`   • ${warning}`));
        }
        
        console.log('\n🚀 Ready to run: node scripts/setup-github-integration.js');
        
    } else {
        console.log('❌ Configuration issues found:');
        errors.forEach(error => console.log(`   • ${error}`));
        
        if (warnings.length > 0) {
            console.log('\n⚠️  Additional warnings:');
            warnings.forEach(warning => console.log(`   • ${warning}`));
        }
        
        console.log('\n🔧 Please fix the issues above before proceeding.');
        process.exit(1);
    }
}

// GitHub token setup instructions
function showSetupInstructions() {
    console.log('\n📝 Quick Setup Instructions:');
    console.log('1. Create GitHub Personal Access Token:');
    console.log('   https://github.com/settings/tokens');
    console.log('   Scopes needed: repo, admin:repo_hook');
    console.log('');
    console.log('2. Update your .env file with:');
    console.log('   GITHUB_TOKEN=your_actual_token');
    console.log('   REPOSITORY_OWNER=your_github_username');
    console.log('   REPOSITORY_NAME=your_repo_name');
    console.log('');
    console.log('3. Verify AWS CLI is configured:');
    console.log('   aws sts get-caller-identity');
    console.log('');
}

if (require.main === module) {
    validateConfiguration().catch(error => {
        console.error('❌ Validation failed:', error.message);
        showSetupInstructions();
        process.exit(1);
    });
}

module.exports = { validateConfiguration };