export const BUTTON_SHAPES = ["rounded", "pill", "square"] as const;
export const COUNT_VISIBILITIES = ["nonzero", "always", "hidden"] as const;
export const COUNT_POSITIONS = ["inside", "beside", "below"] as const;
export const COUNT_FORMATS = ["compact", "full"] as const;
export const BUTTON_ANIMATIONS = [
  "pop",
  "bounce",
  "sparkle",
  "confetti",
  "none",
] as const;

export type ButtonShape = (typeof BUTTON_SHAPES)[number];
export type CountVisibility = (typeof COUNT_VISIBILITIES)[number];
export type CountPosition = (typeof COUNT_POSITIONS)[number];
export type CountFormat = (typeof COUNT_FORMATS)[number];
export type ButtonAnimation = (typeof BUTTON_ANIMATIONS)[number];

export interface ButtonColors {
  background: string;
  foreground: string;
  border: string;
  pressedBackground: string;
  pressedForeground: string;
  pressedBorder: string;
}

export interface PublicButtonColors {
  background: string;
  foreground: string;
  border: string;
  pressed_background: string;
  pressed_foreground: string;
  pressed_border: string;
}

const PUBLIC_COLOR_KEYS = [
  "background",
  "foreground",
  "border",
  "pressed_background",
  "pressed_foreground",
  "pressed_border",
] as const;

const STORED_COLOR_KEYS = [
  "background",
  "foreground",
  "border",
  "pressedBackground",
  "pressedForeground",
  "pressedBorder",
] as const;

export const DEFAULT_BUTTON_SHAPE: ButtonShape = "rounded";
export const DEFAULT_COUNT_VISIBILITY: CountVisibility = "nonzero";
export const DEFAULT_COUNT_POSITION: CountPosition = "inside";
export const DEFAULT_COUNT_FORMAT: CountFormat = "compact";
export const DEFAULT_BUTTON_ANIMATION: ButtonAnimation = "pop";

type PublicButtonColorsInput = {
  background: unknown;
  foreground: unknown;
  border: unknown;
  pressed_background: unknown;
  pressed_foreground: unknown;
  pressed_border: unknown;
};

function invalidAppearance(code: string, label: string): {
  ok: false;
  response: Response;
} {
  return {
    ok: false,
    response: Response.json(
      { error: `Invalid ${label}`, code },
      { status: 400 }
    ),
  };
}

function normalizeHex(value: unknown): string | undefined {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toUpperCase()
    : undefined;
}

function hasExactKeys(value: object, expectedKeys: readonly string[]): boolean {
  const keys = Reflect.ownKeys(value);
  return (
    keys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

export function validateButtonColors(
  value: unknown
):
  | { ok: true; value: ButtonColors | null }
  | { ok: false; response: Response } {
  if (value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalidAppearance("INVALID_COLORS", "colors");
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return invalidAppearance("INVALID_COLORS", "colors");
  }

  const colors = value as PublicButtonColorsInput;
  if (!hasExactKeys(colors, PUBLIC_COLOR_KEYS)) {
    return invalidAppearance("INVALID_COLORS", "colors");
  }

  const normalized = {
    background: normalizeHex(colors.background),
    foreground: normalizeHex(colors.foreground),
    border: normalizeHex(colors.border),
    pressedBackground: normalizeHex(colors.pressed_background),
    pressedForeground: normalizeHex(colors.pressed_foreground),
    pressedBorder: normalizeHex(colors.pressed_border),
  };
  if (Object.values(normalized).some((color) => color === undefined)) {
    return invalidAppearance("INVALID_COLORS", "colors");
  }

  return { ok: true, value: normalized as ButtonColors };
}

export function normalizeStoredButtonColors(value: unknown): ButtonColors | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return null;
  }

  const colors = value as Record<string, unknown>;
  if (!hasExactKeys(colors, STORED_COLOR_KEYS)) {
    return null;
  }

  const normalized = {
    background: normalizeHex(colors.background),
    foreground: normalizeHex(colors.foreground),
    border: normalizeHex(colors.border),
    pressedBackground: normalizeHex(colors.pressedBackground),
    pressedForeground: normalizeHex(colors.pressedForeground),
    pressedBorder: normalizeHex(colors.pressedBorder),
  };
  return Object.values(normalized).every((color) => color !== undefined)
    ? (normalized as ButtonColors)
    : null;
}

export function serializeButtonColors(value: unknown): PublicButtonColors | null {
  const colors = normalizeStoredButtonColors(value);
  return colors === null
    ? null
    : {
        background: colors.background,
        foreground: colors.foreground,
        border: colors.border,
        pressed_background: colors.pressedBackground,
        pressed_foreground: colors.pressedForeground,
        pressed_border: colors.pressedBorder,
      };
}

type EnumValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; response: Response };

function validateEnum<T extends string>(
  value: unknown,
  values: readonly T[],
  code: string,
  label: string
): EnumValidationResult<T> {
  if (typeof value === "string" && values.includes(value as T)) {
    return { ok: true, value: value as T };
  }

  return invalidAppearance(code, label);
}

function normalizeEnum<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T
): T {
  return typeof value === "string" && values.includes(value as T)
    ? (value as T)
    : fallback;
}

export function validateButtonShape(value: unknown): EnumValidationResult<ButtonShape> {
  return validateEnum(value, BUTTON_SHAPES, "INVALID_SHAPE", "shape");
}

export function validateCountVisibility(
  value: unknown
): EnumValidationResult<CountVisibility> {
  return validateEnum(
    value,
    COUNT_VISIBILITIES,
    "INVALID_COUNT_VISIBILITY",
    "count visibility"
  );
}

export function validateCountPosition(
  value: unknown
): EnumValidationResult<CountPosition> {
  return validateEnum(
    value,
    COUNT_POSITIONS,
    "INVALID_COUNT_POSITION",
    "count position"
  );
}

export function validateCountFormat(value: unknown): EnumValidationResult<CountFormat> {
  return validateEnum(value, COUNT_FORMATS, "INVALID_COUNT_FORMAT", "count format");
}

export function validateButtonAnimation(
  value: unknown
): EnumValidationResult<ButtonAnimation> {
  return validateEnum(value, BUTTON_ANIMATIONS, "INVALID_ANIMATION", "animation");
}

export function normalizeStoredButtonShape(value: unknown): ButtonShape {
  return normalizeEnum(value, BUTTON_SHAPES, DEFAULT_BUTTON_SHAPE);
}

export function normalizeStoredCountVisibility(value: unknown): CountVisibility {
  return normalizeEnum(value, COUNT_VISIBILITIES, DEFAULT_COUNT_VISIBILITY);
}

export function normalizeStoredCountPosition(value: unknown): CountPosition {
  return normalizeEnum(value, COUNT_POSITIONS, DEFAULT_COUNT_POSITION);
}

export function normalizeStoredCountFormat(value: unknown): CountFormat {
  return normalizeEnum(value, COUNT_FORMATS, DEFAULT_COUNT_FORMAT);
}

export function normalizeStoredButtonAnimation(value: unknown): ButtonAnimation {
  return normalizeEnum(value, BUTTON_ANIMATIONS, DEFAULT_BUTTON_ANIMATION);
}
