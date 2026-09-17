import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const fieldBaseClasses =
  'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-ring disabled:bg-slate-50 disabled:text-slate-400'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBaseClasses, className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBaseClasses, 'resize-y', className)} {...rest} />
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBaseClasses, 'pr-8', className)} {...rest}>
      {children}
    </select>
  )
}

export function Label({
  children,
  htmlFor,
  required,
}: {
  children: ReactNode
  htmlFor?: string
  required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
      {children}
      {required && <span className="ml-0.5 text-[var(--color-danger)]">*</span>}
    </label>
  )
}

export function FormRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

export function HelpText({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-[var(--color-text-muted)]">{children}</p>
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-[var(--color-danger)]">{children}</p>
}
