import {
  useId,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from "react";
interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}
export function Tabs({
  label,
  items,
}: {
  label: string;
  items: readonly Tab[];
}) {
  const id = useId();
  const [active, setActive] = useState(
    items.findIndex((item) => !item.disabled),
  );
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const available = items
      .map((item, i) => (item.disabled ? -1 : i))
      .filter((i) => i !== -1);
    let next: number | undefined;
    const position = available.indexOf(index);
    if (event.key === "ArrowRight")
      next = available[(position + 1) % available.length];
    if (event.key === "ArrowLeft")
      next = available[(position - 1 + available.length) % available.length];
    if (event.key === "Home") next = available[0];
    if (event.key === "End") next = available[available.length - 1];
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  };
  return (
    <div>
      <div className="tabs-list" role="tablist" aria-label={label}>
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${id}-${item.id}-tab`}
            aria-controls={`${id}-${item.id}-panel`}
            aria-selected={active === index}
            tabIndex={active === index ? 0 : -1}
            disabled={item.disabled}
            className="tab"
            onClick={() => setActive(index)}
            onKeyDown={(event) => navigate(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${id}-${item.id}-panel`}
          aria-labelledby={`${id}-${item.id}-tab`}
          tabIndex={0}
          hidden={index !== active}
          className="tab-panel"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
