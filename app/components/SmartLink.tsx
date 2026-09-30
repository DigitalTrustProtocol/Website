import type { AnchorHTMLAttributes } from 'react';
import { Link } from 'react-router';

type SmartLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string };

/**
 * One link element for MDX and components: site paths (`/protocol`) use
 * client-side routing and the base path; `#anchors` and external URLs stay
 * plain anchors, externals with `rel="noopener"`.
 */
export function SmartLink({ href = '', children, ...rest }: SmartLinkProps) {
  if (href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link to={href} {...rest}>
        {children}
      </Link>
    );
  }
  const external = /^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith('mailto:');
  return (
    <a href={href} rel={external ? 'noopener' : undefined} {...rest}>
      {children}
    </a>
  );
}
