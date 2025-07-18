import { TemplateSection, JiraUpdaterConfig } from '../types/index.js';

export const getDefaultJiraConfig = (): JiraUpdaterConfig => ({
    jiraApiUrl: 'https://jira.adeo.com',
    authToken: process.env.JIRA_TOKEN || '',
    timeout: 30000
});

export const DEFAULT_JIRA_CONFIG: JiraUpdaterConfig = {
    jiraApiUrl: 'https://jira.adeo.com',
    authToken: process.env.JIRA_TOKEN || '',
    timeout: 30000
};

export const DEFAULT_TEMPLATE_SECTIONS: TemplateSection[] = [
    {
        name: 'Context',
        required: true,
        backgroundColor: '#fceae6',
        titleBackgroundColor: '#e76f51',
        adminPrompt: `Expliquez POURQUOI ce travail est nécessaire - justification métier, informations de contexte et motivation. Soyez extrêmement concis et concentrez-vous uniquement sur le contexte essentiel.`,
        userPrompt: 'What background context should be included to explain why this work is needed?'
    },
    {
        name: 'Description',
        required: true,
        backgroundColor: '#edfaf9',
        titleBackgroundColor: '#2a9d8f',
        adminPrompt: `Concentrez-vous sur QUOI et POURQUOI, pas COMMENT. Expliquez les objectifs métier, les bénéfices et les résultats attendus. Évitez les détails d'implémentation technique.`,
        userPrompt: 'What needs to be accomplished and why is this work important (avoid technical implementation details)?'
    },
    {
        name: 'Technical Requirements',
        required: false,
        backgroundColor: '#f0f3ff',
        titleBackgroundColor: '#6366f1',
        adminPrompt: `Concentrez-vous sur COMMENT le travail sera implémenté. Incluez les contraintes techniques, les dépendances, les spécifications, la stack technologique, les exigences de performance et l'approche d'implémentation.`,
        userPrompt: 'What specific technical requirements, constraints, and implementation details need to be defined?'
    },
    {
        name: 'Acceptance criteria',
        required: true,
        backgroundColor: '#dcf3f9',
        titleBackgroundColor: '#457b9d',
        adminPrompt: `Définissez des conditions spécifiques, mesurables et testables qui doivent être remplies. Utilisez des puces claires ou le format Étant donné/Quand/Alors. Incluez les exigences fonctionnelles et non-fonctionnelles.`,
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