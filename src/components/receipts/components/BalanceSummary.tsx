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
}

export function BalanceSummary({
  totals,
  receivedTotals,
  newClientBalance,
  balanceToAdd,
  manualClientBalance,
  setManualClientBalance,
  finalWtBalanceTag,
  setFinalWtBalanceTag,
}: BalanceSummaryProps) {
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
            Received Final Wt.
          </div>
          <div className="text-lg font-semibold">
            {receivedTotals.finalWt.toFixed(3)}g
          </div>
        </div>
        <div className="bg-primary/10 p-3 rounded-md">
          <div className="text-sm text-primary mb-2">New Client Balance</div>
          <Input
            type="number"
            value={manualClientBalance}
            onChange={(e) =>
              setManualClientBalance(Number(e.target.value))
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
            {(totals.finalWeight + manualClientBalance).toFixed(3)}g
          </div>
          <Label
            htmlFor="finalWtBalanceTag"
            className="text-xs text-muted-foreground"
          >
            Tag
          </Label>
          <Input
            id="finalWtBalanceTag"
            value={finalWtBalanceTag}
            onChange={(e) => setFinalWtBalanceTag(e.target.value)}
            placeholder="Enter tag"
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}
