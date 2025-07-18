import { JiraIssue, JiraUpdaterConfig } from '../types/index.js';
import { getDefaultJiraConfig } from '../config/default-config.js';

export class JiraClient {
    private config: JiraUpdaterConfig;

    constructor(config?: Partial<JiraUpdaterConfig>) {
        this.config = { ...getDefaultJiraConfig(), ...config };
    }

    private getApiUrl(endpoint: string): string {
        return `${this.config.jiraApiUrl}/rest/api/2${endpoint}`;
    }

    private getHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.authToken}`,
            'Content-Type': 'application/json',
        };
    }

    async getIssue(issueKey: string): Promise<JiraIssue> {
        const url = this.getApiUrl(`/issue/${issueKey}`);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Issue ${issueKey} not found. Please check the issue key.`);
                } else if (response.status === 401) {
                    throw new Error('Authentication failed. Please check your JIRA credentials.');
                } else {
                    throw new Error(`Failed to fetch issue: ${response.status} ${response.statusText}`);
                }
            }

            const issue = await response.json();
            return issue as JiraIssue;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`Network error while fetching issue: ${error}`);
        }
    }

    async updateIssueDescription(issueKey: string, description: string): Promise<void> {
        const url = this.getApiUrl(`/issue/${issueKey}`);
        
        const updateData = {
            fields: {
                description: description
            }
        };

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Issue ${issueKey} not found. Please check the issue key.`);
                } else if (response.status === 401) {
                    throw new Error('Authentication failed. Please check your JIRA credentials.');
                } else if (response.status === 403) {
                    throw new Error(`Permission denied. You don't have permission to edit issue ${issueKey}.`);
                } else {
                    const errorText = await response.text();
                    throw new Error(`Failed to update issue: ${response.status} ${response.statusText}. ${errorText}`);
                }
            }
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`Network error while updating issue: ${error}`);
        }
    }

    getJiraUrl(issueKey: string): string {
        return `${this.config.jiraApiUrl}/browse/${issueKey}`;
    }
}