import { Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ReceivedItem {
  id: string;
  receivedGold: string | number;
  melting: string | number;
  finalWt: number;
  date?: string; // Add date field
}

interface ReceivedItemsTableProps {
  receivedItems: ReceivedItem[];
  receivedItemErrors: { [key: string]: { [field: string]: string } };
  onUpdateReceivedItem: (id: string, field: string, value: any) => void;
  onAddReceivedItem: () => void;
  onRemoveReceivedItem: (id: string) => void;
  receivedTotals: {
    finalWt: number;
  };
}

export function ReceivedItemsTable({
  receivedItems,
  receivedItemErrors,
  onUpdateReceivedItem,
  onAddReceivedItem,
  onRemoveReceivedItem,
  receivedTotals,
}: ReceivedItemsTableProps) {
  return (
    <div className="bg-background/50 p-6 rounded-md border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Received Items</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddReceivedItem}
          className="flex items-center"
        >
          <Plus className="mr-1 h-4 w-4" /> Add Received Item
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="p-2 text-left font-medium text-muted-foreground">
                Date
              </th>
              <th className="p-2 text-left font-medium text-muted-foreground">
                S.No
              </th>
              <th className="p-2 text-left font-medium text-muted-foreground">
                Received Gold
              </th>
              <th className="p-2 text-left font-medium text-muted-foreground">
                Melting
              </th>
              <th className="p-2 text-left font-medium text-muted-foreground">
                Final Wt.
              </th>
              <th className="p-2 text-left font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {receivedItems.map((item, idx) => {
              const currentItemErrors = receivedItemErrors[item.id] || {};
              return (
                <tr key={item.id} className="border-b">
                  <td className="p-2">
                    <Input
                      type="date"
                      value={
                        item.date || new Date().toISOString().split("T")[0]
                      }
                      onChange={(e) =>
                        onUpdateReceivedItem(item.id, "date", e.target.value)
                      }
                    />
                  </td>
                  <td className="p-2">{idx + 1}</td>
                  <td className="p-2">
                    <Input
                      type="number"
                      placeholder="0.000"
                      step="0.01"
                      min="0"
                      value={item.receivedGold || ""}
                      onChange={(e) =>
                        onUpdateReceivedItem(
                          item.id,
                          "receivedGold",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                    {currentItemErrors.receivedGold && (
                      <div className="text-xs text-destructive mt-1">
                        {currentItemErrors.receivedGold}
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      placeholder="0.000"
                      step="0.01"
                      min="0"
                      max="100"
                      value={item.melting || ""}
                      onChange={(e) =>
                        onUpdateReceivedItem(
                          item.id,
                          "melting",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                    {currentItemErrors.melting && (
                      <div className="text-xs text-destructive mt-1">
                        {currentItemErrors.melting}
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    <Input
                      readOnly
                      value={
                        Number(item.receivedGold) && Number(item.melting) >= 0
                          ? (
                              Number(item.receivedGold) -
                              (Number(item.receivedGold) *
                                Number(item.melting)) /
                                100
                            ).toFixed(3)
                          : ""
                      }
                      placeholder="0.000"
                      className="bg-muted/30"
                    />
                  </td>
                  <td className="p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveReceivedItem(item.id)}
                    >
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-muted/30 font-medium">
              <td colSpan={4} className="p-2 text-right">
                Totals:
              </td>
              <td className="p-2">{receivedTotals.finalWt.toFixed(3)}</td>
              <td className="p-2"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
