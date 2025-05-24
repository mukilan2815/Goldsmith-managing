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

interface Receipt {
  _id: string;
  voucherId: string;
  issueDate: string;
  items: Array<{
    description: string;
    grossWeight: number;
    stoneWeight: number;
    netWeight: number;
    purity: number;
    finalWeight: number;
    rate: number;
    amount: number;
  }>;
  totalGrossWeight: number;
  totalStoneWeight: number;
  totalNetWeight: number;
  totalFinalWeight: number;
  totalAmount: number;
  type: "regular" | "admin";
}

export default function ClientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [stats, setStats] = useState({
    totalReceipts: 0,
    totalWeight: "0g",
    totalValue: "$0",
    lastTransaction: "N/A",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "regular" | "admin">(
    "all"
  );

  const getFilteredReceipts = () => {
    switch (activeTab) {
      case "regular":
        return receipts.filter((r) => r.type === "regular");
      case "admin":
        return receipts.filter((r) => r.type === "admin");
      default:
        return receipts;
    }
  };

  const calculateStats = (receiptsData: Receipt[]) => {
    if (!receiptsData || receiptsData.length === 0) {
      return {
        totalReceipts: 0,
        totalWeight: "0g",
        totalValue: "$0",
        lastTransaction: "N/A",
      };
    }

    const totalReceipts = receiptsData.length;
    const totalWeight =
      receiptsData
        .reduce((sum, r) => sum + (r.totalFinalWeight || 0), 0)
        .toFixed(2) + "g";

    const totalValue =
      "$" +
      receiptsData
        .reduce((sum, r) => sum + (r.totalAmount || 0), 0)
        .toLocaleString();

    const lastTransaction = receiptsData[0]?.issueDate || "N/A";

    return {
      totalReceipts,
      totalWeight,
      totalValue,
      lastTransaction,
    };
  };

  useEffect(() => {
    const filteredReceipts = getFilteredReceipts();
    setStats(calculateStats(filteredReceipts));
  }, [receipts, activeTab]);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    const fetchClientData = async () => {
      try {
        setIsLoading(true);
        const clientResponse = await axios.get(`/api/clients/${id}`);
        setClient(clientResponse.data);

        const receiptsResponse = await axios.get(
          `/api/receipts?clientId=${id}`
        );
        const receiptsData = Array.isArray(receiptsResponse.data)
          ? receiptsResponse.data
          : receiptsResponse.data?.receipts || [];

        setReceipts(receiptsData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch client data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [id, toast]);

  const handleCreateReceipt = () => {
    navigate(`/receipts/new?clientId=${id}`);
  };

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setReceiptModalOpen(true);
  };

  const handleDownloadReceipt = (receiptId: string) => {
    toast({
      title: "Download Started",
      description: `Receipt #${receiptId} is downloading...`,
    });
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
          <Button variant="outline" onClick={handleCreateReceipt}>
            <FileText className="mr-2 h-4 w-4" /> New Receipt
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Receipts"
          value={stats.totalReceipts}
          description="All receipts"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Total Weight"
          value={stats.totalWeight}
          description="All items"
          icon={<Weight className="h-4 w-4" />}
        />
        <StatCard
          title="Total Value"
          value={stats.totalValue}
          description="All transactions"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Last Transaction"
          value={
            stats.lastTransaction === "N/A"
              ? "N/A"
              : new Date(stats.lastTransaction).toLocaleDateString()
          }
          description="Most recent"
          icon={<FileText className="h-4 w-4" />}
        />
      </div>

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

      <div className="bg-card card-premium rounded-lg p-6">
        <Tabs
          defaultValue="all"
          onValueChange={(value) =>
            setActiveTab(value as "all" | "regular" | "admin")
          }
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif font-medium">
              Transaction History
            </h2>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="regular">Regular</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-0">
            <ReceiptsTable
              receipts={getFilteredReceipts()}
              onViewReceipt={handleViewReceipt}
              onDownloadReceipt={handleDownloadReceipt}
            />
          </TabsContent>

          <TabsContent value="regular" className="mt-0">
            <ReceiptsTable
              receipts={getFilteredReceipts()}
              onViewReceipt={handleViewReceipt}
              onDownloadReceipt={handleDownloadReceipt}
            />
          </TabsContent>

          <TabsContent value="admin" className="mt-0">
            <ReceiptsTable
              receipts={getFilteredReceipts()}
              onViewReceipt={handleViewReceipt}
              onDownloadReceipt={handleDownloadReceipt}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
            <DialogDescription>
              Receipt #{selectedReceipt?.voucherId || "N/A"} from{" "}
              {selectedReceipt?.issueDate
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
                      Receipt: #{selectedReceipt.voucherId || "N/A"}
                    </p>
                    <p className="text-sm">
                      Date:{" "}
                      {selectedReceipt.issueDate
                        ? new Date(
                            selectedReceipt.issueDate
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Client: {client.clientName}</p>
                    <p className="text-sm">Phone: {client.phoneNumber}</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
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
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.grossWeight}g</TableCell>
                        <TableCell>{item.stoneWeight}g</TableCell>
                        <TableCell>{item.netWeight}g</TableCell>
                        <TableCell>{item.purity}%</TableCell>
                        <TableCell>{item.finalWeight}g</TableCell>
                        <TableCell>
                          ${(item.amount || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-between mt-6 pt-4 border-t">
                  <div>Total Items: {selectedReceipt.items.length}</div>
                  <div>Total Weight: {selectedReceipt.totalFinalWeight}g</div>
                  <div>
                    Total Value: $
                    {(selectedReceipt.totalAmount || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleDownloadReceipt(selectedReceipt._id)}
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

// Update the Receipt interface to match your MongoDB schema
interface Receipt {
  _id: string;
  clientId: string;
  clientInfo: {
    clientName: string;
    shopName: string;
    phoneNumber: string;
    metalType: string;
  };
  issueDate: string;
  voucherId: string;
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
}

// Update the ReceiptsTable component to display the correct fields
function ReceiptsTable({
  receipts,
  onViewReceipt,
  onDownloadReceipt,
}: ReceiptsTableProps) {
  if (!receipts || receipts.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No receipts found for this client
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Receipt ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Gross Weight</TableHead>
            <TableHead>Stone Weight</TableHead>
            <TableHead>Final Weight</TableHead>
            <TableHead>Total Amount</TableHead>
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
                {new Date(receipt.issueDate).toLocaleDateString()}
              </TableCell>
              <TableCell>{receipt.items.length}</TableCell>
              <TableCell>{receipt.totals.grossWt}g</TableCell>
              <TableCell>{receipt.totals.stoneWt}g</TableCell>
              <TableCell>{receipt.totals.finalWt}g</TableCell>
              <TableCell>
                ₹{receipt.totals.totalInvoiceAmount.toLocaleString()}
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
                    onClick={() => onDownloadReceipt(receipt._id)}
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

// Update the receipt modal to show the correct data
{
  selectedReceipt && (
    <div className="mt-4">
      <div className="border rounded-lg p-6 mb-6 text-center">
        <h3 className="text-lg font-bold mb-2">Golden Touch Jewelers</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Premium Goldsmith Services
        </p>

        <div className="grid grid-cols-2 mb-4">
          <div className="text-left">
            <p className="text-sm">Receipt: #{selectedReceipt.voucherId}</p>
            <p className="text-sm">
              Date: {new Date(selectedReceipt.issueDate).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm">
              Client: {selectedReceipt.clientInfo.clientName}
            </p>
            <p className="text-sm">
              Phone: {selectedReceipt.clientInfo.phoneNumber}
            </p>
          </div>
        </div>

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

        <div className="flex justify-between mt-6 pt-4 border-t">
          <div>Total Items: {selectedReceipt.items.length}</div>
          <div>Total Gross Weight: {selectedReceipt.totals.grossWt}g</div>
          <div>Total Stone Weight: {selectedReceipt.totals.stoneWt}g</div>
          <div>Total Final Weight: {selectedReceipt.totals.finalWt}g</div>
          <div>
            Total Value: ₹
            {(selectedReceipt.totals.totalInvoiceAmount || 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => handleDownloadReceipt(selectedReceipt._id)}>
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
      </div>
    </div>
  );
}
