/** Semantic tones shared by badges, alerts and status indicators. */
export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

export const TONE_SOFT: Record<Tone, string> = {
  neutral: "bg-subtle text-ink-muted",
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export const TONE_BORDER: Record<Tone, string> = {
  neutral: "border-line",
  brand: "border-brand/25",
  success: "border-success/25",
  warning: "border-warning/30",
  danger: "border-danger/25",
  info: "border-info/25",
};

export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-ink-subtle",
  brand: "text-brand",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};

export const TONE_SOLID: Record<Tone, string> = {
  neutral: "bg-ink-subtle",
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};
