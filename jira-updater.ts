import { execSync } from 'child_process';
import { config } from 'dotenv';
import { DEFAULT_JIRA_CONFIG } from './src/config/default-config.js';
config({ path: '.env.local' });

interface TemplateSection {
    title: string;
    backgroundColor: string;
    titleBackgroundColor: string;
    content: string;
}

interface JiraUpdaterConfig {
    baseUrl?: string;
    authToken?: string;
    apiVersion?: string;
}

class JiraUpdater {
    private config: JiraUpdaterConfig;
    constructor(config: JiraUpdaterConfig = {}) {
        this.config = {
            baseUrl: DEFAULT_JIRA_CONFIG.jiraApiUrl,
            authToken: DEFAULT_JIRA_CONFIG.authToken,
            apiVersion: '2',
            ...config
        };
    }

    private getApiUrl(endpoint: string): string {
        return `${this.config.baseUrl}/rest/api/${this.config.apiVersion}${endpoint}`;
    }

    private getHeaders(): HeadersInit {
        
        return {
            'Authorization': `Bearer ${this.config.authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    async getIssue(issueKey: string): Promise<any> {
        const url = this.getApiUrl(`/issue/${issueKey}`);
        console.log(`Fetching issue: ${issueKey}`);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const issue = await response.json();
            console.log(`✅ Successfully fetched issue: ${issue.key} - ${issue.fields.summary}`);
            return issue;
        } catch (error) {
            console.error(`❌ Failed to fetch issue ${issueKey}:`, error);
            throw error;
        }
    }

    private getDefaultSections(): TemplateSection[] {
        return [
            {
                title: "Context",
                backgroundColor: "#fceae6",
                titleBackgroundColor: "#e76f51",
                content: ""
            },
            {
                title: "Description", 
                backgroundColor: "#edfaf9",
                titleBackgroundColor: "#2a9d8f",
                content: ""
            },
            {
                title: "Acceptance criteria",
                backgroundColor: "#dcf3f9", 
                titleBackgroundColor: "#457b9d",
                content: ""
            }
        ];
    }

    private async promptForInput(question: string): Promise<string> {
        console.log(`\n${question}`);
        console.log('(Press Enter twice to finish, or type "skip" to leave empty)');
        console.log('> ');
        
        return new Promise((resolve) => {
            let input = '';
            let emptyLineCount = 0;
            
            const handleInput = (data: Buffer) => {
                const line = data.toString();
                
                if (line.trim() === '') {
                    emptyLineCount++;
                    if (emptyLineCount >= 2) {
                        process.stdin.removeListener('data', handleInput);
                        resolve(input.trim());
                        return;
                    }
                    input += '\n';
                } else if (line.trim().toLowerCase() === 'skip') {
                    process.stdin.removeListener('data', handleInput);
                    resolve('');
                    return;
                } else {
                    emptyLineCount = 0;
                    input += line;
                }
            };
            
            process.stdin.on('data', handleInput);
        });
    }

    private async callClaudeCLI(prompt: string): Promise<string> {
        try {
            console.log('🤖 Calling Claude CLI for suggestions...');
            
            // Use claude CLI with --print flag for non-interactive output
            const result = execSync(`claude --print "${prompt.replace(/"/g, '\\"')}"`, {
                encoding: 'utf8',
                timeout: 30000, // 30 second timeout
                maxBuffer: 1024 * 1024 // 1MB buffer
            });
            
            return result.trim();
        } catch (error) {
            console.error('❌ Error calling Claude CLI:', error);
            console.log('💡 Falling back to manual input...');
            return '';
        }
    }

    private async promptForNextJira(): Promise<void> {
        console.log('\n🎯 Would you like to describe another JIRA issue?');
        console.log('Enter the JIRA key (e.g., SOFFER-526) or press Enter to exit: ');
        
        return new Promise((resolve) => {
            process.stdin.once('data', async (data) => {
                const input = data.toString().trim();
                if (input) {
                    console.log(`\n🚀 Processing next issue: ${input}`);
                    console.log('='.repeat(50));
                    await this.updateDescription(input);
                }
                resolve();
            });
        });
    }

    private async collectUserContext(sectionTitle: string): Promise<string> {
        console.log(`\n💬 Provide additional context for the "${sectionTitle}" section:`);
        console.log('(This helps Claude generate more relevant suggestions)');
        console.log('\n(Press Enter twice to finish, or type "skip" for no additional context)');
        console.log('> ');
        
        return new Promise((resolve) => {
            let input = '';
            let emptyLineCount = 0;
            
            const handleInput = (data: Buffer) => {
                const line = data.toString();
                
                if (line.trim() === '') {
                    emptyLineCount++;
                    if (emptyLineCount >= 2) {
                        process.stdin.removeListener('data', handleInput);
                        resolve(input.trim());
                        return;
                    }
                    input += '\n';
                } else if (line.trim().toLowerCase() === 'skip') {
                    process.stdin.removeListener('data', handleInput);
                    resolve('');
                    return;
                } else {
                    emptyLineCount = 0;
                    input += line;
                }
            };
            
            process.stdin.on('data', handleInput);
        });
    }

    private getAdminPrompt(): string {
        return `IMPORTANT INSTRUCTIONS FOR CONTENT GENERATION:

1. Generate ONLY the content that goes inside the panel - no headers, titles, or labels
2. Do NOT include phrases like "Context:", "Description:", "Acceptance Criteria:" - these are already panel titles
3. Do NOT add meta-commentary like "Here's the context section" or "This section should include"
4. Write direct, actionable content that can be immediately used
5. Keep the tone professional but concise
6. Format should be clean and ready for Jira (plain text, bullets, or numbered lists)
7. Don't precise the name of the project or the issue key - this is already known
8. We are using spring reactive and Java 17, so focus on relevant technologies
Your response should contain ONLY the panel content itself.`;
    }

    private getClaudePromptForSection(sectionTitle: string, issueData: any, userContext: string = ''): string {
        const issueKey = issueData.key;
        const summary = issueData.fields.summary;
        const issueType = issueData.fields.issuetype?.name || 'Unknown';
        const currentDescription = issueData.fields.description || 'No description';
        
        const contextSection = userContext.trim() ? 
            `\nAdditional Context from User:\n${userContext}\n` : '';
        
        const adminPrompt = this.getAdminPrompt();
        
        const prompts = {
            'Context': `${adminPrompt}

Generate content for a Context panel in this Jira ticket:

Issue: ${issueKey} - ${summary}
Type: ${issueType}
Current Description: ${currentDescription}${contextSection}

Generate content that explains:
- Why this work is needed
- What problem it solves
- Any relevant background information
- Dependencies or related work

${userContext.trim() ? 'Incorporate the additional context provided above.' : ''}
Keep it concise and focused. Return only the panel content.`,

            'Description': `${adminPrompt}

Generate content for a Description panel in this Jira ticket:

Issue: ${issueKey} - ${summary}
Type: ${issueType}
Current Description: ${currentDescription}${contextSection}

Generate content that explains:
- What exactly needs to be done
- Technical approach or methodology
- Key deliverables
- Any specific requirements or constraints

${userContext.trim() ? 'Incorporate the additional context and requirements provided above.' : ''}
Keep it detailed but concise. Return only the panel content.`,

            'Acceptance criteria': `${adminPrompt}

Generate content for an Acceptance Criteria panel in this Jira ticket:

Issue: ${issueKey} - ${summary}
Type: ${issueType}
Current Description: ${currentDescription}${contextSection}

Generate acceptance criteria that define:
- Specific, measurable outcomes
- What "done" looks like
- Testing scenarios
- Success metrics

${userContext.trim() ? 'Incorporate the additional context and requirements provided above.' : ''}
Format as numbered or bulleted list. Return only the panel content.`
        };

        return prompts[sectionTitle as keyof typeof prompts] || 
               `${adminPrompt}\n\nGenerate content for the "${sectionTitle}" panel of this Jira ticket: ${issueKey} - ${summary}${contextSection}`;
    }

    private async promptForSectionContent(section: TemplateSection, issueData: any): Promise<string> {
        console.log(`\n📝 Section: ${section.title}`);
        console.log('─'.repeat(30));
        console.log('\nHow would you like to fill this section?');
        console.log('1 - Use Claude CLI to generate suggestions');
        console.log('2 - Write manually');
        console.log('3 - Skip this section');
        console.log('\nChoose option (1-3): ');
        
        return new Promise((resolve) => {
            process.stdin.once('data', async (data) => {
                const choice = data.toString().trim();
                
                try {
                    switch (choice) {
                        case '1':
                            // Use Claude CLI - first collect user context
                            const userContext = await this.collectUserContext(section.title);
                            console.log(userContext.trim() ? 
                                '✅ Got your context! Generating suggestions...' : 
                                '💡 No additional context provided. Using issue details only...');
                            
                            const claudePrompt = this.getClaudePromptForSection(section.title, issueData, userContext);
                            const claudeSuggestion = await this.callClaudeCLI(claudePrompt);
                            
                            if (claudeSuggestion) {
                                console.log('\n🤖 Claude suggests:');
                                console.log('─'.repeat(40));
                                console.log(claudeSuggestion);
                                console.log('─'.repeat(40));
                                
                                console.log('\nOptions:');
                                console.log('1 - Use this suggestion');
                                console.log('2 - Edit this suggestion');
                                console.log('3 - Try again with different prompt');
                                console.log('4 - Write manually instead');
                                console.log('\nChoose option (1-4): ');
                                
                                process.stdin.once('data', async (editChoice) => {
                                    const editOption = editChoice.toString().trim();
                                    
                                    switch (editOption) {
                                        case '1':
                                            resolve(claudeSuggestion);
                                            break;
                                        case '2':
                                            console.log('\n✏️  Edit the suggestion:');
                                            console.log('(Start with the text below, modify as needed)');
                                            console.log('(Press Enter twice to finish)');
                                            console.log('> ');
                                            console.log(claudeSuggestion);
                                            const editedContent = await this.promptForInput('');
                                            resolve(editedContent || claudeSuggestion);
                                            break;
                                        case '3':
                                            console.log('🔄 Let\'s try again with fresh context...');
                                            const newContent = await this.promptForSectionContent(section, issueData);
                                            resolve(newContent);
                                            break;
                                        case '4':
                                            const manualContent = await this.promptForInput(`What would you like to write in the "${section.title}" section?`);
                                            resolve(manualContent);
                                            break;
                                        default:
                                            resolve(claudeSuggestion);
                                    }
                                });
                            } else {
                                // Claude CLI failed, fall back to manual
                                const manualContent = await this.promptForInput(`What would you like to write in the "${section.title}" section?`);
                                resolve(manualContent);
                            }
                            break;
                            
                        case '2':
                            // Manual input
                            const content = await this.promptForInput(`What would you like to write in the "${section.title}" section?`);
                            resolve(content);
                            break;
                            
                        case '3':
                            // Skip
                            resolve('');
                            break;
                            
                        default:
                            console.log('Invalid choice, falling back to manual input...');
                            const fallbackContent = await this.promptForInput(`What would you like to write in the "${section.title}" section?`);
                            resolve(fallbackContent);
                    }
                } catch (error) {
                    console.error('Error in section prompting:', error);
                    resolve('');
                }
            });
        });
    }

    private async buildInteractiveTemplate(issueData: any): Promise<string> {
        console.log('\n🎨 Interactive Template Builder with Claude CLI');
        console.log('===============================================');
        console.log('Let\'s build your Jira template section by section!');
        console.log('💡 Claude CLI can help generate intelligent content based on your issue details.\n');
        
        const sections = this.getDefaultSections();
        const filledSections: TemplateSection[] = [];
        
        for (const section of sections) {
            const content = await this.promptForSectionContent(section, issueData);
            
            filledSections.push({
                ...section,
                content: content
            });
            
            if (content.trim()) {
                console.log(`✅ Added content to "${section.title}" section`);
            } else {
                console.log(`⏭️  Skipped "${section.title}" section`);
            }
        }
        
        return this.generateJiraTemplate(filledSections);
    }

    private generateJiraTemplate(sections: TemplateSection[]): string {
        return sections
            .map(section => {
                const panelHeader = `{panel:title=${section.title}|borderStyle=none|titleBGColor=${section.titleBackgroundColor}|bgColor=${section.backgroundColor}}`;
                const panelFooter = '{panel}';
                
                if (section.content.trim()) {
                    return `${panelHeader}\n${section.content}\n${panelFooter}`;
                } else {
                    return `${panelHeader}\n\n${panelFooter}`;
                }
            })
            .join('\n');
    }

    async updateIssueDescription(issueKey: string, newDescription: string): Promise<any> {
        const url = this.getApiUrl(`/issue/${issueKey}`);
        console.log(`Updating description for issue: ${issueKey}`);
        
        const payload = {
            fields: {
                description: newDescription
            }
        };

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
            }

            console.log(`✅ Successfully updated description for issue: ${issueKey}`);
            return response;
        } catch (error) {
            console.error(`❌ Failed to update issue ${issueKey}:`, error);
            throw error;
        }
    }

    async updateDescription(issueKey: string): Promise<void> {
        if (!issueKey) {
            console.error('Error: Please provide a JIRA issue key as an argument.');
            console.log('Usage: npx ts-node jira-updater.ts SOFFER-525');
            process.exit(1);
        }

        try {
            // First, get the current issue to show existing description
            console.log('🔍 Fetching current issue...');
            const issue = await this.getIssue(issueKey);
            
            console.log('\n📄 Current Description:');
            console.log(issue.fields.description || '(No description)');
            console.log('\n' + '='.repeat(50));
            
            // Build the template interactively
            const jiraTemplate = await this.buildInteractiveTemplate(issue);
            
            console.log('\n📋 Generated Template:');
            console.log('='.repeat(50));
            console.log(jiraTemplate);
            console.log('='.repeat(50));
            
            // Ask for confirmation
            console.log('\nOptions:');
            console.log('1 - Replace description with this template');
            console.log('2 - Append template to existing description');
            console.log('3 - Show template only (don\'t update Jira)');
            console.log('4 - Start over (rebuild template)');
            console.log('q - Quit');
            console.log('\nChoose an option (1-4 or q): ');

            return new Promise((resolve, reject) => {
                process.stdin.once('data', async (data) => {
                    const choice = data.toString().trim();
                    try {
                        switch (choice) {
                            case '1':
                                console.log('🔄 Replacing description with template...');
                                await this.updateIssueDescription(issueKey, jiraTemplate);
                                console.log('✅ Description replaced successfully!');
                                await this.promptForNextJira();
                                resolve();
                                break;
                            case '2':
                                const existingDescription = issue.fields.description || '';
                                const newDescription = existingDescription + '\n\n' + jiraTemplate;
                                console.log('🔄 Appending template to existing description...');
                                await this.updateIssueDescription(issueKey, newDescription);
                                console.log('✅ Template appended successfully!');
                                await this.promptForNextJira();
                                resolve();
                                break;
                            case '3':
                                console.log('📋 Template ready for manual copy:');
                                console.log('\n' + jiraTemplate);
                                console.log('\n✅ Copy the template above and paste it manually in Jira.');
                                await this.promptForNextJira();
                                resolve();
                                break;
                            case '4':
                                console.log('🔄 Starting over...');
                                await this.updateDescription(issueKey);
                                resolve();
                                break;
                            case 'q':
                                console.log('👋 Exiting...');
                                process.exit(0);
                                break;
                            default:
                                console.log('❌ Invalid choice. Please choose 1, 2, 3, 4, or q');
                                process.exit(1);
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            });

        } catch (error) {
            console.error('❌ Error:', error);
            throw error;
        }
    }

}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    process.exit(0);
});

// Main execution
async function main(): Promise<void> {
    const issueKey: string = process.argv[2];
    
    if (!issueKey) {
        console.error('❌ Error: Please provide a JIRA issue key as an argument.');
        console.log('Usage: npx ts-node jira-updater.ts SOFFER-525');
        process.exit(1);
    }
    
    console.log('🚀 Jira API Updater');
    console.log('===================');
    console.log(`Issue: ${issueKey}`);
    console.log(`Base URL: https://jira.adeo.com\n`);
    
    const updater = new JiraUpdater();
    await updater.updateDescription(issueKey);
}

main().catch(console.error);