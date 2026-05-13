import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [perUnit, setPerUnit] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const seedId = initialSelection?.itemId && eligibleLines.find(l => l.id === initialSelection.itemId)
      ? initialSelection.itemId
      : eligibleLines[0]?.id || '';
    setSelectedItemId(seedId);
    setPerUnit(initialSelection?.perUnitDiscount ? String(initialSelection.perUnitDiscount) : '');
  }, [isOpen, scheme?.id]);

  const selectedLine = eligibleLines.find(l => l.id === selectedItemId);
  const enteredNum = Math.max(0, Math.min(cap, Number(perUnit) || 0));
  const computedPerUnit = selectedLine
    ? (valueType === 'percentage' ? selectedLine.rate * (enteredNum / 100) : enteredNum)
    : 0;
  const previewDiscount = selectedLine ? computedPerUnit * selectedLine.quantity : 0;

  const symbol = valueType === 'percentage' ? '%' : '₹';
  const capLabel = valueType === 'percentage' ? `${cap}%` : `₹${cap}`;

  const canConfirm = !!selectedLine && enteredNum > 0 && (!minQty || (selectedLine.quantity >= minQty));

  const handleConfirm = () => {
    if (!canConfirm || !selectedLine) return;
    onConfirm({ itemId: selectedLine.id, perUnitDiscount: enteredNum, valueType });
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
            <Label className="text-xs font-medium">Pick one product from your cart</Label>
            {eligibleLines.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2 p-3 bg-muted/40 rounded">
                No eligible product in cart for this offer. Add one first.
              </p>
            ) : (
              <RadioGroup
                value={selectedItemId}
                onValueChange={setSelectedItemId}
                className="mt-2 max-h-44 overflow-y-auto space-y-1"
              >
                {eligibleLines.map(line => {
                  const disabled = !!minQty && line.quantity < minQty;
                  return (
                    <label
                      key={line.id}
                      className={`flex items-center justify-between gap-3 p-2 rounded border text-xs cursor-pointer ${
                        selectedItemId === line.id ? 'border-primary bg-primary/5' : 'border-border'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <RadioGroupItem value={line.id} disabled={disabled} />
                        <span className="truncate font-medium">{line.name}</span>
                      </div>
                      <span className="shrink-0 text-muted-foreground">
                        {line.quantity} {line.unit} @ ₹{line.rate.toFixed(2)}
                        {disabled ? ` · need ≥${minQty}` : ''}
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
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

          {selectedLine && enteredNum > 0 && (
            <div className="bg-muted/50 rounded p-2 text-xs">
              <div className="font-medium mb-0.5">Preview</div>
              <div className="text-muted-foreground">
                {selectedLine.name} · {selectedLine.quantity} {selectedLine.unit} ×{' '}
                {valueType === 'percentage'
                  ? `${enteredNum}% (₹${computedPerUnit.toFixed(2)}/${unit})`
                  : `₹${enteredNum}/${unit}`}{' '}
                = <span className="font-semibold text-foreground">₹{previewDiscount.toFixed(2)}</span> off
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
