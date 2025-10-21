const AWS = require('aws-sdk');
const axios = require('axios');

const codepipeline = new AWS.CodePipeline();

exports.handler = async (event) => {
    console.log('Notification handler triggered:', JSON.stringify(event, null, 2));
    
    try {
        // Parse the CodePipeline event
        const detail = event.detail;
        const pipelineName = detail.pipeline;
        const executionId = detail['execution-id'];
        const state = detail.state;
        
        // Get pipeline execution details
        const pipelineExecution = await codepipeline.getPipelineExecution({
            pipelineName: pipelineName,
            pipelineExecutionId: executionId
        }).promise();
        
        // Prepare notification message
        const message = await buildSlackMessage(pipelineName, state, pipelineExecution);
        
        // Send Slack notification
        if (process.env.SLACK_WEBHOOK_URL) {
            await sendSlackNotification(message);
        }
        
        // Send email notification if enabled
        if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true') {
            await sendEmailNotification(message);
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Notification sent successfully',
                pipelineName,
                state,
                executionId
            })
        };
        
    } catch (error) {
        console.error('Error processing notification:', error);
        
        // Send error notification
        await sendErrorNotification(error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to process notification',
                details: error.message
            })
        };
    }
};

async function buildSlackMessage(pipelineName, state, execution) {
    const timestamp = new Date().toISOString();
    const executionId = execution.pipelineExecutionId;
    const trigger = execution.trigger || {};
    
    let color = '#36a64f'; // green
    let emoji = '✅';
    
    if (state === 'FAILED') {
        color = '#ff0000'; // red
        emoji = '❌';
    } else if (state === 'STARTED') {
        color = '#ffaa00'; // orange
        emoji = '🚀';
    }
    
    const message = {
        username: 'LambdaDeploy Pipeline',
        icon_emoji: ':rocket:',
        attachments: [
            {
                color: color,
                title: `${emoji} Pipeline ${state}`,
                title_link: `https://console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipelineName}/view`,
                fields: [
                    {
                        title: 'Pipeline',
                        value: pipelineName,
                        short: true
                    },
                    {
                        title: 'Status',
                        value: state,
                        short: true
                    },
                    {
                        title: 'Execution ID',
                        value: executionId.substring(0, 8) + '...',
                        short: true
                    },
                    {
                        title: 'Timestamp',
                        value: timestamp,
                        short: true
                    }
                ],
                footer: 'LambdaDeploy Pipeline',
                ts: Math.floor(Date.now() / 1000)
            }
        ]
    };
    
    // Add trigger information if available
    if (trigger.triggerType === 'Webhook') {
        message.attachments[0].fields.push({
            title: 'Triggered by',
            value: `Git commit: ${trigger.triggerDetail || 'Unknown'}`,
            short: false
        });
    }
    
    return message;
}

async function sendSlackNotification(message) {
    try {
        const response = await axios.post(process.env.SLACK_WEBHOOK_URL, message, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Slack notification sent successfully:', response.status);
    } catch (error) {
        console.error('Failed to send Slack notification:', error.message);
        throw error;
    }
}

async function sendEmailNotification(message) {
    const ses = new AWS.SES();
    
    try {
        const params = {
            Destination: {
                ToAddresses: [process.env.NOTIFICATION_EMAIL]
            },
            Message: {
                Body: {
                    Text: {
                        Data: JSON.stringify(message, null, 2)
                    }
                },
                Subject: {
                    Data: `LambdaDeploy Pipeline Notification - ${message.attachments[0].fields[1].value}`
                }
            },
            Source: process.env.NOTIFICATION_EMAIL
        };
        
        await ses.sendEmail(params).promise();
        console.log('Email notification sent successfully');
    } catch (error) {
        console.error('Failed to send email notification:', error.message);
        throw error;
    }
}

async function sendErrorNotification(error) {
    if (!process.env.SLACK_WEBHOOK_URL) return;
    
    const errorMessage = {
        username: 'LambdaDeploy Pipeline',
        icon_emoji: ':warning:',
        attachments: [
            {
                color: '#ff0000',
                title: '🚨 Notification Handler Error',
                fields: [
                    {
                        title: 'Error',
                        value: error.message,
                        short: false
                    },
                    {
                        title: 'Timestamp',
                        value: new Date().toISOString(),
                        short: true
                    }
                ],
                footer: 'LambdaDeploy Pipeline Error Handler'
            }
        ]
    };
    
    try {
        await axios.post(process.env.SLACK_WEBHOOK_URL, errorMessage);
    } catch (slackError) {
        console.error('Failed to send error notification to Slack:', slackError.message);
    }
}