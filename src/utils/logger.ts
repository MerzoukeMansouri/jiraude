import chalk from 'chalk';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SUCCESS = 4
}

export class Logger {
    private static instance: Logger;
    private currentLevel: LogLevel = LogLevel.INFO;

    private constructor() {}

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    setLevel(level: LogLevel): void {
        this.currentLevel = level;
    }

    debug(message: string, ...args: any[]): void {
        if (this.currentLevel <= LogLevel.DEBUG) {
            console.log(chalk.gray(`🐛 [DEBUG] ${message}`), ...args);
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.currentLevel <= LogLevel.INFO) {
            console.log(chalk.blue(`ℹ️  ${message}`), ...args);
        }
    }

    warn(message: string, ...args: any[]): void {
        if (this.currentLevel <= LogLevel.WARN) {
            console.log(chalk.yellow(`⚠️  ${message}`), ...args);
        }
    }

    error(message: string, ...args: any[]): void {
        if (this.currentLevel <= LogLevel.ERROR) {
            console.log(chalk.red(`❌ ${message}`), ...args);
        }
    }

    success(message: string, ...args: any[]): void {
        if (this.currentLevel <= LogLevel.SUCCESS) {
            console.log(chalk.green(`✅ ${message}`), ...args);
        }
    }

    // Specialized methods
    claude(message: string): void {
        console.log(chalk.magenta(`🤖 Claude: ${message}`));
    }

    jira(message: string): void {
        console.log(chalk.cyan(`🎫 JIRA: ${message}`));
    }

    step(step: number, total: number, message: string): void {
        const progress = `[${step}/${total}]`;
        console.log(chalk.blue(`🔄 ${progress} ${message}`));
    }

    loading(message: string): void {
        console.log(chalk.cyan(`⏳ ${message}`));
    }
}