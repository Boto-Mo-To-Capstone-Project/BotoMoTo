import { useMemo } from "react";

export function useClickableLinks(text?: string) {
  return useMemo(() => {
    if (!text) return null;

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return text.split(urlRegex).map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  }, [text]);
}
