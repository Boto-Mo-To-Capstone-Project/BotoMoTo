// utils/text.ts
export const toSentenceCase = (str: string) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";
