import type { ComponentProps } from "react";

type CodeBlockProps = ComponentProps<"pre"> & {
  "data-title"?: string;
  "data-language"?: string;
  tabindex?: string | number;
};

export function CodeBlock({
  children,
  className,
  tabindex: _tabindex,
  ...props
}: CodeBlockProps) {
  const title = props["data-title"];
  return (
    <div className="code-block" data-code-block>
      <div className="code-toolbar">
        <span className="metadata">
          {title || props["data-language"] || "Code example"}
        </span>
        <button type="button" className="code-copy" data-copy-code hidden>
          Copy code
        </button>
        <span className="sr-only" role="status" data-copy-status />
      </div>
      <pre
        {...props}
        className={`code-scroll ${className ?? ""}`}
        tabIndex={0}
        role="region"
        aria-label={
          title
            ? `Code: ${title}`
            : "Code example; scroll horizontally if needed"
        }
      >
        {children}
      </pre>
    </div>
  );
}
