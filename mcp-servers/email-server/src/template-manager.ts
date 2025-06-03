import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { EmailTemplate } from './types.js';

export class TemplateManager {
  private templateDir: string;
  private templates: Map<string, EmailTemplate> = new Map();

  constructor(templateDir: string) {
    this.templateDir = templateDir;
    this.ensureTemplateDir();
    this.loadTemplates();
  }

  private ensureTemplateDir(): void {
    if (!fs.existsSync(this.templateDir)) {
      fs.mkdirSync(this.templateDir, { recursive: true });
      console.log(`Created template directory: ${this.templateDir}`);
    }
  }

  private loadTemplates(): void {
    try {
      const files = fs.readdirSync(this.templateDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.templateDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          try {
            const template = JSON.parse(content) as EmailTemplate;
            this.templates.set(template.id, template);
          } catch (err) {
            console.error(`Error parsing template file ${file}:`, err);
          }
        }
      }
      
      console.log(`Loaded ${this.templates.size} email templates`);
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  }

  async createTemplate(params: {
    name: string;
    subject: string;
    content: string;
    description?: string;
    category?: string;
  }): Promise<EmailTemplate> {
    const { name, subject, content, description, category } = params;
    
    // Generate a unique ID
    const id = crypto.randomUUID();
    
    const template: EmailTemplate = {
      id,
      name,
      subject,
      content,
      description,
      category,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Save to memory
    this.templates.set(id, template);
    
    // Save to disk
    const filePath = path.join(this.templateDir, `${id}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(template, null, 2), 'utf8');
    
    return template;
  }

  async getTemplate(idOrName: string): Promise<EmailTemplate | null> {
    // First try to find by ID
    if (this.templates.has(idOrName)) {
      return this.templates.get(idOrName) || null;
    }
    
    // Then try to find by name
    for (const template of this.templates.values()) {
      if (template.name === idOrName) {
        return template;
      }
    }
    
    return null;
  }

  async updateTemplate(id: string, updates: Partial<Omit<EmailTemplate, 'id' | 'createdAt'>>): Promise<EmailTemplate | null> {
    const template = this.templates.get(id);
    if (!template) {
      return null;
    }
    
    const updatedTemplate: EmailTemplate = {
      ...template,
      ...updates,
      id: template.id, // Ensure ID doesn't change
      createdAt: template.createdAt, // Ensure creation date doesn't change
      updatedAt: new Date() // Update the update date
    };
    
    // Save to memory
    this.templates.set(id, updatedTemplate);
    
    // Save to disk
    const filePath = path.join(this.templateDir, `${id}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(updatedTemplate, null, 2), 'utf8');
    
    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    if (!this.templates.has(id)) {
      return false;
    }
    
    // Remove from memory
    this.templates.delete(id);
    
    // Remove from disk
    const filePath = path.join(this.templateDir, `${id}.json`);
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch (err) {
      console.error(`Error deleting template file ${id}:`, err);
      return false;
    }
  }

  async listTemplates(category?: string): Promise<EmailTemplate[]> {
    const templates = Array.from(this.templates.values());
    
    if (category) {
      return templates.filter(t => t.category === category);
    }
    
    return templates;
  }
}