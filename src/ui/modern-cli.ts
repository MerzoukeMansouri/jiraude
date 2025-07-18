import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import ora from 'ora';
import boxen from 'boxen';
import { select, input, confirm } from '@inquirer/prompts';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TemplateSection } from '../types/index.js';

export class ModernCLI {
    private spinner = ora();

    async showWelcome(issueKey: string, summary: string): Promise<void> {
        console.clear();
        
        // ASCII art title
        const title = figlet.textSync('JIRA AI', { 
            font: 'Big',
            horizontalLayout: 'fitted' 
        });
        
        console.log(chalk.cyan(title));
        
        // Issue info box
        const issueInfo = boxen(
            `${chalk.bold.blue('🎫 Issue:')} ${chalk.yellow(issueKey)}\n${chalk.bold.blue('📝 Titre:')} ${chalk.white(summary)}`,
            {
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'blue',
                backgroundColor: 'blackBright'
            }
        );
        
        console.log(issueInfo);
    }

    async showCurrentDescription(description: string): Promise<void> {
        const content = description || chalk.italic.gray('(Aucune description)');
        const box = boxen(content, {
            title: chalk.bold.cyan('📄 Description actuelle'),
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'cyan'
        });
        
        console.log(box);
    }

    async collectSectionContext(sectionName: string): Promise<string> {
        console.log(`\n${chalk.bold.magenta('💬 Section:')} ${chalk.white(sectionName)}`);
        
        const approach = await select({
            message: 'Comment voulez-vous procéder ?',
            choices: [
                {
                    name: `${chalk.blue('🤖')} Proposition IA (avec contexte)`,
                    value: 'ai_with_context',
                    description: 'Claude génère du contenu basé sur votre contexte'
                },
                {
                    name: `${chalk.green('✏️')} Écrire directement`,
                    value: 'write_directly',
                    description: 'Écrire le contenu manuellement'
                },
                {
                    name: `${chalk.gray('⏭️')} Passer cette section`,
                    value: 'skip',
                    description: 'Ignorer cette section (si optionnelle)'
                }
            ]
        });

        if (approach === 'skip') {
            return '';
        }

        if (approach === 'ai_with_context') {
            const context = await input({
                message: 'Contexte pour guider l\'IA:',
                transformer: (input) => chalk.gray(input)
            });
            return context;
        }

        // For 'write_directly', return a special marker
        return '__WRITE_DIRECTLY__';
    }

    async editSectionContent(sectionName: string, initialContent: string = ''): Promise<string> {
        this.showSectionHeader(sectionName);
        
        console.log(chalk.yellow(`🔍 Debug: editSectionContent appelé pour "${sectionName}"`));
        console.log(chalk.yellow(`🔍 Debug: initialContent length = ${initialContent.length}`));
        
        // Always use VSCode for editing (no confirmation needed)
        console.log(chalk.yellow(`🔍 Debug: Appel editInVSCode...`));
        return await this.editInVSCode(initialContent, sectionName);
    }

    private checkVSCodeAvailable(): boolean {
        console.log(chalk.yellow(`🔍 Debug: Vérification de VSCode...`));
        
        try {
            const result = execSync('which code-insiders', { stdio: 'pipe' });
            console.log(chalk.yellow(`🔍 Debug: which code-insiders = ${result.toString().trim()}`));
            return true;
        } catch (error) {
            console.log(chalk.yellow(`🔍 Debug: which code-insiders failed: ${error.message}`));
            
            try {
                const result = execSync('code-insiders --version', { stdio: 'pipe' });
                console.log(chalk.yellow(`🔍 Debug: code-insiders --version = ${result.toString().trim()}`));
                return true;
            } catch (error2) {
                console.log(chalk.yellow(`🔍 Debug: code-insiders --version failed: ${error2.message}`));
                return false;
            }
        }
    }

    private async editInVSCode(content: string, sectionName: string): Promise<string> {
        console.log(chalk.yellow(`🔍 Debug: editInVSCode appelé pour "${sectionName}"`));
        
        // Check if VSCode is available
        if (!this.checkVSCodeAvailable()) {
            this.showError('VSCode n\'est pas disponible. Veuillez installer VSCode.');
            return content;
        }

        const tempFileName = `jira-${sectionName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.md`;
        const tempFilePath = join(tmpdir(), tempFileName);
        
        try {
            // Write content to temporary file with helpful header
            const fileContent = `# JIRA Section: ${sectionName}
# Éditez le contenu ci-dessous, sauvegardez et fermez VSCode pour continuer
# Les lignes commençant par # seront ignorées

${content}`;
            
            writeFileSync(tempFilePath, fileContent, 'utf8');
            
            console.log(chalk.yellow(`🔍 Debug: Fichier créé: ${tempFilePath}`));
            this.showInfo(`📝 Fichier temporaire créé: ${tempFilePath}`);
            this.showInfo(`🚀 Ouverture dans VSCode...`);
            
            console.log(chalk.yellow(`🔍 Debug: Exécution: code-insiders --wait "${tempFilePath}"`));
            
            // Open in VSCode and wait for it to close
            try {
                execSync(`code-insiders --wait "${tempFilePath}"`, { 
                    stdio: 'inherit',
                    timeout: 300000, // 5 minute timeout
                    encoding: 'utf8'
                });
            } catch (error) {
                // If the error is just about the process exit code, but the file was edited, continue
                console.log(chalk.yellow(`🔍 Debug: Erreur execSync (peut être normale): ${error.message}`));
                if (error.status !== 0) {
                    console.log(chalk.yellow(`🔍 Debug: Exit code: ${error.status}`));
                }
            }
            
            console.log(chalk.yellow(`🔍 Debug: VSCode fermé, lecture du fichier...`));
            
            // Read the edited content
            const editedContent = readFileSync(tempFilePath, 'utf8');
            
            // Remove the header comments and extract the actual content
            const lines = editedContent.split('\n');
            const contentLines = lines.filter(line => !line.startsWith('#')).join('\n').trim();
            
            // Clean up temporary file
            unlinkSync(tempFilePath);
            
            if (contentLines) {
                this.showSuccess('✅ Contenu mis à jour depuis VSCode!');
                return contentLines;
            } else {
                this.showWarning('⚠️  Aucun contenu trouvé, conservation du contenu original...');
                return content;
            }
            
        } catch (error: any) {
            this.showError(`❌ Erreur avec l'édition VSCode: ${error.message}`);
            console.log(chalk.red(`🔍 Debug: Erreur complète: ${error.stack}`));
            
            // Clean up temp file if it exists
            try {
                unlinkSync(tempFilePath);
            } catch {}
            
            return content;
        }
    }

    private showSectionHeader(sectionName: string): void {
        console.log(`\n✨ ${chalk.bold.cyan(sectionName)} ✨`);
        console.log(chalk.dim('─'.repeat(50)));
    }

    async showGeneratedTemplate(template: string): Promise<void> {
        const box = boxen(template, {
            title: chalk.bold.green('🚀 Template généré'),
            padding: 1,
            margin: 1,
            borderStyle: 'double',
            borderColor: 'green'
        });
        
        console.log(box);
    }

    async showMainMenu(): Promise<'replace' | 'append' | 'restart' | 'quit'> {
        const choice = await select({
            message: 'Que voulez-vous faire ?',
            choices: [
                {
                    name: `${chalk.green('🔄')} Remplacer la description par ce template`,
                    value: 'replace'
                },
                {
                    name: `${chalk.blue('➕')} Ajouter le template à la description existante`,
                    value: 'append'
                },
                {
                    name: `${chalk.yellow('🔄')} Recommencer (reconstruire le template)`,
                    value: 'restart'
                },
                {
                    name: `${chalk.red('❌')} Quitter`,
                    value: 'quit'
                }
            ]
        });

        return choice;
    }

    async promptForNextIssue(): Promise<string | null> {
        const wantAnother = await confirm({
            message: 'Voulez-vous traiter un autre ticket JIRA ?',
            default: false
        });

        if (!wantAnother) {
            return null;
        }

        const issueKey = await input({
            message: 'Numéro du ticket (ex: SOFFER-526):',
            validate: (input) => {
                if (!input.trim()) {
                    return 'Veuillez entrer un numéro de ticket';
                }
                return true;
            }
        });

        return issueKey;
    }

    // Spinner methods
    startSpinner(text: string): void {
        this.spinner.start(chalk.cyan(text));
    }

    updateSpinner(text: string): void {
        this.spinner.text = chalk.cyan(text);
    }

    succeedSpinner(text: string): void {
        this.spinner.succeed(chalk.green(text));
    }

    failSpinner(text: string): void {
        this.spinner.fail(chalk.red(text));
    }

    stopSpinner(): void {
        this.spinner.stop();
    }

    // Utility methods
    showSuccess(message: string): void {
        console.log(chalk.green(`✅ ${message}`));
    }

    showError(message: string): void {
        console.log(chalk.red(`❌ ${message}`));
    }

    showInfo(message: string): void {
        console.log(chalk.blue(`ℹ️  ${message}`));
    }

    showWarning(message: string): void {
        console.log(chalk.yellow(`⚠️  ${message}`));
    }

    showGoodbye(): void {
        console.log('\n' + chalk.green('🎉 Merci d\'avoir utilisé JIRA AI ! 🎉'));
        console.log(chalk.dim('   Développé avec ❤️  par Claude'));
    }
}