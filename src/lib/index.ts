/**
 * Core utility exports
 */

export { sha256, computeVisitorHash } from "./hash";
export { getDailySalt, getCurrentDateUTC, getDeterministicSalt } from "./salt";
export { formatCount, formatCountLocale } from "./format";
export {
  checkRateLimit,
  validatePowSolution,
  rateLimitResponse,
  checkCreateRateLimit,
  createRateLimitResponse,
} from "./ratelimit";

// Button ID utilities
export {
  generatePublicId,
  generatePrivateId,
  isValidPublicId,
  isValidPrivateId,
} from "./ids";
export {
  normalizeUrl,
  extractUrlDomain,
  isValidHttpUrl,
  urlsMatch,
  domainsMatch,
} from "./url";
export {
  DEFAULT_BUTTON_LABEL,
  DEFAULT_PRESSED_BUTTON_LABEL,
  MAX_BUTTON_LABEL_CODE_POINTS,
  normalizeStoredButtonLabel,
  validateButtonLabel,
  type ButtonLabelField,
} from "./button-labels";
export {
  BUTTON_SHAPES,
  COUNT_VISIBILITIES,
  COUNT_POSITIONS,
  COUNT_FORMATS,
  BUTTON_ANIMATIONS,
  DEFAULT_BUTTON_SHAPE,
  DEFAULT_COUNT_VISIBILITY,
  DEFAULT_COUNT_POSITION,
  DEFAULT_COUNT_FORMAT,
  DEFAULT_BUTTON_ANIMATION,
  normalizeStoredButtonColors,
  normalizeStoredButtonShape,
  normalizeStoredCountVisibility,
  normalizeStoredCountPosition,
  normalizeStoredCountFormat,
  normalizeStoredButtonAnimation,
  serializeButtonColors,
  validateButtonColors,
  validateButtonShape,
  validateCountVisibility,
  validateCountPosition,
  validateCountFormat,
  validateButtonAnimation,
  validateAppearance,
  applyAppearanceValues,
  getButtonAppearance,
  hasStoredButtonAppearance,
  type AppearanceBody,
  type AppearanceValues,
  type ButtonAppearanceFields,
  type ButtonAnimation,
  type ButtonColors,
  type PublicButtonColors,
  type ButtonShape,
  type CountFormat,
  type CountPosition,
  type CountVisibility,
} from "./button-appearance";
