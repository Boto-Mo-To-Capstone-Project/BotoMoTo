import db from "@/lib/db/db";

/**
 * Generate a unique voter code
 * @returns A unique 6-digit voter code
 * 
 * Alternative formats (uncomment and modify if needed):
 * - ABC123 format (3 letters + 3 numbers):
 *   const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
 *   const numbers = '0123456789';
 *   let code = '';
 *   for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
 *   for (let i = 0; i < 3; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
 *   return code;
 */
export async function generateUniqueVoterCode(): Promise<string> {
  let code: string;
  let isUnique = false;
  
  while (!isUnique) {
    // Generate a 6-digit number (100000 to 999999)
    code = Math.floor(Math.random() * 900000 + 100000).toString();
    
    // Check if this code already exists
    const existingVoter = await db.voter.findUnique({
      where: { code }
    });
    
    if (!existingVoter) {
      isUnique = true;
    }
  }
  
  return code!;
}

/**
 * Generate multiple unique voter codes efficiently
 * @param count Number of codes to generate
 * @returns Array of unique voter codes
 */
export async function generateMultipleUniqueVoterCodes(count: number): Promise<string[]> {
  const codes: string[] = [];
  const batchSize = 50; // Generate codes in batches to avoid memory issues
  
  for (let i = 0; i < count; i += batchSize) {
    const currentBatchSize = Math.min(batchSize, count - i);
    const batchCodes = await generateBatchUniqueVoterCodes(currentBatchSize);
    codes.push(...batchCodes);
  }
  
  return codes;
}

/**
 * Generate a batch of unique voter codes efficiently
 * @param count Number of codes to generate in this batch
 * @returns Array of unique voter codes
 */
async function generateBatchUniqueVoterCodes(count: number): Promise<string[]> {
  const codes: string[] = [];
  const maxAttempts = count * 3; // Safety limit to prevent infinite loops
  let attempts = 0;
  
  while (codes.length < count && attempts < maxAttempts) {
    // Generate multiple candidate codes
    const candidateCodes: string[] = [];
    const remainingNeeded = count - codes.length;
    const generateCount = Math.min(remainingNeeded * 2, 100); // Generate extra in case of collisions
    
    for (let i = 0; i < generateCount; i++) {
      const code = Math.floor(Math.random() * 900000 + 100000).toString();
      candidateCodes.push(code);
    }
    
    // Check which codes already exist in a single query
    const existingVoters = await db.voter.findMany({
      where: {
        code: { in: candidateCodes }
      },
      select: { code: true }
    });
    
    const existingCodes = new Set(existingVoters.map(v => v.code));
    
    // Add unique codes
    for (const code of candidateCodes) {
      if (!existingCodes.has(code) && !codes.includes(code)) {
        codes.push(code);
        if (codes.length >= count) break;
      }
    }
    
    attempts++;
  }
  
  if (codes.length < count) {
    throw new Error(`Could not generate ${count} unique codes after ${maxAttempts} attempts`);
  }
  
  return codes.slice(0, count);
}

/**
 * Check if a voter code is unique
 * @param code The code to check
 * @returns True if the code is unique, false otherwise
 */
export async function isVoterCodeUnique(code: string): Promise<boolean> {
  const existingVoter = await db.voter.findUnique({
    where: { code }
  });
  
  return !existingVoter;
}

/**
 * Validate voter code format
 * @param code The code to validate
 * @returns True if the format is valid, false otherwise
 * 
 * Alternative validation patterns:
 * - ABC123 format: /^[A-Z]{3}[0-9]{3}$/.test(code)
 */
export function isValidVoterCodeFormat(code: string): boolean {
  // Check if code is exactly 6 digits
  return /^[0-9]{6}$/.test(code);
}
