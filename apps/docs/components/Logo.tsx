import type { SVGProps } from 'react';

export function Logo({ size = 20, ...rest }: { readonly size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      {...rest}
    >
      <rect x="3" y="3" width="18" height="5" />
      <rect x="3" y="10" width="18" height="5" />
      <rect x="3" y="17" width="18" height="4" />
    </svg>
  );
}
