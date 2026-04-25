import { type ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, className = '', children, ...rest },
  ref
) {
  const variantCls = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant];
  const sizeCls = size === 'md' ? '' : size === 'lg' ? 'btn-lg' : 'btn-xl';
  const blockCls = block ? 'w-full' : '';
  return (
    <button
      ref={ref}
      className={`${variantCls} ${sizeCls} ${blockCls} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
