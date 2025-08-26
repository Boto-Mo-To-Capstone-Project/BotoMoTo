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
 * Generate multiple unique voter codes
 * @param count Number of codes to generate
 * @returns Array of unique voter codes
 */
export async function generateMultipleUniqueVoterCodes(count: number): Promise<string[]> {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = await generateUniqueVoterCode();
    codes.push(code);
  }
  
  return codes;
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
