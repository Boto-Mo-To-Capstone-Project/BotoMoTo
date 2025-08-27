import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/db';
import { templateRegistry } from '@/lib/email/templates/registry';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { ROLES } from '@/lib/constants';

// Types for template variables
interface TemplateVariables {
  voterName: string;
  votingCode: string;
  electionTitle: string;
  organizationName: string;
  expiryDate?: string;
  startDate?: string;
  endDate?: string;
  instructions?: string;
}

// GET - List all templates (system + custom)
export async function GET(request: NextRequest) {
  try {

    // Check authentication and authorization
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) {
        return authResult.response;
    }
    const user = authResult.user;

    console.log('Authenticated user sa templates:', user);
    const organizationId = user.organization.id;

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');

    // if merong query param na templateId
    // If specific template requested, return its details
    if (templateId) {
      // Check if it's a system template (use explicit list, not dynamic registry)
      const systemTemplateIds = ['voting-code', 'voting-code-html'];
      if (systemTemplateIds.includes(templateId)) {
        return NextResponse.json({
          success: true,
          template: {
            id: templateId,
            name: templateId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: 'System template',
            type: 'system',
            createdAt: null,
            fileUrl: null
          }
        });
      }

      // Check custom templates
      const customTemplate = await db.emailTemplate.findFirst({
        where: {
          templateId,
          organizationId: organizationId,
        }
      });

      if (customTemplate) {
        return NextResponse.json({
          success: true,
          template: {
            id: customTemplate.templateId,
            name: customTemplate.name,
            description: customTemplate.description,
            type: 'custom',
            createdAt: customTemplate.createdAt.toISOString(),
            fileUrl: `/api/email/templates/${customTemplate.id}/download` // Always available since content is in DB
          }
        });
      }

      return NextResponse.json(
        { success: false, message: 'Template not found' },
        { status: 404 }
      );
    }

    // List all available templates
    // Only include original system templates from defaultTemplates registry
    const systemTemplateIds = ['voting-code', 'voting-code-html']; // Exact IDs from templateRegistry
    
    const systemTemplates = systemTemplateIds.map(id => ({
      id,
      name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: 'System template',
      type: 'system' as const,
      createdAt: null,
      fileUrl: null
    }));

    const customTemplates = await db.emailTemplate.findMany({
      where: {
        organizationId: organizationId,
        type: 'CUSTOM'
      },
      select: {
        id: true,
        templateId: true,
        name: true,
        description: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      // Get distinct templateIds only (prevent duplicates from database level)
      distinct: ['templateId']
    });

    const customTemplatesList = customTemplates.map((template: any) => ({
      id: template.templateId,
      name: template.name, // Use the actual name from database, not derived from ID
      description: template.description,
      type: 'custom' as const,
      createdAt: template.createdAt.toISOString(),
      fileUrl: `/api/email/templates/${template.id}/download` // Always available since content is in DB
    }));

    // Remove duplicates by templateId (in case there are duplicate database entries)
    const uniqueCustomTemplates = customTemplatesList.filter((template, index, self) => 
      index === self.findIndex(t => t.id === template.id)
    );

    // Debug logging
    if (customTemplatesList.length !== uniqueCustomTemplates.length) {
      console.warn(`Removed ${customTemplatesList.length - uniqueCustomTemplates.length} duplicate templates for organization ${organizationId}`);
    }

    const allTemplates = [...systemTemplates, ...uniqueCustomTemplates];

    return NextResponse.json({
      success: true,
      templates: allTemplates,
      available: allTemplates.map(t => t.id) // For backward compatibility
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST - Upload new custom template
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) {
        return authResult.response;
    }
    const user = authResult.user;
    const organizationId = user.organization.id;

    const formData = await request.formData();
    const templateName = formData.get('templateName') as string;
    const description = formData.get('description') as string | null;
    const templateFile = formData.get('templateFile') as File;

    if (!templateName || !templateFile) {
      return NextResponse.json(
        { success: false, message: 'Template name and file are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!templateFile.type.includes('html') && !templateFile.name.endsWith('.html') && !templateFile.name.endsWith('.htm')) {
      return NextResponse.json(
        { success: false, message: 'Only HTML files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (2MB max)
    if (templateFile.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'File size must be less than 2MB' },
        { status: 400 }
      );
    }

    // Generate unique template ID
    const templateId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Read file content
    const htmlContent = await templateFile.text();

    // Validate template variables (ensure required variables are present)
    const requiredVars = ['voterName', 'votingCode', 'electionTitle', 'organizationName'];
    const missingVars = requiredVars.filter(varName => 
      !htmlContent.includes(`{{${varName}}}`)
    );

    if (missingVars.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Template must include these required variables: ${missingVars.map(v => `{{${v}}}`).join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Check if template name already exists for this organization
    const existingTemplate = await db.emailTemplate.findFirst({
      where: {
        name: templateName.trim(),
        organizationId: organizationId,
        type: 'CUSTOM'
      }
    });

    if (existingTemplate) {
      return NextResponse.json(
        { success: false, message: 'A template with this name already exists' },
        { status: 400 }
      );
    }


    // Use transaction to ensure data consistency and prevent duplicates
    const savedTemplate = await db.$transaction(async (tx) => {
      // Clean up any potential orphaned or duplicate templates for this organization
      // This helps prevent accumulation of duplicate entries
      const existingCount = await tx.emailTemplate.count({
        where: {
          organizationId: organizationId,
          type: 'CUSTOM'
        }
      });

      // If we have too many templates (more than 50), clean up oldest ones
      if (existingCount > 50) {
        const oldTemplates = await tx.emailTemplate.findMany({
          where: {
            organizationId: organizationId,
            type: 'CUSTOM'
          },
          orderBy: {
            createdAt: 'asc'
          },
          take: existingCount - 50,
          select: { id: true, filePath: true }
        });


        // Delete old template records
        await tx.emailTemplate.deleteMany({
          where: {
            id: { in: oldTemplates.map(t => t.id) }
          }
        });
      }

      // Save new template to database (HTML content only, no file storage)
      return await tx.emailTemplate.create({
        data: {
          name: templateName.trim(),
          description: description?.trim() || null,
          templateId,
          type: 'CUSTOM',
          htmlContent,
          defaultSubject: 'Your Voting Code - {{electionTitle}}',
          fileName: templateFile.name,
          fileSize: templateFile.size,
          organizationId: organizationId,
          createdBy: user.id
        }
      });
    });

    // Note: We don't register custom templates globally in templateEngine
    // They will be loaded on-demand when needed for rendering

    return NextResponse.json({
      success: true,
      message: 'Template uploaded successfully',
      template: {
        id: templateId,
        name: savedTemplate.name,
        description: savedTemplate.description,
        type: 'custom',
        createdAt: savedTemplate.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error uploading template:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete custom template
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) {
        return authResult.response;
    }
    const user = authResult.user;
    const organizationId = user.organization.id;

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json(
        { success: false, message: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Prevent deletion of system templates
    if (templateId in templateRegistry) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete system templates' },
        { status: 400 }
      );
    }

    // Find and delete custom template
    const template = await db.emailTemplate.findFirst({
      where: {
        templateId,
        organizationId: organizationId,
        type: 'CUSTOM'
      }
    });

    if (!template) {
      return NextResponse.json(
        { success: false, message: 'Template not found' },
        { status: 404 }
      );
    }

    // No file deletion needed since we only store HTML content in database

    // Delete from database
    await db.emailTemplate.delete({
      where: { id: template.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
