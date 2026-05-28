"use client";

import * as React from "react";

type OpenAdsButtonProps = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function OpenAdsButton({
  children,
  className,
  disabled = false,
  error = false,
  loading = false,
  leftIcon,
  rightIcon,
  type = "button",
  ...props
}: OpenAdsButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-[50px]",
        "px-4 py-2 text-[14px] font-medium leading-6 tracking-[-0.01em]",
        "font-['Pretendard','Malgun_Gothic',sans-serif]",
        "transition-all duration-150 ease-out",
        "select-none whitespace-nowrap",
        error
          ? "border border-[#d92d20] bg-white text-[#d92d20]"
          : "border border-black bg-black text-white",
        !isDisabled && !error && "hover:-translate-y-px hover:bg-[#1e1e1e]",
        !isDisabled && error && "hover:bg-[#fff5f4]",
        !isDisabled && "active:translate-y-0 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:border-[#d0d5dd] disabled:bg-white disabled:text-[#616161] disabled:shadow-none",
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className={cn(
              "h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            )}
          />
          <span>로딩 중</span>
        </>
      ) : (
        <>
          {leftIcon ? <span aria-hidden="true">{leftIcon}</span> : null}
          <span className="truncate">{children}</span>
          {rightIcon ? <span aria-hidden="true">{rightIcon}</span> : null}
        </>
      )}
    </button>
  );
}

export default OpenAdsButton;
