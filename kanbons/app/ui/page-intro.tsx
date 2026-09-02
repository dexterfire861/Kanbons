export function PageIntro({
  title,
  what,
  columns,
}: {
  title: string;
  what: string;
  columns: { name: string; meaning: string }[];
}) {
  return (
    <header className="mb-4 max-w-4xl">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-zinc-600">{what}</p>
      <dl className="columns">
        {columns.map((column) => (
          <div key={column.name} className="contents">
            <dt>{column.name}</dt>
            <dd>{column.meaning}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
