#!/usr/bin/env node

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Command } from 'commander';
import { Logger, LogLevel } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env.local');
config({ path: envPath });

// Import after dotenv to ensure config has access to environment variables
import { ModernJiraUpdater } from './app-modern.js';

const logger = Logger.getInstance();
const program = new Command();

program
    .name('jira-ai')
    .description('🤖 JIRA AI - Générateur de descriptions intelligentes avec Claude')
    .version('1.0.0')
    .argument('<issue-key>', 'Numéro du ticket JIRA (ex: SOFFER-525)')
    .option('-v, --verbose', 'Mode verbose (debug)')
    .option('-q, --quiet', 'Mode silencieux')
    .action(async (issueKey: string, options) => {
        // Set log level
        if (options.verbose) {
            logger.setLevel(LogLevel.DEBUG);
        } else if (options.quiet) {
            logger.setLevel(LogLevel.ERROR);
        }

        try {
            const updater = new ModernJiraUpdater();
            await updater.run(issueKey);
        } catch (error) {
            if (error.name === 'ExitPromptError') {
                logger.info('Opération annulée par l\'utilisateur');
                process.exit(0);
            }
            logger.error(`Erreur lors du traitement du ticket: ${error}`);
            process.exit(1);
        }
    });

// Handle graceful shutdown
process.on('SIGINT', () => {
    logger.info('\nArrêt en cours...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('Erreur inattendue:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error('Promesse rejetée:', reason);
    process.exit(1);
});

program.parse();