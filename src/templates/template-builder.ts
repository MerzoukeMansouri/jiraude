import { TemplateSection } from '../types/index.js';
import { DEFAULT_TEMPLATE_SECTIONS } from '../config/default-config.js';

export class TemplateBuilder {
    private sections: TemplateSection[];

    constructor(customSections?: TemplateSection[]) {
        this.sections = customSections || DEFAULT_TEMPLATE_SECTIONS;
    }

    getDefaultSections(): TemplateSection[] {
        return [...this.sections];
    }

    generateJiraTemplate(sectionsWithContent: Array<{ section: TemplateSection; content: string }>): string {
        if (!sectionsWithContent || sectionsWithContent.length === 0) {
            throw new Error('No sections provided for template generation');
        }

        const templateParts: string[] = [];

        sectionsWithContent.forEach(({ section, content }) => {
            if (!content.trim()) {
                if (section.required) {
                    throw new Error(`Required section "${section.name}" cannot be empty`);
                }
                return;
            }

            const panelHeader = `{panel:title=${section.name}|borderStyle=none|titleBGColor=${section.titleBackgroundColor || '#457b9d'}|bgColor=${section.backgroundColor || '#dcf3f9'}}`;
            const panelFooter = '{panel}';
            
            templateParts.push(panelHeader);
            templateParts.push(content.trim());
            templateParts.push(panelFooter);
        });

        if (templateParts.length === 0) {
            throw new Error('No valid content provided for any sections');
        }

        return templateParts.join('\n');
    }

    validateTemplate(template: string): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!template || !template.trim()) {
            errors.push('Template cannot be empty');
            return { isValid: false, errors };
        }

        const requiredSections = this.sections.filter(s => s.required);
        const missingRequired: string[] = [];

        requiredSections.forEach(section => {
            const sectionHeader = `{panel:title=${section.name}`;
            if (!template.includes(sectionHeader)) {
                missingRequired.push(section.name);
            }
        });

        if (missingRequired.length > 0) {
            errors.push(`Missing required sections: ${missingRequired.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    addSection(section: TemplateSection): void {
        const existingIndex = this.sections.findIndex(s => s.name === section.name);
        if (existingIndex >= 0) {
            this.sections[existingIndex] = section;
        } else {
            this.sections.push(section);
        }
    }

    removeSection(sectionName: string): boolean {
        const index = this.sections.findIndex(s => s.name === sectionName);
        if (index >= 0) {
            this.sections.splice(index, 1);
            return true;
        }
        return false;
    }

    getSectionByName(name: string): TemplateSection | undefined {
        return this.sections.find(s => s.name === name);
    }

    previewTemplate(sectionsWithContent: Array<{ section: TemplateSection; content: string }>): string {
        try {
            return this.generateJiraTemplate(sectionsWithContent);
        } catch (error) {
            return `Error generating preview: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }
}