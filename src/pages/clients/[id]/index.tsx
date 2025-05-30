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
import { ArrowLeft, Edit, FileText, Weight, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
                  ? receipt.received.total
                  : receipt.totals.totalInvoiceAmount
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
        console.log("Client data:", clientResponse.data);
        setClient(clientResponse.data);

        // Fetch client receipts
        const clientReceiptsResponse = await axios.get(
          `${CLIENT_RECEIPTS_URL}/client/${id}`
        );
        console.log("Client receipts data:", clientReceiptsResponse);

        const clientReceiptsData = clientReceiptsResponse.data.data.map(
          (r: any) => ({
            ...r,
            type: "client",
          })
        );
        console.log("Client receipts data:", clientReceiptsResponse);
        setClientReceipts(clientReceiptsData);

        // Fetch admin receipts for this client
        const adminReceiptsResponse = await axios.get(
          `${ADMIN_RECEIPTS_URL}?clientId=${id}`
        );
        const adminReceiptsData = adminReceiptsResponse.data.map((r: any) => ({
          ...r,
          type: "admin",
        }));
        console.log("Admin receipts data:", adminReceiptsData);
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

  const handleCreateReceipt = (type: "client" | "admin") => {
    navigate(`/receipts/new?clientId=${id}&type=${type}`);
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
      const url =
        type === "client"
          ? `${CLIENT_RECEIPTS_URL}/${receiptId}/download`
          : `${ADMIN_RECEIPTS_URL}/${receiptId}/download`;

      const response = await axios.get(url, { responseType: "blob" });

      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `receipt-${receiptId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: "Download Complete",
        description: "Receipt downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download receipt",
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
          <div className="inline-flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleCreateReceipt("client")}
            >
              <FileText className="mr-2 h-4 w-4" /> New Client Receipt
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCreateReceipt("admin")}
            >
              <FileText className="mr-2 h-4 w-4" /> New Admin Receipt
            </Button>
          </div>
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
          description="Admin receipts"
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
              {selectedReceipt?.type === "admin" ? "Admin " : "Client "}
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
              <div className="border rounded-lg p-6 mb-6 text-center">
                <h3 className="text-lg font-bold mb-2">
                  Golden Touch Jewelers
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Premium Goldsmith Services
                </p>

                <div className="grid grid-cols-2 mb-4">
                  <div className="text-left">
                    <p className="text-sm">
                      Receipt: #{selectedReceipt.voucherId}
                    </p>
                    <p className="text-sm">
                      Date:{" "}
                      {selectedReceipt.type === "admin"
                        ? new Date(
                            selectedReceipt.given.date
                          ).toLocaleDateString()
                        : new Date(
                            selectedReceipt.issueDate
                          ).toLocaleDateString()}
                    </p>
                    <p className="text-sm">
                      Type:{" "}
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          selectedReceipt.type === "admin"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {selectedReceipt.type}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      Client:{" "}
                      {selectedReceipt.type === "admin"
                        ? selectedReceipt.clientName
                        : selectedReceipt.clientInfo.clientName}
                    </p>
                    <p className="text-sm">
                      Status:{" "}
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          (
                            selectedReceipt.type === "admin"
                              ? selectedReceipt.status === "complete"
                              : selectedReceipt.totals.paymentStatus === "Paid"
                          )
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {selectedReceipt.type === "admin"
                          ? selectedReceipt.status
                          : selectedReceipt.totals.paymentStatus}
                      </span>
                    </p>
                  </div>
                </div>

                {selectedReceipt.type === "admin" ? (
                  <>
                    <h4 className="font-medium mb-2">Given Items</h4>
                    <Table className="mb-4">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Pure Weight</TableHead>
                          <TableHead>Pure %</TableHead>
                          <TableHead>Melting</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReceipt.given.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>{item.pureWeight}g</TableCell>
                            <TableCell>{item.purePercent}%</TableCell>
                            <TableCell>{item.melting}</TableCell>
                            <TableCell>
                              ₹{item.total.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <h4 className="font-medium mb-2">Received Items</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Final Weight</TableHead>
                          <TableHead>Stone Weight</TableHead>
                          <TableHead>Making Charge %</TableHead>
                          <TableHead>Sub Total</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReceipt.received.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>{item.finalOrnamentsWt}g</TableCell>
                            <TableCell>{item.stoneWeight}g</TableCell>
                            <TableCell>{item.makingChargePercent}%</TableCell>
                            <TableCell>
                              ₹{item.subTotal.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              ₹{item.total.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="flex flex-wrap justify-between mt-6 pt-4 border-t gap-2">
                      <div>
                        Total Given Items: {selectedReceipt.given.items.length}
                      </div>
                      <div>
                        Total Pure Weight:{" "}
                        {selectedReceipt.given.totalPureWeight}g
                      </div>
                      <div>
                        Total Given Value: ₹
                        {selectedReceipt.given.total.toLocaleString()}
                      </div>
                      <div>
                        Total Received Items:{" "}
                        {selectedReceipt.received.items.length}
                      </div>
                      <div>
                        Total Ornaments Weight:{" "}
                        {selectedReceipt.received.totalOrnamentsWt}g
                      </div>
                      <div>
                        Total Stone Weight:{" "}
                        {selectedReceipt.received.totalStoneWeight}g
                      </div>
                      <div>
                        Total Received Value: ₹
                        {selectedReceipt.received.total.toLocaleString()}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Tag</TableHead>
                          <TableHead>Gross Wt</TableHead>
                          <TableHead>Stone Wt</TableHead>
                          <TableHead>Net Wt</TableHead>
                          <TableHead>Touch%</TableHead>
                          <TableHead>Final Wt</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReceipt.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.itemName}</TableCell>
                            <TableCell>{item.tag}</TableCell>
                            <TableCell>{item.grossWt}g</TableCell>
                            <TableCell>{item.stoneWt}g</TableCell>
                            <TableCell>{item.netWt}g</TableCell>
                            <TableCell>{item.meltingTouch}%</TableCell>
                            <TableCell>{item.finalWt}g</TableCell>
                            <TableCell>
                              ₹{(item.totalInvoiceAmount || 0).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="flex flex-wrap justify-between mt-6 pt-4 border-t gap-2">
                      <div>Total Items: {selectedReceipt.items.length}</div>
                      <div>
                        Total Gross Weight: {selectedReceipt.totals.grossWt}g
                      </div>
                      <div>
                        Total Stone Weight: {selectedReceipt.totals.stoneWt}g
                      </div>
                      <div>
                        Total Final Weight: {selectedReceipt.totals.finalWt}g
                      </div>
                      <div>
                        Total Value: ₹
                        {(
                          selectedReceipt.totals.totalInvoiceAmount || 0
                        ).toLocaleString()}
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
