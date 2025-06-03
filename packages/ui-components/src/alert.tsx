import React from 'react';
import { clsx } from 'clsx';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'success';
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={clsx(
        'relative w-full rounded-lg border p-4',
        {
          'bg-background text-foreground': variant === 'default',
          'border-destructive/50 text-destructive dark:border-destructive': variant === 'destructive',
          'border-yellow-500/50 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/10': variant === 'warning',
          'border-green-500/50 text-green-600 bg-green-50 dark:bg-green-900/10': variant === 'success',
        },
        className
      )}
      {...props}
    />
  )
);

Alert.displayName = 'Alert';

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const AlertTitle = React.forwardRef<HTMLParagraphElement, AlertTitleProps>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={clsx('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
  )
);

AlertTitle.displayName = 'AlertTitle';

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx('text-sm opacity-90', className)} {...props} />
  )
);

AlertDescription.displayName = 'AlertDescription';