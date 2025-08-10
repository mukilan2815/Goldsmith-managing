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
  baseURL: "https://backend-goldsmith.onrender.com/api",
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

// Types for our data
interface Client {
  id: string;
  name: string;
  balance: number;
}

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
  date?: string;
  _id?: string;
  id?: string; // Add the id field that backend expects
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

// Client API functions
const clientApi = {
  getClientById: async (id: string): Promise<Client> => {
    try {
      const response = await api.get(`/clients/${id}`);
      const c = response.data;
      return {
        id: c._id,
        name: c.clientName,
        balance: Number(c.balance) || 0,
      };
    } catch (error) {
      console.error(`Error fetching client ${id}:`, error);
      throw error;
    }
  },
  updateClientBalance: async (id: string, balance: number): Promise<void> => {
    try {
      await api.put(`/clients/${id}`, { balance });
    } catch (error) {
      console.error(`Error updating client ${id} balance:`, error);
      throw error;
    }
  },
};

// Work Receipt API functions
const adminReceiptApi = {
  getAdminReceiptById: async (id: string): Promise<AdminReceipt> => {
    try {
      const response = await api.get(`/admin-receipts/${id}`);
      return response.data as AdminReceipt;
    } catch (error) {
      console.error(`Error fetching Work Receipt ${id}:`, error);
      throw error;
    }
  },
  updateAdminReceipt: async (
    id: string,
    data: Partial<AdminReceipt>
  ): Promise<AdminReceipt> => {
    try {
      console.log("Sending update data:", JSON.stringify(data, null, 2));
      const response = await api.put(`/admin-receipts/${id}`, data);
      return response.data as AdminReceipt;
    } catch (error: any) {
      console.error(`Error updating Work Receipt ${id}:`, error);
      console.error("Error response data:", error.response?.data);
      console.error("Error response status:", error.response?.status);
      throw error;
    }
  },
};

export default function EditAdminReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [receipt, setReceipt] = useState<AdminReceipt | null>(null);
  const [originalReceipt, setOriginalReceipt] = useState<AdminReceipt | null>(
    null
  );
  const [clientBalance, setClientBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch receipt and client data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);
      try {
        // Fetch receipt
        const data = await adminReceiptApi.getAdminReceiptById(id);

        // Deep clone and ensure all numeric fields are numbers
        const initializedData = JSON.parse(JSON.stringify(data));

        // Process given items
        initializedData.given.items = initializedData.given.items.map(
          (item: any) => ({
            ...item,
            _id:
              item._id ||
              item.id ||
              `existing-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
            id:
              item.id ||
              item._id ||
              `existing-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
            pureWeight: Number(item.pureWeight) || 0,
            purePercent: Number(item.purePercent) || 0,
            melting: Number(item.melting) || 0,
            total: Number(item.total) || 0,
            date: item.date || new Date().toISOString().split("T")[0],
          })
        );
        initializedData.given.total = Number(initializedData.given.total) || 0;
        initializedData.given.totalPureWeight =
          Number(initializedData.given.totalPureWeight) || 0;

        // Process received items
        initializedData.received.items = initializedData.received.items.map(
          (item: any) => ({
            ...item,
            _id:
              item._id ||
              item.id ||
              `existing-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
            id:
              item.id ||
              item._id ||
              `existing-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
            finalOrnamentsWt: Number(item.finalOrnamentsWt) || 0,
            stoneWeight: Number(item.stoneWeight) || 0,
            subTotal: Number(item.subTotal) || 0,
            makingChargePercent: Number(item.makingChargePercent) || 0,
            total: Number(item.total) || 0,
            date: item.date || new Date().toISOString().split("T")[0],
          })
        );
        initializedData.received.total =
          Number(initializedData.received.total) || 0;
        initializedData.received.totalOrnamentsWt =
          Number(initializedData.received.totalOrnamentsWt) || 0;
        initializedData.received.totalStoneWeight =
          Number(initializedData.received.totalStoneWeight) || 0;
        initializedData.received.totalSubTotal =
          Number(initializedData.received.totalSubTotal) || 0;

        setReceipt(initializedData);
        setOriginalReceipt(initializedData);

        // Fetch client balance
        if (data.clientId) {
          const client = await clientApi.getClientById(data.clientId);
          setClientBalance(client.balance);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load receipt or client data");
        toast({
          title: "Error",
          description: "Could not fetch receipt or client details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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

      // Create updated item - don't convert date or productName to numbers
      const updatedItem = {
        ...updatedItems[index],
        [field]:
          field === "productName" || field === "date"
            ? value
            : typeof value === "string"
            ? parseFloat(value) || 0
            : value,
      };

      // Recalculate totals for given items
      if (transactionType === "given") {
        if (["pureWeight", "purePercent", "melting"].includes(field)) {
          const pureWeight = updatedItem.pureWeight || 0;
          const purePercent = updatedItem.purePercent || 0;
          const melting = updatedItem.melting || 1;
          updatedItem.total = (pureWeight * purePercent) / melting;
        }
      }

      // Recalculate totals for received items
      if (transactionType === "received") {
        if (
          ["finalOrnamentsWt", "stoneWeight", "makingChargePercent"].includes(
            field
          )
        ) {
          const finalOrnamentsWt = updatedItem.finalOrnamentsWt || 0;
          const stoneWeight = updatedItem.stoneWeight || 0;
          updatedItem.subTotal = finalOrnamentsWt - stoneWeight;
          updatedItem.total =
            updatedItem.subTotal *
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
                (sum, item) =>
                  sum +
                  ((item.pureWeight || 0) * (item.purePercent || 0)) / 100,
                0
              )
            : prev[transactionType].totalPureWeight,
        totalOrnamentsWt:
          transactionType === "received"
            ? updatedItems.reduce(
                (sum, item) => sum + (item.finalOrnamentsWt || 0),
                0
              )
            : prev[transactionType].totalOrnamentsWt,
        totalStoneWeight:
          transactionType === "received"
            ? updatedItems.reduce(
                (sum, item) => sum + (item.stoneWeight || 0),
                0
              )
            : prev[transactionType].totalStoneWeight,
        totalSubTotal:
          transactionType === "received"
            ? updatedItems.reduce((sum, item) => sum + (item.subTotal || 0), 0)
            : prev[transactionType].totalSubTotal,
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

      const tempId = `new-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const newItem: ReceiptItem = {
        productName: "",
        date: new Date().toISOString().split("T")[0], // Set today's date as default
        _id: tempId, // Generate a temporary ID
        id: tempId, // Also set the id field that backend requires
      };

      if (transactionType === "given") {
        newItem.pureWeight = 0;
        newItem.purePercent = 0;
        newItem.melting = 1;
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

  // Remove item
  const removeItem = (transactionType: "given" | "received", index: number) => {
    setReceipt((prev) => {
      if (!prev) return null;
      const updatedItems = [...prev[transactionType].items];
      updatedItems.splice(index, 1);

      // Recalculate totals
      const totals = {
        total: updatedItems.reduce((sum, item) => sum + (item.total || 0), 0),
        totalPureWeight:
          transactionType === "given"
            ? updatedItems.reduce(
                (sum, item) =>
                  sum +
                  ((item.pureWeight || 0) * (item.purePercent || 0)) / 100,
                0
              )
            : prev[transactionType].totalPureWeight,
        totalOrnamentsWt:
          transactionType === "received"
            ? updatedItems.reduce(
                (sum, item) => sum + (item.finalOrnamentsWt || 0),
                0
              )
            : prev[transactionType].totalOrnamentsWt,
        totalStoneWeight:
          transactionType === "received"
            ? updatedItems.reduce(
                (sum, item) => sum + (item.stoneWeight || 0),
                0
              )
            : prev[transactionType].totalStoneWeight,
        totalSubTotal:
          transactionType === "received"
            ? updatedItems.reduce((sum, item) => sum + (item.subTotal || 0), 0)
            : prev[transactionType].totalSubTotal,
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

  // Calculate balance
  const calculateBalance = () => {
    const givenTotal = Number(receipt?.given?.total) || 0;
    const receivedTotal = Number(receipt?.received?.total) || 0;
    const operation =
      receipt?.manualCalculations?.operation || "subtract-given-received";
    let result: number;
    switch (operation) {
      case "subtract-given-received":
        result = givenTotal - receivedTotal;
        break;
      case "subtract-received-given":
        result = receivedTotal - givenTotal;
        break;
      case "add":
        result = givenTotal + receivedTotal;
        break;
      default:
        result = 0;
    }
    return result;
  };

  // Calculate new client balance as (Given - Received) + Current Balance
  const calculateNewClientBalance = () => {
    if (!receipt) return clientBalance;
    
    const givenTotal = Number(receipt.given?.total) || 0;
    const receivedTotal = Number(receipt.received?.total) || 0;

    return (givenTotal - receivedTotal) + (clientBalance || 0);
  };

  // Handle save
  const handleSave = async () => {
    if (!receipt || !id) return;

    setIsUpdating(true);
    try {
      // Validate inputs
      for (const item of receipt.given.items) {
        if (
          !item.productName ||
          (item.pureWeight || 0) <= 0 ||
          (item.purePercent || 0) <= 0 ||
          (item.melting || 0) <= 0
        ) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description:
              "Please fill all required fields for given items with valid values",
          });
          setIsUpdating(false);
          return;
        }
      }

      for (const item of receipt.received.items) {
        if (
          !item.productName ||
          (item.finalOrnamentsWt || 0) <= 0 ||
          (item.makingChargePercent || 0) < 0
        ) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description:
              "Please fill all required fields for received items with valid values",
          });
          setIsUpdating(false);
          return;
        }
      }

      // Update client balance first
      const newClientBalance = calculateNewClientBalance();
      await clientApi.updateClientBalance(receipt.clientId, newClientBalance);

      // Update receipt status
      const shouldBeComplete =
        receipt.given.items.length > 0 &&
        receipt.received.items.length > 0 &&
        receipt.given.total !== undefined &&
        receipt.received.total !== undefined;

      // Prepare manual calculations
      const manualCalculations = {
        givenTotal: Math.round((Number(receipt.given.total) || 0) * 100) / 100,
        receivedTotal:
          Math.round((Number(receipt.received.total) || 0) * 100) / 100,
        operation:
          receipt.manualCalculations?.operation || "subtract-given-received",
        result: Math.round(calculateBalance() * 100) / 100,
      };

      // Clean up the data to ensure all numeric fields are properly formatted
      const cleanedReceipt = {
        ...receipt,
        status: shouldBeComplete ? "complete" : receipt.status,
        manualCalculations,
        given: {
          ...receipt.given,
          items: receipt.given.items.map((item) => {
            const cleanedItem: any = {
              productName: item.productName,
              pureWeight: Number(item.pureWeight) || 0,
              purePercent: Number(item.purePercent) || 0,
              melting: Number(item.melting) || 0,
              total: Math.round((Number(item.total) || 0) * 100) / 100, // Fix floating point precision
              date: item.date || new Date().toISOString().split("T")[0],
            };

            // Handle _id and id fields properly
            if (
              item._id &&
              !item._id.startsWith("new-") &&
              !item._id.startsWith("temp-")
            ) {
              // Existing item - use the existing _id for both fields
              cleanedItem._id = item._id;
              cleanedItem.id = item._id;
            } else {
              // New item - don't send _id, but generate a temporary id for backend requirement
              const tempId = `temp-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`;
              cleanedItem.id = tempId;
            }

            return cleanedItem;
          }),
          total: Math.round((Number(receipt.given.total) || 0) * 100) / 100,
          totalPureWeight:
            Math.round((Number(receipt.given.totalPureWeight) || 0) * 100) /
            100,
        },
        received: {
          ...receipt.received,
          items: receipt.received.items.map((item) => {
            const cleanedItem: any = {
              productName: item.productName,
              finalOrnamentsWt: Number(item.finalOrnamentsWt) || 0,
              stoneWeight: Number(item.stoneWeight) || 0,
              subTotal: Math.round((Number(item.subTotal) || 0) * 100) / 100,
              makingChargePercent: Number(item.makingChargePercent) || 0,
              total: Math.round((Number(item.total) || 0) * 100) / 100, // Fix floating point precision
              date: item.date || new Date().toISOString().split("T")[0],
            };

            // Handle _id and id fields properly
            if (
              item._id &&
              !item._id.startsWith("new-") &&
              !item._id.startsWith("temp-")
            ) {
              // Existing item - use the existing _id for both fields
              cleanedItem._id = item._id;
              cleanedItem.id = item._id;
            } else {
              // New item - don't send _id, but generate a temporary id for backend requirement
              const tempId = `temp-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`;
              cleanedItem.id = tempId;
            }

            return cleanedItem;
          }),
          total: Math.round((Number(receipt.received.total) || 0) * 100) / 100,
          totalOrnamentsWt:
            Math.round((Number(receipt.received.totalOrnamentsWt) || 0) * 100) /
            100,
          totalStoneWeight:
            Math.round((Number(receipt.received.totalStoneWeight) || 0) * 100) /
            100,
          totalSubTotal:
            Math.round((Number(receipt.received.totalSubTotal) || 0) * 100) /
            100,
        },
      };

      // Remove unnecessary fields that might cause issues
      const { _id, __v, createdAt, updatedAt, ...updateData } = cleanedReceipt;

      await adminReceiptApi.updateAdminReceipt(id, updateData);
      setClientBalance(newClientBalance);

      toast({
        title: "Success",
        description: `Receipt updated successfully. New client balance: ${newClientBalance.toFixed(
          2
        )}`,
      });
      navigate(`/admin-receipts/${id}`);
    } catch (error: any) {
      console.error("Error updating receipt:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update receipt or client balance";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const generatePDF = (receipt: AdminReceipt) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // Helper functions
    const formatNumber = (num: number) => num.toFixed(2);
    const formatDate = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleDateString();
      } catch {
        return "N/A";
      }
    };

    // Draw golden border
    doc.setDrawColor(204, 153, 0); // Golden color
    doc.setLineWidth(3);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

    // Add logo - centered at top
    let currentY = 25;
    try {
      // If you have a logo file, you can add it here
      // doc.addImage(logoBase64, "PNG", pageWidth/2 - 20, 15, 40, 20);
      // currentY = 45;
    } catch (error) {
      console.warn("Logo not found, continuing without logo");
    }

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Work Receipt", pageWidth / 2, currentY, { align: "center" });
    currentY += 10;

    // Receipt ID
    doc.setFontSize(12);
    doc.text(`Receipt ID: ${receipt.voucherId}`, pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 15;

    // Client and Shop Information
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Client:", margin, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(receipt.clientName, margin + 25, currentY);

    doc.setFont("helvetica", "bold");
    doc.text("Shop:", pageWidth / 2, currentY);
    doc.setFont("helvetica", "normal");
    doc.text("Goldsmith Workshop", pageWidth / 2 + 25, currentY);
    currentY += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Date:", margin, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(receipt.createdAt), margin + 25, currentY);

    doc.setFont("helvetica", "bold");
    doc.text("Status:", pageWidth / 2, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(receipt.status, pageWidth / 2 + 25, currentY);
    currentY += 15;

    // Given Items Table
    if (receipt.given.items.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Given Items:", margin, currentY);
      currentY += 8;

      const givenTableData = receipt.given.items.map((item) => [
        item.productName,
        formatNumber(item.pureWeight),
        formatNumber(item.purePercent) + "%",
        formatNumber(item.melting),
        formatNumber(item.total),
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["Product", "Pure Weight", "Pure %", "Melting", "Total"]],
        body: givenTableData,
        theme: "grid",
        headStyles: {
          fillColor: [218, 165, 32], // Golden color
          textColor: 255,
          fontStyle: "bold",
          fontSize: 10,
          halign: "center",
        },
        bodyStyles: {
          fontSize: 9,
          halign: "center",
          textColor: [0, 0, 0],
        },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        columnStyles: {
          0: { halign: "left", cellWidth: 60 },
          1: { cellWidth: 30 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { halign: "right", cellWidth: 30 },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Received Items Table
    if (receipt.received.items.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Received Items:", margin, currentY);
      currentY += 8;

      const receivedTableData = receipt.received.items.map((item) => [
        item.productName,
        formatNumber(item.finalOrnamentsWt),
        formatNumber(item.stoneWeight),
        formatNumber(item.makingChargePercent) + "%",
        formatNumber(item.total),
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["Product", "Final Wt", "Stone Wt", "Making %", "Total"]],
        body: receivedTableData,
        theme: "grid",
        headStyles: {
          fillColor: [218, 165, 32], // Golden color
          textColor: 255,
          fontStyle: "bold",
          fontSize: 10,
          halign: "center",
        },
        bodyStyles: {
          fontSize: 9,
          halign: "center",
          textColor: [0, 0, 0],
        },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        columnStyles: {
          0: { halign: "left", cellWidth: 60 },
          1: { cellWidth: 30 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { halign: "right", cellWidth: 30 },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Summary section
    const balance = calculateBalance();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Summary:", margin, currentY);
    currentY += 10;

    const summaryData = [
      ["Given Total:", formatNumber(receipt.given.total)],
      ["Received Total:", formatNumber(receipt.received.total)],
      ["Balance (Given - Received):", formatNumber(balance)],
    ];

    summaryData.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.text(label, margin + 10, currentY);
      doc.setFont("helvetica", "bold");
      doc.text(value, pageWidth - margin - 10, currentY, { align: "right" });
      currentY += 7;
    });

    // Footer
    const footerY = pageHeight - 30;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Thank you for your business!", pageWidth / 2, footerY + 10, {
      align: "center",
    });

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

  return (
    <div className="container py-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Edit Work Receipt</h1>
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
              readOnly
              className="w-full border rounded px-3 py-2 bg-gray-100"
            />
          </div>
          {/* <div>
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
          </div> */}
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
                    Pure Weight (g)
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Pure %
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Melting
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Total (g)
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Date
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
                        min="0.01"
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
                      <input
                        type="date"
                        value={item.date || ""}
                        onChange={(e) =>
                          handleItemChange(
                            "given",
                            index,
                            "date",
                            e.target.value
                          )
                        }
                        className="w-full border rounded px-2 py-1"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem("given", index)}
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
                    Final Ornaments Wt (g)
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Stone Weight (g)
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Sub Total (g)
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Touch
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Total (g)
                  </th>
                  <th className="py-2 px-4 text-left text-sm font-semibold">
                    Date
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
                      <input
                        type="date"
                        value={item.date || ""}
                        onChange={(e) =>
                          handleItemChange(
                            "received",
                            index,
                            "date",
                            e.target.value
                          )
                        }
                        className="w-full border rounded px-2 py-1"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem("received", index)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={6} className="py-2 px-4 text-right font-medium">
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
              <p className="text-sm text-gray-500">Given Total (g)</p>
              <p className="font-medium">{safeToFixed(receipt.given?.total)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Received Total (g)</p>
              <p className="font-medium">
                {safeToFixed(receipt.received?.total)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                Current Client Balance (g)
              </p>
              <p className="font-medium">{safeToFixed(clientBalance)}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">New Client Balance (g)</p>
              <p className="font-medium">
                {safeToFixed(calculateNewClientBalance())}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
