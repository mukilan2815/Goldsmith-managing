import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  ArrowLeft,
  Edit,
  FileText,
  Weight,
  Download,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// API configuration
const API_BASE_URL = "https://backend-goldsmith.onrender.com/api";
const CLIENT_RECEIPTS_URL = `${API_BASE_URL}/receipts`;
const ADMIN_RECEIPTS_URL = `${API_BASE_URL}/admin-receipts`;

interface Client {
  _id: string;
  shopName: string;
  clientName: string;
  phoneNumber: string;
  address: string;
  email: string;
  active: boolean;
  createdAt: string;
}

interface AdminReceipt {
  _id: string;
  clientId: string;
  clientName: string;
  voucherId: string;
  status: string;
  given: {
    date: string;
    items: {
      productName: string;
      pureWeight: string;
      purePercent: string;
      melting: string;
      total: number;
      _id: string;
    }[];
    totalPureWeight: number;
    total: number;
  };
  received: {
    date: string;
    items: {
      productName: string;
      finalOrnamentsWt: string;
      stoneWeight: string;
      makingChargePercent: string;
      subTotal: number;
      total: number;
      _id: string;
    }[];
    totalOrnamentsWt: number;
    totalStoneWeight: number;
    totalSubTotal: number;
    total: number;
  };
  createdAt: string;
  updatedAt: string;
  __v: number;
  type: "admin";
}

interface ClientReceipt {
  _id: string;
  voucherId: string;
  clientId: string;
  clientInfo: {
    clientName: string;
    shopName: string;
    phoneNumber: string;
    metalType: string;
  };
  issueDate: string;
  items: Array<{
    itemName: string;
    tag: string;
    grossWt: number;
    stoneWt: number;
    netWt: number;
    meltingTouch: number;
    finalWt: number;
    stoneAmt: number;
    totalInvoiceAmount: number;
  }>;
  totals: {
    grossWt: number;
    stoneWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
    totalInvoiceAmount: number;
    totalPaidAmount: number;
    balanceDue: number;
    paymentStatus: string;
    isCompleted: boolean;
  };
  payments: any[];
  createdAt: string;
  updatedAt: string;
  __v: number;
  type: "client";
}

type Receipt = ClientReceipt | AdminReceipt;

interface ReceiptsTableProps {
  receipts: Receipt[];
  onViewReceipt: (receipt: Receipt) => void;
  onDownloadReceipt: (receiptId: string, type: "client" | "admin") => void;
  onDeleteReceipt: (receiptId: string, type: "client" | "admin") => void;
}

function ReceiptsTable({
  receipts,
  onViewReceipt,
  onDownloadReceipt,
  onDeleteReceipt,
}: ReceiptsTableProps) {
  console.log("Rendering ReceiptsTable with receipts:", receipts);
  if (!receipts || receipts.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No receipts found
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Receipt ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receipts.map((receipt) => (
            <TableRow key={receipt._id}>
              <TableCell className="font-medium">
                #{receipt.voucherId}
              </TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    receipt.type === "admin"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {receipt.type}
                </span>
              </TableCell>
              <TableCell>
                {new Date(
                  receipt.type === "admin"
                    ? receipt.given.date
                    : receipt.issueDate
                ).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {receipt.type === "admin"
                  ? receipt.clientName
                  : receipt.clientInfo.clientName}
              </TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    (
                      receipt.type === "admin"
                        ? receipt.status === "complete"
                        : receipt.totals.paymentStatus === "Paid"
                    )
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {receipt.type === "admin"
                    ? receipt.status
                    : receipt.totals.paymentStatus}
                </span>
              </TableCell>
              <TableCell>
                ₹
                {(receipt.type === "admin"
                  ? receipt.given?.total ?? 0
                  : receipt.totals?.totalInvoiceAmount ?? 0
                ).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onViewReceipt(receipt)}
                    title="View Receipt"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onDownloadReceipt(receipt._id, receipt.type)}
                    title="Download Receipt"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const generatePDF = (receipt: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Header Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`Work Receipt: ${receipt.voucherId || "N/A"}`, margin, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const infoYStart = 28;
  const lineHeight = 7;

  doc.text(`Client: ${receipt.clientName || "N/A"}`, margin, infoYStart);
  doc.text(
    `Status: ${receipt.status || "incomplete"}`,
    margin,
    infoYStart + lineHeight
  );
  doc.text(
    `Date: ${
      receipt.issueDate
        ? new Date(receipt.issueDate).toLocaleDateString()
        : "N/A"
    }`,
    margin,
    infoYStart + lineHeight * 2
  );

  // Given Items Table
  const givenItems = receipt.given?.items || [];
  const givenTotal = Number(receipt.given?.total || 0);
  const receivedItems = receipt.received?.items || [];
  const receivedTotal = Number(receipt.received?.total || 0);
  const balance = givenTotal - receivedTotal;

  const tableY = infoYStart + lineHeight * 3 + 5;

  const givenTableData = givenItems.map((item: any) => [
    item.productName || "—",
    Number(item.pureWeight || 0).toFixed(2),
    Number(item.purePercent || 0).toFixed(2),
    Number(item.melting || 0).toFixed(2),
    Number(item.total || 0).toFixed(2),
  ]);

  const givenTotalRow = [
    "Total",
    givenTotal.toFixed(2),
    "",
    "",
    givenTotal.toFixed(2),
  ];

  givenTableData.push(givenTotalRow);

  autoTable(doc, {
    startY: tableY,
    margin: { left: margin, right: margin },
    head: [["Product", "Pure Weight", "Pure %", "Melting", "Total"]],
    body: givenTableData,
    theme: "grid",
    headStyles: {
      fillColor: [31, 41, 55],
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
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { halign: "right", cellWidth: 25 },
    },
    didDrawCell: (data) => {
      if (data.row.index === givenTableData.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [191, 219, 254]; // Light Blue
        data.cell.styles.textColor = [0, 0, 0]; // Optional: Use black text for contrast
      }
    },
  });

  // Received Items Table (if any)
  if (receivedItems.length > 0) {
    const receivedTableData = receivedItems.map((item: any) => [
      item.productName || "—",
      Number(item.pureWeight || 0).toFixed(2),
      Number(item.purePercent || 0).toFixed(2),
      Number(item.melting || 0).toFixed(2),
      Number(item.total || 0).toFixed(2),
    ]);

    const receivedTotalRow = [
      "Total",
      receivedTotal.toFixed(2),
      "",
      "",
      receivedTotal.toFixed(2),
    ];

    receivedTableData.push(receivedTotalRow);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      margin: { left: margin, right: margin },
      head: [["Product", "Pure Weight", "Pure %", "Melting", "Total"]],
      body: receivedTableData,
      theme: "grid",
      headStyles: {
        fillColor: [31, 41, 55],
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
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { halign: "right", cellWidth: 25 },
      },
      didDrawCell: (data) => {
        if (data.row.index === receivedTableData.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [191, 219, 254]; // Light Blue
          data.cell.styles.textColor = [0, 0, 0]; // Optional: Use black text for contrast
        }
      },
    });
  }

  // Summary Section
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const rowHeight = 8;
  const spacing = 2;
  const lineGap = rowHeight + spacing;

  const drawRow = (label: string, value: string, yPos: number) => {
    doc.setFillColor(248, 250, 252); // #F8FAFC
    doc.rect(margin, yPos, contentWidth, rowHeight, "F");

    doc.setDrawColor(226, 232, 240); // border
    doc.rect(margin, yPos, contentWidth, rowHeight);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(label, margin + 5, yPos + 5.5);

    doc.setFont("helvetica", "bold");
    doc.text(value, pageWidth - margin - 5, yPos + 5.5, { align: "right" });
  };

  drawRow("Given Total", givenTotal.toFixed(2), finalY);
  drawRow("Received Total", receivedTotal.toFixed(2), finalY + lineGap);
  drawRow(
    "Balance (Given - Received)",
    balance.toFixed(2),
    finalY + lineGap * 2
  );

  return doc;
};

export default function ClientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [clientReceipts, setClientReceipts] = useState<ClientReceipt[]>([]);
  const [adminReceipts, setAdminReceipts] = useState<AdminReceipt[]>([]);
  const [stats, setStats] = useState({
    totalReceipts: 0,
    totalValue: "₹0",
    lastTransaction: "N/A",
    totalAdminValue: "₹0",
    totalClientValue: "₹0",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "client" | "admin">("all");

  // Fetch all data
  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch client data
        const clientResponse = await axios.get(`${API_BASE_URL}/clients/${id}`);
        setClient(clientResponse.data);

        // Fetch client receipts
        const clientReceiptsResponse = await axios.get(
          `${CLIENT_RECEIPTS_URL}/client/${id}`
        );
        const clientReceiptsData = clientReceiptsResponse.data.data.map(
          (r: any) => ({
            ...r,
            type: "client",
          })
        );
        setClientReceipts(clientReceiptsData);

        // Fetch Work Receipts for this client
        const adminReceiptsResponse = await axios.get(
          `${ADMIN_RECEIPTS_URL}?clientId=${id}`
        );
        const adminReceiptsData = adminReceiptsResponse.data.map((r: any) => ({
          ...r,
          type: "admin",
        }));
        setAdminReceipts(adminReceiptsData);

        // Calculate stats
        const totalReceipts =
          clientReceiptsData.length + adminReceiptsData.length;

        const totalClientValue = clientReceiptsData.reduce(
          (sum: number, r: ClientReceipt) =>
            sum + (r.totals.totalInvoiceAmount || 0),
          0
        );

        const totalAdminValue = adminReceiptsData.reduce(
          (sum: number, r: AdminReceipt) => sum + (r.received.total || 0),
          0
        );

        const totalValue = totalClientValue + totalAdminValue;

        // Find most recent transaction
        const allReceipts = [...clientReceiptsData, ...adminReceiptsData];
        const sortedByDate = allReceipts.sort((a, b) => {
          const dateA =
            a.type === "admin" ? new Date(a.given.date) : new Date(a.issueDate);
          const dateB =
            b.type === "admin" ? new Date(b.given.date) : new Date(b.issueDate);
          return dateB.getTime() - dateA.getTime();
        });

        const lastTransaction = sortedByDate[0]
          ? sortedByDate[0].type === "admin"
            ? new Date(sortedByDate[0].given.date).toLocaleDateString()
            : new Date(sortedByDate[0].issueDate).toLocaleDateString()
          : "N/A";

        setStats({
          totalReceipts,
          totalValue: `₹${totalValue.toLocaleString()}`,
          lastTransaction,
          totalAdminValue: `₹${totalAdminValue.toLocaleString()}`,
          totalClientValue: `₹${totalClientValue.toLocaleString()}`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, toast]);

  // Filter receipts based on active tab
  const getFilteredReceipts = () => {
    switch (activeTab) {
      case "client":
        return [...clientReceipts].sort(
          (a, b) =>
            new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
        );
      case "admin":
        return [...adminReceipts].sort(
          (a, b) =>
            new Date(b.given.date).getTime() - new Date(a.given.date).getTime()
        );
      default:
        return [...clientReceipts, ...adminReceipts].sort((a, b) => {
          const dateA =
            a.type === "admin" ? new Date(a.given.date) : new Date(a.issueDate);
          const dateB =
            b.type === "admin" ? new Date(b.given.date) : new Date(b.issueDate);
          return dateB.getTime() - dateA.getTime();
        });
    }
  };

  const handleCreateReceipt = (type: "client") => {
    navigate(`/receipts/select-client`);
  };

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setReceiptModalOpen(true);
  };

  const handleDownloadReceipt = async (
    receiptId: string,
    type: "client" | "admin"
  ) => {
    try {
      let doc;
      try {
        if (type === "client") {
          const receipt = clientReceipts.find((r) => r._id === receiptId);
          if (!receipt) throw new Error("Receipt not found");
          doc = generatePDF(receipt);
        } else {
          const receipt = adminReceipts.find((r) => r._id === receiptId);
          if (!receipt) throw new Error("Receipt not found");
          doc = generatePDF(receipt);
        }
      } catch (pdfGenError) {
        console.error("PDF generation error:", pdfGenError);
        toast({
          title: "Download Failed",
          description: "Could not generate receipt (PDF generation error)",
          variant: "destructive",
        });
        return;
      }

      try {
        doc.save(`receipt-${receiptId}.pdf`);
      } catch (saveError) {
        console.error("PDF save error:", saveError);
        toast({
          title: "Download Failed",
          description: "Could not save PDF file",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Download Complete",
        description: "Receipt downloaded successfully",
      });
    } catch (error) {
      console.error("Unknown error in handleDownloadReceipt:", error);
      toast({
        title: "Download Failed",
        description: "Could not generate receipt (unknown error)",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReceipt = async (
    receiptId: string,
    type: "client" | "admin"
  ) => {
    try {
      const url =
        type === "client"
          ? `${CLIENT_RECEIPTS_URL}/${receiptId}`
          : `${ADMIN_RECEIPTS_URL}/${receiptId}`;

      await axios.delete(url);

      // Update the appropriate receipts list
      if (type === "client") {
        setClientReceipts(clientReceipts.filter((r) => r._id !== receiptId));
      } else {
        setAdminReceipts(adminReceipts.filter((r) => r._id !== receiptId));
      }

      // Close modal if open
      if (selectedReceipt?._id === receiptId) {
        setReceiptModalOpen(false);
      }

      toast({
        title: "Success",
        description: "Receipt deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete receipt",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="text-center py-12">Loading client details...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container py-6">
        <div className="text-center py-12 text-destructive">
          Client not found
        </div>
        <div className="text-center">
          <Button onClick={() => navigate("/clients")}>
            Return to Client List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/clients")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
      </Button>

      {/* Client header and actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">{client.shopName}</h1>
          <p className="text-muted-foreground">
            {client.clientName} • {client.phoneNumber}
          </p>
        </div>
        <div className="mt-4 md:mt-0 space-x-2">
          <Button onClick={() => navigate(`/clients/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" /> Edit Client
          </Button>
          <Button
            variant="outline"
            onClick={() => handleCreateReceipt("client")}
          >
            <Plus className="mr-2 h-4 w-4" /> New Shop Receipt
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/admin-receipts/new")}
          >
            <Plus className="mr-2 h-4 w-4" /> New Work Receipt
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Receipts"
          value={stats.totalReceipts}
          description="All receipts"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Total Client Value"
          value={stats.totalClientValue}
          description="Client receipts"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Total Admin Value"
          value={stats.totalAdminValue}
          description="Work Receipts"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Last Transaction"
          value={stats.lastTransaction}
          description="Most recent"
          icon={<FileText className="h-4 w-4" />}
        />
      </div>

      {/* Client info card */}
      <Card className="card-premium mb-8">
        <CardContent className="p-6">
          <h2 className="text-xl font-serif font-medium mb-4">
            Client Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Shop Name</p>
              <p className="font-medium">{client.shopName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Client Name</p>
              <p className="font-medium">{client.clientName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone Number</p>
              <p className="font-medium">{client.phoneNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{client.email || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{client.address || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    client.active
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {client.active ? "Active" : "Inactive"}
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipts table with tabs */}
      <div className="bg-card card-premium rounded-lg p-6">
        <Tabs
          defaultValue="all"
          onValueChange={(value) =>
            setActiveTab(value as "all" | "client" | "admin")
          }
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif font-medium">
              Transaction History
            </h2>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="client">Client</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-0">
            <ReceiptsTable
              receipts={getFilteredReceipts()}
              onViewReceipt={handleViewReceipt}
              onDownloadReceipt={handleDownloadReceipt}
              onDeleteReceipt={handleDeleteReceipt}
            />
          </TabsContent>

          <TabsContent value="client" className="mt-0">
            <ReceiptsTable
              receipts={getFilteredReceipts()}
              onViewReceipt={handleViewReceipt}
              onDownloadReceipt={handleDownloadReceipt}
              onDeleteReceipt={handleDeleteReceipt}
            />
          </TabsContent>

          <TabsContent value="admin" className="mt-0">
            <ReceiptsTable
              receipts={getFilteredReceipts()}
              onViewReceipt={handleViewReceipt}
              onDownloadReceipt={handleDownloadReceipt}
              onDeleteReceipt={handleDeleteReceipt}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Receipt details modal */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
            <DialogDescription>
              {selectedReceipt?.type === "admin" ? "Work " : "Client "}
              Receipt #{selectedReceipt?.voucherId || "N/A"} from{" "}
              {selectedReceipt?.type === "admin"
                ? new Date(selectedReceipt.given.date).toLocaleDateString()
                : selectedReceipt?.issueDate
                ? new Date(selectedReceipt.issueDate).toLocaleDateString()
                : "N/A"}
            </DialogDescription>
          </DialogHeader>

          {selectedReceipt && (
            <div className="mt-4">
              <div className="border rounded-lg p-6 mb-6 text-left">
                <h2 className="text-xl font-semibold mb-2">
                  {selectedReceipt.type === "admin" ? "Work" : "Client"}{" "}
                  Receipt: #{selectedReceipt.voucherId}
                </h2>
                <p className="text-sm">
                  Client:{" "}
                  {selectedReceipt.type === "admin"
                    ? selectedReceipt.clientName
                    : selectedReceipt.clientInfo.clientName}
                </p>
                <p className="text-sm">
                  Status:{" "}
                  {selectedReceipt.type === "admin"
                    ? selectedReceipt.status
                    : selectedReceipt.totals?.paymentStatus || "N/A"}
                </p>
                <p className="text-sm mb-4">
                  Date:{" "}
                  {new Date(
                    selectedReceipt.type === "admin"
                      ? selectedReceipt.given?.date
                      : selectedReceipt.issueDate
                  ).toLocaleDateString()}
                </p>

                {selectedReceipt.type === "admin" ? (
                  <>
                    <table className="w-full border border-collapse mb-4">
                      <thead>
                        <tr className="bg-blue-700 text-white text-sm">
                          <th className="border px-4 py-2">Product</th>
                          <th className="border px-4 py-2">Pure Weight</th>
                          <th className="border px-4 py-2">Pure %</th>
                          <th className="border px-4 py-2">Melting</th>
                          <th className="border px-4 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReceipt.given.items.map((item, index) => (
                          <tr key={index} className="text-center text-sm">
                            <td className="border px-4 py-2">
                              {item.productName}
                            </td>
                            <td className="border px-4 py-2">
                              {Number(item.pureWeight).toFixed(2)}
                            </td>
                            <td className="border px-4 py-2">
                              {Number(item.purePercent).toFixed(2)}
                            </td>
                            <td className="border px-4 py-2">
                              {Number(item.melting).toFixed(2)}
                            </td>
                            <td className="border px-4 py-2">
                              {Number(item.total).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-blue-700 text-white text-sm font-semibold">
                          <td
                            className="border px-4 py-2 text-center"
                            colSpan={4}
                          >
                            Total
                          </td>
                          <td className="border px-4 py-2 text-center">
                            {Number(selectedReceipt.given.total).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="text-sm w-full">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-gray-50 p-4 border">
                        <div className="flex justify-between">
                          <span>Given Total</span>
                          <span>
                            {Number(selectedReceipt.given.total).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Received Total</span>
                          <span>
                            {Number(
                              selectedReceipt.received?.total || 0
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Balance (Given - Received)</span>
                          <span>
                            {(
                              Number(selectedReceipt.given.total) -
                              Number(selectedReceipt.received?.total || 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <table className="w-full border border-collapse mb-4">
                      <thead>
                        <tr className="bg-blue-700 text-white text-sm">
                          <th className="border px-4 py-2">Item Name</th>
                          <th className="border px-4 py-2">Tag</th>
                          <th className="border px-4 py-2">Gross Wt</th>
                          <th className="border px-4 py-2">Stone Wt</th>
                          <th className="border px-4 py-2">Net Wt</th>
                          <th className="border px-4 py-2">Melting %</th>
                          <th className="border px-4 py-2">Final Wt</th>
                          <th className="border px-4 py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReceipt.items.map((item, index) => (
                          <tr key={index} className="text-center text-sm">
                            <td className="border px-4 py-2">
                              {item.itemName}
                            </td>
                            <td className="border px-4 py-2">{item.tag}</td>
                            <td className="border px-4 py-2">
                              {item.grossWt}g
                            </td>
                            <td className="border px-4 py-2">
                              {item.stoneWt}g
                            </td>
                            <td className="border px-4 py-2">{item.netWt}g</td>
                            <td className="border px-4 py-2">
                              {item.meltingTouch}%
                            </td>
                            <td className="border px-4 py-2">
                              {item.finalWt}g
                            </td>
                            <td className="border px-4 py-2">
                              ₹{item.totalInvoiceAmount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-blue-700 text-white text-sm font-semibold">
                          <td
                            className="border px-4 py-2 text-center"
                            colSpan={7}
                          >
                            Total
                          </td>
                          <td className="border px-4 py-2 text-center">
                            ₹
                            {selectedReceipt.totals.totalInvoiceAmount.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="text-sm w-full">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 border">
                        <div className="flex justify-between">
                          <span>Total Gross Weight:</span>
                          <span>{selectedReceipt.totals.grossWt}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Stone Weight:</span>
                          <span>{selectedReceipt.totals.stoneWt}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Final Weight:</span>
                          <span>{selectedReceipt.totals.finalWt}g</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>TOTAL VALUE:</span>
                          <span>
                            ₹
                            {selectedReceipt.totals.totalInvoiceAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDeleteReceipt(
                      selectedReceipt._id,
                      selectedReceipt.type
                    );
                    setReceiptModalOpen(false);
                  }}
                >
                  Delete Receipt
                </Button>
                <Button
                  onClick={() =>
                    handleDownloadReceipt(
                      selectedReceipt._id,
                      selectedReceipt.type
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
