export interface HomeHeroProps {
  /** The hero's title and message: the CMS banner's, or the static fallback `resolveBanner` gives. */
  readonly greeting: {
    readonly title: string;
    readonly message: string;
  };
}
