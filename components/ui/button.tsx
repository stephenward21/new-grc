"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-teal-600 text-white shadow hover:bg-teal-700": variant === "default",
            "bg-red-600 text-white shadow-sm hover:bg-red-700": variant === "destructive",
            "border border-zinc-700 bg-transparent shadow-sm hover:bg-zinc-800 text-zinc-200": variant === "outline",
            "hover:bg-zinc-800 hover:text-zinc-100 text-zinc-400": variant === "ghost",
            "text-teal-400 underline-offset-4 hover:underline": variant === "link",
            "bg-zinc-700 text-zinc-100 shadow-sm hover:bg-zinc-600": variant === "secondary",
          },
          {
            "h-9 px-4 py-2": size === "default",
            "h-8 rounded-md px-3 text-xs": size === "sm",
            "h-10 rounded-md px-8": size === "lg",
            "h-9 w-9": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
