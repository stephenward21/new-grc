import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "destructive" | "warning" | "pending" | "api" | "screenshot" | "github" | "aws" | "jira";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        {
          "border-zinc-700 bg-zinc-800 text-zinc-300": variant === "default",
          "border-green-800 bg-green-900/50 text-green-400": variant === "success",
          "border-red-800 bg-red-900/50 text-red-400": variant === "destructive",
          "border-yellow-800 bg-yellow-900/50 text-yellow-400": variant === "warning",
          "border-zinc-700 bg-zinc-800 text-zinc-400": variant === "pending",
          "border-blue-800 bg-blue-900/50 text-blue-400": variant === "api",
          "border-purple-800 bg-purple-900/50 text-purple-400": variant === "screenshot",
          "border-zinc-700 bg-zinc-800 text-zinc-200": variant === "github",
          "border-orange-800 bg-orange-900/50 text-orange-400": variant === "aws",
          "border-blue-800 bg-blue-900/50 text-blue-300": variant === "jira",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
