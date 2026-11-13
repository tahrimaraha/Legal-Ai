import { Fragment } from 'react';
import { Link } from 'react-router-dom';

const URL_RE = /(https?:\/\/[^\s]+)/g;

/**
 * Thread message body: keeps line breaks and turns URLs into links. Links to this
 * app (e.g. meeting invites) navigate in-app; others open in a new tab.
 */
export function MessageText({ text, linkClassName = 'underline font-semibold break-all' }: { text: string; linkClassName?: string }) {
  const parts = text.split(URL_RE);
  return (
    <p className="whitespace-pre-line break-words">
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        let internal: string | null = null;
        try {
          const url = new URL(part);
          if (url.origin === window.location.origin) internal = `${url.pathname}${url.search}${url.hash}`;
        } catch {
          return <Fragment key={i}>{part}</Fragment>;
        }
        return internal ? (
          <Link key={i} to={internal} className={linkClassName}>
            {part}
          </Link>
        ) : (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={linkClassName}>
            {part}
          </a>
        );
      })}
    </p>
  );
}
