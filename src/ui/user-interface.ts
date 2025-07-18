import { TemplateSection } from '../types/index.js';
import { MENU_OPTIONS } from '../config/default-config.js';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export class UserInterface {
    
    async promptForInput(question: string): Promise<string> {
        console.log(question);
        console.log('> ');
        
        return new Promise((resolve) => {
            process.stdin.once('data', (data) => {
                resolve(data.toString().trim());
            });
        });
    }

    async collectUserContext(sectionTitle: string): Promise<string> {
        console.log(`\n💬 Contexte pour "${sectionTitle}":`);
        console.log('> ');
        
        return new Promise((resolve) => {
            let input = '';
            let emptyLineCount = 0;
            
            const handleInput = (data: Buffer) => {
                const line = data.toString();
                
                if (line.trim() === 'skip') {
                    process.stdin.removeListener('data', handleInput);
                    resolve('');
                    return;
                }
                
                if (line.trim() === '') {
                    emptyLineCount++;
                    if (emptyLineCount >= 2) {
                        process.stdin.removeListener('data', handleInput);
                        resolve(input.trim());
                        return;
                    }
                } else {
                    emptyLineCount = 0;
                }
                
                input += line;
            };
            
            process.stdin.on('data', handleInput);
        });
    }

    async promptForSectionContent(section: TemplateSection, issueData: any, claudeResponse?: string): Promise<string> {
        console.log(`\n📝 ${section.name}`);
        
        if (claudeResponse && claudeResponse.trim()) {
            const vscodeEdited = await this.editInVSCode(claudeResponse, section.name);
            return vscodeEdited || claudeResponse.trim();
        }

        // No Claude suggestion - offer manual options
        console.log('\nNo Claude suggestion available.');
        console.log('Options:');
        console.log('1 - Write your own content');
        console.log('2 - Skip this section');
        
        if (!section.required) {
            console.log('3 - Leave this section empty (optional)');
        }

        console.log('\nChoose an option: ');

        return new Promise((resolve) => {
            process.stdin.once('data', async (data) => {
                const choice = data.toString().trim();
                
                switch (choice) {
                    case '1':
                        console.log(`\n✏️ Write your content for "${section.name}":`);
                        console.log('(Press Enter twice to finish)');
                        const custom = await this.collectMultilineInput();
                        resolve(custom);
                        break;
                    case '2':
                        const retry = await this.promptForSectionContent(section, issueData, claudeResponse);
                        resolve(retry);
                        break;
                    case '3':
                        if (!section.required) {
                            resolve('');
                        } else {
                            console.log('❌ This section is required. Please choose option 1.');
                            const result = await this.promptForSectionContent(section, issueData, claudeResponse);
                            resolve(result);
                        }
                        break;
                    default:
                        console.log('❌ Invalid choice. Please try again.');
                        const result = await this.promptForSectionContent(section, issueData, claudeResponse);
                        resolve(result);
                }
            });
        });
    }

    async collectMultilineInput(): Promise<string> {
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
                } else {
                    emptyLineCount = 0;
                }
                
                input += line;
            };
            
            process.stdin.on('data', handleInput);
        });
    }

    async promptForNextJira(): Promise<string | null> {
        console.log('\n🎯 Would you like to describe another JIRA issue?');
        console.log('Enter the JIRA key (e.g., SOFFER-526) or press Enter to exit: ');
        
        return new Promise((resolve) => {
            process.stdin.once('data', (data) => {
                const input = data.toString().trim();
                resolve(input || null);
            });
        });
    }

    displayMenu(): void {
        console.log('\nOptions:');
        MENU_OPTIONS.forEach(option => {
            console.log(`${option.choice} - ${option.description}`);
        });
        console.log('\nChoix (1-4 ou q): ');
    }

    async getMenuChoice(): Promise<string> {
        return new Promise((resolve) => {
            process.stdin.once('data', (data) => {
                resolve(data.toString().trim());
            });
        });
    }

    displayCurrentDescription(description: string): void {
        console.log('\n📄 Description actuelle :');
        console.log(description || '(Aucune description)');
    }

    displayGeneratedTemplate(template: string): void {
        console.log('\n📋 Template généré :');
        console.log(template);
    }

    displayIssueInfo(issueKey: string, jiraUrl: string): void {
        console.log('🚀 Jira API Updater');
        console.log('===================');
        console.log(`Issue: ${issueKey}`);
        console.log(`Base URL: ${jiraUrl}\n`);
    }

    displaySuccess(message: string): void {
        console.log(`✅ ${message}`);
    }

    displayError(message: string): void {
        console.log(`❌ ${message}`);
    }

    displayInfo(message: string): void {
        console.log(`🔍 ${message}`);
    }

    displayProgress(message: string): void {
        console.log(`🔄 ${message}`);
    }

    private checkVSCodeAvailable(): boolean {
        try {
            execSync('which code-insiders', { stdio: 'pipe' });
            return true;
        } catch {
            try {
                execSync('code-insiders --version', { stdio: 'pipe' });
                return true;
            } catch {
                return false;
            }
        }
    }

    async editInVSCode(content: string, sectionName: string): Promise<string> {
        // Check if VSCode is available
        if (!this.checkVSCodeAvailable()) {
            console.log('❌ VSCode is not available. Falling back to manual editing.');
            console.log('\nCurrent suggestion:');
            console.log(content);
            console.log('\nEdit the content (press Enter twice to finish):');
            return await this.collectMultilineInput() || content;
        }

        const tempFileName = `jira-${sectionName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.md`;
        const tempFilePath = join(tmpdir(), tempFileName);
        
        try {
            // Write content to temporary file with helpful header
            const fileContent = `# JIRA Section: ${sectionName}
# Edit the content below, save the file, and close VSCode to continue
# Lines starting with # will be ignored

${content}`;
            
            writeFileSync(tempFilePath, fileContent, 'utf8');
            
            console.log(`📝 Temporary file created: ${tempFilePath}`);
            
            // Open in VSCode and wait for it to close
            execSync(`code-insiders --wait "${tempFilePath}"`, { 
                stdio: 'inherit',
                timeout: 300000 // 5 minute timeout
            });
            
            // Read the edited content
            const editedContent = readFileSync(tempFilePath, 'utf8');
            
            // Remove the header comments and extract the actual content
            const lines = editedContent.split('\n');
            const contentLines = lines.filter(line => !line.startsWith('#')).join('\n').trim();
            
            // Clean up temporary file
            unlinkSync(tempFilePath);
            
            if (contentLines) {
                console.log('✅ Content updated from VSCode!');
                return contentLines;
            } else {
                console.log('⚠️  No content found, keeping original...');
                return content;
            }
            
        } catch (error: any) {
            console.error('❌ Error with VSCode editing:', error.message);
            
            // Clean up temp file if it exists
            try {
                unlinkSync(tempFilePath);
            } catch {}
            
            console.log('🔄 Falling back to manual editing...');
            console.log('\nCurrent content:');
            console.log(content);
            console.log('\nEnter your edited version (press Enter twice to finish):');
            
            return await this.collectMultilineInput() || content;
        }
    }
}