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
        name: 'Contexte',
        required: true,
        backgroundColor: '#fceae6',
        titleBackgroundColor: '#e76f51',
        adminPrompt: `Expliquez POURQUOI ce travail est nécessaire - justification métier, informations de contexte et motivation. Soyez extrêmement concis et concentrez-vous uniquement sur le contexte essentiel.`,
        userPrompt: 'Quel contexte de base doit être inclus pour expliquer pourquoi ce travail est nécessaire ?'
    },
    {
        name: 'Description',
        required: true,
        backgroundColor: '#edfaf9',
        titleBackgroundColor: '#2a9d8f',
        adminPrompt: `Concentrez-vous sur QUOI et POURQUOI, pas COMMENT. Expliquez les objectifs métier, les bénéfices et les résultats attendus. Évitez les détails d'implémentation technique.`,
        userPrompt: 'Que doit-on accomplir et pourquoi ce travail est-il important (éviter les détails d\'implémentation technique) ?'
    },
    {
        name: 'Exigences techniques',
        required: false,
        backgroundColor: '#f0f3ff',
        titleBackgroundColor: '#6366f1',
        adminPrompt: `Concentrez-vous sur COMMENT le travail sera implémenté. Incluez les contraintes techniques, les dépendances, les spécifications, la stack technologique, les exigences de performance et l'approche d'implémentation.`,
        userPrompt: 'Quelles exigences techniques spécifiques, contraintes et détails d\'implémentation doivent être définis ?'
    },
    {
        name: 'Critères d\'acceptation',
        required: true,
        backgroundColor: '#dcf3f9',
        titleBackgroundColor: '#457b9d',
        adminPrompt: `Définissez des conditions spécifiques, mesurables et testables qui doivent être remplies. Utilisez des puces claires ou le format Étant donné/Quand/Alors. Incluez les exigences fonctionnelles et non-fonctionnelles.`,
        userPrompt: 'Quels critères spécifiques doivent être remplis pour que ce ticket soit considéré comme terminé ?'
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