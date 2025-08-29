/**
 * Basic CSS inliner utility
 * TODO: Replace with 'juice' package for production use
 */
export function inlineCss(html: string): string {
  // Extract CSS from style tags
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const styles: string[] = [];
  let match;
  
  while ((match = styleRegex.exec(html)) !== null) {
    styles.push(match[1]);
  }
  
  if (styles.length === 0) {
    return html;
  }
  
  // Simple CSS selector to inline style conversion
  // This is a basic implementation - juice package would be much better
  let inlinedHtml = html;
  
  // Remove style tags
  inlinedHtml = inlinedHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Basic inline styles for common selectors
  styles.forEach(styleContent => {
    // Very basic parsing - in production, use juice
    const rules = styleContent.split('}').filter(rule => rule.trim());
    
    rules.forEach(rule => {
      const [selector, styles] = rule.split('{').map(s => s.trim());
      if (!selector || !styles) return;
      
      // Only handle basic class and element selectors for now
      if (selector.startsWith('.')) {
        const className = selector.substring(1);
        const regex = new RegExp(`class="([^"]*\\b${className}\\b[^"]*)"`, 'gi');
        inlinedHtml = inlinedHtml.replace(regex, (match, classNames) => {
          return `class="${classNames}" style="${styles}"`;
        });
      } else if (/^[a-zA-Z]+$/.test(selector)) {
        // Basic element selector
        const regex = new RegExp(`<${selector}([^>]*)>`, 'gi');
        inlinedHtml = inlinedHtml.replace(regex, (match, attributes) => {
          if (attributes.includes('style=')) {
            // Merge with existing style
            return match.replace(/style="([^"]*)"/, `style="$1; ${styles}"`);
          } else {
            return `<${selector}${attributes} style="${styles}">`;
          }
        });
      }
    });
  });
  
  return inlinedHtml;
}

/**
 * Convert HTML to plain text
 * TODO: Replace with 'html-to-text' package for production use
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newlines
    .replace(/<\/p>/gi, '\n\n') // Convert </p> to double newlines
    .replace(/<\/div>/gi, '\n') // Convert </div> to newlines
    .replace(/<\/h[1-6]>/gi, '\n\n') // Convert headings to double newlines
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Convert &nbsp; to spaces
    .replace(/&amp;/g, '&') // Convert &amp; to &
    .replace(/&lt;/g, '<') // Convert &lt; to <
    .replace(/&gt;/g, '>') // Convert &gt; to >
    .replace(/&quot;/g, '"') // Convert &quot; to "
    .replace(/&#39;/g, "'") // Convert &#39; to '
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n\s+/g, '\n') // Remove spaces at start of lines
    .trim();
}
