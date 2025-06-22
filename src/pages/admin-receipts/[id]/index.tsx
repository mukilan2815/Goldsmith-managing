import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

// Types for our receipt data
interface ReceiptItem {
  productName: string;
  pureWeight?: number | string;
  purePercent?: number | string;
  melting?: number | string;
  total?: number | string;
  finalOrnamentsWt?: number | string;
  stoneWeight?: number | string;
  subTotal?: number | string;
  makingChargePercent?: number | string;
  _id: string;
}

interface TransactionDetails {
  date: string;
  items: ReceiptItem[];
  total?: number | string;
  totalPureWeight?: number | string;
  totalOrnamentsWt?: number | string;
  totalStoneWeight?: number | string;
  totalSubTotal?: number | string;
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
    givenTotal: number | string;
    receivedTotal: number | string;
    operation: string;
    result: number | string;
  };
}

// Interface for client details fetched from /api/clients/:id
interface ClientDetails {
  _id: string;
  shopName: string;
  clientName: string;
  phoneNumber: string;
  address: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  getClientById: async (clientId: string): Promise<ClientDetails> => {
    try {
      const response = await api.get(`/clients/${clientId}`);
      return response.data as ClientDetails;
    } catch (error) {
      console.error(`Error fetching client ${clientId}:`, error);
      throw error;
    }
  },
};

// Helper to convert a value to a number and format it with toFixed
const formatNumber = (
  value: number | string | undefined,
  decimals: number = 3
): string => {
  if (value === undefined || value === null) return "0.000";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? "0.000" : num.toFixed(decimals);
};

// Updated generatePDF function to use client details
const generatePDF = (receipt: AdminReceipt, client: ClientDetails | null) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  // Set golden border (approximating the color from the image)
  doc.setDrawColor(204, 153, 0); // Golden border color (RGB)
  doc.setLineWidth(1);
  doc.rect(5, 5, 200, 287); // A4 page border (210x297 mm, with 5mm margin)

  // Add logo at the top center
  const logoPath = "/logo.jpg"; // Using the provided logo path
  doc.addImage(logoPath, "JPEG", 85, 5, 40, 20); // Centered logo, adjusted size to fit design

  // Dynamic Fields (aligned with design)
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0); // Black text
  let y = 35;
  const marginLeft = 25;

  // Use client details for Name, Shop, and Phone Number with bold side titles
  doc.setFont("helvetica", "bold");
  doc.text("Name", marginLeft, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    `: ${client?.clientName || receipt.clientName || "-"}`,
    marginLeft + 35,
    y
  );
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Shop", marginLeft, y);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${client?.shopName || "-"}`, marginLeft + 35, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Phone Number", marginLeft, y);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${client?.phoneNumber || "-"}`, marginLeft + 35, y);
  y += 6;

  // Given Date Section
  y = 65;
  doc.setFontSize(12);
  doc.setFont("helvetica", "thin");
  const givenDate = receipt.given?.date
    ? new Date(receipt.given.date)
        .toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
        .toUpperCase()
    : "-";
  doc.setFont("helvetica", "bold");
  doc.text("Given Date :", marginLeft, y);
  doc.setFont("helvetica", "normal");
  doc.text(givenDate, marginLeft + doc.getTextWidth("Given Date : ") + 1, y);

  // First Table (Given Items)
  const givenItems = Array.isArray(receipt.given?.items)
    ? receipt.given.items
    : [];
  autoTable(doc, {
    startY: y + 3,
    head: [
      ["S.NO", "Product Name", "Pure(wt)", "Pure%", "Melting", "Total", "Tag"],
    ],
    body: givenItems.map((item, index) => [
      index + 1,
      item.productName || "-",
      formatNumber(item.pureWeight),
      formatNumber(item.purePercent),
      formatNumber(item.melting),
      formatNumber(item.total),
      item.tag || "—",
    ]),
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 1, textColor: [0, 0, 0] },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineWidth: 0.1, // Thin border for head
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      lineWidth: 0.1, // Match border thickness with head
      lineColor: [0, 0, 0],
    },
    margin: { left: marginLeft, right: 15 },
    columnStyles: {
      0: { cellWidth: 15 }, // S.NO
      1: { cellWidth: 40 }, // Product Name
      2: { cellWidth: 25 }, // Pure(wt)
      3: { cellWidth: 25 }, // Pure%
      4: { cellWidth: 25 }, // Melting
      5: { cellWidth: 25 }, // Total
      6: { cellWidth: 25 }, // Tag
    },
  });
  // Received Date Section
  let newY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "thin");
  const receivedDate = receipt.given?.date
    ? new Date(receipt.given.date)
        .toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
        .toUpperCase()
    : "-";
  doc.setFont("helvetica", "bold");
  doc.text("Received Date :", marginLeft, newY);
  doc.setFont("helvetica", "normal");
  doc.text(
    receivedDate,
    marginLeft + doc.getTextWidth("Received Date : ") + 1,
    newY
  );

  // Second Table (Received Items)
  const receivedItems = Array.isArray(receipt.received?.items)
    ? receipt.received.items
    : [];
  autoTable(doc, {
    startY: newY + 3,
    head: [
      [
        "S.NO",
        "Product Name",
        "Final Ornament(wt)",
        "Stone Weight",
        "sub total",
        "Making Charge(%)",
        "MC",
        "Total",
      ],
    ],
    body: receivedItems.map((item, index) => [
      index + 1,
      item.productName || "-",
      formatNumber(item.finalOrnamentsWt),
      formatNumber(item.stoneWeight),
      formatNumber(item.subTotal),
      formatNumber(item.makingChargePercent, 2),
      formatNumber(Number(item.total) - Number(item.subTotal)),
      formatNumber(item.total),
    ]),
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2, textColor: [0, 0, 0] },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineWidth: 0.1, // Thin border for head
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      lineWidth: 0.1, // Match border thickness with head
      lineColor: [0, 0, 0],
    },
    margin: { left: marginLeft, right: 15 },
    columnStyles: {
      0: { cellWidth: 15 }, // S.NO
      1: { cellWidth: 30 }, // Product Name
      2: { cellWidth: 30 }, // Final Ornament(wt)
      3: { cellWidth: 25 }, // Stone Weight
      4: { cellWidth: 20 }, // sub total
      5: { cellWidth: 25 }, // Making Charge(%)
      6: { cellWidth: 20 }, // MC
      7: { cellWidth: 20 }, // Total
    },
  });

  // Totals Section (Right-aligned as in the image)
  let finalY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const totalsX = pageWidth - 80;
  doc.text(
    `Given Total        : ${formatNumber(
      receipt.manualCalculations?.givenTotal
    )}`,
    totalsX,
    finalY
  );
  finalY += 6;
  doc.text(
    `Received Total   : ${formatNumber(
      receipt.manualCalculations?.receivedTotal
    )}`,
    totalsX,
    finalY
  );
  finalY += 6;
  doc.text(
    `Result                 : ${formatNumber(
      receipt.manualCalculations?.result
    )}`,
    totalsX,
    finalY
  );

  // Footer (aligned with the design)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const footerGap = 15;
  const footer1 = "Antiques";
  const footer2 = "Jewellery Manufacturers";
  const textWidth1 = doc.getTextWidth(footer1);
  const textWidth2 = doc.getTextWidth(footer2);
  // Calculate X so that text is centered at the right corner (with footerGap from right edge)
  const x1 = pageWidth - footerGap - textWidth1 / 2 - 13; // Move "Antiques" 10 units left
  const x2 = pageWidth - footerGap - textWidth2 / 2;
  // Centered at right corner
  doc.text(footer1, x1, 265, { align: "center" });
  doc.text(footer2, x2, 270, { align: "center" });

  // Save the PDF
  doc.save(
    `receipt_${client?.clientName || receipt.clientName || "unknown"}.pdf`
  );
};

export default function AdminReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [receipt, setReceipt] = useState<AdminReceipt | null>(null);
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch receipt and client data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);
      try {
        // Fetch receipt data
        const receiptData = await adminReceiptApi.getAdminReceiptById(id);
        setReceipt(receiptData); // Fixed syntax error: removed space between set and Receipt

        // Fetch client data using clientId from receipt
        if (receiptData?.clientId) {
          const clientData = await adminReceiptApi.getClientById(
            receiptData.clientId
          );
          setClient(clientData);
        } else {
          throw new Error("Client ID not found in receipt");
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

  const handleDownloadPDF = () => {
    if (!receipt) return;
    try {
      generatePDF(receipt, client);
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
    const givenTotal = parseFloat(String(receipt.given?.total || 0));
    const receivedTotal = parseFloat(String(receipt.received?.total || 0));
    return (givenTotal - receivedTotal).toFixed(3);
  };

  return (
    <div className="container py-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Work Receipt View</h1>
            <p className="text-gray-500">Voucher ID: {receipt.voucherId}</p>
            <p className="text-gray-500">
              Client: {client?.clientName || receipt.clientName} (ID:{" "}
              {receipt.clientId})
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
                    <th className="py-2 px-4 text-sm font-semibold text-center">
                      S.No.
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center">
                      Product Name
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center">
                      Pure Weight
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center">
                      Pure %
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center">
                      Melting
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center">
                      Total
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center">
                      Tag
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
                        {formatNumber(item.pureWeight)}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {formatNumber(item.purePercent)}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {formatNumber(item.melting)}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {formatNumber(item.total)}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {item.tag || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td
                      colSpan={6}
                      className="py-2 px-4 text-right font-medium"
                    >
                      Total:
                    </td>
                    <td className="py-2 px-4 text-center font-medium">
                      {formatNumber(receipt.given?.total)}
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
                    <th className="py-2 px-4 text-sm font-semibold text-center">
                      S.No.
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center">
                      Product Name
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center">
                      Final Ornaments (wt)
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center">
                      Stone Weight
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center">
                      Sub Total
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center">
                      Making Charge (%)
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center">
                      MC
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center">
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
                        {formatNumber(item.finalOrnamentsWt)}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {formatNumber(item.stoneWeight)}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {formatNumber(item.subTotal)}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {formatNumber(item.makingChargePercent, 2)}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {formatNumber(
                          Number(item.total) - Number(item.subTotal)
                        )}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {formatNumber(item.total)}
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
                      {formatNumber(receipt.received?.totalOrnamentsWt)}
                    </td>
                    <td className="py-2 px-4 text-center font-medium">
                      {formatNumber(receipt.received?.totalStoneWeight)}
                    </td>
                    <td className="py-2 px-4 text-center font-medium">
                      {formatNumber(receipt.received?.totalSubTotal)}
                    </td>
                    <td className="py-2 px-4"></td>
                    <td className="py-2 px-4"></td>
                    <td className="py-2 px-4 text-center font-medium">
                      {formatNumber(receipt.received?.total)}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">OD Balance</p>
              <p className="font-medium">
                {client && typeof client.balance === "number"
                  ? client.balance.toFixed(2)
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Given Total</p>
              <p className="font-medium">
                {formatNumber(receipt.given?.total)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Received Total</p>
              <p className="font-medium">
                {formatNumber(receipt.received?.total)}
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
                  {formatNumber(receipt.manualCalculations?.givenTotal)}
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
                  {formatNumber(receipt.manualCalculations?.receivedTotal)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Manual Result</p>
                <p
                  className={`font-medium ${
                    parseFloat(String(receipt.manualCalculations?.result)) > 0
                      ? "text-green-600"
                      : parseFloat(String(receipt.manualCalculations?.result)) <
                        0
                      ? "text-red-600"
                      : ""
                  }`}
                >
                  {formatNumber(receipt.manualCalculations?.result)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
