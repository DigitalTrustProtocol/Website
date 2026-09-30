import type { MDXComponents } from 'mdx/types';
import { SmartLink } from '~/components/SmartLink';
import {
  ButtonLink,
  ButtonRow,
  Callout,
  Card,
  CardGrid,
  Flow,
  Gallery,
  Hero,
  InstallButton,
  Principle,
  Principles,
  ProductCard,
  Question,
  RepoCard,
  Screenshot,
  Section,
  SourceList,
} from './blocks';
import { StatusBadge } from './StatusBadge';

/**
 * Components available to every Website-authored MDX page without an import,
 * so page files stay plain prose for translators.
 */
export const mdxComponents: MDXComponents = {
  a: SmartLink,
  ButtonLink,
  ButtonRow,
  Callout,
  Card,
  CardGrid,
  Flow,
  Gallery,
  Hero,
  InstallButton,
  Principle,
  Principles,
  ProductCard,
  Question,
  RepoCard,
  Screenshot,
  Section,
  SourceList,
  StatusBadge,
};
