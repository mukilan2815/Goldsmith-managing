interface BalanceSummaryProps {
  totals: {
    finalWeight: number;
  };
  receivedTotals: {
    finalWt: number;
  };
  newClientBalance: number;
  balanceToAdd: number;
}

export function BalanceSummary({
  totals,
  receivedTotals,
  newClientBalance,
  balanceToAdd,
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
          <div className="text-sm text-primary">New Client Balance</div>
          <div className="text-lg font-semibold text-primary">
            {newClientBalance.toFixed(3)}g
          </div>
        </div>
        <div className="bg-muted/10 p-3 rounded-md">
          <div className="text-sm text-muted-foreground">
            Final Wt. + Balance
          </div>
          <div className="text-lg font-semibold">
            {(totals.finalWeight + balanceToAdd).toFixed(3)}g
          </div>
        </div>
      </div>
    </div>
  );
}
