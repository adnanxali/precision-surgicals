const AWS = require('aws-sdk');

// Sample application that will be deployed by the pipeline
exports.handler = async (event, context) => {
    console.log('LambdaDeploy App triggered:', JSON.stringify(event, null, 2));
    
    const response = {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            message: 'Hello from LambdaDeploy Pipeline!',
            timestamp: new Date().toISOString(),
            version: process.env.APP_VERSION || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            deploymentTime: process.env.DEPLOYMENT_TIME || 'unknown',
            requestId: context.requestId,
            functionName: context.functionName,
            functionVersion: context.functionVersion,
            memoryLimitInMB: context.memoryLimitInMB,
            remainingTimeInMillis: context.getRemainingTimeInMillis()
        })
    };
    
    // Log deployment info
    console.log('App response:', response);
    
    return response;
};

// Health check endpoint
exports.healthCheck = async (event, context) => {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.APP_VERSION || '1.0.0'
        })
    };
};