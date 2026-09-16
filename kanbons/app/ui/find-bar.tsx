export function FindBar({
  action,
  label,
  defaultValue,
}: {
  action: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <form className="find" action={action} method="get">
      <label>
        <span>{label}</span>
        <input name="q" defaultValue={defaultValue ?? ""} />
      </label>
      <button type="submit" className="btn-primary">
        Find
      </button>
    </form>
  );
}
