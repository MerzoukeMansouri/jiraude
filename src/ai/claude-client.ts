import { exec } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TemplateSection, ClaudeResponse, JiraIssue } from '../types/index.js';
import { CLI_TIMEOUTS } from '../config/default-config.js';

export class ClaudeClient {
    private timeout: number;

    constructor(timeout?: number) {
        this.timeout = timeout || CLI_TIMEOUTS.CLAUDE_CLI;
    }

    async callClaudeCLI(prompt: string): Promise<ClaudeResponse> {
        return new Promise((resolve) => {
            try {
                // Check if claude command exists
                exec('which claude', (whichError) => {
                    if (whichError) {
                        resolve({
                            content: '',
                            success: false,
                            error: 'Claude CLI not found. Please install Claude CLI first: https://claude.ai/cli'
                        });
                        return;
                    }

                    // Use temporary file to avoid command line length limits
                    const tempFileName = `claude-prompt-${Date.now()}.txt`;
                    const tempFilePath = join(tmpdir(), tempFileName);
                    
                    try {
                        // Write prompt to temporary file
                        writeFileSync(tempFilePath, prompt, 'utf8');
                        
                        const command = `claude < "${tempFilePath}"`;
                        
                        
                        exec(command, { 
                            timeout: this.timeout,
                            maxBuffer: 1024 * 1024 * 10,
                            shell: '/bin/bash'
                        }, (error, stdout, stderr) => {
                            // Clean up temp file
                            try {
                                unlinkSync(tempFilePath);
                            } catch {}
                            
                            if (error) {
                                if (error.code === 'ETIMEDOUT') {
                                    resolve({
                                        content: '',
                                        success: false,
                                        error: 'Claude CLI request timed out after 60 seconds. Try with shorter context.'
                                    });
                                } else {
                                    resolve({
                                        content: '',
                                        success: false,
                                        error: `Claude CLI execution failed: ${error.message}. Code: ${error.code}`
                                    });
                                }
                                return;
                            }
                            
                            if (stderr && stderr.trim()) {
                                // Don't treat stderr as fatal error if we got stdout
                                if (!stdout || !stdout.trim()) {
                                    resolve({
                                        content: '',
                                        success: false,
                                        error: `Claude CLI error: ${stderr.trim()}`
                                    });
                                    return;
                                }
                            }
                            
                            const output = stdout.trim();
                            if (!output) {
                                resolve({
                                    content: '',
                                    success: false,
                                    error: 'Claude CLI returned empty response'
                                });
                                return;
                            }
                            
                            resolve({
                                content: output,
                                success: true
                            });
                        });
                        
                    } catch (fileError: any) {
                        resolve({
                            content: '',
                            success: false,
                            error: `Failed to create temp file: ${fileError.message}`
                        });
                    }
                });
            } catch (error: any) {
                resolve({
                    content: '',
                    success: false,
                    error: `Unexpected error: ${error.message}`
                });
            }
        });
    }

    getAdminPrompt(): string {
        return `You are a Senior Software Engineer with extensive experience in JIRA ticket management and technical documentation. Your role is to help create professional, comprehensive JIRA ticket descriptions that meet enterprise standards.

CRITICAL FORMATTING RULES:
- Use single asterisk (*) for emphasis, NEVER double asterisks (**)
- Use plain text with bullet points (-) for lists
- Avoid markdown-style headers (#, ##, ###)
- Write in plain, professional prose suitable for JIRA panels
- Do NOT repeat the section name in your content (e.g., don't write "Description:" in a Description section)

CONTENT CONSTRAINTS:
- MAXIMUM 150 words per response (Context: 100 words max)
- Focus ONLY on what is essential and important
- Avoid verbose explanations and unnecessary details
- Be direct and actionable
- Maintain professional tone suitable for enterprise environments

Key principles:
- Write clear, actionable content that developers and stakeholders can understand
- Include specific technical details and requirements when appropriate
- Ensure content is testable and measurable
- Consider edge cases, error handling, and non-functional requirements
- Focus on practical implementation details

Generate content that is:
1. Specific and actionable
2. Relevant to the technical context
3. Appropriate for the audience (developers, QA, product managers)
4. Comprehensive but concise
5. Following enterprise documentation standards
6. Prioritizing the most important points first`;
    }

    getClaudePromptForSection(section: TemplateSection, issueData: JiraIssue, userContext?: string): string {
        const baseInfo = this.formatIssueData(issueData);
        const adminInstructions = this.getAdminPrompt();
        const sectionPrompt = section.adminPrompt;
        
        let prompt = `${adminInstructions}\n\n`;
        prompt += `Current JIRA Issue Information:\n${baseInfo}\n\n`;
        prompt += `Section to generate: ${section.name}\n`;
        prompt += `Requirements: ${sectionPrompt}\n\n`;
        
        if (userContext && userContext.trim()) {
            prompt += `Additional context from user:\n${userContext}\n\n`;
        }
        
        prompt += `Please generate professional content for the "${section.name}" section of this JIRA ticket. `;
        prompt += `Ensure the content is specific to this issue and follows the requirements above. `;
        prompt += `Write in a clear, professional tone suitable for enterprise environments. `;
        
        if (section.name === 'Description') {
            prompt += `CRITICAL: Focus on WHAT and WHY only. Avoid technical implementation details (HOW). `;
            prompt += `Do NOT start with "Description:" or similar labels. `;
            prompt += `Keep your response under 150 words and focus on business goals and objectives.`;
        } else if (section.name === 'Technical Requirements') {
            prompt += `CRITICAL: Focus on HOW the work will be implemented. Include technical details, constraints, and specifications. `;
            prompt += `Do NOT start with "Technical Requirements:" or similar labels. `;
            prompt += `Keep your response under 150 words and focus on technical implementation details.`;
        } else if (section.name === 'Context') {
            prompt += `CRITICAL: Keep your response under 100 words and focus only on essential background context. `;
            prompt += `Do NOT start with "Context:" or similar labels.`;
        } else if (section.name === 'Acceptance criteria') {
            prompt += `CRITICAL: Focus on specific, testable conditions. Use clear bullet points or numbered lists. `;
            prompt += `Do NOT start with "Acceptance Criteria:" or similar labels. `;
            prompt += `Keep your response under 150 words.`;
        } else {
            prompt += `IMPORTANT: Keep your response under 150 words and focus only on essential information. `;
            prompt += `Do NOT start with section labels or repeat the section name.`;
        }
        
        return prompt;
    }

    private formatIssueData(issueData: JiraIssue): string {
        const info: string[] = [];
        
        info.push(`• Issue Key: ${issueData.key}`);
        info.push(`• Summary: ${issueData.fields.summary}`);
        info.push(`• Issue Type: ${issueData.fields.issuetype.name}`);
        info.push(`• Project: ${issueData.fields.project.name} (${issueData.fields.project.key})`);
        info.push(`• Status: ${issueData.fields.status.name}`);
        
        if (issueData.fields.assignee) {
            info.push(`• Assignee: ${issueData.fields.assignee.displayName}`);
        }
        
        info.push(`• Reporter: ${issueData.fields.reporter.displayName}`);
        
        if (issueData.fields.priority) {
            info.push(`• Priority: ${issueData.fields.priority.name}`);
        }
        
        if (issueData.fields.description) {
            info.push(`• Current Description: ${issueData.fields.description}`);
        }
        
        return info.join('\n');
    }

    async generateSectionContent(section: TemplateSection, issueData: JiraIssue, userContext?: string): Promise<ClaudeResponse> {
        const prompt = this.getClaudePromptForSection(section, issueData, userContext);
        return await this.callClaudeCLI(prompt);
    }

    async improveSectionContent(section: TemplateSection, currentContent: string, feedback: string): Promise<ClaudeResponse> {
        const prompt = `${this.getAdminPrompt()}\n\n` +
                      `Section: ${section.name}\n` +
                      `Current content:\n${currentContent}\n\n` +
                      `User feedback/improvement request:\n${feedback}\n\n` +
                      `Please improve the content based on the feedback while maintaining professional standards. ` +
                      `Do NOT repeat the section name or add labels like "${section.name}:". ` +
                      `Use single asterisks (*) for emphasis, never double (**). ` +
                      `Keep your response under ${section.name === 'Context' ? '100' : '150'} words and focus only on essential information.`;
        
        return await this.callClaudeCLI(prompt);
    }

    validateResponse(response: ClaudeResponse): boolean {
        return response.success && 
               response.content && 
               response.content.trim().length > 0 &&
               !response.error;
    }

    setTimeout(timeout: number): void {
        this.timeout = timeout;
    }
}