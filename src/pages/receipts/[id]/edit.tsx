import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Loader, Save } from "lucide-react";
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
  clientInfo: ClientInfo;
  paymentStatus: "Pending" | "Partial" | "Paid";
  totalPaidAmount: number;
  totals?: {
    grossWt: number;
    stoneWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
    totalInvoiceAmount: number;
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
      setEditableReceipt({
        ...receipt,
        issueDate: safeDateParse(receipt.issueDate),
        clientInfo: receipt.clientInfo || {
          shopName: "",
          clientName: "",
          phoneNumber: "",
          address: "",
        },
        items: receipt.items.map((item) => ({
          ...item,
          grossWt: item.grossWt || 0,
          stoneWt: item.stoneWt || 0,
          netWt: item.netWt || 0,
          meltingTouch: item.meltingTouch || 0,
          finalWt: item.finalWt || 0,
          stoneAmt: item.stoneAmt || 0,
          totalInvoiceAmount: item.totalInvoiceAmount || 0,
        })),
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

  // Handle item changes
  const handleItemChange = (
    index: number,
    field: keyof ReceiptItem,
    value: string | number
  ) => {
    setEditableReceipt((prev) => {
      if (!prev) return null;

      const updatedItems = [...prev.items];

      // Handle string fields differently from number fields
      if (field === "itemName" || field === "tag") {
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
      items: editableReceipt.items.map((item) => ({
        ...item,
        grossWt: Number(item.grossWt) || 0,
        stoneWt: Number(item.stoneWt) || 0,
        netWt: Number(item.netWt) || 0,
        meltingTouch: Number(item.meltingTouch) || 0,
        finalWt: Number(item.finalWt) || 0,
        stoneAmt: Number(item.stoneAmt) || 0,
        totalInvoiceAmount: Number(item.totalInvoiceAmount) || 0,
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
        <div className="col-span-2">
          <div className="bg-card rounded-lg p-6 print:p-0 print:bg-transparent">
            <h2 className="text-xl font-medium mb-4">Receipt Items</h2>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-1 text-sm font-medium">
                      Item Name
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
                  </tr>
                </thead>
                <tbody>
                  {editableReceipt.items?.map((item, index) => (
                    <tr key={item._id || index} className="border-b">
                      <td className="py-2 px-1">
                        <input
                          type="text"
                          value={item.itemName}
                          onChange={(e) =>
                            handleItemChange(index, "itemName", e.target.value)
                          }
                          className="w-full bg-transparent border rounded px-2 py-1"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={item.grossWt || 0}
                          onChange={(e) =>
                            handleItemChange(index, "grossWt", e.target.value)
                          }
                          className="w-full bg-transparent border rounded px-2 py-1 text-right"
                          step="0.01"
                          min="0"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={item.stoneWt || 0}
                          onChange={(e) =>
                            handleItemChange(index, "stoneWt", e.target.value)
                          }
                          className="w-full bg-transparent border rounded px-2 py-1 text-right"
                          step="0.01"
                          min="0"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={item.meltingTouch || 0}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "meltingTouch",
                              e.target.value
                            )
                          }
                          className="w-full bg-transparent border rounded px-2 py-1 text-right"
                          step="0.1"
                          min="0"
                          max="100"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={item.netWt || 0}
                          readOnly
                          className="w-full bg-muted/50 border rounded px-2 py-1 text-right"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={item.finalWt || 0}
                          readOnly
                          className="w-full bg-muted/50 border rounded px-2 py-1 text-right"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={item.stoneAmt || 0}
                          onChange={(e) =>
                            handleItemChange(index, "stoneAmt", e.target.value)
                          }
                          className="w-full bg-transparent border rounded px-2 py-1 text-right"
                          step="0.01"
                          min="0"
                        />
                      </td>
                    </tr>
                  ))}

                  <tr className="font-medium bg-accent/20">
                    <td className="py-2 px-1">Totals</td>
                    <td className="py-2 px-1 text-right">
                      {editableReceipt.totals?.grossWt?.toFixed(3) || "0.000"}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {editableReceipt.totals?.stoneWt?.toFixed(3) || "0.000"}
                    </td>
                    <td className="py-2 px-1">
                      {editableReceipt.totals?.meltingTouch?.toFixed(3) ||
                        "0.000"}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {editableReceipt.totals?.netWt?.toFixed(3) || "0.000"}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {editableReceipt.totals?.finalWt?.toFixed(3) || "0.000"}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {editableReceipt.totals?.stoneAmt?.toFixed(3) || "0.000"}
                    </td>
                  </tr>
                </tbody>
              </table>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
