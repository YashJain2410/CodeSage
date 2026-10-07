import { Fragment } from 'react';
// Safe, deliberately small Markdown renderer: never injects HTML or remote media.
function Inline({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
        .map((part, i) =>
          part.startsWith('**') ? (
            <strong key={i}>{part.slice(2, -2)}</strong>
          ) : part.startsWith('`') ? (
            <code key={i}>{part.slice(1, -1)}</code>
          ) : (
            <Fragment key={i}>{part}</Fragment>
          ),
        )}
    </>
  );
}
export default function Markdown({ text }: { text: string }) {
  const blocks = text.split(/(```[\s\S]*?(?:```|$))/g);
  return (
    <div className="markdown">
      {blocks.map((block, b) =>
        block.startsWith('```') ? (
          <pre key={b}>
            <code>{block.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')}</code>
          </pre>
        ) : (
          block.split(/\n\s*\n/).map((p, i) => {
            if (/^###? /.test(p))
              return /^### /.test(p) ? (
                <h3 key={`${b}-${i}`}>
                  <Inline text={p.replace(/^### /, '')} />
                </h3>
              ) : (
                <h2 key={`${b}-${i}`}>
                  <Inline text={p.replace(/^##? /, '')} />
                </h2>
              );
            if (/^(?:\d+\.|[-*]) /.test(p))
              return (
                <ul key={`${b}-${i}`}>
                  {p.split('\n').map((l, j) => (
                    <li key={j}>
                      <Inline text={l.replace(/^(?:\d+\.|[-*]) /, '')} />
                    </li>
                  ))}
                </ul>
              );
            return p.trim() ? (
              <p key={`${b}-${i}`}>
                <Inline text={p} />
              </p>
            ) : null;
          })
        ),
      )}
    </div>
  );
}
