import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Loader, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { receiptServices } from "@/services/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useEffect } from "react";

export default function EditReceiptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [editableReceipt, setEditableReceipt] = useState(null);

  // Check for state data first (passed from ReceiptDetailsPage)
  const stateReceipt = location.state?.receiptData;

  // Fetch receipt by ID only if not available in state
  const {
    data: receipt,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["receipt", id],
    queryFn: () => receiptServices.getReceipt(id),
    enabled: !!id && !stateReceipt,
  });

  // Handle query side effects
  useEffect(() => {
    if (receipt) {
      setEditableReceipt(receipt?.receipt);
    }
  }, [receipt]);

  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: "Failed to load receipt. Please try again.",
        variant: "destructive",
      });
    }
  }, [isError, toast]);

  // Initialize state with location data if available
  useEffect(() => {
    if (stateReceipt) {
      setEditableReceipt(stateReceipt);
    }
  }, [stateReceipt]);

  // Update receipt mutation
  // Update receipt mutation
  type UpdateReceiptInput = {
    metalType: string;
    issueDate: string;
    items: Array<{
      itemName: string;
      grossWt: number;
      stoneWt: number;
      netWt: number;
      finalWt: number;
      stoneAmt: number;
      meltingPercent: number;
    }>;
    clientInfo: {
      shopName: string;
      clientName: string;
      phoneNumber?: string;
      address?: string;
    };
    paymentStatus: string;
    totalPaidAmount: number;
  };

  const { mutate: updateReceipt, isPending: isUpdating } = useMutation<
    void,
    Error,
    UpdateReceiptInput
  >({
    mutationFn: (updatedData) => receiptServices.updateReceipt(id, updatedData),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Receipt updated successfully",
      });
      navigate(`/receipts/${id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update receipt",
        variant: "destructive",
      });
    },
  });

  // Handle save
  const handleSave = async () => {
    if (!editableReceipt) {
      toast({
        title: "Error",
        description: "No receipt data to save",
        variant: "destructive",
      });
      return;
    }

    try {
      // Calculate totals
      const totals = editableReceipt.items.reduce(
        (acc, item) => {
          acc.grossWt += Number(item.grossWeight) || 0;
          acc.stoneWt += Number(item.stoneWeight) || 0;
          acc.stoneAmt += Number(item.stoneAmount) || 0;
          acc.netWt += Number(item.netWeight) || 0;
          acc.finalWt += Number(item.finalWeight) || 0;
          return acc;
        },
        {
          grossWt: 0,
          stoneWt: 0,
          netWt: 0,
          finalWt: 0,
          stoneAmt: 0,
        }
      );

      // Prepare the payload with the correct field names
      const payload = {
        metalType: editableReceipt.metalType,
        issueDate:
          editableReceipt.issueDate instanceof Date
            ? editableReceipt.issueDate.toISOString()
            : new Date(editableReceipt.issueDate).toISOString(),
        items: editableReceipt.items.map((item) => ({
          itemName: item.description || item.itemName || "",
          grossWt: Number(item.grossWeight) || 0,
          stoneWt: Number(item.stoneWeight) || 0,
          netWt: Number(item.netWeight) || 0,
          finalWt: Number(item.finalWeight) || 0,
          stoneAmt: Number(item.stoneAmount) || 0,
          meltingPercent: Number(item.meltingPercent) || 0,
        })),
        clientInfo: {
          shopName: editableReceipt.clientInfo?.shopName || "",
          clientName: editableReceipt.clientInfo?.clientName || "",
          phoneNumber: editableReceipt.clientInfo?.phoneNumber || "",
          address: editableReceipt.clientInfo?.address || "",
        },
        paymentStatus: editableReceipt.paymentStatus,
        totalPaidAmount: Number(editableReceipt.totalPaidAmount) || 0,
        totals, // Include calculated totals
      };

      await updateReceipt(payload);
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save Failed",
        description: error.message || "Could not save receipt",
        variant: "destructive",
      });
    }
  };

  // Handle field changes
  const handleFieldChange = (field, value) => {
    setEditableReceipt((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle client info changes
  const handleClientInfoChange = (field, value) => {
    setEditableReceipt((prev) => ({
      ...prev,
      clientInfo: {
        ...prev.clientInfo,
        [field]: value,
      },
    }));
  };

  // Handle item changes
  const handleItemChange = (index, field, value) => {
    setEditableReceipt((prev) => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: Number(value) || value,
      };

      // Calculate item totals if needed
      if (["grossWeight", "stoneWeight", "meltingPercent"].includes(field)) {
        const grossWeight = Number(updatedItems[index].grossWeight) || 0;
        const stoneWeight = Number(updatedItems[index].stoneWeight) || 0;
        const meltingPercent = Number(updatedItems[index].meltingPercent) || 0;

        updatedItems[index].netWeight = grossWeight - stoneWeight;
        updatedItems[index].finalWeight =
          updatedItems[index].netWeight * (meltingPercent / 100);
      }

      return {
        ...prev,
        items: updatedItems,
      };
    });
  };

  // // Handle save
  // const handleSave = async () => {
  //   if (!editableReceipt) {
  //     toast({
  //       title: "Error",
  //       description: "No receipt data to save",
  //       variant: "destructive",
  //     });
  //     return;
  //   }

  //   try {
  //     // Calculate totals if needed
  //     const totals = editableReceipt.items.reduce(
  //       (acc, item) => {
  //         acc.grossWt += Number(item.grossWeight) || 0;
  //         acc.stoneWt += Number(item.stoneWeight) || 0;
  //         acc.stoneAmt += Number(item.stoneAmount) || 0;
  //         acc.netWt += Number(item.netWeight) || 0;
  //         acc.finalWt += Number(item.finalWeight) || 0;
  //         return acc;
  //       },
  //       {
  //         grossWt: 0,
  //         stoneWt: 0,
  //         netWt: 0,
  //         finalWt: 0,
  //         stoneAmt: 0,
  //       }
  //     );

  //     const payload = {
  //       ...editableReceipt,
  //       totals,
  //       items: editableReceipt.items.map((item) => ({
  //         ...item,
  //         grossWeight: Number(item.grossWeight),
  //         stoneWeight: Number(item.stoneWeight),
  //         meltingPercent: Number(item.meltingPercent),
  //         netWeight: Number(item.netWeight),
  //         finalWeight: Number(item.finalWeight),
  //         stoneAmount: Number(item.stoneAmount),
  //         rate: Number(item.rate) || 0,
  //       })),
  //       totalPaidAmount: Number(editableReceipt.totalPaidAmount) || 0,
  //       issueDate:
  //         editableReceipt.issueDate instanceof Date
  //           ? editableReceipt.issueDate.toISOString()
  //           : new Date(editableReceipt.issueDate).toISOString(),
  //     };

  //     delete payload._id; // Remove MongoDB _id if present
  //     delete payload.__v; // Remove version key if present

  //     await updateReceipt(payload);
  //   } catch (error) {
  //     console.error("Save error:", error);
  //     toast({
  //       title: "Save Failed",
  //       description: error.message || "Could not save receipt",
  //       variant: "destructive",
  //     });
  //   }
  // };

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

  if (isError) {
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
          Failed to load receipt details.{" "}
          {error?.message || "Please try again."}
        </div>
      </div>
    );
  }

  if (!editableReceipt) {
    return (
      <div className="container py-6">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/receipts")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Receipts
        </Button>
        <div className="text-center py-8">Receipt not found</div>
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
            <p className="text-muted-foreground">
              {editableReceipt.clientInfo?.shopName} -{" "}
              {editableReceipt.clientInfo?.clientName}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Voucher ID: {editableReceipt.voucherId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="col-span-2">
          <div className="bg-card card-premium rounded-lg p-6 print:p-0 print:bg-transparent print:shadow-none">
            <h2 className="text-xl font-medium mb-4">Receipt Items</h2>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-1 text-sm font-medium">
                      Description
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
                    <tr
                      key={item._id || index}
                      className="border-b last:border-b-0"
                    >
                      <td className="py-2 px-1">
                        <input
                          type="text"
                          value={item.description || item.itemName || ""}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          className="w-full bg-transparent border rounded px-2 py-1"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={item.grossWeight || 0}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "grossWeight",
                              e.target.value
                            )
                          }
                          className="w-full bg-transparent border rounded px-2 py-1 text-right"
                          step="0.01"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={item.stoneWeight || 0}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "stoneWeight",
                              e.target.value
                            )
                          }
                          className="w-full bg-transparent border rounded px-2 py-1 text-right"
                          step="0.01"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={item.meltingPercent || 0}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "meltingPercent",
                              e.target.value
                            )
                          }
                          className="w-full bg-transparent border rounded px-2 py-1 text-right"
                          step="0.1"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={item.netWeight || 0}
                          onChange={(e) =>
                            handleItemChange(index, "netWeight", e.target.value)
                          }
                          className="w-full bg-transparent border rounded px-2 py-1 text-right"
                          step="0.01"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={item.finalWeight || 0}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "finalWeight",
                              e.target.value
                            )
                          }
                          className="w-full bg-transparent border rounded px-2 py-1 text-right"
                          step="0.01"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={item.stoneAmount || 0}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "stoneAmount",
                              e.target.value
                            )
                          }
                          className="w-full bg-transparent border rounded px-2 py-1 text-right"
                          step="0.01"
                        />
                      </td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  <tr className="font-medium bg-accent/20 print:bg-gray-100">
                    <td className="py-2 px-1 text-left">Totals</td>
                    <td className="py-2 px-1 text-right">
                      {editableReceipt.items
                        ?.reduce(
                          (sum, item) => sum + (item.grossWeight || 0),
                          0
                        )
                        .toFixed(2)}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {editableReceipt.items
                        ?.reduce(
                          (sum, item) => sum + (item.stoneWeight || 0),
                          0
                        )
                        .toFixed(2)}
                    </td>
                    <td className="py-2 px-1"></td>
                    <td className="py-2 px-1 text-right">
                      {editableReceipt.items
                        ?.reduce((sum, item) => sum + (item.netWeight || 0), 0)
                        .toFixed(2)}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {editableReceipt.items
                        ?.reduce(
                          (sum, item) => sum + (item.finalWeight || 0),
                          0
                        )
                        .toFixed(2)}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {editableReceipt.items
                        ?.reduce(
                          (sum, item) => sum + (item.stoneAmount || 0),
                          0
                        )
                        .toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-card card-premium rounded-lg p-6 mb-6 print:p-0 print:bg-transparent print:shadow-none">
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
                  type="text"
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

          <div className="bg-card card-premium rounded-lg p-6 print:p-0 print:bg-transparent print:shadow-none">
            <h2 className="text-xl font-medium mb-4">Receipt Information</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Metal Type
                </label>
                <select
                  value={editableReceipt.metalType || "Gold"}
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
                          new Date(editableReceipt.issueDate),
                          "yyyy-MM-dd"
                        )
                      : ""
                  }
                  onChange={(e) =>
                    handleFieldChange("issueDate", e.target.value)
                  }
                  className="w-full bg-transparent border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Payment Status
                </label>
                <select
                  value={editableReceipt.paymentStatus || "Pending"}
                  onChange={(e) =>
                    handleFieldChange("paymentStatus", e.target.value)
                  }
                  className="w-full bg-transparent border rounded px-3 py-2"
                >
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial </option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Total Paid Amount
                </label>
                <input
                  type="number"
                  value={editableReceipt.totalPaidAmount || 0}
                  onChange={(e) =>
                    handleFieldChange("totalPaidAmount", e.target.value)
                  }
                  className="w-full bg-transparent border rounded px-3 py-2"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
