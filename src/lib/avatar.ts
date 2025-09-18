/**
 * Avatar utility functions for generating user avatars
 */

/**
 * Generates initials from a user's name
 * @param name - The user's full name
 * @returns The first letters of each word, uppercased and limited to 2 characters
 */
export const getInitials = (name: string): string => {
  if (!name || name.trim() === '') return 'U';
  
  return name
    .trim()
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Generates a consistent background color for an avatar based on the user's name
 * @param name - The user's name to generate color from
 * @returns A CSS class for background color
 */
export const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500', 
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-teal-500',
  ];
  
  // Generate a consistent color based on name
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};
