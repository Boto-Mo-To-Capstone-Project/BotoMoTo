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
  const usedCodes = new Set<string>(); // Track codes used in this batch
  const batchSize = 500; // Larger batch size for better performance
  
  // Get all existing codes once to avoid repeated database queries
  const existingVoters = await db.voter.findMany({
    select: { code: true }
  });
  const existingCodes = new Set(existingVoters.map(v => v.code));
  
  for (let i = 0; i < count; i += batchSize) {
    const currentBatchSize = Math.min(batchSize, count - i);
    const batchCodes = await generateBatchUniqueVoterCodes(currentBatchSize, usedCodes, existingCodes);
    codes.push(...batchCodes);
    
    // usedCodes is already updated in generateBatchUniqueVoterCodes
  }
  
  // Final verification: ensure no duplicates in the final result
  const uniqueCodes = [...new Set(codes)];
  if (uniqueCodes.length !== codes.length) {
    throw new Error(`Duplicate codes detected in generation result. Expected ${codes.length} unique codes, got ${uniqueCodes.length}.`);
  }
  
  return codes;
}

/**
 * Generate a batch of unique voter codes efficiently
 * @param count Number of codes to generate in this batch
 * @param usedCodes Set of codes already used in this generation session
 * @param existingCodes Set of codes that already exist in the database
 * @returns Array of unique voter codes
 */
async function generateBatchUniqueVoterCodes(count: number, usedCodes: Set<string> = new Set(), existingCodes: Set<string> = new Set()): Promise<string[]> {
  const codes: string[] = [];
  const maxAttempts = count * 5; // Increase safety limit
  let attempts = 0;
  
  while (codes.length < count && attempts < maxAttempts) {
    // Generate multiple candidate codes
    const remainingNeeded = count - codes.length;
    const generateCount = Math.min(remainingNeeded * 3, 500); // Generate more candidate codes
    
    for (let i = 0; i < generateCount; i++) {
      const code = Math.floor(Math.random() * 900000 + 100000).toString();
      
      // Skip if already used in this session or exists in DB
      if (!usedCodes.has(code) && !existingCodes.has(code)) {
        codes.push(code);
        usedCodes.add(code); // Add immediately to prevent duplicates in this batch
        if (codes.length >= count) break;
      }
    }
    
    attempts++;
  }
  
  if (codes.length < count) {
    throw new Error(`Could not generate ${count} unique codes after ${maxAttempts} attempts. Generated ${codes.length} out of ${count} requested.`);
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
