
export const toSentenceCase = (str: string) =>{
  if (!str) return "";


  const cleaned = str.replace(/_/g, " ");
  const words = cleaned.trim().split(/\s+/);

  if (words.length > 3) return cleaned; // keep original (with spaces instead of underscores)

  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};


// Converts underscores (_) to spaces.

// If the text has 3 words or fewer, it formats it in Title Case.

// If the text has more than 3 words, it just returns the original text (with underscores already replaced by spaces).
