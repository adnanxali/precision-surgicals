const AWS = require('aws-sdk');

const codepipeline = new AWS.CodePipeline();
const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

exports.handler = async (event) => {
    console.log('Deployment orchestrator triggered:', JSON.stringify(event, null, 2));
    
    try {
        // Extract CodePipeline job data
        const jobId = event['CodePipeline.job'].id;
        const jobData = event['CodePipeline.job'].data;
        const inputArtifacts = jobData.inputArtifacts;
        const outputArtifacts = jobData.outputArtifacts;
        
        console.log('Processing deployment job:', jobId);
        
        // Get deployment configuration
        const config = await getDeploymentConfig(jobData);
        
        // Download and process artifacts
        const artifacts = await processArtifacts(inputArtifacts);
        
        // Execute deployment based on configuration
        const deploymentResult = await executeDeployment(config, artifacts);
        
        // Update output artifacts if needed
        if (outputArtifacts && outputArtifacts.length > 0) {
            await updateOutputArtifacts(outputArtifacts, deploymentResult);
        }
        
        // Signal success to CodePipeline
        await codepipeline.putJobSuccessResult({
            jobId: jobId,
            outputVariables: {
                deploymentStatus: 'SUCCESS',
                deploymentTime: new Date().toISOString(),
                deployedVersion: deploymentResult.version || 'unknown'
            }
        }).promise();
        
        console.log('Deployment completed successfully');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Deployment orchestrated successfully',
                jobId,
                result: deploymentResult
            })
        };
        
    } catch (error) {
        console.error('Deployment orchestration failed:', error);
        
        // Signal failure to CodePipeline
        if (event['CodePipeline.job']) {
            await codepipeline.putJobFailureResult({
                jobId: event['CodePipeline.job'].id,
                failureDetails: {
                    message: error.message,
                    type: 'JobFailed'
                }
            }).promise();
        }
        
        throw error;
    }
};

async function getDeploymentConfig(jobData) {
    // Extract configuration from job data or environment variables
    const config = {
        deploymentType: process.env.DEPLOYMENT_TYPE || 'lambda',
        targetFunction: process.env.TARGET_FUNCTION_NAME || 'lambdadeploy-app',
        environment: process.env.ENVIRONMENT || 'development',
        region: process.env.AWS_REGION || 'us-east-1'
    };
    
    // Override with job-specific configuration if available
    if (jobData.actionConfiguration && jobData.actionConfiguration.configuration) {
        const actionConfig = jobData.actionConfiguration.configuration;
        Object.assign(config, actionConfig);
    }
    
    console.log('Deployment configuration:', config);
    return config;
}

async function processArtifacts(inputArtifacts) {
    const artifacts = {};
    
    for (const artifact of inputArtifacts) {
        console.log('Processing artifact:', artifact.name);
        
        const location = artifact.location.s3Location;
        const bucketName = location.bucketName;
        const objectKey = location.objectKey;
        
        // Download artifact from S3
        const artifactData = await s3.getObject({
            Bucket: bucketName,
            Key: objectKey
        }).promise();
        
        artifacts[artifact.name] = {
            data: artifactData.Body,
            metadata: artifactData.Metadata,
            contentType: artifactData.ContentType
        };
    }
    
    return artifacts;
}

async function executeDeployment(config, artifacts) {
    console.log('Executing deployment with type:', config.deploymentType);
    
    switch (config.deploymentType) {
        case 'lambda':
            return await deployToLambda(config, artifacts);
        case 'ecs':
            return await deployToECS(config, artifacts);
        case 's3':
            return await deployToS3(config, artifacts);
        default:
            throw new Error(`Unsupported deployment type: ${config.deploymentType}`);
    }
}

async function deployToLambda(config, artifacts) {
    console.log('Deploying to Lambda function:', config.targetFunction);
    
    // Find the application artifact
    const appArtifact = artifacts['BuildArtifact'] || artifacts['SourceOutput'];
    if (!appArtifact) {
        throw new Error('No application artifact found for Lambda deployment');
    }
    
    try {
        // Update Lambda function code
        const updateResult = await lambda.updateFunctionCode({
            FunctionName: config.targetFunction,
            ZipFile: appArtifact.data
        }).promise();
        
        console.log('Lambda function updated:', updateResult.FunctionArn);
        
        // Wait for function to be updated
        await lambda.waitFor('functionUpdated', {
            FunctionName: config.targetFunction
        }).promise();
        
        // Update function configuration if needed
        if (config.environment !== 'production') {
            await lambda.updateFunctionConfiguration({
                FunctionName: config.targetFunction,
                Environment: {
                    Variables: {
                        NODE_ENV: config.environment,
                        DEPLOYMENT_TIME: new Date().toISOString()
                    }
                }
            }).promise();
        }
        
        return {
            type: 'lambda',
            functionArn: updateResult.FunctionArn,
            version: updateResult.Version,
            lastModified: updateResult.LastModified
        };
        
    } catch (error) {
        console.error('Lambda deployment failed:', error);
        throw new Error(`Lambda deployment failed: ${error.message}`);
    }
}

async function deployToECS(config, artifacts) {
    console.log('Deploying to ECS service:', config.serviceName);
    
    const ecs = new AWS.ECS();
    
    try {
        // Update ECS service with new task definition
        const updateResult = await ecs.updateService({
            cluster: config.clusterName || 'default',
            service: config.serviceName,
            forceNewDeployment: true
        }).promise();
        
        return {
            type: 'ecs',
            serviceArn: updateResult.service.serviceArn,
            taskDefinition: updateResult.service.taskDefinition
        };
        
    } catch (error) {
        console.error('ECS deployment failed:', error);
        throw new Error(`ECS deployment failed: ${error.message}`);
    }
}

async function deployToS3(config, artifacts) {
    console.log('Deploying to S3 bucket:', config.bucketName);
    
    try {
        const appArtifact = artifacts['BuildArtifact'] || artifacts['SourceOutput'];
        if (!appArtifact) {
            throw new Error('No application artifact found for S3 deployment');
        }
        
        // Upload to S3
        const uploadResult = await s3.upload({
            Bucket: config.bucketName,
            Key: `deployments/${Date.now()}/app.zip`,
            Body: appArtifact.data,
            ContentType: 'application/zip'
        }).promise();
        
        return {
            type: 's3',
            location: uploadResult.Location,
            etag: uploadResult.ETag
        };
        
    } catch (error) {
        console.error('S3 deployment failed:', error);
        throw new Error(`S3 deployment failed: ${error.message}`);
    }
}

async function updateOutputArtifacts(outputArtifacts, deploymentResult) {
    for (const artifact of outputArtifacts) {
        const location = artifact.location.s3Location;
        
        // Create deployment summary
        const summary = {
            deploymentResult,
            timestamp: new Date().toISOString(),
            status: 'SUCCESS'
        };
        
        await s3.putObject({
            Bucket: location.bucketName,
            Key: location.objectKey,
            Body: JSON.stringify(summary, null, 2),
            ContentType: 'application/json'
        }).promise();
        
        console.log('Output artifact updated:', artifact.name);
    }
}