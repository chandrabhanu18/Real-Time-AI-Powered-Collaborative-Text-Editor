import llm from './backend/src/ai/llmProvider.js';
console.log('mockMode:', llm.mockMode);
console.log('apiKey:', JSON.stringify(llm.apiKey));
console.log('provider:', llm.provider);
