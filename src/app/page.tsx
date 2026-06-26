import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
          Ascensus
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Sign in to continue
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          Use Google Login.
        </p>
        <div className="mt-8">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Go to login
          </Link>
        </div>
      </div>
    </main>
  );
}