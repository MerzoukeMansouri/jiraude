export interface TemplateSection {
    name: string;
    required: boolean;
    adminPrompt: string;
    userPrompt: string;
    backgroundColor?: string;
    titleBackgroundColor?: string;
}

export interface JiraUpdaterConfig {
    jiraApiUrl: string;
    authToken: string;
    timeout: number;
}

export interface JiraIssue {
    key: string;
    fields: {
        summary: string;
        description: string;
        issuetype: {
            name: string;
        };
        project: {
            key: string;
            name: string;
        };
        assignee?: {
            displayName: string;
        };
        reporter: {
            displayName: string;
        };
        status: {
            name: string;
        };
        priority?: {
            name: string;
        };
    };
}


export interface ClaudeResponse {
    content: string;
    success: boolean;
    error?: string;
}