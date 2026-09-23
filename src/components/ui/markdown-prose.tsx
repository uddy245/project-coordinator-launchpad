import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Renders lesson markdown with the Read tab's typography (.read-prose in
 * src/app/globals.css). GitHub-flavoured markdown is on, so pipe tables
 * render as real tables (wrapped to scroll sideways on narrow screens)
 * and **bold** / lists never leak as raw markers.
 *
 * Use `compact` for card-sized content (workbook scenario, task box).
 */
export function MarkdownProse({
  content,
  compact = false,
  className,
}: {
  content: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("read-prose", compact && "read-prose--compact", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Drop react-markdown's internal `node` prop so it isn't rendered as
          // an HTML attribute.
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          table: ({ node, ...props }) => (
            <div className="read-table-wrap">
              <table {...props} />
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
