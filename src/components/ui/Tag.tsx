import type { ReactNode } from 'react';

type Variant = 'info' | 'warn' | 'danger' | 'success';

export function Tag({ variant = 'info', children }: { variant?: Variant; children: ReactNode }) {
  const cls = {
    info: 'tag-info',
    warn: 'tag-warn',
    danger: 'tag-danger',
    success: 'tag-success',
  }[variant];
  return <span className={cls}>{children}</span>;
}
