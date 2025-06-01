import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Attach autoTable to jsPDF
(jsPDF as any).autoTable = autoTable;

// API client setup
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Utility function to safely format numbers
const safeToFixed = (value: unknown, decimals = 2): string => {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? parseFloat(value) || 0
      : 0;
  return num.toFixed(decimals);
};

// Types for our receipt data
interface ReceiptItem {
  productName: string;
  pureWeight?: number;
  purePercent?: number;
  melting?: number;
  total?: number;
  finalOrnamentsWt?: number;
  stoneWeight?: number;
  subTotal?: number;
  makingChargePercent?: number;
  _id?: string;
}

interface TransactionDetails {
  date: string;
  items: ReceiptItem[];
  total?: number;
  totalPureWeight?: number;
  totalOrnamentsWt?: number;
  totalStoneWeight?: number;
  totalSubTotal?: number;
}

interface AdminReceipt {
  _id: string;
  clientId: string;
  clientName: string;
  status: string;
  voucherId: string;
  given: TransactionDetails;
  received: TransactionDetails;
  createdAt: string;
  updatedAt: string;
  __v: number;
  manualCalculations: {
    givenTotal: number;
    receivedTotal: number;
    operation: string;
    result: number;
  };
}

// Admin Receipt API functions
const adminReceiptApi = {
  getAdminReceiptById: async (id: string): Promise<AdminReceipt> => {
    try {
      const response = await api.get(`/admin-receipts/${id}`);
      return response.data as AdminReceipt;
    } catch (error) {
      console.error(`Error fetching admin receipt ${id}:`, error);
      throw error;
    }
  },
  updateAdminReceipt: async (
    id: string,
    data: Partial<AdminReceipt>
  ): Promise<AdminReceipt> => {
    try {
      const response = await api.put(`/admin-receipts/${id}`, data);
      return response.data as AdminReceipt;
    } catch (error) {
      console.error(`Error updating admin receipt ${id}:`, error);
      throw error;
    }
  },
};

export default function EditAdminReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [receipt, setReceipt] = useState<AdminReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch receipt data
  useEffect(() => {
    const fetchReceiptData = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);
      try {
        const data = await adminReceiptApi.getAdminReceiptById(id);

        // Deep clone and ensure all numeric fields are numbers
        const initializedData = JSON.parse(JSON.stringify(data));

        // Process given items
        initializedData.given.items = initializedData.given.items.map(
          (item: any) => ({
            ...item,
            pureWeight: Number(item.pureWeight) || 0,
            purePercent: Number(item.purePercent) || 0,
            melting: Number(item.melting) || 0,
            total: Number(item.total) || 0,
          })
        );
        initializedData.given.total = Number(initializedData.given.total) || 0;

        // Process received items
        initializedData.received.items = initializedData.received.items.map(
          (item: any) => ({
            ...item,
            finalOrnamentsWt: Number(item.finalOrnamentsWt) || 0,
            stoneWeight: Number(item.stoneWeight) || 0,
            subTotal: Number(item.subTotal) || 0,
            makingChargePercent: Number(item.makingChargePercent) || 0,
            total: Number(item.total) || 0,
          })
        );
        initializedData.received.total =
          Number(initializedData.received.total) || 0;

        setReceipt(initializedData);
      } catch (err) {
        console.error("Error fetching receipt:", err);
        setError("Failed to load receipt data");
        toast({
          title: "Error",
          description: "Could not fetch receipt details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReceiptData();
  }, [id, toast]);

  // Handle field changes
  const handleFieldChange = <K extends keyof AdminReceipt>(
    field: K,
    value: AdminReceipt[K]
  ) => {
    setReceipt((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  };

  // Handle transaction field changes
  const handleTransactionChange = (
    transactionType: "given" | "received",
    field: keyof TransactionDetails,
    value: any
  ) => {
    setReceipt((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [transactionType]: {
          ...prev[transactionType],
          [field]: value,
        },
      };
    });
  };

  // Handle item changes
  const handleItemChange = (
    transactionType: "given" | "received",
    index: number,
    field: keyof ReceiptItem,
    value: string | number
  ) => {
    setReceipt((prev) => {
      if (!prev) return null;

      const updatedItems = [...prev[transactionType].items];
      const numericValue =
        typeof value === "string" ? parseFloat(value) || 0 : value;

      // Create updated item
      const updatedItem = {
        ...updatedItems[index],
        [field]: field === "productName" ? value : numericValue,
      };

      // Recalculate totals for given items
      if (transactionType === "given") {
        if (["pureWeight", "purePercent", "melting"].includes(field)) {
          updatedItem.total =
            ((((updatedItem.pureWeight || 0) * (updatedItem.purePercent || 0)) /
              100) *
              (updatedItem.melting || 0)) /
            100;
        }
      }

      // Recalculate totals for received items
      if (transactionType === "received") {
        if (
          ["finalOrnamentsWt", "stoneWeight", "makingChargePercent"].includes(
            field
          )
        ) {
          updatedItem.subTotal =
            (updatedItem.finalOrnamentsWt || 0) +
            (updatedItem.stoneWeight || 0);
          updatedItem.total =
            (updatedItem.subTotal || 0) *
            (1 + (updatedItem.makingChargePercent || 0) / 100);
        }
      }

      // Update the item in the array
      updatedItems[index] = updatedItem;

      // Calculate transaction totals
      const totals = {
        total: updatedItems.reduce((sum, item) => sum + (item.total || 0), 0),
        totalPureWeight:
          transactionType === "given"
            ? updatedItems.reduce(
                (sum, item) => sum + (item.pureWeight || 0),
                0
              )
            : undefined,
        totalOrnamentsWt:
          transactionType === "received"
            ? updatedItems.reduce(
                (sum, item) => sum + (item.finalOrnamentsWt || 0),
                0
              )
            : undefined,
        totalStoneWeight:
          transactionType === "received"
            ? updatedItems.reduce(
                (sum, item) => sum + (item.stoneWeight || 0),
                0
              )
            : undefined,
        totalSubTotal:
          transactionType === "received"
            ? updatedItems.reduce((sum, item) => sum + (item.subTotal || 0), 0)
            : undefined,
      };

      return {
        ...prev,
        [transactionType]: {
          ...prev[transactionType],
          items: updatedItems,
          ...totals,
        },
      };
    });
  };

  // Add new item to given or received
  const addNewItem = (transactionType: "given" | "received") => {
    setReceipt((prev) => {
      if (!prev) return null;

      const newItem: ReceiptItem = {
        productName: "",
      };

      if (transactionType === "given") {
        newItem.pureWeight = 0;
        newItem.purePercent = 0;
        newItem.melting = 0;
        newItem.total = 0;
      } else {
        newItem.finalOrnamentsWt = 0;
        newItem.stoneWeight = 0;
        newItem.subTotal = 0;
        newItem.makingChargePercent = 0;
        newItem.total = 0;
      }

      return {
        ...prev,
        [transactionType]: {
          ...prev[transactionType],
          items: [...prev[transactionType].items, newItem],
        },
      };
    });
  };

  // Handle save
  // Handle save
  const handleSave = async () => {
    if (!receipt || !id) return;

    setIsUpdating(true);
    try {
      // Check if both given and received have items and totals
      const shouldBeComplete =
        receipt.given.items.length > 0 &&
        receipt.received.items.length > 0 &&
        receipt.given.total !== undefined &&
        receipt.received.total !== undefined;

      // Prepare update data
      const updateData: Partial<AdminReceipt> = {
        ...receipt,
        status: shouldBeComplete ? "complete" : receipt.status,
      };

      await adminReceiptApi.updateAdminReceipt(id, updateData);
      toast({
        title: "Success",
        description: "Receipt updated successfully",
      });
      navigate(`/admin-receipts/${id}`);
    } catch (error) {
      console.error("Error updating receipt:", error);
      toast({
        title: "Error",
        description: "Failed to update receipt",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  const generatePDF = (receipt: AdminReceipt) => {
    const doc = new jsPDF();
    // ... (same PDF generation code as before)
    doc.save(`receipt-${receipt.voucherId}.pdf`);
  };

  const handleDownloadPDF = () => {
    if (!receipt) return;
    try {
      generatePDF(receipt);
      toast({
        title: "Success",
        description: "PDF download started",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-6 flex justify-center items-center min-h-[600px]">
        <p className="text-xl text-muted-foreground">
          Loading receipt details...
        </p>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="container py-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Receipt Not Found</h2>
          <p className="text-muted-foreground mb-6">
            {error ||
              "The receipt you are looking for does not exist or has been removed."}
          </p>
          <Button onClick={() => navigate("/admin-receipts")}>
            Return to Receipts
          </Button>
        </div>
      </div>
    );
  }

  // Calculate balance
  const calculateBalance = () => {
    const givenTotal = Number(receipt.given?.total) || 0;
    const receivedTotal = Number(receipt.received?.total) || 0;
    return safeToFixed(givenTotal - receivedTotal);
  };

  return (
    <div className="container py-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Edit Admin Receipt</h1>
            <p className="text-gray-500">Voucher ID: {receipt.voucherId}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/admin-receipts")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
            <Button onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Basic Info Section */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Name
            </label>
            <input
              type="text"
              value={receipt.clientName}
              onChange={(e) => handleFieldChange("clientName", e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client ID
            </label>
            <input
              type="text"
              value={receipt.clientId}
              onChange={(e) => handleFieldChange("clientId", e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={receipt.status}
              onChange={(e) => handleFieldChange("status", e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="complete">Complete</option>
              <option value="incomplete">Incomplete</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Given Details Section */}
        <div className="mb-8 border p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Given Details</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addNewItem("given")}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={
                receipt.given.date
                  ? new Date(receipt.given.date).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) =>
                handleTransactionChange("given", "date", e.target.value)
              }
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Product
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Pure Weight
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Pure %
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Melting
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Total
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {receipt.given.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) =>
                          handleItemChange(
                            "given",
                            index,
                            "productName",
                            e.target.value
                          )
                        }
                        className="w-full border rounded px-2 py-1"
                        placeholder="Enter product name"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={item.pureWeight || ""}
                        onChange={(e) =>
                          handleItemChange(
                            "given",
                            index,
                            "pureWeight",
                            e.target.value
                          )
                        }
                        className="w-full border rounded px-2 py-1"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={item.purePercent || ""}
                        onChange={(e) =>
                          handleItemChange(
                            "given",
                            index,
                            "purePercent",
                            e.target.value
                          )
                        }
                        className="w-full border rounded px-2 py-1"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={item.melting || ""}
                        onChange={(e) =>
                          handleItemChange(
                            "given",
                            index,
                            "melting",
                            e.target.value
                          )
                        }
                        className="w-full border rounded px-2 py-1"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={safeToFixed(item.total)}
                        readOnly
                        className="w-full border rounded px-2 py-1 bg-gray-100"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Remove item logic here
                          setReceipt((prev) => {
                            if (!prev) return null;
                            const updatedItems = [...prev.given.items];
                            updatedItems.splice(index, 1);
                            return {
                              ...prev,
                              given: {
                                ...prev.given,
                                items: updatedItems,
                                total: updatedItems.reduce(
                                  (sum, item) => sum + (item.total || 0),
                                  0
                                ),
                              },
                            };
                          });
                        }}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={4} className="py-2 px-4 text-right font-medium">
                    Total:
                  </td>
                  <td className="py-2 px-4 font-medium">
                    {safeToFixed(receipt.given?.total)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Received Details Section */}
        <div className="mb-8 border p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Received Details</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addNewItem("received")}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={
                receipt.received.date
                  ? new Date(receipt.received.date).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) =>
                handleTransactionChange("received", "date", e.target.value)
              }
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Product
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Final Ornaments (wt)
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Stone Weight
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Sub Total
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Making Charge %
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Total
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {receipt.received.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) =>
                          handleItemChange(
                            "received",
                            index,
                            "productName",
                            e.target.value
                          )
                        }
                        className="w-full border rounded px-2 py-1"
                        placeholder="Enter product name"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={item.finalOrnamentsWt || ""}
                        onChange={(e) =>
                          handleItemChange(
                            "received",
                            index,
                            "finalOrnamentsWt",
                            e.target.value
                          )
                        }
                        className="w-full border rounded px-2 py-1"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={item.stoneWeight || ""}
                        onChange={(e) =>
                          handleItemChange(
                            "received",
                            index,
                            "stoneWeight",
                            e.target.value
                          )
                        }
                        className="w-full border rounded px-2 py-1"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={safeToFixed(item.subTotal)}
                        readOnly
                        className="w-full border rounded px-2 py-1 bg-gray-100"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={item.makingChargePercent || ""}
                        onChange={(e) =>
                          handleItemChange(
                            "received",
                            index,
                            "makingChargePercent",
                            e.target.value
                          )
                        }
                        className="w-full border rounded px-2 py-1"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={safeToFixed(item.total)}
                        readOnly
                        className="w-full border rounded px-2 py-1 bg-gray-100"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Remove item logic here
                          setReceipt((prev) => {
                            if (!prev) return null;
                            const updatedItems = [...prev.received.items];
                            updatedItems.splice(index, 1);
                            return {
                              ...prev,
                              received: {
                                ...prev.received,
                                items: updatedItems,
                                total: updatedItems.reduce(
                                  (sum, item) => sum + (item.total || 0),
                                  0
                                ),
                              },
                            };
                          });
                        }}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={5} className="py-2 px-4 text-right font-medium">
                    Total:
                  </td>
                  <td className="py-2 px-4 font-medium">
                    {safeToFixed(receipt.received?.total)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Balance Summary Section */}
        <div className="mb-4 p-4 border rounded-lg bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">Balance Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Given Total</p>
              <p className="font-medium">{safeToFixed(receipt.given?.total)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Received Total</p>
              <p className="font-medium">
                {safeToFixed(receipt.received?.total)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                Balance (Given - Received)
              </p>
              <p
                className={`font-medium ${
                  parseFloat(calculateBalance()) > 0
                    ? "text-green-600"
                    : parseFloat(calculateBalance()) < 0
                    ? "text-red-600"
                    : ""
                }`}
              >
                {calculateBalance()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
