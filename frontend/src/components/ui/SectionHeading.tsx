import { RevealItem } from './Reveal';

interface Props {
  eyebrow?: string;
  title: string;
  sub?: string;
  tone?: 'default' | 'invert';
  align?: 'left' | 'center';
}

export function SectionHeading({ eyebrow, title, sub, tone = 'default', align = 'left' }: Props) {
  const titleTone = tone === 'invert' ? 'text-bone' : 'text-ink';
  const subTone = tone === 'invert' ? 'text-granite' : 'text-ink-soft/80';
  const eyebrowTone = tone === 'invert' ? 'text-clay-tint' : 'text-clay-deep';

  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <RevealItem>
          <p className={`label mb-4 ${eyebrowTone}`}>{eyebrow}</p>
        </RevealItem>
      )}
      <RevealItem as="h2">
        <span className={`block text-h2 ${titleTone}`}>{title}</span>
      </RevealItem>
      {sub && (
        <RevealItem as="p">
          <span className={`mt-5 block max-w-prose text-body ${subTone}`}>{sub}</span>
        </RevealItem>
      )}
    </div>
  );
}
