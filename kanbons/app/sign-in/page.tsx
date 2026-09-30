import { signInAction } from "./actions";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const failed = params.error === "1";

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Use the email and password an admin set up for you.
      </p>
      <form action={signInAction} className="dialog-fields max-w-sm">
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {failed ? (
          <p className="needs-you-note text-sm">
            That email or password did not work.
          </p>
        ) : null}
        <button type="submit" className="btn-primary">
          Sign in
        </button>
      </form>
    </main>
  );
}
