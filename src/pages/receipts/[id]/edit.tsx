import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Loader, Save, Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { receiptServices } from "@/services/api";

// Helper function to safely parse dates
const safeDateParse = (dateString: string | Date): Date => {
  if (dateString instanceof Date) return dateString;
  try {
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  } catch {
    return new Date();
  }
};

// Type definitions
interface ReceiptItem {
  _id?: string;
  itemName: string;
  tag: string;
  grossWt: number;
  stoneWt: number;
  netWt: number;
  meltingTouch: number;
  finalWt: number;
  stoneAmt: number;
  totalInvoiceAmount: number;
  date?: string; // Add date field
}

interface ReceivedItem {
  _id?: string;
  receivedGold: number;
  melting: number;
  finalWt: number;
  date?: string; // Add date field
}

interface ClientInfo {
  shopName: string;
  clientName: string;
  phoneNumber?: string;
  address?: string;
}

interface Receipt {
  _id: string;
  voucherId: string;
  metalType: string;
  issueDate: string | Date;
  items: ReceiptItem[];
  receivedItems?: ReceivedItem[];
  clientInfo: ClientInfo;
  paymentStatus: "Pending" | "Partial" | "Paid";
  totalPaidAmount: number;
  status?: "complete" | "incomplete";
  totals?: {
    grossWt: number;
    stoneWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
    totalInvoiceAmount: number;
  };
  receivedTotals?: {
    finalWt: number;
  };
}

export default function EditReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [editableReceipt, setEditableReceipt] = useState<Receipt | null>(null);

  // Fetch receipt by ID
  const {
    data: receiptData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["receipt", id],
    queryFn: () => receiptServices.getReceipt(id!),
    enabled: !!id,
  });

  // Initialize state with fetched data
  useEffect(() => {
    if (receiptData?.data) {
      const receipt = receiptData.data;

      // Process received items and calculate totals
      const processedReceivedItems = (receipt.receivedItems || []).map(
        (item) => ({
          ...item,
          receivedGold: item.receivedGold || 0,
          melting: item.melting || 0,
          finalWt: item.finalWt || 0,
        })
      );

      // Calculate received totals
      const receivedTotals = {
        finalWt: processedReceivedItems.reduce(
          (sum, item) => sum + (item.finalWt || 0),
          0
        ),
      };

      // Process given items and calculate totals
      const processedItems = (receipt.givenItems || receipt.items || []).map(
        (item) => ({
          ...item,
          grossWt: item.grossWt ?? 0,
          stoneWt: item.stoneWt ?? 0,
          netWt: item.netWt ?? 0,
          meltingTouch: item.meltingTouch ?? 0,
          finalWt: item.finalWt ?? 0,
          stoneAmt: item.stoneAmt ?? 0,
          totalInvoiceAmount: item.totalInvoiceAmount ?? 0,
        })
      );

      // Calculate given totals
      const totals = receipt.totals || {
        grossWt: processedItems.reduce(
          (sum, item) => sum + (item.grossWt || 0),
          0
        ),
        stoneWt: processedItems.reduce(
          (sum, item) => sum + (item.stoneWt || 0),
          0
        ),
        netWt: processedItems.reduce((sum, item) => sum + (item.netWt || 0), 0),
        finalWt: processedItems.reduce(
          (sum, item) => sum + (item.finalWt || 0),
          0
        ),
        stoneAmt: processedItems.reduce(
          (sum, item) => sum + (item.stoneAmt || 0),
          0
        ),
        totalInvoiceAmount: processedItems.reduce(
          (sum, item) => sum + (item.totalInvoiceAmount || 0),
          0
        ),
      };

      setEditableReceipt({
        ...receipt,
        issueDate: safeDateParse(receipt.issueDate),
        clientInfo: receipt.clientInfo || {
          shopName: "",
          clientName: "",
          phoneNumber: "",
          address: "",
        },
        items: processedItems,
        receivedItems: processedReceivedItems,
        totals,
        receivedTotals,
      });
    }
  }, [receiptData]);

  // Handle query errors
  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: error?.message || "Failed to load receipt",
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  // Update receipt mutation
  const { mutate: updateReceipt, isPending: isUpdating } = useMutation({
    mutationFn: (updatedData: Partial<Receipt>) =>
      receiptServices.updateReceipt(id!, updatedData),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Receipt updated successfully",
      });
      navigate(`/receipts/${id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update receipt",
        variant: "destructive",
      });
    },
  });

  // Handle field changes
  const handleFieldChange = <K extends keyof Receipt>(
    field: K,
    value: Receipt[K]
  ) => {
    setEditableReceipt((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  };

  // Handle client info changes
  const handleClientInfoChange = <K extends keyof ClientInfo>(
    field: K,
    value: ClientInfo[K]
  ) => {
    setEditableReceipt((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        clientInfo: {
          ...(prev.clientInfo || {
            shopName: "",
            clientName: "",
            phoneNumber: "",
            address: "",
          }),
          [field]: value,
        },
      };
    });
  };

  // Handle received item changes
  const handleReceivedItemChange = (
    index: number,
    field: keyof ReceivedItem,
    value: string | number
  ) => {
    setEditableReceipt((prev) => {
      if (!prev || !prev.receivedItems || !prev.receivedItems[index])
        return prev;

      const updatedReceivedItems = [...(prev.receivedItems || [])];

      // Handle string fields (date) differently from number fields
      if (field === "date") {
        updatedReceivedItems[index] = {
          ...updatedReceivedItems[index],
          [field]: value.toString(),
        };
      } else {
        const numericValue =
          typeof value === "string" ? parseFloat(value) || 0 : value;

        // Create updated item
        const updatedItem = {
          ...updatedReceivedItems[index],
          [field]: numericValue,
        };

        // Recalculate finalWt for received items
        if (["receivedGold", "melting"].includes(field)) {
          updatedItem.finalWt =
            (updatedItem.receivedGold * updatedItem.melting) / 100;
        }

        updatedReceivedItems[index] = updatedItem;
      }

      // Calculate received totals
      const receivedTotals = {
        finalWt: updatedReceivedItems.reduce(
          (sum, item) => sum + (item.finalWt || 0),
          0
        ),
      };

      // Auto-update status based on received items
      const hasValidReceivedItems = updatedReceivedItems.some(
        (item) => item.receivedGold > 0 && item.melting > 0
      );
      const newStatus = hasValidReceivedItems ? "complete" : "incomplete";

      return {
        ...prev,
        receivedItems: updatedReceivedItems,
        receivedTotals,
        status: newStatus,
      };
    });
  };

  // Add received item
  const addReceivedItem = () => {
    setEditableReceipt((prev) => {
      if (!prev) return prev;
      const newItem: ReceivedItem = {
        receivedGold: 0,
        melting: 0,
        finalWt: 0,
        date: format(new Date(), "yyyy-MM-dd"), // Add default date
      };
      const updatedReceivedItems = [...(prev.receivedItems || []), newItem];

      // Check if status should be updated
      const hasValidReceivedItems = updatedReceivedItems.some(
        (item) => item.receivedGold > 0 && item.melting > 0
      );
      const newStatus = hasValidReceivedItems ? "complete" : "incomplete";

      return {
        ...prev,
        receivedItems: updatedReceivedItems,
        status: newStatus,
      };
    });
  };

  // Remove received item
  const removeReceivedItem = (index: number) => {
    setEditableReceipt((prev) => {
      if (!prev || !prev.receivedItems) return prev;
      const updatedReceivedItems = prev.receivedItems.filter(
        (_, i) => i !== index
      );

      // Recalculate totals
      const receivedTotals = {
        finalWt: updatedReceivedItems.reduce(
          (sum, item) => sum + (item.finalWt || 0),
          0
        ),
      };

      // Auto-update status based on remaining received items
      const hasValidReceivedItems = updatedReceivedItems.some(
        (item) => item.receivedGold > 0 && item.melting > 0
      );
      const newStatus = hasValidReceivedItems ? "complete" : "incomplete";

      return {
        ...prev,
        receivedItems: updatedReceivedItems,
        receivedTotals,
        status: newStatus,
      };
    });
  };

  // Add given item
  const addGivenItem = () => {
    setEditableReceipt((prev) => {
      if (!prev) return prev;
      const newItem: ReceiptItem = {
        itemName: "",
        tag: "",
        grossWt: 0,
        stoneWt: 0,
        netWt: 0,
        meltingTouch: 0,
        finalWt: 0,
        stoneAmt: 0,
        totalInvoiceAmount: 0,
        date: format(new Date(), "yyyy-MM-dd"), // Add default date
      };
      return {
        ...prev,
        items: [...(prev.items || []), newItem],
      };
    });
  };

  // Remove given item
  const removeGivenItem = (index: number) => {
    setEditableReceipt((prev) => {
      if (!prev || !prev.items || prev.items.length <= 1) return prev;
      const updatedItems = prev.items.filter((_, i) => i !== index);

      // Recalculate totals
      const totals = {
        grossWt: updatedItems.reduce(
          (sum, item) => sum + (item.grossWt || 0),
          0
        ),
        stoneWt: updatedItems.reduce(
          (sum, item) => sum + (item.stoneWt || 0),
          0
        ),
        netWt: updatedItems.reduce((sum, item) => sum + (item.netWt || 0), 0),
        finalWt: updatedItems.reduce(
          (sum, item) => sum + (item.finalWt || 0),
          0
        ),
        stoneAmt: updatedItems.reduce(
          (sum, item) => sum + (item.stoneAmt || 0),
          0
        ),
        totalInvoiceAmount: updatedItems.reduce(
          (sum, item) => sum + (item.totalInvoiceAmount || 0),
          0
        ),
      };

      return {
        ...prev,
        items: updatedItems,
        totals,
      };
    });
  };

  // Handle item changes
  const handleItemChange = (
    index: number,
    field: keyof ReceiptItem,
    value: string | number
  ) => {
    setEditableReceipt((prev) => {
      if (!prev || !prev.items || !prev.items[index]) return prev;

      const updatedItems = [...prev.items];

      // Handle string fields differently from number fields
      if (field === "itemName" || field === "tag" || field === "date") {
        updatedItems[index] = {
          ...updatedItems[index],
          [field]: value.toString(), // Ensure it's a string
        };
      } else {
        // For numeric fields
        const numericValue =
          typeof value === "string" ? parseFloat(value) || 0 : value;

        // Create updated item
        const updatedItem = {
          ...updatedItems[index],
          [field]: numericValue,
        };

        // Recalculate dependent fields
        if (["grossWt", "stoneWt", "meltingTouch"].includes(field)) {
          updatedItem.netWt = updatedItem.grossWt - updatedItem.stoneWt;
          updatedItem.finalWt =
            updatedItem.netWt * (updatedItem.meltingTouch / 100);
        }

        updatedItems[index] = updatedItem;
      }

      // Calculate totals (only for numeric fields)
      const totals = {
        grossWt: (updatedItems || []).reduce(
          (sum, item) => sum + (item.grossWt || 0),
          0
        ),
        stoneWt: (updatedItems || []).reduce(
          (sum, item) => sum + (item.stoneWt || 0),
          0
        ),
        netWt: (updatedItems || []).reduce(
          (sum, item) => sum + (item.netWt || 0),
          0
        ),
        finalWt: (updatedItems || []).reduce(
          (sum, item) => sum + (item.finalWt || 0),
          0
        ),
        stoneAmt: (updatedItems || []).reduce(
          (sum, item) => sum + (item.stoneAmt || 0),
          0
        ),
        totalInvoiceAmount: (updatedItems || []).reduce(
          (sum, item) => sum + (item.totalInvoiceAmount || 0),
          0
        ),
      };

      return {
        ...prev,
        items: updatedItems,
        totals,
      };
    });
  };

  // Handle save
  const handleSave = () => {
    if (!editableReceipt) {
      toast({
        title: "Error",
        description: "No receipt data to save",
        variant: "destructive",
      });
      return;
    }

    // Prepare payload with all updated fields
    const payload = {
      ...editableReceipt,
      issueDate:
        editableReceipt.issueDate instanceof Date
          ? editableReceipt.issueDate.toISOString()
          : editableReceipt.issueDate,
      givenItems: (editableReceipt.items || []).map((item) => ({
        ...item,
        grossWt: Number(item.grossWt) || 0,
        stoneWt: Number(item.stoneWt) || 0,
        netWt: Number(item.netWt) || 0,
        meltingTouch: Number(item.meltingTouch) || 0,
        finalWt: Number(item.finalWt) || 0,
        stoneAmt: Number(item.stoneAmt) || 0,
        totalInvoiceAmount: Number(item.totalInvoiceAmount) || 0,
        date: item.date || format(new Date(), "yyyy-MM-dd"), // Include date
      })),
      receivedItems: (editableReceipt.receivedItems || []).map((item) => ({
        ...item,
        receivedGold: Number(item.receivedGold) || 0,
        melting: Number(item.melting) || 0,
        finalWt: Number(item.finalWt) || 0,
        date: item.date || format(new Date(), "yyyy-MM-dd"), // Include date
      })),
    };

    updateReceipt(payload);
  };

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex justify-center items-center py-20">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading receipt details...</span>
        </div>
      </div>
    );
  }

  if (isError || !editableReceipt) {
    return (
      <div className="container py-6">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/receipts")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Receipts
        </Button>
        <div className="text-center text-destructive py-8">
          {error?.message || "Failed to load receipt details"}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 print:py-0">
      <div className="print:hidden">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/receipts")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Receipts
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold">Edit Receipt</h1>
            {editableReceipt.clientInfo && (
              <>
                <p className="text-muted-foreground">
                  {editableReceipt.clientInfo.shopName} -{" "}
                  {editableReceipt.clientInfo.clientName}
                </p>
              </>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Voucher ID: {editableReceipt.voucherId}
            </p>
          </div>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 space-y-6">
          {/* Given Items Table */}
          <div className="bg-card rounded-lg p-6 print:p-0 print:bg-transparent">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium">Given Items</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addGivenItem}
                className="flex items-center print:hidden"
              >
                <Plus className="mr-1 h-4 w-4" /> Add Item
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-1 text-sm font-medium">
                      Item Name
                    </th>
                    <th className="text-center py-2 px-1 text-sm font-medium">
                      Date
                    </th>
                    <th className="text-left py-2 px-1 text-sm font-medium">
                      Tag
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Gross Wt (g)
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Stone Wt (g)
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Melting %
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Net Wt (g)
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Final Wt (g)
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Stone Amt
                    </th>
                    <th className="text-center py-2 px-1 text-sm font-medium print:hidden">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(editableReceipt.items || [])
                    ?.filter((item) => item.itemName !== "Previous Balance")
                    ?.map((item, index) => {
                      // Find the actual index in the original array for proper handling
                      const actualIndex = (
                        editableReceipt.items || []
                      ).findIndex((originalItem) => originalItem === item);
                      return (
                        <tr key={item._id || actualIndex} className="border-b">
                          <td className="py-2 px-1">
                            <input
                              type="text"
                              value={item.itemName}
                              onChange={(e) =>
                                handleItemChange(
                                  actualIndex,
                                  "itemName",
                                  e.target.value
                                )
                              }
                              className="w-full bg-transparent border rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="date"
                              value={
                                item.date || format(new Date(), "yyyy-MM-dd")
                              }
                              onChange={(e) =>
                                handleItemChange(
                                  actualIndex,
                                  "date",
                                  e.target.value
                                )
                              }
                              className="w-full bg-transparent border rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="text"
                              value={item.tag}
                              onChange={(e) =>
                                handleItemChange(
                                  actualIndex,
                                  "tag",
                                  e.target.value
                                )
                              }
                              className="w-full bg-transparent border rounded px-2 py-1"
                              placeholder="Tag"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              value={item.grossWt === 0 ? "" : item.grossWt}
                              onChange={(e) =>
                                handleItemChange(
                                  actualIndex,
                                  "grossWt",
                                  e.target.value
                                )
                              }
                              className="w-full bg-transparent border rounded px-2 py-1 text-right"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              value={item.stoneWt === 0 ? "" : item.stoneWt}
                              onChange={(e) =>
                                handleItemChange(
                                  actualIndex,
                                  "stoneWt",
                                  e.target.value
                                )
                              }
                              className="w-full bg-transparent border rounded px-2 py-1 text-right"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              value={
                                item.meltingTouch === 0 ? "" : item.meltingTouch
                              }
                              onChange={(e) =>
                                handleItemChange(
                                  actualIndex,
                                  "meltingTouch",
                                  e.target.value
                                )
                              }
                              className="w-full bg-transparent border rounded px-2 py-1 text-right"
                              step="0.1"
                              min="0"
                              max="100"
                              placeholder="0.0"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              value={item.netWt?.toFixed(3) || "0.000"}
                              readOnly
                              className="w-full bg-muted/50 border rounded px-2 py-1 text-right"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              value={item.finalWt?.toFixed(3) || "0.000"}
                              readOnly
                              className="w-full bg-muted/50 border rounded px-2 py-1 text-right"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              value={item.stoneAmt === 0 ? "" : item.stoneAmt}
                              onChange={(e) =>
                                handleItemChange(
                                  actualIndex,
                                  "stoneAmt",
                                  e.target.value
                                )
                              }
                              className="w-full bg-transparent border rounded px-2 py-1 text-right"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="py-2 px-1 text-center print:hidden">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeGivenItem(actualIndex)}
                              className="h-6 w-6"
                            >
                              <Trash className="h-3 w-3 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}

                  <tr className="font-medium bg-accent/20">
                    <td colSpan={3} className="py-2 px-1">
                      Totals
                    </td>
                    <td className="py-2 px-1 text-right">
                      {/* Calculate totals excluding Previous Balance items */}
                      {(editableReceipt.items || [])
                        .filter((item) => item.itemName !== "Previous Balance")
                        .reduce((sum, item) => sum + (item.grossWt || 0), 0)
                        .toFixed(3)}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {(editableReceipt.items || [])
                        .filter((item) => item.itemName !== "Previous Balance")
                        .reduce((sum, item) => sum + (item.stoneWt || 0), 0)
                        .toFixed(3)}
                    </td>
                    <td className="py-2 px-1">-</td>
                    <td className="py-2 px-1 text-right">
                      {(editableReceipt.items || [])
                        .filter((item) => item.itemName !== "Previous Balance")
                        .reduce((sum, item) => sum + (item.netWt || 0), 0)
                        .toFixed(3)}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {(editableReceipt.items || [])
                        .filter((item) => item.itemName !== "Previous Balance")
                        .reduce((sum, item) => sum + (item.finalWt || 0), 0)
                        .toFixed(3)}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {(editableReceipt.items || [])
                        .filter((item) => item.itemName !== "Previous Balance")
                        .reduce((sum, item) => sum + (item.stoneAmt || 0), 0)
                        .toFixed(3)}
                    </td>
                    <td className="py-2 px-1 print:hidden"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Received Items Table */}
          <div className="bg-card rounded-lg p-6 print:p-0 print:bg-transparent">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium">Received Items</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addReceivedItem}
                className="flex items-center print:hidden"
              >
                <Plus className="mr-1 h-4 w-4" /> Add Item
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-1 text-sm font-medium">
                      S.No
                    </th>
                    <th className="text-center py-2 px-1 text-sm font-medium">
                      Date
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Received Gold (g)
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Melting %
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Final Wt (g)
                    </th>
                    <th className="text-center py-2 px-1 text-sm font-medium print:hidden">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(editableReceipt.receivedItems || [])?.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-1">{index + 1}</td>
                      <td className="py-2 px-1">
                        <input
                          type="date"
                          value={item.date || format(new Date(), "yyyy-MM-dd")}
                          onChange={(e) =>
                            handleReceivedItemChange(
                              index,
                              "date",
                              e.target.value
                            )
                          }
                          className="w-full bg-transparent border rounded px-2 py-1"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={
                            item.receivedGold === 0 ? "" : item.receivedGold
                          }
                          onChange={(e) =>
                            handleReceivedItemChange(
                              index,
                              "receivedGold",
                              e.target.value
                            )
                          }
                          className="w-full bg-transparent border rounded px-2 py-1 text-right"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={item.melting === 0 ? "" : item.melting}
                          onChange={(e) =>
                            handleReceivedItemChange(
                              index,
                              "melting",
                              e.target.value
                            )
                          }
                          className="w-full bg-transparent border rounded px-2 py-1 text-right"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="0.0"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={item.finalWt?.toFixed(3) || "0.000"}
                          readOnly
                          className="w-full bg-muted/50 border rounded px-2 py-1 text-right"
                        />
                      </td>
                      <td className="py-2 px-1 text-center print:hidden">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeReceivedItem(index)}
                          className="h-6 w-6"
                        >
                          <Trash className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}

                  <tr className="font-medium bg-accent/20">
                    <td colSpan={4} className="py-2 px-1 text-right">
                      Totals:
                    </td>
                    <td className="py-2 px-1 text-right">
                      {editableReceipt.receivedTotals?.finalWt?.toFixed(3) ||
                        "0.000"}
                    </td>
                    <td className="py-2 px-1 print:hidden"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Balance Summary */}
          <div className="bg-card rounded-lg p-6 print:p-0 print:bg-transparent">
            <h2 className="text-xl font-medium mb-4">Balance Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/10 p-3 rounded-md">
                <div className="text-sm text-muted-foreground">
                  Given Final Wt.
                </div>
                <div className="text-lg font-semibold">
                  {editableReceipt.totals?.finalWt?.toFixed(3) || "0.000"}g
                </div>
              </div>
              <div className="bg-muted/10 p-3 rounded-md">
                <div className="text-sm text-muted-foreground">
                  Received Final Wt.
                </div>
                <div className="text-lg font-semibold">
                  {editableReceipt.receivedTotals?.finalWt?.toFixed(3) ||
                    "0.000"}
                  g
                </div>
              </div>
              <div className="bg-primary/10 p-3 rounded-md">
                <div className="text-sm text-primary">Balance</div>
                <div className="text-lg font-semibold text-primary">
                  {(
                    (editableReceipt.totals?.finalWt || 0) -
                    (editableReceipt.receivedTotals?.finalWt || 0)
                  ).toFixed(3)}
                  g
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-card rounded-lg p-6">
            <h2 className="text-xl font-medium mb-4">Client Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Shop Name
                </label>
                <input
                  type="text"
                  value={editableReceipt.clientInfo?.shopName || ""}
                  onChange={(e) =>
                    handleClientInfoChange("shopName", e.target.value)
                  }
                  className="w-full bg-transparent border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  value={editableReceipt.clientInfo?.clientName || ""}
                  onChange={(e) =>
                    handleClientInfoChange("clientName", e.target.value)
                  }
                  className="w-full bg-transparent border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={editableReceipt.clientInfo?.phoneNumber || ""}
                  onChange={(e) =>
                    handleClientInfoChange("phoneNumber", e.target.value)
                  }
                  className="w-full bg-transparent border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Address
                </label>
                <textarea
                  value={editableReceipt.clientInfo?.address || ""}
                  onChange={(e) =>
                    handleClientInfoChange("address", e.target.value)
                  }
                  className="w-full bg-transparent border rounded px-3 py-2"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-6">
            <h2 className="text-xl font-medium mb-4">Receipt Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Metal Type
                </label>
                <select
                  value={editableReceipt.metalType}
                  onChange={(e) =>
                    handleFieldChange("metalType", e.target.value)
                  }
                  className="w-full bg-transparent border rounded px-3 py-2"
                >
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                  <option value="Platinum">Platinum</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={
                    editableReceipt.issueDate
                      ? format(
                          safeDateParse(editableReceipt.issueDate),
                          "yyyy-MM-dd"
                        )
                      : format(new Date(), "yyyy-MM-dd")
                  }
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    if (!isNaN(newDate.getTime())) {
                      handleFieldChange("issueDate", newDate);
                    }
                  }}
                  className="w-full bg-transparent border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Payment Status
                </label>
                <select
                  value={editableReceipt.paymentStatus}
                  onChange={(e) =>
                    handleFieldChange(
                      "paymentStatus",
                      e.target.value as "Pending" | "Partial" | "Paid"
                    )
                  }
                  className="w-full bg-transparent border rounded px-3 py-2"
                >
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Total Paid Amount
                </label>
                <input
                  type="number"
                  value={editableReceipt.totalPaidAmount}
                  onChange={(e) =>
                    handleFieldChange(
                      "totalPaidAmount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full bg-transparent border rounded px-3 py-2"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Receipt Status
                </label>
                <select
                  value={editableReceipt.status || "incomplete"}
                  onChange={(e) =>
                    handleFieldChange(
                      "status",
                      e.target.value as "complete" | "incomplete"
                    )
                  }
                  className="w-full bg-transparent border rounded px-3 py-2"
                >
                  <option value="complete">Complete</option>
                  <option value="incomplete">Incomplete</option>
                </select>
                <div className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const hasValidReceivedItems = (
                      editableReceipt.receivedItems || []
                    ).some((item) => item.receivedGold > 0 && item.melting > 0);
                    return hasValidReceivedItems
                      ? "✅ Has received items - Status: Complete"
                      : "⚠️ No received items - Status: Incomplete";
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
