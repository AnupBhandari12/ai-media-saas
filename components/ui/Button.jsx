export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition";

  const variants = {
    primary:
      "bg-primary text-white hover:bg-primary-hover",
    secondary:
      "bg-secondary text-white hover:opacity-90",
    outline:
      "border border-border bg-surface text-foreground hover:bg-background",
    danger:
      "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}