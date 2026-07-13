import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

export function AuthFormCard({
  children,
  testId,
  badge,
  title,
  subtitle,
  icon: Icon,
  iconNode,
  iconDanger = false,
  footer,
  className,
  showLogo = false,
  nav,
  script,
  titleDot,
}) {
  const showIcon = !showLogo && !script && (Icon || iconNode);
  return (
    <div
      className={cn("cs-auth-card", className)}
      data-testid={testId}
    >
      <div className="relative px-6 py-7 sm:px-8 sm:py-8">
        {showLogo && (
          <div className="cs-auth-card-logo mb-5 flex justify-center sm:mb-6">
            <Logo />
          </div>
        )}
        {nav && <div className="mb-6">{nav}</div>}
        {showIcon && (
          <div
            className={cn("cs-auth-card-icon", iconDanger && "cs-auth-card-icon-danger")}
            aria-hidden
          >
            {iconNode || (
              <Icon
                className="h-5 w-5"
                style={{ color: iconDanger ? "var(--c-danger)" : "var(--c-primary)" }}
              />
            )}
          </div>
        )}
        {badge && (
          <span className="cs-badge cs-badge-teal mb-4">{badge}</span>
        )}
        {script && <div className="cs-auth-script">{script}</div>}
        <h1 className={cn(
          "font-heading font-bold tracking-tight text-[var(--c-ink)]",
          script ? "mt-1 text-[2.1rem] leading-[1.08] sm:text-[2.35rem]" : "text-[1.75rem] sm:text-[1.85rem]",
        )}>
          {title}
          {titleDot && (
            <span className={titleDot === "teal" ? "cs-auth-title-dot-teal" : "cs-auth-title-dot"}>.</span>
          )}
        </h1>
        {subtitle && (
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--c-muted-fg)]">{subtitle}</p>
        )}
        {children}
      </div>
      {footer && (
        <div className="cs-auth-card-footer">
          {footer}
        </div>
      )}
    </div>
  );
}

export function AuthField({ id, label, icon: Icon, action, hint, children, className }) {
  return (
    <div className={cn("cs-auth-field", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-[13px] font-semibold text-[var(--c-ink)]">
          {label}
        </Label>
        {action}
      </div>
      <div className="relative mt-2">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 h-[1.05rem] w-[1.05rem] -translate-y-1/2 text-[var(--c-muted-fg)]"
            aria-hidden
          />
        )}
        {children}
      </div>
      {hint && <p className="mt-1.5 text-xs text-[var(--c-muted-fg)]">{hint}</p>}
    </div>
  );
}

export function AuthTextInput({ icon, className, ...props }) {
  return (
    <Input
      {...props}
      className={cn(
        "cs-auth-input h-12 text-[15px]",
        icon && "pl-11",
        className,
      )}
    />
  );
}

export function AuthPasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  autoComplete,
  testId,
  toggleTestId,
  className,
}) {
  return (
    <div className="relative">
      <AuthTextInput
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn("pr-11", className)}
        data-testid={testId}
      />
      <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-[var(--c-muted-fg)] transition-colors hover:text-[var(--c-ink)]"
        data-testid={toggleTestId}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

const PWD_STRENGTH_LABELS = ["Too weak", "Fair", "Good", "Strong"];

export function PasswordStrengthMeter({ password, rules }) {
  const passed = rules.filter((r) => r.test(password)).length;
  const level = passed <= 1 ? 0 : passed === 2 ? 1 : passed === 3 ? 2 : 3;

  if (!password) return null;

  return (
    <div className="mt-3 space-y-2" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors duration-300"
              style={{
                background:
                  i <= level
                    ? level >= 3
                      ? "var(--c-primary)"
                      : level >= 2
                        ? "var(--c-warning)"
                        : "var(--c-accent)"
                    : "var(--c-border)",
              }}
            />
          ))}
        </div>
        <span className="text-[11px] font-semibold text-[var(--c-muted-fg)]">
          {PWD_STRENGTH_LABELS[level]}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5" data-testid="register-password-rules">
        {rules.map(({ label, test }) => {
          const ok = test(password);
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                ok ? "text-[var(--c-primary)]" : "text-[var(--c-muted-fg)]",
              )}
            >
              {ok ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Circle className="h-2 w-2 shrink-0 opacity-50" />
              )}
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}