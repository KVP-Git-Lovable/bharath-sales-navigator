import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tag } from "lucide-react";
import { ProductScheme } from "@/hooks/useOfflineSchemes";
import type { ManualSchemeSelection } from "@/utils/schemeEngine";

interface CartLine {
  id: string;            // engine line id (variant?.id || product.id)
  productId: string;
  variantId?: string;
  name: string;
  quantity: number;
  rate: number;
  unit: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  scheme: ProductScheme | null;
  cartLines: CartLine[];
  initialSelection?: ManualSchemeSelection | null;
  onConfirm: (selection: ManualSchemeSelection) => void;
}

export const ManualPerUnitApplyDialog: React.FC<Props> = ({
  isOpen, onClose, scheme, cartLines, initialSelection, onConfirm,
}) => {
  const valueType: 'amount' | 'percentage' =
    (scheme?.discount_value_type as 'amount' | 'percentage') === 'percentage' ? 'percentage' : 'amount';
  const cap = Number(scheme?.max_discount_per_unit || 0);
  const unit = scheme?.discount_unit || 'unit';
  const minQty = Number(scheme?.condition_quantity || 0);

  // Filter eligible lines: must match scheme target (product/variant) when set
  const eligibleLines = useMemo(() => {
    if (!scheme) return [];
    return cartLines.filter(l => {
      if (scheme.variant_id) return l.variantId === scheme.variant_id;
      if (scheme.product_id) return l.productId === scheme.product_id;
      if (scheme.target_product_ids?.length) return scheme.target_product_ids.includes(l.productId);
      return true; // all products
    });
  }, [scheme, cartLines]);

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [perItemValues, setPerItemValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    // Seed selection: prefer prior selection (itemIds or legacy itemId), else select all eligible lines.
    const eligibleIds = eligibleLines.filter(l => !minQty || l.quantity >= minQty).map(l => l.id);
    const prior = (initialSelection?.itemIds && initialSelection.itemIds.length > 0)
      ? initialSelection.itemIds
      : (initialSelection?.itemId ? [initialSelection.itemId] : []);
    const valid = prior.filter(id => eligibleIds.includes(id));
    setSelectedItemIds(valid.length > 0 ? valid : eligibleIds);
    // Seed per-line values from prior selection if present, else from legacy single value.
    const seed: Record<string, string> = {};
    const legacy = initialSelection?.perUnitDiscount ? String(initialSelection.perUnitDiscount) : '';
    const priorPerItem = initialSelection?.perItemDiscounts || {};
    eligibleIds.forEach(id => {
      if (priorPerItem[id] != null) seed[id] = String(priorPerItem[id]);
      else if (legacy) seed[id] = legacy;
    });
    setPerItemValues(seed);
  }, [isOpen, scheme?.id]);

  const toggleLine = (id: string) => {
    setSelectedItemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const setLineValue = (id: string, raw: string) => {
    if (raw === '') {
      setPerItemValues(prev => ({ ...prev, [id]: '' }));
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    setPerItemValues(prev => ({ ...prev, [id]: String(Math.max(0, Math.min(cap, n))) }));
  };

  const selectedLines = eligibleLines.filter(l => selectedItemIds.includes(l.id));
  const lineDiscountFor = (line: CartLine) => {
    const v = Math.max(0, Math.min(cap, Number(perItemValues[line.id]) || 0));
    if (v <= 0) return 0;
    const perUnitAmt = valueType === 'percentage' ? line.rate * (v / 100) : v;
    return perUnitAmt * line.quantity;
  };
  const previewDiscount = selectedLines.reduce((sum, l) => sum + lineDiscountFor(l), 0);
  const linesWithValue = selectedLines.filter(l => (Number(perItemValues[l.id]) || 0) > 0);

  const symbol = valueType === 'percentage' ? '%' : '₹';
  const capLabel = valueType === 'percentage' ? `${cap}%` : `₹${cap}`;

  const canConfirm = linesWithValue.length > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    const ids = linesWithValue.map(l => l.id);
    const perItemDiscounts: Record<string, number> = {};
    let firstVal = 0;
    ids.forEach((id, i) => {
      const v = Math.max(0, Math.min(cap, Number(perItemValues[id]) || 0));
      perItemDiscounts[id] = v;
      if (i === 0) firstVal = v;
    });
    onConfirm({
      itemId: ids[0],
      itemIds: ids,
      perUnitDiscount: firstVal, // legacy/back-compat
      perItemDiscounts,
      valueType,
    });
    onClose();
  };

  if (!scheme) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Tag className="w-4 h-4 text-primary" />
            Apply: {scheme.name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Cap: {capLabel} {valueType === 'amount' ? `/ ${unit}` : `off per ${unit}`}
            {minQty ? ` · Min qty ${minQty}${unit ? ` ${unit}` : ''}` : ''}
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium">Pick products from your cart</Label>
            {eligibleLines.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2 p-3 bg-muted/40 rounded">
                No eligible product in cart for this offer. Add one first.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between mt-2 mb-1">
                  <button
                    type="button"
                    className="text-[11px] text-primary hover:underline"
                    onClick={() => {
                      const all = eligibleLines.filter(l => !minQty || l.quantity >= minQty).map(l => l.id);
                      setSelectedItemIds(selectedItemIds.length === all.length ? [] : all);
                    }}
                  >
                    {selectedItemIds.length === eligibleLines.filter(l => !minQty || l.quantity >= minQty).length
                      ? 'Clear all'
                      : 'Select all'}
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    {selectedItemIds.length} selected
                  </span>
                </div>
                <div className="max-h-44 overflow-y-auto space-y-1">
                  {eligibleLines.map(line => {
                    const disabled = !!minQty && line.quantity < minQty;
                    const checked = selectedItemIds.includes(line.id);
                    return (
                      <label
                        key={line.id}
                        className={`flex items-center justify-between gap-3 p-2 rounded border text-xs cursor-pointer ${
                          checked ? 'border-primary bg-primary/5' : 'border-border'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Checkbox
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={() => !disabled && toggleLine(line.id)}
                          />
                          <span className="truncate font-medium">{line.name}</span>
                        </div>
                        <span className="shrink-0 text-muted-foreground">
                          {line.quantity} {line.unit} @ ₹{line.rate.toFixed(2)}
                          {disabled ? ` · need ≥${minQty}` : ''}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div>
            <Label className="text-xs font-medium">
              Discount {valueType === 'percentage' ? `% per ${unit}` : `per ${unit}`}
              <span className="text-muted-foreground font-normal"> · max {capLabel}</span>
            </Label>
            <div className="relative mt-1">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={cap}
                step="0.01"
                value={perUnit}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') return setPerUnit('');
                  const n = Number(v);
                  if (Number.isNaN(n)) return;
                  setPerUnit(String(Math.max(0, Math.min(cap, n))));
                }}
                placeholder={`0 - ${cap}`}
                className="pr-8 h-9 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{symbol}</span>
            </div>
          </div>

          {selectedLines.length > 0 && enteredNum > 0 && (
            <div className="bg-muted/50 rounded p-2 text-xs space-y-0.5">
              <div className="font-medium">Preview</div>
              <div className="text-muted-foreground">
                {valueType === 'percentage' ? `${enteredNum}% per ${unit}` : `₹${enteredNum} per ${unit}`}
                {' · '}
                {selectedLines.length} product{selectedLines.length > 1 ? 's' : ''}
                {' = '}
                <span className="font-semibold text-foreground">₹{previewDiscount.toFixed(2)}</span> off
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!canConfirm} onClick={handleConfirm}>
            Apply Offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
