/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Scheme and host for canonical URLs, from SITE_ORIGIN at build time. */
  readonly VITE_SITE_ORIGIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.mdx' {
  import type { ComponentType } from 'react';
  import type { MDXProps } from 'mdx/types';

  export const frontmatter: {
    title: string;
    description: string;
    route: string;
    modelVersion?: string;
  };
  const MDXComponent: ComponentType<MDXProps>;
  export default MDXComponent;
}
