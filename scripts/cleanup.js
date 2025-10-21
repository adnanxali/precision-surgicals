#!/usr/bin/env node

const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1'
});

const cloudformation = new AWS.CloudFormation();
const s3 = new AWS.S3();
const ssm = new AWS.SSM();

async function cleanup() {
    console.log('🧹 Starting cleanup process...');
    
    try {
        const stackName = `lambdadeploy-pipeline-${process.env.NODE_ENV || 'dev'}`;
        
        // Get stack information before deletion
        const stackInfo = await getStackInfo(stackName);
        
        if (!stackInfo) {
            console.log('ℹ️ Stack not found, nothing to clean up');
            return;
        }
        
        // Empty S3 buckets before stack deletion
        await emptyS3Buckets(stackInfo);
        
        // Delete CloudFormation stack
        await deleteStack(stackName);
        
        // Clean up Parameter Store parameters
        await cleanupParameters();
        
        console.log('✅ Cleanup completed successfully!');
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        process.exit(1);
    }
}

async function getStackInfo(stackName) {
    try {
        const result = await cloudformation.describeStacks({ StackName: stackName }).promise();
        return result.Stacks[0];
    } catch (error) {
        if (error.code === 'ValidationError') {
            return null;
        }
        throw error;
    }
}

async function emptyS3Buckets(stackInfo) {
    console.log('🗑️ Emptying S3 buckets...');
    
    const resources = await cloudformation.listStackResources({
        StackName: stackInfo.StackName
    }).promise();
    
    const s3Buckets = resources.StackResourceSummaries
        .filter(resource => resource.ResourceType === 'AWS::S3::Bucket')
        .map(resource => resource.PhysicalResourceId);
    
    for (const bucketName of s3Buckets) {
        try {
            console.log(`🗑️ Emptying bucket: ${bucketName}`);
            
            // List all objects in the bucket
            const objects = await s3.listObjectsV2({ Bucket: bucketName }).promise();
            
            if (objects.Contents && objects.Contents.length > 0) {
                // Delete all objects
                const deleteParams = {
                    Bucket: bucketName,
                    Delete: {
                        Objects: objects.Contents.map(obj => ({ Key: obj.Key }))
                    }
                };
                
                await s3.deleteObjects(deleteParams).promise();
                console.log(`✅ Emptied bucket: ${bucketName}`);
            } else {
                console.log(`ℹ️ Bucket already empty: ${bucketName}`);
            }
            
            // List and delete all object versions (for versioned buckets)
            const versions = await s3.listObjectVersions({ Bucket: bucketName }).promise();
            
            if (versions.Versions && versions.Versions.length > 0) {
                const deleteVersionsParams = {
                    Bucket: bucketName,
                    Delete: {
                        Objects: versions.Versions.map(version => ({
                            Key: version.Key,
                            VersionId: version.VersionId
                        }))
                    }
                };
                
                await s3.deleteObjects(deleteVersionsParams).promise();
                console.log(`✅ Deleted all versions from bucket: ${bucketName}`);
            }
            
            // Delete delete markers
            if (versions.DeleteMarkers && versions.DeleteMarkers.length > 0) {
                const deleteMarkersParams = {
                    Bucket: bucketName,
                    Delete: {
                        Objects: versions.DeleteMarkers.map(marker => ({
                            Key: marker.Key,
                            VersionId: marker.VersionId
                        }))
                    }
                };
                
                await s3.deleteObjects(deleteMarkersParams).promise();
                console.log(`✅ Deleted all delete markers from bucket: ${bucketName}`);
            }
            
        } catch (error) {
            if (error.code === 'NoSuchBucket') {
                console.log(`ℹ️ Bucket does not exist: ${bucketName}`);
            } else {
                console.error(`❌ Failed to empty bucket ${bucketName}:`, error.message);
                throw error;
            }
        }
    }
}

async function deleteStack(stackName) {
    console.log(`🗑️ Deleting CloudFormation stack: ${stackName}`);
    
    try {
        await cloudformation.deleteStack({ StackName: stackName }).promise();
        
        console.log('⏳ Waiting for stack deletion to complete...');
        await cloudformation.waitFor('stackDeleteComplete', { StackName: stackName }).promise();
        
        console.log('✅ Stack deleted successfully');
        
    } catch (error) {
        if (error.code === 'ValidationError' && error.message.includes('does not exist')) {
            console.log('ℹ️ Stack does not exist');
        } else {
            throw error;
        }
    }
}

async function cleanupParameters() {
    console.log('🧹 Cleaning up Parameter Store parameters...');
    
    const parameterNames = [
        '/lambdadeploy/slack-webhook-url',
        '/lambdadeploy/github-token'
    ];
    
    for (const parameterName of parameterNames) {
        try {
            await ssm.deleteParameter({ Name: parameterName }).promise();
            console.log(`✅ Deleted parameter: ${parameterName}`);
        } catch (error) {
            if (error.code === 'ParameterNotFound') {
                console.log(`ℹ️ Parameter not found: ${parameterName}`);
            } else {
                console.error(`❌ Failed to delete parameter ${parameterName}:`, error.message);
            }
        }
    }
}

// Run cleanup if called directly
if (require.main === module) {
    const readline = require('readline');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('⚠️ This will delete all LambdaDeploy Pipeline resources. Are you sure? (yes/no): ', (answer) => {
        rl.close();
        
        if (answer.toLowerCase() === 'yes') {
            cleanup().catch(error => {
                console.error('Cleanup failed:', error);
                process.exit(1);
            });
        } else {
            console.log('Cleanup cancelled');
        }
    });
}

module.exports = { cleanup };