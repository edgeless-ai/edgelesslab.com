#!/usr/bin/env node

/**
 * Subprocess bridge for agentek tools
 * This script acts as a bridge between Python and the agentek TypeScript tools
 */

const { createAgentekClient, allTools } = require('@agentek/tools');
const { mainnet, optimism, arbitrum } = require('viem/chains');
const { http } = require('viem');

// Parse command line arguments
const [,, toolName, paramsJson] = process.argv;

if (!toolName || !paramsJson) {
    console.error(JSON.stringify({
        error: 'Missing required arguments: toolName and params'
    }));
    process.exit(1);
}

let params;
try {
    params = JSON.parse(paramsJson);
} catch (error) {
    console.error(JSON.stringify({
        error: 'Failed to parse parameters',
        details: error.message
    }));
    process.exit(1);
}

// Initialize agentek client
async function initializeClient() {
    const chains = [mainnet, optimism, arbitrum];
    const transports = chains.map(() => http());
    
    const client = createAgentekClient({
        accountOrAddress: params.accountOrAddress || '0x0000000000000000000000000000000000000000',
        chains,
        transports,
        tools: allTools({})
    });
    
    return client;
}

// Execute tool
async function executeTool() {
    try {
        const client = await initializeClient();
        
        // Special handling for tool listing
        if (toolName === 'list_tools') {
            const tools = Object.keys(client.tools || {});
            console.log(JSON.stringify({ tools }));
            return;
        }
        
        // Special handling for batch execution
        if (toolName === 'batch_execute') {
            const results = [];
            for (const request of params.requests) {
                try {
                    const result = await client.execute(request.tool, request.params);
                    results.push(result);
                } catch (error) {
                    results.push({ error: error.message });
                }
            }
            console.log(JSON.stringify({ results }));
            return;
        }
        
        // Execute single tool
        const result = await client.execute(toolName, params);
        
        // Format response
        const response = {
            status: 'success',
            data: result,
            chain: params.chain || 'mainnet',
            timestamp: new Date().toISOString()
        };
        
        console.log(JSON.stringify(response));
        
    } catch (error) {
        console.error(JSON.stringify({
            status: 'error',
            error: error.message,
            tool: toolName,
            params: params
        }));
        process.exit(1);
    }
}

// Run
executeTool().catch(error => {
    console.error(JSON.stringify({
        status: 'error',
        error: error.message,
        stack: error.stack
    }));
    process.exit(1);
});