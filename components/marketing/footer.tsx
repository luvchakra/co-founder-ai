import Link from "next/link";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "Product",
    links: [
      ["How It Works", "#how-it-works"],
      ["Features", "#benefits"],
      ["Pricing", "#pricing"],
      ["FAQ", "#faq"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "#"],
      ["Contact", "#"],
      ["Blog", "#"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy", "#"],
      ["Terms", "#"],
      ["Security", "#"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-landing-surface-border px-6 py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <Link href="/" className="text-lg font-semibold tracking-tight text-landing-fg">
            CoFounder<span className="text-landing-accent">AI</span>
          </Link>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-medium text-landing-fg">{column.title}</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {column.links.map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="text-sm text-landing-muted hover:text-landing-fg">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-12 max-w-6xl text-xs text-landing-muted">© CoFounderAI</p>
    </footer>
  );
}
