import { Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReceiptItem } from "@/models/Receipt";

interface GivenItemsTableProps {
  items: ReceiptItem[];
  itemErrors: { [key: string]: { [field: string]: string } };
  onUpdateItem: (id: string, field: string, value: any) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  totals: {
    grossWeight: number;
    stoneWeight: number;
    netWeight: number;
    finalWeight: number;
    stoneAmount: number;
  };
}

export function GivenItemsTable({
  items,
  itemErrors,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  totals,
}: GivenItemsTableProps) {
  return (
    <div className="bg-background/50 p-6 rounded-md border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Items</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddItem}
          className="flex items-center"
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Item
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
                Description
              </th>
              <th className="p-2 text-left font-medium text-muted-foreground">
                Tag
              </th>
              <th className="p-2 text-left font-medium text-muted-foreground">
                Gross Wt.
              </th>
              <th className="p-2 text-left font-medium text-muted-foreground">
                Stone Wt.
              </th>
              <th className="p-2 text-left font-medium text-muted-foreground">
                Melting %
              </th>
              <th className="p-2 text-left font-medium text-muted-foreground">
                Net Wt.
              </th>
              <th className="p-2 text-left font-medium text-muted-foreground">
                Final Wt.
              </th>
              <th className="p-2 text-left font-medium text-muted-foreground">
                Stone Amt.
              </th>
              <th className="p-2 text-left font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const currentItemErrors = itemErrors[item.id] || {};
              return (
                <tr key={item.id} className="border-b">
                  <td className="p-2">
                    <Input
                      type="date"
                      value={
                        item.date || new Date().toISOString().split("T")[0]
                      }
                      onChange={(e) =>
                        onUpdateItem(item.id, "date", e.target.value)
                      }
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      placeholder="Item name"
                      value={item.itemName}
                      onChange={(e) =>
                        onUpdateItem(item.id, "itemName", e.target.value)
                      }
                    />
                    {currentItemErrors.itemName && (
                      <div className="text-xs text-destructive mt-1">
                        {currentItemErrors.itemName}
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    <Input
                      placeholder="Tag"
                      value={item.tag}
                      onChange={(e) =>
                        onUpdateItem(item.id, "tag", e.target.value)
                      }
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      placeholder="0.000"
                      step="0.01"
                      min="0"
                      value={item.grossWt || ""}
                      onChange={(e) =>
                        onUpdateItem(
                          item.id,
                          "grossWt",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                    {currentItemErrors.grossWt && (
                      <div className="text-xs text-destructive mt-1">
                        {currentItemErrors.grossWt}
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      placeholder="0.000"
                      step="0.01"
                      min="0"
                      value={item.stoneWt || ""}
                      onChange={(e) =>
                        onUpdateItem(
                          item.id,
                          "stoneWt",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                    {currentItemErrors.stoneWt && (
                      <div className="text-xs text-destructive mt-1">
                        {currentItemErrors.stoneWt}
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
                      value={item.meltingTouch || ""}
                      onChange={(e) =>
                        onUpdateItem(
                          item.id,
                          "meltingTouch",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                    {currentItemErrors.meltingTouch && (
                      <div className="text-xs text-destructive mt-1">
                        {currentItemErrors.meltingTouch}
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    <Input
                      readOnly
                      value={item.netWt ? item.netWt.toFixed(3) : ""}
                      placeholder="0.000"
                      className="bg-muted/30"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      readOnly
                      value={item.finalWt ? item.finalWt.toFixed(3) : ""}
                      placeholder="0.000"
                      className="bg-muted/30"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      placeholder="0.000"
                      step="0.01"
                      min="0"
                      value={item.stoneAmt || ""}
                      onChange={(e) =>
                        onUpdateItem(
                          item.id,
                          "stoneAmt",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </td>
                  <td className="p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-muted/30 font-medium">
              <td colSpan={3} className="p-2 text-right">
                Totals:
              </td>
              <td className="p-2">{totals.grossWeight.toFixed(3)}</td>
              <td className="p-2">{totals.stoneWeight.toFixed(3)}</td>
              <td className="p-2">{totals.netWeight.toFixed(3)}</td>
              <td className="p-2">
                {items
                  .map((item) => Number(item.meltingTouch) || 0)
                  .reduce((acc, curr) => acc + curr, 0)}
              </td>
              <td className="p-2">{totals.finalWeight.toFixed(3)}</td>
              <td className="p-2">{totals.stoneAmount.toFixed(3)}</td>
              <td className="p-2"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
