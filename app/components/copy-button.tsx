import clsx from "clsx";
import { useState } from "react";

interface CopyButtonProps {
  textToCopy: string;
}

export function CopyButton({ textToCopy }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={clsx(
        "px-3 py-1.5 text-sm rounded-md",
        "bg-link hover:bg-linkh text-base-0 transition-colors",
        "flex items-center gap-2",
      )}
      aria-label="Copy code to clipboard"
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

export function CodeBlockWithCopyButton({ code }: { code: string }) {
  return (
    <div className="relative">
      <div className="absolute top-0 right-0">
        <CopyButton textToCopy={code} />
      </div>
      <pre
        className={clsx(
          "bg-base-2 dark:bg-base-2d p-4 rounded-md text-sm",
          "text-content-1 dark:text-content-1d max-h-64 overflow-auto",
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
