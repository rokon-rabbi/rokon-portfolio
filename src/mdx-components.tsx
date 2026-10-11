import { CodeBlock } from "@/components/mdx/code-block";
import { MediaContainer } from "@/components/mdx/media-container";
import { type ComponentProps, type ReactNode, isValidElement } from "react";

function headingText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number")
    return String(children);
  if (Array.isArray(children)) return children.map(headingText).join("");
  if (isValidElement<{ children?: ReactNode }>(children))
    return headingText(children.props.children);
  return "section";
}
function heading(Tag: "h2" | "h3" | "h4") {
  return ({ children, id, ...props }: ComponentProps<"h2">) => (
    <Tag {...props} id={id}>
      {children}
      {id && (
        <a
          className="heading-anchor"
          href={`#${id}`}
          aria-label={`Link to ${headingText(children)}`}
        >
          <span aria-hidden="true">#</span>
        </a>
      )}
    </Tag>
  );
}

type CodeProps = ComponentProps<"code"> & {
  "data-language"?: string;
};

export const mdxComponents = {
  MediaContainer,
  h2: heading("h2"),
  h3: heading("h3"),
  h4: heading("h4"),
  pre: (props: ComponentProps<"pre">) => <CodeBlock {...props} />,
  hr: (props: ComponentProps<"hr">) => <hr {...props} />,
  table: (props: ComponentProps<"table">) => (
    <div
      className="article-table"
      role="region"
      aria-label="Article table; scroll horizontally if needed"
      tabIndex={0}
    >
      <table {...props} />
    </div>
  ),
  code: ({ children, ...props }: CodeProps) => {
    if (props["data-language"]) {
      return <code {...props}>{children}</code>;
    }
    return (
      <code className="inline-code" {...props}>
        {children}
      </code>
    );
  },
} as const;
