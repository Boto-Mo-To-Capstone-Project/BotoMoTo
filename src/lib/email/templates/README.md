# Email Template System

The email template system provides a unified way to create, manage, and render email templates using either React components or raw HTML with variable substitution.

## Features

- **Multiple Template Types**: Support for React Email components and raw HTML templates
- **Variable Substitution**: Simple `{{variable}}` syntax for dynamic content
- **CSS Inlining**: Automatic CSS inlining for better email client compatibility
- **Text Generation**: Automatic text version generation from HTML
- **Preview System**: Built-in preview endpoints for development
- **Type Safety**: Full TypeScript support

## Usage

### Basic Template Rendering

```typescript
import { templateEngine } from '@/lib/email';

// Render a template
const result = await templateEngine.render('voting-code', {
  voterName: 'John Doe',
  electionName: 'Student Council Election',
  votingCode: 'ABC123XYZ',
  startDate: 'March 1, 2025',
  endDate: 'March 7, 2025'
});

console.log(result.html); // Rendered HTML
console.log(result.text); // Text version
console.log(result.subject); // Subject line
```

### Sending Template Emails

```typescript
import { createEmailService, initializeTemplates } from '@/lib/email';

// Initialize templates
initializeTemplates();

// Get email service
const emailService = createEmailService();

// Send single template email
await emailService.sendTemplate(
  'voting-code',
  variables,
  { email: 'user@example.com', name: 'User Name' }
);

// Send bulk template emails
await emailService.sendBulkTemplate(
  'voting-code',
  [
    { to: { email: 'user1@example.com' }, variables: { voterName: 'User 1', ... } },
    { to: { email: 'user2@example.com' }, variables: { voterName: 'User 2', ... } }
  ]
);
```

## Creating Templates

### Raw HTML Templates

```typescript
import { RawHtmlTemplate } from '@/lib/email/templates';

const myTemplate: RawHtmlTemplate = {
  html: `
    <h1>Hello {{name}}</h1>
    <p>Your code is: {{code}}</p>
  `,
  text: `
    Hello {{name}}
    Your code is: {{code}}
  `,
  defaultSubject: 'Your code - {{name}}',
  previewProps: {
    name: 'John Doe',
    code: 'ABC123'
  }
};
```

### React Email Templates (Future)

```typescript
import { ReactEmailTemplate } from '@/lib/email/templates';

const MyEmailComponent = ({ name, code }) => (
  <div>
    <h1>Hello {name}</h1>
    <p>Your code is: {code}</p>
  </div>
);

const reactTemplate: ReactEmailTemplate = {
  component: MyEmailComponent,
  defaultSubject: 'Your code - {{name}}',
  previewProps: {
    name: 'John Doe',
    code: 'ABC123'
  }
};
```

### Registering Templates

```typescript
import { templateEngine } from '@/lib/email/templates';

// Register single template
templateEngine.register('my-template', myTemplate);

// Register multiple templates
templateEngine.registerAll({
  'template1': template1,
  'template2': template2
});
```

## Development & Preview

### Preview Templates

Access template previews at:

- `GET /api/email/preview` - List available templates
- `GET /api/email/preview?template=voting-code` - HTML preview
- `GET /api/email/preview?template=voting-code&mode=text` - Text preview
- `GET /api/email/preview?template=voting-code&mode=json` - JSON output

### Test Template Sending

Test template functionality at:

- `GET /api/email/test-template` - Send test email
- `GET /api/email/test-template?action=template` - Send template email
- `GET /api/email/test-template?action=verify` - Check provider health

## Available Templates

### voting-code

Sends voting codes to voters for elections.

**Variables:**
- `voterName` - Name of the voter
- `electionName` - Name of the election
- `votingCode` - The voting code
- `startDate` - Election start date
- `endDate` - Election end date

**Usage:**
```typescript
await emailService.sendTemplate('voting-code', {
  voterName: 'John Doe',
  electionName: 'Student Council Election 2025',
  votingCode: 'ABC123XYZ',
  startDate: 'March 1, 2025',
  endDate: 'March 7, 2025'
}, { email: 'voter@example.com' });
```

## Future Enhancements

When dependencies are installed:

1. **React Email Support**: Install `@react-email/render` and `@react-email/components`
2. **Advanced Templates**: Install `handlebars` for complex logic
3. **Better CSS Inlining**: Install `juice` for robust CSS inlining
4. **Text Generation**: Install `html-to-text` for better text conversion

```bash
npm install @react-email/render @react-email/components handlebars juice html-to-text
npm install --save-dev @types/handlebars @types/html-to-text
```
