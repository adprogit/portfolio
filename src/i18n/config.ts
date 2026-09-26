/**
 * Trois langues, l'anglais servant de base (pas de préfixe dans l'URL).
 *
 *   /              /fr/              /de/
 *   /projects/x/   /fr/projects/x/   /de/projects/x/
 */

export const locales = ['en', 'fr', 'de'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

/** Langues secondaires — celles qui vivent sous `src/pages/[lang]/`. */
export const altLocales = locales.filter((l) => l !== defaultLocale);

export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
};

export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}

/**
 * Le préfixe du site, toujours terminé par `/` : `/` à la racine d'un hôte,
 * `/<dépôt>/` sur GitHub Pages (voir `astro.config.mjs`).
 */
export const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

/** Racine d'une langue : '/' pour l'anglais, '/fr/' sinon — derrière `base`. */
export function localeRoot(locale: Locale): string {
  return locale === defaultLocale ? base : `${base}${locale}/`;
}

export function projectPath(locale: Locale, slug: string): string {
  return `${localeRoot(locale)}projects/${slug}/`;
}

export function notePath(locale: Locale, slug: string): string {
  return `${localeRoot(locale)}notes/${slug}/`;
}

/**
 * Même page, dans une autre langue — utilisé par le sélecteur de langue et les
 * balises `hreflang`.
 */
export function translatePath(pathname: string, target: Locale): string {
  const local = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  const segments = local.split('/').filter(Boolean);
  if (isLocale(segments[0])) segments.shift();
  const rest = segments.length ? `${segments.join('/')}/` : '';
  return `${localeRoot(target)}${rest}`;
}
