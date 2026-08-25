/**
 * Order quantity / unit safety helpers.
 *
 * Context: a ×1000 defect where the typed quantity stayed the same while the
 * unit changed (5000 G → "5000 KG"). These helpers are the shared primitives
 * for every order-entry path:
 *   1. convert the quantity when the unit changes (preserve the physical amount)
 *   2. never silently assume a unit
 *   3. confirm implausibly large lines before they can be submitted
 */

const GRAM_ALIASES = ['g', 'gm', 'gms', 'gram', 'grams'];
const KG_ALIASES = ['kg', 'kgs', 'kilogram', 'kilograms'];
const ML_ALIASES = ['ml', 'milliliter', 'millilitre', 'milliliters', 'millilitres'];
const L_ALIASES = ['l', 'lt', 'ltr', 'liter', 'litre', 'liters', 'litres'];

const norm = (u?: string | null) => (u || '').toString().trim().toLowerCase();

/** Factor to the category base unit (gram / ml / piece). Null = unknown unit. */
export function unitToBaseFactor(unit?: string | null): number | null {
  const u = norm(unit);
  if (!u) return null;
  if (GRAM_ALIASES.includes(u)) return 1;
  if (KG_ALIASES.includes(u)) return 1000;
  if (ML_ALIASES.includes(u)) return 1;
  if (L_ALIASES.includes(u)) return 1000;
  return null;
}

/**
 * Convert a quantity between two text units, preserving the physical amount.
 * 5000 with "grams" → "kg" gives 5, NOT 5000.
 * Returns the quantity unchanged when either unit is unknown/incompatible.
 */
export function convertQtyBetweenUnits(
  qty: number,
  fromUnit?: string | null,
  toUnit?: string | null,
): number {
  if (!qty || !isFinite(qty)) return qty;
  const from = norm(fromUnit);
  const to = norm(toUnit);
  if (!from || !to || from === to) return qty;
  const f = unitToBaseFactor(from);
  const t = unitToBaseFactor(to);
  if (!f || !t) return qty;
  const converted = (qty * f) / t;
  return +converted.toFixed(4);
}

/**
 * Convert using UOM-mapping conversion factors (preferred when available —
 * works for BOX/PIECE/DOZEN, not just weight/volume).
 */
export function convertQtyByConversion(
  qty: number,
  fromConversionToBase?: number | null,
  toConversionToBase?: number | null,
): number {
  if (!qty || !isFinite(qty)) return qty;
  if (!fromConversionToBase || !toConversionToBase) return qty;
  return +((qty * fromConversionToBase) / toConversionToBase).toFixed(4);
}

/** Confirmation thresholds — mirrors TableOrderForm's voice guard. */
export const LINE_VALUE_CONFIRM_THRESHOLD = 20000; // ₹
export const LINE_BASE_QTY_CONFIRM_THRESHOLD = 50000; // 50 kg / 50 L in base units

/** True when a line looks implausible and should be confirmed by the user. */
export function isImplausibleLine(
  qty: number,
  unit: string | null | undefined,
  lineTotal: number,
): boolean {
  if (!qty || qty <= 0) return false;
  if (lineTotal >= LINE_VALUE_CONFIRM_THRESHOLD) return true;
  const factor = unitToBaseFactor(unit);
  if (factor && qty * factor >= LINE_BASE_QTY_CONFIRM_THRESHOLD) return true;
  return false;
}

/** Human-readable restatement of the physical quantity, for the confirm prompt. */
export function describePhysicalQuantity(qty: number, unit?: string | null): string {
  const u = norm(unit);
  const label = (unit || '').toString().toUpperCase() || 'UNIT';
  const pretty = `${qty.toLocaleString()} ${label}`;
  if (KG_ALIASES.includes(u)) return `${pretty} = ${(qty * 1000).toLocaleString()} G`;
  if (GRAM_ALIASES.includes(u)) return `${pretty} = ${(qty / 1000).toLocaleString()} KG`;
  if (L_ALIASES.includes(u)) return `${pretty} = ${(qty * 1000).toLocaleString()} ML`;
  if (ML_ALIASES.includes(u)) return `${pretty} = ${(qty / 1000).toLocaleString()} L`;
  return pretty;
}

/**
 * Blocking confirmation for a large line. Returns true when the user accepts
 * (or when the line is plausible and no prompt was needed).
 */
export function confirmLargeLine(
  itemLabel: string,
  qty: number,
  unit: string | null | undefined,
  lineTotal: number,
): boolean {
  if (!isImplausibleLine(qty, unit, lineTotal)) return true;
  return window.confirm(
    `${itemLabel}\n\n${describePhysicalQuantity(qty, unit)} — ₹${lineTotal.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })} for one line.\n\nIs that right?`,
  );
}
