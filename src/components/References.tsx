import { isValidElement, type ReactNode } from "react";

export default function References({ children }: { children?: ReactNode }) {
  const items = extractItems(children);

  return (
    <section className="my-4">
      <ol className="space-y-4">
        {items.map(({ key, value, content }) => (
          <li
            key={key}
            id={`ref-${value}`}
            value={value}
            className="reference-item -mx-2 list-none scroll-mt-24 rounded-md px-2"
          >
            <div className="flex gap-3">
              <span
                aria-hidden="true"
                className="
                  mt-0.5 inline-flex h-6 w-6 shrink-0 select-none items-center justify-center
                  rounded-md bg-emerald-600/10 text-xs font-semibold tabular-nums text-emerald-700
                  dark:bg-emerald-400/10 dark:text-emerald-400
                "
              >
                {value}
              </span>
              <div
                className="
                  min-w-0 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300
                  [&_a]:text-emerald-600 dark:[&_a]:text-emerald-400
                  [&_em]:text-zinc-800 dark:[&_em]:text-zinc-200
                "
              >
                {content}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function extractItems(children: ReactNode): {
  key: string;
  value: number;
  content: ReactNode;
}[] {
  const items: { key: string; value: number; content: ReactNode }[] = [];
  walk(children);
  return items;

  function walk(node: ReactNode): void {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!isValidElement(node)) return;
    const props = node.props as { children?: ReactNode };
    if (node.type === "ol") {
      collectLis(props.children);
      return;
    }
    walk(props.children);
  }

  function collectLis(listChildren: ReactNode): void {
    let n = 0;
    const visit = (node: ReactNode) => {
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (!isValidElement(node)) return;
      if (node.type === "li") {
        n += 1;
        const props = node.props as { children?: ReactNode };
        items.push({
          key: node.key ?? `ref-${n}`,
          value: n,
          content: props.children,
        });
      }
    };
    visit(listChildren);
  }
}
