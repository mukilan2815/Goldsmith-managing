import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

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
  pureWeight?: number | string;
  purePercent?: number | string;
  melting?: number | string;
  total?: number | string;
  finalOrnamentsWt?: number | string;
  stoneWeight?: number | string;
  subTotal?: number | string;
  makingChargePercent?: number | string;
  date?: string;
  tag?: string;
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
  balance?: number;
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

// Helper to format date
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Updated generatePDF function to use client details
const generatePDF = async (
  receipt: AdminReceipt,
  client: ClientDetails | null
) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  // Set golden border (approximating the color from the image)
  doc.setDrawColor(204, 153, 0); // Golden border color (RGB)
  doc.setLineWidth(1);
  doc.rect(5, 5, 200, 287); // A4 page border (210x297 mm, with 5mm margin)

  // Add logo at the top center
  const logoPath = "/logo.jpg"; // Using the provided logo path
  try {
    doc.addImage(logoPath, "JPEG", 85, 5, 40, 20); // Centered logo, adjusted size to fit design
  } catch (logoError) {
    console.warn("Logo not found, continuing without logo");
  }

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

  // Given Details Section
  y = 65;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Given Details", marginLeft, y);
  y += 5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const givenDate = receipt.given?.date
    ? new Date(receipt.given.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";
  doc.text(`Date: ${givenDate}`, marginLeft, y);
  y += 2;

  // First Table (Given Items)
  const givenItems = Array.isArray(receipt.given?.items)
    ? receipt.given.items
    : [];

  const givenTableBody = givenItems.map((item, index) => [
    index + 1,
    item.productName || "-",
    formatNumber(item.pureWeight),
    formatNumber(item.purePercent),
    formatNumber(item.melting),
    formatNumber(item.total),
    item.date ? format(new Date(item.date), "dd/MM/yyyy") : "—",
  ]);

  // Add totals row
  givenTableBody.push([
    "",
    "Total:",
    "",
    "",
    "",
    formatNumber(receipt.given?.total),
    "",
  ]);

  autoTable(doc, {
    startY: y + 3,
    head: [
      ["S.NO", "Product Name", "Pure(wt)", "Pure%", "Melting", "Total", "Date"],
    ],
    body: givenTableBody,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0] },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    didParseCell: function (data) {
      // Make the totals row bold
      if (data.row.index === givenTableBody.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
    margin: { left: 15, right: 25 },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 35 },
      2: { cellWidth: 22 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
    },
  });

  // Received Details Section
  let newY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Received Details", marginLeft, newY);
  newY += 5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const receivedDate = receipt.received?.date
    ? new Date(receipt.received.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";
  doc.text(`Date: ${receivedDate}`, marginLeft, newY);
  newY += 2;

  // Second Table (Received Items)
  const receivedItems = Array.isArray(receipt.received?.items)
    ? receipt.received.items
    : [];

  const receivedTableBody = receivedItems.map((item, index) => [
    index + 1,
    item.productName || "-",
    item.date ? format(new Date(item.date), "dd/MM/yyyy") : "—",
    formatNumber(item.finalOrnamentsWt),
    formatNumber(item.stoneWeight),
    formatNumber(item.makingChargePercent, 2),
    formatNumber(Number(item.total) - Number(item.subTotal)),
    formatNumber(item.subTotal),
    formatNumber(item.total),
  ]);

  // Add totals row for received items
  receivedTableBody.push([
    "",
    "Total:",
    "",
    formatNumber(receipt.received?.totalOrnamentsWt),
    formatNumber(receipt.received?.totalStoneWeight),
    "",
    "",
    formatNumber(receipt.received?.totalSubTotal),
    formatNumber(receipt.received?.total),
  ]);

  autoTable(doc, {
    startY: newY + 3,
    head: [
      [
        "S.NO",
        "Product Name",
        "Date",
        "Final Ornament(wt)",
        "Stone Weight",
        "Touch",
        "MC",
        "Subtotal",
        "Total",
      ],
    ],
    body: receivedTableBody,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0] },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    didParseCell: function (data) {
      // Make the totals row bold
      if (data.row.index === receivedTableBody.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
    margin: { left: 15, right: 25 },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 20 },
      2: { cellWidth: 18 },
      3: { cellWidth: 20 },
      4: { cellWidth: 17 },
      5: { cellWidth: 15 },
      6: { cellWidth: 15 },
      7: { cellWidth: 17 },
      8: { cellWidth: 19 },
    },
  });

  // Balance Summary Section with horizontal table layout
  let finalY = (doc as any).lastAutoTable.finalY + 10;

  // Balance Summary Table - Horizontal Layout
  const balanceHeaders = [
    "OD Balance",
    "Given Total",
    "Received Total",
    "(Given - Received)+Balance",
  ];

  const balanceValues = [
    formatNumber(client?.balance || 0, 2),
    formatNumber(receipt.given?.total),
    formatNumber(receipt.received?.total),
    formatNumber(
      (client?.balance || 0) + Number(receipt.given?.total || 0) - Number(receipt.received?.total || 0),
      3
    ),
  ];

  autoTable(doc, {
    startY: finalY,
    head: [balanceHeaders],
    body: [balanceValues],
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 2,
      textColor: [0, 0, 0],
      halign: "center",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      halign: "center",
    },
    bodyStyles: {
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 45, fontStyle: "bold", fillColor: [240, 240, 240] },
    },
    margin: { left: 15, right: 25 },
  });

  // Manual Calculations Section with horizontal table layout
  // finalY = (doc as any).lastAutoTable.finalY + 8;

  // const manualHeaders = [
  //   "Manual Given",
  //   "Operation",
  //   "Manual Received",
  //   "Manual Result",
  // ];

  // const manualValues = [
  //   formatNumber(receipt.manualCalculations?.givenTotal),
  //   receipt.manualCalculations?.operation?.replace(/-/g, " ") ||
  //     "subtract given received",
  //   formatNumber(receipt.manualCalculations?.receivedTotal),
  //   formatNumber(receipt.manualCalculations?.result),
  // ];

  // autoTable(doc, {
  //   startY: finalY,
  //   head: [manualHeaders],
  //   body: [manualValues],
  //   theme: "grid",
  //   styles: {
  //     fontSize: 9,
  //     cellPadding: 2,
  //     textColor: [0, 0, 0],
  //     halign: "center",
  //   },
  //   headStyles: {
  //     fillColor: [255, 255, 255],
  //     textColor: [0, 0, 0],
  //     fontStyle: "bold",
  //     lineWidth: 0.1,
  //     lineColor: [0, 0, 0],
  //     halign: "center",
  //   },
  //   bodyStyles: {
  //     lineWidth: 0.1,
  //     lineColor: [0, 0, 0],
  //     halign: "center",
  //   },
  //   columnStyles: {
  //     0: { cellWidth: 35 },
  //     1: { cellWidth: 40 },
  //     2: { cellWidth: 35 },
  //     3: { cellWidth: 40, fontStyle: "bold", fillColor: [240, 240, 240] },
  //   },
  //   margin: { left: 15, right: 25 },
  // });

  // Save the PDF
  const fileName = `receipt_${
    client?.clientName?.replace(/[^a-zA-Z0-9]/g, "_") ||
    receipt.clientName?.replace(/[^a-zA-Z0-9]/g, "_") ||
    "unknown"
  }.pdf`;
  doc.save(fileName);
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

  const handleDownloadPDF = async () => {
    if (!receipt) return;
    try {
      await generatePDF(receipt, client);
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
    const givenTotal = parseFloat(String(receipt.given?.total || 0));
    const receivedTotal = parseFloat(String(receipt.received?.total || 0));
    return (givenTotal - receivedTotal).toFixed(3);
  };

  return (
    <div className="container py-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Work Receipt View</h1>
            <p className="text-gray-500">Voucher ID: {receipt.voucherId}</p>
            <p className="text-gray-500">
              Work Receipt for: {client?.clientName || receipt.clientName}
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

        {/* Given Items Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Given Items</h2>

          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">
              Given Details (Client: {client?.clientName || receipt.clientName})
            </h3>
            <p className="text-gray-600 mb-4">
              {receipt.given?.date
                ? format(new Date(receipt.given.date), "MMMM do, yyyy")
                : format(new Date(), "MMMM do, yyyy")}
            </p>
          </div>

          {receipt.given?.items?.length ? (
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="py-2 px-4 text-sm font-semibold text-left border">
                      Product Name
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Date
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Pure Weight (g)
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Pure %
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Melting
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Total (g)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.given.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-4 border">
                        {item.productName || "Product Name"}
                      </td>
                      <td className="py-2 px-4 text-center border">
                        {item.date
                          ? format(new Date(item.date), "dd-MM-yyyy")
                          : format(new Date(), "dd-MM-yyyy")}
                      </td>
                      <td className="py-2 px-4 text-center border">
                        {formatNumber(item.pureWeight)}
                      </td>
                      <td className="py-2 px-4 text-center border">
                        {formatNumber(item.purePercent)}
                      </td>
                      <td className="py-2 px-4 text-center border">
                        {formatNumber(item.melting)}
                      </td>
                      <td className="py-2 px-4 text-center border">
                        {formatNumber(item.total, 2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-medium">
                    <td className="py-2 px-4 border">Totals</td>
                    <td className="py-2 px-4 text-center border">-</td>
                    <td className="py-2 px-4 text-center border">
                      {formatNumber(receipt.given?.totalPureWeight, 2)}
                    </td>
                    <td className="py-2 px-4 text-center border">-</td>
                    <td className="py-2 px-4 text-center border">-</td>
                    <td className="py-2 px-4 text-center border">
                      {formatNumber(receipt.given?.total, 2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="py-2 px-4 text-sm font-semibold text-left border">
                      Product Name
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Date
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Pure Weight (g)
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Pure %
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Melting
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Total (g)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 px-4 border">Product Name</td>
                    <td className="py-2 px-4 text-center border">
                      {format(new Date(), "dd-MM-yyyy")}
                    </td>
                    <td className="py-2 px-4 text-center border">
                      Pure Weight
                    </td>
                    <td className="py-2 px-4 text-center border">Pure %</td>
                    <td className="py-2 px-4 text-center border">Melting</td>
                    <td className="py-2 px-4 text-center border">0.00</td>
                  </tr>
                  <tr className="bg-gray-50 font-medium">
                    <td className="py-2 px-4 border">Totals</td>
                    <td className="py-2 px-4 text-center border">-</td>
                    <td className="py-2 px-4 text-center border">0.00</td>
                    <td className="py-2 px-4 text-center border">-</td>
                    <td className="py-2 px-4 text-center border">-</td>
                    <td className="py-2 px-4 text-center border">0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Given Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Totals</p>
              <p className="font-medium">
                {formatNumber(receipt.given?.total)} g
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">OD Balance</p>
              <p className="font-medium">
                {client && typeof client.balance === "number"
                  ? client.balance.toFixed(3)
                  : "0.000"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Calculation</p>
              <p className="font-medium">
                {formatNumber(receipt.given?.total)} +{" "}
                {client && typeof client.balance === "number"
                  ? client.balance.toFixed(3)
                  : "0.000"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Final Given Total</p>
              <p className="font-medium">
                {formatNumber(
                  Number(receipt.given?.total || 0) +
                    Number(client?.balance || 0)
                )}
              </p>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Received Items Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Received Items</h2>

          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">
              Received Details (Client:{" "}
              {client?.clientName || receipt.clientName})
            </h3>
            <p className="text-gray-600 mb-4">
              {receipt.received?.date
                ? format(new Date(receipt.received.date), "MMMM do, yyyy")
                : format(new Date(), "MMMM do, yyyy")}
            </p>
          </div>

          {receipt.received?.items?.length ? (
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="py-2 px-4 text-sm font-semibold text-left border">
                      Product Name
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Date
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Final Ornaments Wt (g)
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Stone Weight (g)
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Touch
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      MC
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Subtotal (g)
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Total (g)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.received.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-4 border">
                        {item.productName || "Product Name"}
                      </td>
                      <td className="py-2 px-4 text-center border">
                        {item.date
                          ? format(new Date(item.date), "dd-MM-yyyy")
                          : format(new Date(), "dd-MM-yyyy")}
                      </td>
                      <td className="py-2 px-4 text-center border">
                        {formatNumber(item.finalOrnamentsWt)}
                      </td>
                      <td className="py-2 px-4 text-center border">
                        {formatNumber(item.stoneWeight)}
                      </td>
                      <td className="py-2 px-4 text-center border">
                        {formatNumber(item.makingChargePercent, 2)}
                      </td>
                      <td className="py-2 px-4 text-center border">
                        {formatNumber(
                          Number(item.total) - Number(item.subTotal),
                          2
                        )}
                      </td>
                      <td className="py-2 px-4 text-center border">
                        {formatNumber(item.subTotal, 2)}
                      </td>
                      <td className="py-2 px-4 text-center border">
                        {formatNumber(item.total, 2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-medium">
                    <td className="py-2 px-4 border">Totals</td>
                    <td className="py-2 px-4 text-center border">-</td>
                    <td className="py-2 px-4 text-center border">
                      {formatNumber(receipt.received?.totalOrnamentsWt, 2)}
                    </td>
                    <td className="py-2 px-4 text-center border">
                      {formatNumber(receipt.received?.totalStoneWeight, 2)}
                    </td>
                    <td className="py-2 px-4 text-center border">-</td>
                    <td className="py-2 px-4 text-center border">0.00</td>
                    <td className="py-2 px-4 text-center border">
                      {formatNumber(receipt.received?.totalSubTotal, 2)}
                    </td>
                    <td className="py-2 px-4 text-center border">
                      {formatNumber(receipt.received?.total, 2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="py-2 px-4 text-sm font-semibold text-left border">
                      Product Name
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Date
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Final Ornaments Wt (g)
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Stone Weight (g)
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Touch
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      MC
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Subtotal (g)
                    </th>
                    <th className="py-2 px-4 text-sm font-semibold text-center border">
                      Total (g)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 px-4 border">Product Name</td>
                    <td className="py-2 px-4 text-center border">
                      {format(new Date(), "dd-MM-yyyy")}
                    </td>
                    <td className="py-2 px-4 text-center border">
                      Final Ornaments Wt
                    </td>
                    <td className="py-2 px-4 text-center border">0</td>
                    <td className="py-2 px-4 text-center border">Touch</td>
                    <td className="py-2 px-4 text-center border">0.00</td>
                    <td className="py-2 px-4 text-center border">0.00</td>
                    <td className="py-2 px-4 text-center border">0.00</td>
                  </tr>
                  <tr className="bg-gray-50 font-medium">
                    <td className="py-2 px-4 border">Totals</td>
                    <td className="py-2 px-4 text-center border">-</td>
                    <td className="py-2 px-4 text-center border">0.00</td>
                    <td className="py-2 px-4 text-center border">0.00</td>
                    <td className="py-2 px-4 text-center border">-</td>
                    <td className="py-2 px-4 text-center border">0.00</td>
                    <td className="py-2 px-4 text-center border">0.00</td>
                    <td className="py-2 px-4 text-center border">0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Received Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-blue-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Totals</p>
              <p className="font-medium">
                {formatNumber(receipt.received?.total)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className="font-medium">
                {client && typeof client.balance === "number"
                  ? client.balance.toFixed(3)
                  : "0.000"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Calculation</p>
              <p className="font-medium">
                {formatNumber(receipt.given?.total)} -{" "}
                {formatNumber(receipt.received?.total)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Final Received Total</p>
              <p className="font-medium">{calculateBalance()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
