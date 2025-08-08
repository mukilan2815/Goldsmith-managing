import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BalanceSummaryProps {
  totals: {
    finalWeight: number;
  };
  receivedTotals: {
    finalWt: number;
  };
  newClientBalance: number;
  balanceToAdd: number;
  manualClientBalance: number;
  setManualClientBalance: (value: number) => void;
  finalWtBalanceTag: string;
  setFinalWtBalanceTag: (value: string) => void;
  receiptId?: string; // Add receiptId to scope the storage
}

const STORAGE_KEY_PREFIX = 'receipt_tag_';

export function BalanceSummary({
  totals,
  receivedTotals,
  newClientBalance,
  balanceToAdd,
  manualClientBalance,
  setManualClientBalance,
  finalWtBalanceTag: propFinalWtBalanceTag,
  setFinalWtBalanceTag: propSetFinalWtBalanceTag,
  receiptId = 'current', // Default to 'current' if no receiptId provided
}: BalanceSummaryProps) {
  // Get storage key based on receiptId
  const storageKey = `${STORAGE_KEY_PREFIX}${receiptId}`;
  
  // Initialize state with value from localStorage or prop
  const [localTag, setLocalTag] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(storageKey) || propFinalWtBalanceTag || '';
    }
    return propFinalWtBalanceTag || '';
  });

  // Update localStorage when localTag changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, localTag);
    }
  }, [localTag, storageKey]);

  // Update local state when prop changes
  useEffect(() => {
    if (propFinalWtBalanceTag && propFinalWtBalanceTag !== localTag) {
      setLocalTag(propFinalWtBalanceTag);
    }
  }, [propFinalWtBalanceTag]);

  // Combined setter that updates both local state and prop setter
  const setFinalWtBalanceTag = useCallback((value: string) => {
    setLocalTag(value);
    propSetFinalWtBalanceTag(value);
  }, [propSetFinalWtBalanceTag]);
  return (
    <div className="bg-background/50 p-4 rounded-md border mt-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-muted/10 p-3 rounded-md">
          <div className="text-sm text-muted-foreground">Given Final Wt.</div>
          <div className="text-lg font-semibold">
            {totals.finalWeight.toFixed(3)}g
          </div>
        </div>
        <div className="bg-muted/10 p-3 rounded-md">
          <div className="text-sm text-muted-foreground">
            Received Final Wt. {manualClientBalance ? `(Balance: ${manualClientBalance.toFixed(3)}g)` : ''}
          </div>
          <div className="text-lg font-semibold">
            {receivedTotals.finalWt === 0 ? (
              'empty'
            ) : manualClientBalance && manualClientBalance > 0 ? (
              `${(receivedTotals.finalWt - manualClientBalance).toFixed(3)} + ${manualClientBalance.toFixed(3)} = ${receivedTotals.finalWt.toFixed(3)}g`
            ) : (
              `${receivedTotals.finalWt.toFixed(3)}g`
            )}
          </div>
        </div>
        <div className="bg-primary/10 p-3 rounded-md">
          <div className="text-sm text-primary mb-2">New Client Balance</div>
          <Input
            type="number"
            value={manualClientBalance ?? ''}
            onChange={(e) =>
              setManualClientBalance(e.target.value === '' ? undefined : Number(e.target.value))
            }
            placeholder="Enter new balance"
            className="text-lg font-semibold"
            step="0.001"
          />
          <div className="text-xs text-muted-foreground mt-1">
            Manual entry (grams)
          </div>
        </div>
        <div className="bg-muted/10 p-3 rounded-md">
          <div className="text-sm text-muted-foreground mb-2">
            Final Wt. + Balance
          </div>
          <div className="text-lg font-semibold mb-2">
            {(totals.finalWeight + (manualClientBalance || 0)).toFixed(3)}g
          </div>
          <Label htmlFor="finalWtBalanceTag" className="text-xs text-muted-foreground">
            Tag
          </Label>
          <Input
            id="finalWtBalanceTag"
            value={localTag}
            onChange={(e) => setFinalWtBalanceTag(e.target.value)}
            placeholder="Enter tag"
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}
