import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testType = 'all' } = body;

    const emailService = await createEmailService();
    const results: any[] = [];

    console.log('[Comprehensive Email Test] Starting tests...');

    // Test 1: Single email send
    if (testType === 'all' || testType === 'single') {
      console.log('[Test 1] Testing single email send...');
      try {
        const singleResult = await emailService.send({
          to: { email: 'test@example.com', name: 'Test User' },
          subject: 'Single Email Test',
          html: '<h1>This is a test email</h1><p>Testing single send functionality.</p>',
          text: 'This is a test email. Testing single send functionality.',
        });

        results.push({
          test: 'single-send',
          success: true,
          provider: singleResult.provider,
          messageId: singleResult.id,
          details: 'Successfully sent single email'
        });
      } catch (error) {
        results.push({
          test: 'single-send',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Test 2: Bulk email send (small batch)
    if (testType === 'all' || testType === 'bulk') {
      console.log('[Test 2] Testing bulk email send...');
      try {
        const bulkMessages = [
          {
            to: { email: 'test1@example.com', name: 'Test User 1' },
            subject: 'Bulk Email Test 1',
            html: '<h1>Bulk Email Test</h1><p>This is message 1 in the bulk test.</p>',
            text: 'Bulk Email Test. This is message 1 in the bulk test.',
          },
          {
            to: { email: 'test2@example.com', name: 'Test User 2' },
            subject: 'Bulk Email Test 2',
            html: '<h1>Bulk Email Test</h1><p>This is message 2 in the bulk test.</p>',
            text: 'Bulk Email Test. This is message 2 in the bulk test.',
          },
          {
            to: { email: 'test3@example.com', name: 'Test User 3' },
            subject: 'Bulk Email Test 3',
            html: '<h1>Bulk Email Test</h1><p>This is message 3 in the bulk test.</p>',
            text: 'Bulk Email Test. This is message 3 in the bulk test.',
          }
        ];

        const bulkResult = await emailService.sendBulk(bulkMessages);

        results.push({
          test: 'bulk-send',
          success: true,
          provider: bulkResult.provider,
          messageIds: bulkResult.ids,
          count: bulkResult.ids.length,
          details: `Successfully sent ${bulkResult.ids.length} bulk emails`
        });
      } catch (error) {
        results.push({
          test: 'bulk-send',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Test 3: Template email send
    if (testType === 'all' || testType === 'template') {
      console.log('[Test 3] Testing template email send...');
      try {
        // Test with the voting-code template that we know exists
        const templateResult = await emailService.sendTemplate(
          'voting-code',
          {
            voterName: 'Test User',
            electionTitle: 'Test Election',
            votingCode: 'TEST123',
            electionDate: '2024-01-15',
            electionTime: '09:00 AM - 5:00 PM',
            organizationName: 'Test Organization',
            contactEmail: 'support@test.com'
          },
          { email: 'test@example.com', name: 'Test User' }
        );

        results.push({
          test: 'template-send',
          success: true,
          messageId: templateResult.id,
          details: 'Successfully sent template email'
        });
      } catch (error) {
        results.push({
          test: 'template-send',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Test 4: Email with attachments
    if (testType === 'all' || testType === 'attachments') {
      console.log('[Test 4] Testing email with attachments...');
      try {
        const attachmentResult = await emailService.send({
          to: { email: 'test@example.com', name: 'Test User' },
          subject: 'Email with Attachment Test',
          html: '<h1>Attachment Test</h1><p>This email contains a test attachment.</p>',
          text: 'Attachment Test. This email contains a test attachment.',
          attachments: [
            {
              filename: 'test.txt',
              content: Buffer.from('This is a test attachment file.'),
              contentType: 'text/plain'
            }
          ]
        });

        results.push({
          test: 'attachment-send',
          success: true,
          provider: attachmentResult.provider,
          messageId: attachmentResult.id,
          details: 'Successfully sent email with attachment'
        });
      } catch (error) {
        results.push({
          test: 'attachment-send',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Test 5: Basic configuration test
    if (testType === 'all' || testType === 'config') {
      console.log('[Test 5] Testing email service configuration...');
      try {
        // Just test that the service was created successfully
        const testConfigResult = await emailService.send({
          to: { email: 'config-test@example.com', name: 'Config Test' },
          subject: 'Configuration Test',
          html: '<p>Testing email service configuration.</p>',
          text: 'Testing email service configuration.',
        });
        
        results.push({
          test: 'config-test',
          success: true,
          details: 'Email service configuration is working correctly',
          messageId: testConfigResult.id
        });
      } catch (error) {
        results.push({
          test: 'config-test',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Summary
    const successCount = results.filter(r => r.success).length;
    const totalTests = results.length;

    console.log(`[Comprehensive Email Test] Completed: ${successCount}/${totalTests} tests passed`);

    return NextResponse.json({
      success: true,
      summary: {
        total: totalTests,
        passed: successCount,
        failed: totalTests - successCount,
        passRate: `${Math.round((successCount / totalTests) * 100)}%`
      },
      results
    });

  } catch (error) {
    console.error('[Comprehensive Email Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
