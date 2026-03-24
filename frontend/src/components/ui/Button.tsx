type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg"

type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-jscolors-crimson text-white hover:-translate-y-0.5 hover:bg-[#721313]",
  secondary: "border border-jscolors-crimson/20 bg-white text-jscolors-crimson hover:-translate-y-0.5 hover:border-jscolors-crimson/40 hover:bg-white/90",
  ghost: "border border-jscolors-crimson/20 bg-transparent text-jscolors-crimson hover:border-jscolors-crimson/40",
  danger: "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-5 py-2.5 text-sm",
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const classes = [
    "inline-flex items-center justify-center rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  ].filter(Boolean).join(" ")

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}
