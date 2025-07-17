import { JiraClient } from './api/jira-client.js';
import { TemplateBuilder } from './templates/template-builder.js';
import { UserInterface } from './ui/user-interface.js';
import { ClaudeClient } from './ai/claude-client.js';
import { JiraIssue, TemplateSection } from './types/index.js';

export class JiraUpdater {
    private jiraClient: JiraClient;
    private templateBuilder: TemplateBuilder;
    private ui: UserInterface;
    private claudeClient: ClaudeClient;

    constructor() {
        this.jiraClient = new JiraClient();
        this.templateBuilder = new TemplateBuilder();
        this.ui = new UserInterface();
        this.claudeClient = new ClaudeClient();
    }

    async updateDescription(issueKey: string, issueData?: JiraIssue): Promise<void> {
        if (!issueKey) {
            this.ui.displayError('Please provide a JIRA issue key as an argument.');
            console.log('Usage: npx ts-node src/index.ts SOFFER-525');
            process.exit(1);
        }

        try {
            let issue: JiraIssue;
            
            if (issueData) {
                issue = issueData;
            } else {
                this.ui.displayInfo('Fetching current issue...');
                issue = await this.jiraClient.getIssue(issueKey);
            }
            
            this.ui.displayCurrentDescription(issue.fields.description);
            
            const { template: jiraTemplate, sectionsWithContent } = await this.buildInteractiveTemplate(issue);
            
            this.ui.displayGeneratedTemplate(jiraTemplate);
            
            await this.handleUserChoice(issueKey, issue, jiraTemplate, sectionsWithContent);

        } catch (error) {
            this.ui.displayError(`Error: ${error}`);
            throw error;
        }
    }

    private async buildInteractiveTemplate(issueData: JiraIssue): Promise<{ template: string; sectionsWithContent: Array<{ section: TemplateSection; content: string }> }> {
        const sections = this.templateBuilder.getDefaultSections();
        const sectionsWithContent: Array<{ section: TemplateSection; content: string }> = [];

        for (const section of sections) {
            console.log(`\n🔄 Processing section: ${section.name}`);
            
            const userContext = await this.ui.collectUserContext(section.name);
            
            let claudeResponse = '';
            if (userContext !== '') {
                console.log('🤖 Asking Claude for suggestions...');
                const response = await this.claudeClient.generateSectionContent(section, issueData, userContext);
                if (response.success) {
                    claudeResponse = response.content;
                } else {
                    this.ui.displayError(`Claude error: ${response.error}`);
                    console.log('💡 Continuing without Claude suggestions. You can write content manually.');
                }
            } else {
                console.log('💡 No context provided. Skipping Claude suggestions - you can write content manually.');
            }

            const content = await this.ui.promptForSectionContent(section, issueData, claudeResponse);
            
            if (content.trim()) {
                sectionsWithContent.push({ section, content: content.trim() });
            }
        }

        if (sectionsWithContent.length === 0) {
            throw new Error('No content provided for any sections');
        }

        const template = this.templateBuilder.generateJiraTemplate(sectionsWithContent);
        return { template, sectionsWithContent };
    }

    private async handleUserChoice(issueKey: string, issue: JiraIssue, jiraTemplate: string, sectionsWithContent?: Array<{ section: TemplateSection; content: string }>): Promise<void> {
        this.ui.displayMenu();

        return new Promise((resolve, reject) => {
            process.stdin.once('data', async (data) => {
                const choice = data.toString().trim();
                try {
                    switch (choice) {
                        case '1':
                            this.ui.displayProgress('Replacing description with template...');
                            await this.jiraClient.updateIssueDescription(issueKey, jiraTemplate);
                            this.ui.displaySuccess('Description replaced successfully!');
                            await this.promptForNextJira();
                            resolve();
                            break;
                        case '2':
                            const existingDescription = issue.fields.description || '';
                            const newDescription = existingDescription + '\n\n' + jiraTemplate;
                            this.ui.displayProgress('Appending template to existing description...');
                            await this.jiraClient.updateIssueDescription(issueKey, newDescription);
                            this.ui.displaySuccess('Template appended successfully!');
                            await this.promptForNextJira();
                            resolve();
                            break;
                        case '3':
                            this.ui.displayProgress('Starting over...');
                            await this.updateDescription(issueKey);
                            resolve();
                            break;
                        case 'q':
                            console.log('👋 Exiting...');
                            process.exit(0);
                            break;
                        default:
                            this.ui.displayError('Invalid choice. Please choose 1, 2, 3, or q');
                            process.exit(1);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    private async editExistingPanels(issueData: JiraIssue, sectionsWithContent: Array<{ section: TemplateSection; content: string }>): Promise<Array<{ section: TemplateSection; content: string }>> {
        console.log('\n🎨 Edit Existing Panels with Claude CLI');
        console.log('======================================');
        console.log('Select a panel to edit or improve:\n');

        // Display current panels
        sectionsWithContent.forEach((item, index) => {
            console.log(`${index + 1} - ${item.section.name}`);
        });
        console.log('0 - Done editing, return to main menu\n');

        return new Promise((resolve) => {
            process.stdin.once('data', async (data) => {
                const choice = parseInt(data.toString().trim());
                
                if (choice === 0) {
                    resolve(sectionsWithContent);
                    return;
                }

                if (choice >= 1 && choice <= sectionsWithContent.length) {
                    const selectedIndex = choice - 1;
                    const selectedItem = sectionsWithContent[selectedIndex];
                    
                    console.log(`\n📝 Editing: ${selectedItem.section.name}`);
                    console.log('─'.repeat(40));
                    console.log('Current content:');
                    console.log(selectedItem.content);
                    console.log('─'.repeat(40));
                    
                    console.log('\nHow would you like to improve this panel?');
                    console.log('1 - Use Claude CLI to improve/refine existing content');
                    console.log('2 - Replace with completely new Claude-generated content');
                    console.log('3 - Manually edit the content');
                    console.log('4 - Keep current content and go back');
                    console.log('\nChoose option (1-4): ');

                    process.stdin.once('data', async (editChoice) => {
                        const editOption = editChoice.toString().trim();
                        let newContent = selectedItem.content;

                        try {
                            switch (editOption) {
                                case '1':
                                    // Improve existing content
                                    const improvementContext = await this.ui.collectUserContext(`${selectedItem.section.name} improvement`);
                                    console.log('🤖 Asking Claude to improve existing content...');
                                    const improveResponse = await this.claudeClient.improveSectionContent(
                                        selectedItem.section,
                                        selectedItem.content,
                                        improvementContext || 'Please improve and refine this content while keeping the core message.'
                                    );
                                    
                                    if (improveResponse.success) {
                                        newContent = improveResponse.content;
                                        console.log('\n🤖 Claude improved version:');
                                        console.log('─'.repeat(40));
                                        console.log(newContent);
                                        console.log('─'.repeat(40));
                                        
                                        const keepImprovement = await this.ui.promptForInput('Use this improved version? (y/n):');
                                        if (keepImprovement.toLowerCase() !== 'y') {
                                            newContent = selectedItem.content;
                                        }
                                    } else {
                                        this.ui.displayError(`Claude error: ${improveResponse.error}`);
                                    }
                                    break;

                                case '2':
                                    // Generate completely new content
                                    const newContext = await this.ui.collectUserContext(selectedItem.section.name);
                                    console.log('🤖 Asking Claude to generate new content...');
                                    const newResponse = await this.claudeClient.generateSectionContent(
                                        selectedItem.section,
                                        issueData,
                                        newContext
                                    );
                                    
                                    if (newResponse.success) {
                                        newContent = newResponse.content;
                                        console.log('\n🤖 Claude new version:');
                                        console.log('─'.repeat(40));
                                        console.log(newContent);
                                        console.log('─'.repeat(40));
                                        
                                        const keepNew = await this.ui.promptForInput('Use this new version? (y/n):');
                                        if (keepNew.toLowerCase() !== 'y') {
                                            newContent = selectedItem.content;
                                        }
                                    } else {
                                        this.ui.displayError(`Claude error: ${newResponse.error}`);
                                    }
                                    break;

                                case '3':
                                    // Manual edit
                                    console.log('\n✏️ Enter your new content (press Enter twice to finish):');
                                    const manualContent = await this.ui.collectMultilineInput();
                                    if (manualContent.trim()) {
                                        newContent = manualContent;
                                    }
                                    break;

                                case '4':
                                    // Keep current content
                                    break;

                                default:
                                    console.log('Invalid option, keeping current content.');
                            }

                            // Update the sections array
                            const updatedSections = [...sectionsWithContent];
                            updatedSections[selectedIndex] = { 
                                section: selectedItem.section, 
                                content: newContent 
                            };

                            console.log('\n✅ Panel updated! Continue editing or finish?');
                            
                            // Recursively call to allow editing more panels
                            const finalSections = await this.editExistingPanels(issueData, updatedSections);
                            resolve(finalSections);

                        } catch (error) {
                            console.error('Error during editing:', error);
                            resolve(sectionsWithContent);
                        }
                    });

                } else {
                    console.log('Invalid selection. Please try again.');
                    const retry = await this.editExistingPanels(issueData, sectionsWithContent);
                    resolve(retry);
                }
            });
        });
    }

    private async promptForNextJira(): Promise<void> {
        const nextIssueKey = await this.ui.promptForNextJira();
        if (nextIssueKey) {
            console.log(`\n🚀 Processing next issue: ${nextIssueKey}`);
            console.log('='.repeat(50));
            // For next issues, we don't have the data pre-fetched, so pass undefined
            await this.updateDescription(nextIssueKey);
        }
    }
}