import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

// Types for our receipt data
interface ReceiptItem {
  productName: string;
  [key: string]: any;
  _id: string;
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
};

const generatePDF = (receipt: AdminReceipt) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let yPos = 20;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GOLDEN ART JEWELLERS", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;
  doc.setFontSize(12);
  doc.text("Admin Receipt", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Receipt info - 2 column layout
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Voucher ID: ${receipt.voucherId}`, margin, yPos);
  doc.text(`Client: ${receipt.clientName}`, pageWidth / 2, yPos);
  yPos += 6;
  doc.text(`Status: ${receipt.status.toUpperCase()}`, margin, yPos);
  doc.text(
    `Created: ${new Date(receipt.createdAt).toLocaleDateString()}`,
    pageWidth / 2,
    yPos
  );
  yPos += 15;

  // Given Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Given Details", margin, yPos);
  yPos += 6;

  const givenHeaders = [
    "No.",
    "Product",
    "Pure Wt.",
    "Pure %",
    "Melting",
    "Total",
  ];
  const givenData = receipt.given.items.map((item, i) => [
    i + 1,
    item.productName || "-",
    item.pureWeight ? Number(item.pureWeight).toFixed(2) : "0.00",
    item.purePercent ? Number(item.purePercent).toFixed(2) : "0.00",
    item.melting ? Number(item.melting).toFixed(2) : "0.00",
    (item.total || 0).toFixed(2),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [givenHeaders],
    body: givenData,
    theme: "grid",
    headStyles: {
      fontStyle: "bold",
      textColor: 0,
      fillColor: 255,
      lineWidth: 0.2,
    },
    styles: {
      fontSize: 9,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: 0,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 40 },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 20, halign: "right" },
    },
    margin: { left: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 2;

  // Given total
  autoTable(doc, {
    startY: yPos,
    body: [
      [
        {
          content: "Total Given:",
          styles: { fontStyle: "bold", halign: "right" },
        },
        {
          content: (receipt.given?.total || 0).toFixed(2),
          styles: { fontStyle: "bold", halign: "right" },
        },
      ],
    ],
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: 0,
    },
    columnStyles: {
      0: { cellWidth: 110, halign: "right" },
      1: { cellWidth: 20, halign: "right" },
    },
    margin: { left: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Received Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Received Details", margin, yPos);
  yPos += 6;

  const receivedHeaders = [
    "No.",
    "Product",
    "Ornaments Wt.",
    "Stone Wt.",
    "Sub Total",
    "Making %",
    "Total",
  ];
  const receivedData = receipt.received.items.map((item, i) => [
    i + 1,
    item.productName || "-",
    item.finalOrnamentsWt ? Number(item.finalOrnamentsWt).toFixed(2) : "0.00",
    item.stoneWeight ? Number(item.stoneWeight).toFixed(2) : "0.00",
    (item.subTotal || 0).toFixed(2),
    item.makingChargePercent
      ? Number(item.makingChargePercent).toFixed(2)
      : "0.00",
    (item.total || 0).toFixed(2),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [receivedHeaders],
    body: receivedData,
    theme: "grid",
    headStyles: {
      fontStyle: "bold",
      textColor: 0,
      fillColor: 255,
      lineWidth: 0.2,
    },
    styles: {
      fontSize: 9,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: 0,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 35 },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 15, halign: "right" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 15, halign: "right" },
      6: { cellWidth: 20, halign: "right" },
    },
    margin: { left: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 2;

  // Received total
  autoTable(doc, {
    startY: yPos,
    body: [
      [
        {
          content: "Total Received:",
          styles: { fontStyle: "bold", halign: "right" },
        },
        {
          content: (receipt.received?.total || 0).toFixed(2),
          styles: { fontStyle: "bold", halign: "right" },
        },
      ],
    ],
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: 0,
    },
    columnStyles: {
      0: { cellWidth: 110, halign: "right" },
      1: { cellWidth: 20, halign: "right" },
    },
    margin: { left: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Balance Summary
  const balance = (receipt.given?.total || 0) - (receipt.received?.total || 0);
  autoTable(doc, {
    startY: yPos,
    body: [
      [
        {
          content: "Balance Summary",
          colSpan: 2,
          styles: {
            fontStyle: "bold",
            fontSize: 12,
            halign: "center",
          },
        },
      ],
      [
        "Given Total",
        {
          content: (receipt.given?.total || 0).toFixed(2),
          styles: { halign: "right" },
        },
      ],
      [
        "Received Total",
        {
          content: (receipt.received?.total || 0).toFixed(2),
          styles: { halign: "right" },
        },
      ],
      [
        {
          content: "Balance (Given - Received)",
          styles: { fontStyle: "bold" },
        },
        {
          content: balance.toFixed(2),
          styles: { fontStyle: "bold", halign: "right" },
        },
      ],
    ],
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineWidth: 0.1,
      lineColor: 0,
    },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 20, halign: "right" },
    },
    margin: { left: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Manual Calculations
  autoTable(doc, {
    startY: yPos,
    body: [
      [
        {
          content: "Manual Calculations",
          colSpan: 4,
          styles: {
            fontStyle: "bold",
            fontSize: 12,
            halign: "center",
          },
        },
      ],
      [
        { content: "Manual Given", styles: { fontStyle: "bold" } },
        {
          content: (receipt.manualCalculations?.givenTotal || 0).toFixed(2),
          styles: { halign: "right" },
        },
        { content: "Operation", styles: { fontStyle: "bold" } },
        {
          content:
            receipt.manualCalculations?.operation?.replace(/-/g, " ") ||
            "subtract given received",
          styles: { fontStyle: "bold" },
        },
      ],
      [
        { content: "Manual Received", styles: { fontStyle: "bold" } },
        {
          content: (receipt.manualCalculations?.receivedTotal || 0).toFixed(2),
          styles: { halign: "right" },
        },
        { content: "Manual Result", styles: { fontStyle: "bold" } },
        {
          content: (receipt.manualCalculations?.result || 0).toFixed(2),
          styles: { fontStyle: "bold", halign: "right" },
        },
      ],
    ],
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineWidth: 0.1,
      lineColor: 0,
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 25, halign: "right" },
      2: { cellWidth: 40 },
      3: { cellWidth: 25, halign: "right" },
    },
    margin: { left: margin },
  });

  // Footer
  yPos = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your business!", pageWidth / 2, yPos, {
    align: "center",
  });
  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Golden Art Jewellers", pageWidth / 2, yPos, { align: "center" });

  // Ensure it fits on one page
  if (yPos > 280) {
    doc.deletePage(2); // Remove any auto-created second page
  }

  doc.save(`receipt-${receipt.voucherId}.pdf`);
};
export default function AdminReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [receipt, setReceipt] = useState<AdminReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch receipt data
  useEffect(() => {
    const fetchReceiptData = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);
      try {
        const data = await adminReceiptApi.getAdminReceiptById(id);
        setReceipt(data);
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

  // Helper to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calculate balance
  const calculateBalance = () => {
    const givenTotal = receipt.given?.total || 0;
    const receivedTotal = receipt.received?.total || 0;
    return (givenTotal - receivedTotal).toFixed(2);
  };

  return (
    <div className="container py-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Admin Receipt View</h1>
            <p className="text-gray-500">Voucher ID: {receipt.voucherId}</p>
            <p className="text-gray-500">
              Client: {receipt.clientName} (ID: {receipt.clientId})
            </p>
            <p className="text-gray-500">
              Status:
              <span
                className={`ml-2 px-2 py-1 rounded-full text-xs capitalize ${
                  receipt.status === "complete"
                    ? "bg-green-100 text-green-800"
                    : receipt.status === "incomplete"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {receipt.status || "unknown"}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/admin-receipts")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
            <Button onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" /> Download Receipt
            </Button>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Given Details Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Given Details</h2>
          <p className="text-gray-600 mb-4">
            Date: {formatDate(receipt.given?.date)}
          </p>

          {receipt.given?.items?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="py-2 px-4 text-left text-sm font-semibold text-center">
                      S.No.
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-center">
                      Product Name
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-center">
                      Pure Weight
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-center">
                      Pure %
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-center">
                      Melting
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-center">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.given.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-4 text-center">{index + 1}</td>
                      <td className="py-2 px-4 text-center">
                        {item.productName || "N/A"}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {item.pureWeight || "0.00"}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {item.purePercent || "0.00"}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {item.melting || "0.00"}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {(item.total || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td
                      colSpan={5}
                      className="py-2 px-4 text-right font-medium"
                    >
                      Total:
                    </td>
                    <td className="py-2 px-4 text-center font-medium">
                      {(receipt.given?.total || 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No given items recorded</p>
          )}
        </div>

        <Separator className="my-6" />

        {/* Received Details Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Received Details</h2>
          <p className="text-gray-600 mb-4">
            Date: {formatDate(receipt.received?.date)}
          </p>

          {receipt.received?.items?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="py-2 px-4 text-left text-sm font-semibold text-center">
                      S.No.
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-center">
                      Product Name
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-center">
                      Final Ornaments (wt)
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-center">
                      Stone Weight
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-center">
                      Sub Total
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-center">
                      Making Charge (%)
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-center">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.received.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-4 text-center">{index + 1}</td>
                      <td className="py-2 px-4 text-center">
                        {item.productName || "N/A"}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {item.finalOrnamentsWt || "0.00"}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {item.stoneWeight || "0.00"}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {(item.subTotal || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {item.makingChargePercent || "0.00"}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {(item.total || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td
                      colSpan={2}
                      className="py-2 px-4 text-right font-medium"
                    >
                      Total:
                    </td>
                    <td className="py-2 px-4 text-center font-medium">
                      {(receipt.received?.totalOrnamentsWt || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-4 text-center font-medium">
                      {(receipt.received?.totalStoneWeight || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-4 text-center font-medium">
                      {(receipt.received?.totalSubTotal || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-4"></td>
                    <td className="py-2 px-4 text-center font-medium">
                      {(receipt.received?.total || 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No received items recorded</p>
          )}
        </div>

        <Separator className="my-6" />

        {/* Balance Summary Section */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Balance Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Given Total</p>
              <p className="font-medium">
                {(receipt.given?.total || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Received Total</p>
              <p className="font-medium">
                {(receipt.received?.total || 0).toFixed(2)}
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

          {/* Manual Calculations Section */}
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Manual Calculations</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-blue-50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Manual Given</p>
                <p className="font-medium">
                  {(receipt.manualCalculations?.givenTotal || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Operation</p>
                <p className="font-medium capitalize">
                  {receipt.manualCalculations?.operation?.replace(/-/g, " ") ||
                    "subtract given received"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Manual Received</p>
                <p className="font-medium">
                  {(receipt.manualCalculations?.receivedTotal || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Manual Result</p>
                <p
                  className={`font-medium ${
                    receipt.manualCalculations?.result > 0
                      ? "text-green-600"
                      : receipt.manualCalculations?.result < 0
                      ? "text-red-600"
                      : ""
                  }`}
                >
                  {(receipt.manualCalculations?.result || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
