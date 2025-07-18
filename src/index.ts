#!/usr/bin/env node

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env.local');
config({ path: envPath });

// Import after dotenv to ensure config has access to environment variables
import { JiraUpdater } from './app.js';
import { JiraClient } from './api/jira-client.js';

async function main(): Promise<void> {
    const issueKey: string = process.argv[2];
    
    if (!issueKey) {
        console.error('❌ Error: Please provide a JIRA issue key as an argument.');
        console.log('Usage: npx ts-node src/index.ts SOFFER-525');
        process.exit(1);
    }
    
    console.log(`🚀 ${issueKey}`);
    
    try {
        const jiraClient = new JiraClient();
        const issue = await jiraClient.getIssue(issueKey);
        console.log(`${issue.fields.summary}\n`);
        
        const updater = new JiraUpdater();
        await updater.updateDescription(issueKey, issue);
    } catch (error) {
        console.error('❌ Error fetching issue:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    process.exit(0);
});

main().catch(console.error);