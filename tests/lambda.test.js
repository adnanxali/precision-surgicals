const { handler: notificationHandler } = require('../src/lambda/notification-handler');
const { handler: deploymentOrchestrator } = require('../src/lambda/deployment-orchestrator');
const { handler: sampleApp } = require('../src/app');

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
    CodePipeline: jest.fn(() => ({
        getPipelineExecution: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({
                pipelineExecutionId: 'test-execution-id',
                trigger: { triggerType: 'Webhook' }
            })
        }),
        putJobSuccessResult: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({})
        }),
        putJobFailureResult: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({})
        })
    })),
    Lambda: jest.fn(() => ({
        updateFunctionCode: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({
                FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
                Version: '1',
                LastModified: '2023-01-01T00:00:00.000Z'
            })
        }),
        waitFor: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({})
        }),
        updateFunctionConfiguration: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({})
        })
    })),
    S3: jest.fn(() => ({
        getObject: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({
                Body: Buffer.from('test-artifact-data'),
                Metadata: {},
                ContentType: 'application/zip'
            })
        }),
        putObject: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({})
        })
    })),
    SES: jest.fn(() => ({
        sendEmail: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({})
        })
    }))
}));

// Mock axios
jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({ status: 200 })
}));

describe('Notification Handler', () => {
    beforeEach(() => {
        process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
        jest.clearAllMocks();
    });

    test('should handle pipeline success notification', async () => {
        const event = {
            detail: {
                pipeline: 'test-pipeline',
                'execution-id': 'test-execution-id',
                state: 'SUCCEEDED'
            }
        };

        const result = await notificationHandler(event);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body).message).toBe('Notification sent successfully');
    });

    test('should handle pipeline failure notification', async () => {
        const event = {
            detail: {
                pipeline: 'test-pipeline',
                'execution-id': 'test-execution-id',
                state: 'FAILED'
            }
        };

        const result = await notificationHandler(event);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body).state).toBe('FAILED');
    });

    test('should handle missing Slack webhook URL', async () => {
        delete process.env.SLACK_WEBHOOK_URL;

        const event = {
            detail: {
                pipeline: 'test-pipeline',
                'execution-id': 'test-execution-id',
                state: 'SUCCEEDED'
            }
        };

        const result = await notificationHandler(event);

        expect(result.statusCode).toBe(200);
    });
});

describe('Deployment Orchestrator', () => {
    beforeEach(() => {
        process.env.TARGET_FUNCTION_NAME = 'test-function';
        process.env.DEPLOYMENT_TYPE = 'lambda';
        jest.clearAllMocks();
    });

    test('should handle Lambda deployment successfully', async () => {
        const event = {
            'CodePipeline.job': {
                id: 'test-job-id',
                data: {
                    inputArtifacts: [
                        {
                            name: 'BuildArtifact',
                            location: {
                                s3Location: {
                                    bucketName: 'test-bucket',
                                    objectKey: 'test-key'
                                }
                            }
                        }
                    ],
                    outputArtifacts: [],
                    actionConfiguration: {
                        configuration: {}
                    }
                }
            }
        };

        const result = await deploymentOrchestrator(event);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body).message).toBe('Deployment orchestrated successfully');
    });

    test('should handle deployment failure', async () => {
        const AWS = require('aws-sdk');
        AWS.Lambda().updateFunctionCode().promise.mockRejectedValue(new Error('Deployment failed'));

        const event = {
            'CodePipeline.job': {
                id: 'test-job-id',
                data: {
                    inputArtifacts: [
                        {
                            name: 'BuildArtifact',
                            location: {
                                s3Location: {
                                    bucketName: 'test-bucket',
                                    objectKey: 'test-key'
                                }
                            }
                        }
                    ],
                    outputArtifacts: [],
                    actionConfiguration: {
                        configuration: {}
                    }
                }
            }
        };

        await expect(deploymentOrchestrator(event)).rejects.toThrow('Lambda deployment failed');
    });
});

describe('Sample Application', () => {
    test('should return success response', async () => {
        const event = {};
        const context = {
            requestId: 'test-request-id',
            functionName: 'test-function',
            functionVersion: '1',
            memoryLimitInMB: 128,
            getRemainingTimeInMillis: () => 30000
        };

        const result = await sampleApp(event, context);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Hello from LambdaDeploy Pipeline!');
        expect(body.requestId).toBe('test-request-id');
    });

    test('should include environment variables in response', async () => {
        process.env.APP_VERSION = '2.0.0';
        process.env.NODE_ENV = 'production';

        const event = {};
        const context = {
            requestId: 'test-request-id',
            functionName: 'test-function',
            functionVersion: '1',
            memoryLimitInMB: 128,
            getRemainingTimeInMillis: () => 30000
        };

        const result = await sampleApp(event, context);

        const body = JSON.parse(result.body);
        expect(body.version).toBe('2.0.0');
        expect(body.environment).toBe('production');
    });
});