/**
 * Email Template Variable Substitution
 * Supports {{variable}} syntax for dynamic content
 */

import type { Project, User } from '@prisma/client';

// Variable context for substitution
export interface VariableContext {
  user?: Pick<User, 'name' | 'email'> | null;
  project?: Pick<Project, 'name' | 'projectNumber' | 'clientName' | 'simplicateId'> | null;
  custom?: Record<string, string>;
}

// Available variables documentation (for template editor UI)
export const VARIABLE_DEFINITIONS = {
  user: {
    memberName: 'Full name of the team member',
    memberFirstName: 'First name of the team member',
    memberEmail: 'Email address of the team member',
  },
  project: {
    projectName: 'Name of the project',
    projectNumber: 'Project number (e.g., P2024-001)',
    clientName: 'Name of the client',
    simplicateUrl: 'Direct link to project in Simplicate',
  },
  system: {
    uploadUrl: 'Secure document upload URL (generated)',
    appUrl: 'Application URL',
    currentDate: 'Current date (DD-MM-YYYY)',
    currentYear: 'Current year',
  },
} as const;

// Get all available variable names as a flat list
export function getAvailableVariables(): string[] {
  return [
    ...Object.keys(VARIABLE_DEFINITIONS.user),
    ...Object.keys(VARIABLE_DEFINITIONS.project),
    ...Object.keys(VARIABLE_DEFINITIONS.system),
  ];
}

// Extract first name from full name
function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  return parts[0] || fullName;
}

// Format date as DD-MM-YYYY (Dutch format)
function formatDate(date: Date): string {
  return date.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Build Simplicate project URL
function buildSimplicateUrl(simplicateId: string): string {
  // Simplicate URL format: https://{subdomain}.simplicate.com/projects/{id}
  // Since we don't have the subdomain, we use a generic pattern
  return `https://app.simplicate.com/projects/project/${simplicateId}`;
}

// Resolve a single variable
function resolveVariable(
  key: string,
  context: VariableContext,
  appUrl: string,
  uploadUrl?: string
): string | undefined {
  // Check custom variables first (highest priority)
  if (context.custom?.[key]) {
    return context.custom[key];
  }

  // User variables
  if (context.user) {
    switch (key) {
      case 'memberName':
        return context.user.name || 'Team Member';
      case 'memberFirstName':
        return getFirstName(context.user.name) || 'Team Member';
      case 'memberEmail':
        return context.user.email;
    }
  }

  // Project variables
  if (context.project) {
    switch (key) {
      case 'projectName':
        return context.project.name;
      case 'projectNumber':
        return context.project.projectNumber || '';
      case 'clientName':
        return context.project.clientName || '';
      case 'simplicateUrl':
        return context.project.simplicateId
          ? buildSimplicateUrl(context.project.simplicateId)
          : '';
    }
  }

  // System variables
  switch (key) {
    case 'uploadUrl':
      return uploadUrl || '';
    case 'appUrl':
      return appUrl;
    case 'currentDate':
      return formatDate(new Date());
    case 'currentYear':
      return new Date().getFullYear().toString();
  }

  return undefined;
}

// Substitute all variables in a template string
export function substituteVariables(
  template: string,
  context: VariableContext,
  options: {
    appUrl: string;
    uploadUrl?: string;
  }
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = resolveVariable(key, context, options.appUrl, options.uploadUrl);
    // Keep the original placeholder if variable not found
    return value !== undefined ? value : match;
  });
}

// Validate that a template only uses known variables
export function validateTemplateVariables(template: string): {
  valid: boolean;
  unknownVariables: string[];
  usedVariables: string[];
} {
  const availableVars = new Set(getAvailableVariables());
  const usedVariables: string[] = [];
  const unknownVariables: string[] = [];

  const regex = /\{\{(\w+)\}\}/g;
  let match;

  while ((match = regex.exec(template)) !== null) {
    const varName = match[1];
    if (varName && !usedVariables.includes(varName)) {
      usedVariables.push(varName);
      if (!availableVars.has(varName)) {
        unknownVariables.push(varName);
      }
    }
  }

  return {
    valid: unknownVariables.length === 0,
    unknownVariables,
    usedVariables,
  };
}

// Get sample data for template preview
export function getSampleVariableData(): Record<string, string> {
  return {
    memberName: 'Jan de Vries',
    memberFirstName: 'Jan',
    memberEmail: 'jan@example.com',
    projectName: 'Website Redesign',
    projectNumber: 'P2024-001',
    clientName: 'Acme Corp',
    simplicateUrl: 'https://app.simplicate.com/projects/project/example',
    uploadUrl: 'https://your-app.vercel.app/upload/abc123',
    appUrl: 'https://your-app.vercel.app',
    currentDate: formatDate(new Date()),
    currentYear: new Date().getFullYear().toString(),
  };
}

// Render a preview with sample data
export function renderPreview(template: string): string {
  const sampleData = getSampleVariableData();
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return sampleData[key] || match;
  });
}
