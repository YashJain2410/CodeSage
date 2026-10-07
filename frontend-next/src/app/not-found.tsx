import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="main" className="fatal-error">
      <span className="eyebrow">404 / UNKNOWN PATH</span>
      <h1>This path leads somewhere else.</h1>
      <Link className="button primary" href="/">
        Back to CodeSage
      </Link>
    </main>
  );
}
