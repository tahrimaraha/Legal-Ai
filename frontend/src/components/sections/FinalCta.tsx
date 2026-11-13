import { useLang } from '../../context/LanguageContext';
import { nudgeScale } from '../ui/BalanceScale';
import { ButtonLink } from '../ui/Button';
import { Reveal, RevealItem } from '../ui/Reveal';

export function FinalCta() {
  const { t } = useLang();
  return (
    <section className="section-pad bg-ink text-bone">
      <Reveal className="shell text-center">
        <RevealItem as="h2">
          <span className="mx-auto block max-w-3xl text-h2 text-bone">{t.finalCta.title}</span>
        </RevealItem>
        <RevealItem as="p">
          <span className="mt-5 block text-body text-granite">{t.finalCta.sub}</span>
        </RevealItem>
        <RevealItem className="mt-10 flex justify-center">
          <span onPointerDown={nudgeScale} className="inline-flex">
            <ButtonLink to="/app/chat" size="lg">
              {t.finalCta.cta}
            </ButtonLink>
          </span>
        </RevealItem>
      </Reveal>
    </section>
  );
}
