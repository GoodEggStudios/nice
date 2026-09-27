export const DEFAULT_BUTTON_LABEL = "Nice";
export const DEFAULT_PRESSED_BUTTON_LABEL = "Nice'd";
export const MAX_BUTTON_LABEL_CODE_POINTS = 32;

export type ButtonLabelField = "label" | "pressed_label";

function isValidButtonLabel(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    Array.from(trimmed).length <= MAX_BUTTON_LABEL_CODE_POINTS &&
    !/[\u0000-\u001F\u007F<>]/.test(value)
  );
}

export function normalizeStoredButtonLabel(
  value: unknown,
  fallback: string
): string {
  if (typeof value !== "string" || !isValidButtonLabel(value)) {
    return fallback;
  }

  return value.trim();
}

export function validateButtonLabel(
  value: unknown,
  field: ButtonLabelField
): { ok: true; value: string } | { ok: false; response: Response } {
  if (typeof value === "string" && isValidButtonLabel(value)) {
    return { ok: true, value: value.trim() };
  }

  const isPressedLabel = field === "pressed_label";
  return {
    ok: false,
    response: Response.json(
      {
        error: isPressedLabel ? "Invalid pressed label" : "Invalid button label",
        code: isPressedLabel ? "INVALID_PRESSED_LABEL" : "INVALID_LABEL",
      },
      { status: 400 }
    ),
  };
}
