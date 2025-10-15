import {
  PrismLight as SyntaxHighlighter,
  type SyntaxHighlighterProps,
} from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "../utils/theme";
import { CopyButton } from "./copy-button";
import { useEffect } from "react";
import clsx from "clsx";

type CodeBlockProps = SyntaxHighlighterProps & {
  copyButton?: boolean;
  children: string;
  divClassName?: string;
};
export function CodeBlock({
  copyButton,
  children,
  divClassName,
  className,
  ...props
}: CodeBlockProps) {
  const { theme } = useTheme();

  useEffect(() => {
    // Dynamically load the Meson syntax theme from meson docs to avoid licensing issues.
    function mesonGrammar(prism: any) {
      prism.languages.meson = (window as any).Prism.languages.meson;
    }
    mesonGrammar.displayName = "meson";

    if (typeof (window as any).Prism?.languages?.meson === "undefined") {
      (window as any).Prism = (window as any).Prism || {};
      (window as any).Prism.languages = (window as any).Prism.languages || {};
      let script = document.createElement("script");
      script.onload = () =>
        SyntaxHighlighter.registerLanguage("meson", mesonGrammar);
      script.src =
        "https://mesonbuild.com/assets/prism_components/prism-meson.min.js";
      document.head.appendChild(script);
    } else {
      SyntaxHighlighter.registerLanguage("meson", mesonGrammar);
    }
  }, []);

  return (
    <div className={clsx("relative", divClassName)}>
      {copyButton && (
        <div className="absolute top-0 right-0">
          <CopyButton textToCopy={children} />
        </div>
      )}
      <SyntaxHighlighter
        {...props}
        className={clsx("text-sm! p-2!", className)}
        style={theme === "dark" ? oneDark : oneLight}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}
