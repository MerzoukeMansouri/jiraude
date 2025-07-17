import { TemplateSection, JiraUpdaterConfig } from '../types/index.js';

export const DEFAULT_JIRA_CONFIG: JiraUpdaterConfig = {
    jiraApiUrl: 'https://jira.adeo.com',
    authToken: process.env.JIRA_TOKEN || 'Bearer <YOUR_BEARER_TOKEN_HERE>', // Replace with your actual token
    timeout: 30000
};

export const DEFAULT_TEMPLATE_SECTIONS: TemplateSection[] = [
    {
        name: 'Context',
        required: true,
        backgroundColor: '#fceae6',
        titleBackgroundColor: '#e76f51',
        adminPrompt: `Explain WHY this work is needed - business justification, background information, and motivation. Be extremely concise and focus only on essential context.`,
        userPrompt: 'What background context should be included to explain why this work is needed?'
    },
    {
        name: 'Description',
        required: true,
        backgroundColor: '#edfaf9',
        titleBackgroundColor: '#2a9d8f',
        adminPrompt: `Focus on WHAT and WHY, not HOW. Explain business goals, benefits, and desired outcomes. Avoid technical implementation details.`,
        userPrompt: 'What needs to be accomplished and why is this work important (avoid technical implementation details)?'
    },
    {
        name: 'Technical Requirements',
        required: false,
        backgroundColor: '#f0f3ff',
        titleBackgroundColor: '#6366f1',
        adminPrompt: `Focus on HOW the work will be implemented. Include technical constraints, dependencies, specifications, technology stack, performance requirements, and implementation approach.`,
        userPrompt: 'What specific technical requirements, constraints, and implementation details need to be defined?'
    },
    {
        name: 'Acceptance criteria',
        required: true,
        backgroundColor: '#dcf3f9',
        titleBackgroundColor: '#457b9d',
        adminPrompt: `Define specific, measurable, testable conditions that must be met. Use clear bullet points or Given/When/Then format. Include functional and non-functional requirements.`,
        userPrompt: 'What specific criteria must be met for this ticket to be considered complete?'
    }
];

export const CLI_TIMEOUTS = {
    DEFAULT: 30000,
    CLAUDE_CLI: 60000,
    USER_INPUT: 300000
};

export const MENU_OPTIONS = [
    { choice: '1', description: 'Replace description with this template' },
    { choice: '2', description: 'Append template to existing description' },
    { choice: '3', description: 'Start over (rebuild template)' },
    { choice: 'q', description: 'Quit' }
];