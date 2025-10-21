// Jest setup file for LambdaDeploy Pipeline tests

// Set default environment variables for testing
process.env.AWS_REGION = 'us-east-1';
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  // Suppress console.log in tests unless explicitly needed
  console.log = jest.fn();
  
  // Keep console.error for debugging
  console.error = jest.fn((...args) => {
    if (process.env.DEBUG_TESTS) {
      originalConsoleError(...args);
    }
  });
});

afterAll(() => {
  // Restore original console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Global test utilities
global.createMockContext = (overrides = {}) => ({
  requestId: 'test-request-id',
  functionName: 'test-function',
  functionVersion: '1',
  memoryLimitInMB: 128,
  getRemainingTimeInMillis: () => 30000,
  ...overrides
});

global.createMockCodePipelineEvent = (overrides = {}) => ({
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
    },
    ...overrides
  }
});

global.createMockPipelineEvent = (overrides = {}) => ({
  detail: {
    pipeline: 'test-pipeline',
    'execution-id': 'test-execution-id',
    state: 'SUCCEEDED',
    ...overrides
  }
});