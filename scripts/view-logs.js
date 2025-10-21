#!/usr/bin/env node

const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1'
});

const logs = new AWS.CloudWatchLogs();
const codepipeline = new AWS.CodePipeline();

async function viewLogs() {
    console.log('📋 LambdaDeploy Pipeline Logs Viewer');
    console.log('=====================================\n');
    
    try {
        const command = process.argv[2];
        
        switch (command) {
            case 'pipeline':
                await viewPipelineLogs();
                break;
            case 'build':
                await viewBuildLogs();
                break;
            case 'lambda':
                await viewLambdaLogs();
                break;
            case 'all':
                await viewAllLogs();
                break;
            default:
                showUsage();
        }
        
    } catch (error) {
        console.error('❌ Failed to retrieve logs:', error.message);
        process.exit(1);
    }
}

function showUsage() {
    console.log('Usage: node view-logs.js <command>');
    console.log('\nCommands:');
    console.log('  pipeline  - View CodePipeline execution history');
    console.log('  build     - View CodeBuild logs');
    console.log('  lambda    - View Lambda function logs');
    console.log('  all       - View all logs');
    console.log('\nExamples:');
    console.log('  node scripts/view-logs.js pipeline');
    console.log('  node scripts/view-logs.js build');
    console.log('  node scripts/view-logs.js lambda');
}

async function viewPipelineLogs() {
    console.log('🔍 Pipeline Execution History\n');
    
    const pipelineName = process.env.PIPELINE_NAME || 'lambdadeploy-pipeline';
    
    try {
        const executions = await codepipeline.listPipelineExecutions({
            pipelineName: pipelineName,
            maxResults: 10
        }).promise();
        
        if (executions.pipelineExecutionSummaries.length === 0) {
            console.log('No pipeline executions found');
            return;
        }
        
        console.log('Recent Pipeline Executions:');
        console.log('---------------------------');
        
        executions.pipelineExecutionSummaries.forEach((execution, index) => {
            const status = execution.status;
            const startTime = execution.startTime;
            const endTime = execution.lastUpdateTime;
            const duration = endTime ? Math.round((endTime - startTime) / 1000) : 'Running';
            
            const statusIcon = getStatusIcon(status);
            
            console.log(`${index + 1}. ${statusIcon} ${execution.pipelineExecutionId.substring(0, 8)}...`);
            console.log(`   Status: ${status}`);
            console.log(`   Started: ${startTime.toISOString()}`);
            console.log(`   Duration: ${duration}s`);
            
            if (execution.trigger) {
                console.log(`   Trigger: ${execution.trigger.triggerType}`);
            }
            
            console.log('');
        });
        
    } catch (error) {
        console.error(`Failed to get pipeline executions: ${error.message}`);
    }
}

async function viewBuildLogs() {
    console.log('🔨 CodeBuild Logs\n');
    
    const logGroupName = '/aws/codebuild/lambdadeploy-build';
    
    try {
        const logStreams = await logs.describeLogStreams({
            logGroupName: logGroupName,
            orderBy: 'LastEventTime',
            descending: true,
            limit: 5
        }).promise();
        
        if (logStreams.logStreams.length === 0) {
            console.log('No build logs found');
            return;
        }
        
        console.log('Recent Build Logs:');
        console.log('------------------');
        
        for (const stream of logStreams.logStreams.slice(0, 3)) {
            console.log(`\n📝 Build: ${stream.logStreamName}`);
            console.log(`   Last Event: ${new Date(stream.lastEventTime).toISOString()}`);
            
            const events = await logs.getLogEvents({
                logGroupName: logGroupName,
                logStreamName: stream.logStreamName,
                limit: 20,
                startFromHead: false
            }).promise();
            
            events.events.forEach(event => {
                const timestamp = new Date(event.timestamp).toISOString();
                console.log(`   ${timestamp}: ${event.message.trim()}`);
            });
        }
        
    } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
            console.log('Build log group not found. No builds have run yet.');
        } else {
            console.error(`Failed to get build logs: ${error.message}`);
        }
    }
}

async function viewLambdaLogs() {
    console.log('⚡ Lambda Function Logs\n');
    
    const functions = [
        'lambdadeploy-notification-handler',
        'lambdadeploy-deployment-orchestrator',
        'lambdadeploy-app'
    ];
    
    for (const functionName of functions) {
        console.log(`📋 ${functionName}:`);
        console.log(''.padEnd(functionName.length + 4, '-'));
        
        const logGroupName = `/aws/lambda/${functionName}`;
        
        try {
            const logStreams = await logs.describeLogStreams({
                logGroupName: logGroupName,
                orderBy: 'LastEventTime',
                descending: true,
                limit: 3
            }).promise();
            
            if (logStreams.logStreams.length === 0) {
                console.log('No logs found for this function\n');
                continue;
            }
            
            for (const stream of logStreams.logStreams.slice(0, 2)) {
                const events = await logs.getLogEvents({
                    logGroupName: logGroupName,
                    logStreamName: stream.logStreamName,
                    limit: 10,
                    startFromHead: false
                }).promise();
                
                events.events.forEach(event => {
                    const timestamp = new Date(event.timestamp).toISOString();
                    console.log(`${timestamp}: ${event.message.trim()}`);
                });
            }
            
            console.log('');
            
        } catch (error) {
            if (error.code === 'ResourceNotFoundException') {
                console.log('Log group not found. Function may not have been invoked yet.\n');
            } else {
                console.error(`Failed to get logs for ${functionName}: ${error.message}\n`);
            }
        }
    }
}

async function viewAllLogs() {
    await viewPipelineLogs();
    console.log('\n' + '='.repeat(50) + '\n');
    await viewBuildLogs();
    console.log('\n' + '='.repeat(50) + '\n');
    await viewLambdaLogs();
}

function getStatusIcon(status) {
    switch (status) {
        case 'Succeeded':
            return '✅';
        case 'Failed':
            return '❌';
        case 'InProgress':
            return '🔄';
        case 'Stopped':
            return '⏹️';
        case 'Stopping':
            return '⏸️';
        default:
            return '❓';
    }
}

// Run if called directly
if (require.main === module) {
    viewLogs().catch(error => {
        console.error('Failed to view logs:', error);
        process.exit(1);
    });
}

module.exports = { viewLogs };