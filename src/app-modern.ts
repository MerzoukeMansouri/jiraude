import { JiraClient } from './api/jira-client.js';
import { TemplateBuilder } from './templates/template-builder.js';
import { ModernCLI } from './ui/modern-cli.js';
import { ClaudeClient } from './ai/claude-client.js';
import { Logger } from './utils/logger.js';
import { JiraIssue, TemplateSection } from './types/index.js';

export class ModernJiraUpdater {
    private jiraClient: JiraClient;
    private templateBuilder: TemplateBuilder;
    private cli: ModernCLI;
    private claudeClient: ClaudeClient;
    private logger: Logger;

    constructor() {
        this.jiraClient = new JiraClient();
        this.templateBuilder = new TemplateBuilder();
        this.cli = new ModernCLI();
        this.claudeClient = new ClaudeClient();
        this.logger = Logger.getInstance();
    }

    async run(issueKey: string): Promise<void> {
        try {
            // Fetch issue
            this.cli.startSpinner('Récupération du ticket JIRA...');
            const issue = await this.jiraClient.getIssue(issueKey);
            this.cli.succeedSpinner('Ticket récupéré avec succès');

            // Show welcome screen
            await this.cli.showWelcome(issueKey, issue.fields.summary);
            await this.cli.showCurrentDescription(issue.fields.description);

            // Build template interactively
            const { template, sectionsWithContent } = await this.buildTemplate(issue);

            // Show generated template
            await this.cli.showGeneratedTemplate(template);

            // Handle user choice
            await this.handleUserChoice(issueKey, issue, template);

        } catch (error) {
            this.cli.failSpinner('Erreur lors du traitement');
            throw error;
        }
    }

    private async buildTemplate(issue: JiraIssue): Promise<{ template: string; sectionsWithContent: Array<{ section: TemplateSection; content: string }> }> {
        const sections = this.templateBuilder.getDefaultSections();
        const sectionsWithContent: Array<{ section: TemplateSection; content: string }> = [];

        this.logger.info(`Génération du template pour ${sections.length} sections`);

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            this.logger.step(i + 1, sections.length, `Traitement de "${section.name}"`);

            // Collect context and determine approach
            const userContext = await this.cli.collectSectionContext(section.name);
            
            this.logger.debug(`🔍 Debug: userContext = "${userContext}"`);
            
            let content = '';
            
            if (userContext === '') {
                // User chose to skip
                this.logger.debug('🔍 Debug: User chose to skip');
                content = '';
            } else if (userContext === '__WRITE_DIRECTLY__') {
                // User wants to write directly
                this.logger.debug('🔍 Debug: User wants to write directly');
                content = await this.cli.editSectionContent(section.name, '');
            } else {
                // User provided context for AI generation
                this.logger.debug('🔍 Debug: User provided context for AI');
                this.cli.startSpinner('Claude génère du contenu...');
                const response = await this.claudeClient.generateSectionContent(section, issue, userContext);
                
                if (response.success) {
                    this.cli.succeedSpinner('Contenu généré par Claude');
                    this.logger.debug('🔍 Debug: AI generation successful, opening editor');
                    // Let user edit the AI-generated content
                    content = await this.cli.editSectionContent(section.name, response.content);
                } else {
                    this.cli.failSpinner('Erreur Claude');
                    this.logger.error(`Erreur Claude: ${response.error}`);
                    this.logger.debug('🔍 Debug: AI generation failed, fallback to manual');
                    // Fallback to manual writing
                    content = await this.cli.editSectionContent(section.name, '');
                }
            }
            
            if (content.trim()) {
                sectionsWithContent.push({ section, content: content.trim() });
                this.logger.success(`Section "${section.name}" complétée`);
            } else if (section.required) {
                this.logger.warn(`Section "${section.name}" requise mais vide`);
                // Could re-prompt here
            }
        }

        if (sectionsWithContent.length === 0) {
            throw new Error('Aucun contenu fourni pour les sections');
        }

        const template = this.templateBuilder.generateJiraTemplate(sectionsWithContent);
        return { template, sectionsWithContent };
    }

    private async handleUserChoice(issueKey: string, issue: JiraIssue, template: string): Promise<void> {
        while (true) {
            const choice = await this.cli.showMainMenu();
            
            try {
                switch (choice) {
                    case 'replace':
                        this.cli.startSpinner('Remplacement de la description...');
                        await this.jiraClient.updateIssueDescription(issueKey, template);
                        this.cli.succeedSpinner('Description remplacée avec succès!');
                        await this.promptForNextIssue();
                        return;
                        
                    case 'append':
                        this.cli.startSpinner('Ajout du template...');
                        const existingDescription = issue.fields.description || '';
                        const newDescription = existingDescription + '\n\n' + template;
                        await this.jiraClient.updateIssueDescription(issueKey, newDescription);
                        this.cli.succeedSpinner('Template ajouté avec succès!');
                        await this.promptForNextIssue();
                        return;
                        
                    case 'restart':
                        this.logger.info('Redémarrage du processus...');
                        await this.run(issueKey);
                        return;
                        
                    case 'quit':
                        this.cli.showGoodbye();
                        return;
                }
            } catch (error) {
                this.cli.failSpinner('Erreur lors de la mise à jour');
                this.logger.error(`Erreur: ${error}`);
                // Continue the loop to let user try again
            }
        }
    }

    private async promptForNextIssue(): Promise<void> {
        const nextIssueKey = await this.cli.promptForNextIssue();
        
        if (nextIssueKey) {
            this.logger.info(`Traitement du ticket suivant: ${nextIssueKey}`);
            await this.run(nextIssueKey);
        } else {
            this.cli.showGoodbye();
        }
    }
}