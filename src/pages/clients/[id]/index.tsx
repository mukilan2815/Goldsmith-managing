import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock client data - would be replaced with API calls
const getClientWithStats = (id: string) => {
  const clients = [
    {
      id: "1",
      shopName: "Golden Creations",
      clientName: "John Smith",
      phoneNumber: "555-123-4567",
      address: "123 Jewel Street, Diamond City",
      stats: {
        totalReceipts: 12,
        totalWeight: "450g",
        totalValue: "$15,450",
        lastTransaction: "2024-05-10"
      }
    },
    {
      id: "2",
      shopName: "Silver Linings",
      clientName: "Sarah Johnson",
      phoneNumber: "555-987-6543",
      address: "456 Precious Lane, Gold Town",
      stats: {
        totalReceipts: 8,
        totalWeight: "320g",
        totalValue: "$9,800",
        lastTransaction: "2024-05-05"
      }
    },
    {
      id: "3",
      shopName: "Gem Masters",
      clientName: "Michael Brown",
      phoneNumber: "555-456-7890",
      address: "789 Crystal Avenue, Platinum Heights",
      stats: {
        totalReceipts: 5,
        totalWeight: "180g",
        totalValue: "$5,600",
        lastTransaction: "2024-05-01"
      }
    },
  ];
  
  return clients.find(client => client.id === id);
};

// Mock receipts data
const getMockReceipts = (clientId: string) => {
  return [
    {
      id: "r1",
      date: "2024-05-10",
      items: 3,
      totalWeight: "150g",
      totalValue: "$4,800",
      type: "regular"
    },
    {
      id: "r2",
      date: "2024-04-22",
      items: 1,
      totalWeight: "80g",
      totalValue: "$2,500",
      type: "regular"
    },
    {
      id: "r3",
      date: "2024-03-15",
      items: 2,
      totalWeight: "120g",
      totalValue: "$3,900",
      type: "admin"
    },
  ].filter((_, index) => index < 3); // Simulate filtering by clientId
};

export default function ClientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    // Simulate API calls
    setTimeout(() => {
      const clientData = getClientWithStats(id);
      const receiptsData = getMockReceipts(id);
      
      if (clientData) {
        setClient(clientData);
        setReceipts(receiptsData);
      }
      
      setIsLoading(false);
    }, 500);
  }, [id]);

  const handleCreateReceipt = () => {
    navigate(`/receipts/new?clientId=${id}`);
  };

  const handleViewReceipt = (receipt) => {
    setSelectedReceipt(receipt);
    setReceiptModalOpen(true);
  };

  const handleDownloadReceipt = (receiptId) => {
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
          Client not found. The requested client may have been deleted or does not exist.
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
          value={client.stats.totalReceipts}
          description="All receipts"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Total Weight"
          value={client.stats.totalWeight}
          description="All items"
          icon={<Weight className="h-4 w-4" />}
        />
        <StatCard
          title="Total Value"
          value={client.stats.totalValue}
          description="All transactions"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Last Transaction"
          value={new Date(client.stats.lastTransaction).toLocaleDateString()}
          description="Most recent"
          icon={<FileText className="h-4 w-4" />}
        />
      </div>

      <Card className="card-premium mb-8">
        <CardContent className="p-6">
          <h2 className="text-xl font-serif font-medium mb-4">Client Information</h2>
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
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{client.address}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-card card-premium rounded-lg p-6">
        <Tabs defaultValue="all">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif font-medium">Transaction History</h2>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="regular">Regular</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-0">
            <ReceiptsTable 
              receipts={receipts}
              onViewReceipt={handleViewReceipt}
              onDownloadReceipt={handleDownloadReceipt}
            />
          </TabsContent>
          
          <TabsContent value="regular" className="mt-0">
            <ReceiptsTable 
              receipts={receipts.filter(r => r.type === 'regular')}
              onViewReceipt={handleViewReceipt}
              onDownloadReceipt={handleDownloadReceipt}
            />
          </TabsContent>
          
          <TabsContent value="admin" className="mt-0">
            <ReceiptsTable 
              receipts={receipts.filter(r => r.type === 'admin')}
              onViewReceipt={handleViewReceipt}
              onDownloadReceipt={handleDownloadReceipt}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Receipt Preview Dialog */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
            <DialogDescription>
              Receipt #{selectedReceipt?.id} from {selectedReceipt?.date}
            </DialogDescription>
          </DialogHeader>

          {selectedReceipt && (
            <div className="mt-4">
              <div className="border rounded-lg p-6 mb-6 text-center">
                <h3 className="text-lg font-bold mb-2">Golden Touch Jewelers</h3>
                <p className="text-sm text-muted-foreground mb-4">Premium Goldsmith Services</p>
                
                <div className="grid grid-cols-2 mb-4">
                  <div className="text-left">
                    <p className="text-sm">Receipt: #{selectedReceipt.id}</p>
                    <p className="text-sm">Date: {new Date(selectedReceipt.date).toLocaleDateString()}</p>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Gold Necklace</TableCell>
                      <TableCell>50g</TableCell>
                      <TableCell>5g</TableCell>
                      <TableCell>45g</TableCell>
                      <TableCell>91.6%</TableCell>
                      <TableCell>41.22g</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Gold Ring</TableCell>
                      <TableCell>10g</TableCell>
                      <TableCell>2g</TableCell>
                      <TableCell>8g</TableCell>
                      <TableCell>91.6%</TableCell>
                      <TableCell>7.33g</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                
                <div className="flex justify-between mt-6 pt-4 border-t">
                  <div>Total Items: {selectedReceipt.items}</div>
                  <div>Total Weight: {selectedReceipt.totalWeight}</div>
                  <div>Total Value: {selectedReceipt.totalValue}</div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={() => handleDownloadReceipt(selectedReceipt.id)}>
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

function ReceiptsTable({ receipts, onViewReceipt, onDownloadReceipt }) {
  if (receipts.length === 0) {
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
            <TableHead>Total Weight</TableHead>
            <TableHead>Total Value</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receipts.map((receipt) => (
            <TableRow key={receipt.id}>
              <TableCell className="font-medium">#{receipt.id}</TableCell>
              <TableCell>{new Date(receipt.date).toLocaleDateString()}</TableCell>
              <TableCell>{receipt.items}</TableCell>
              <TableCell>{receipt.totalWeight}</TableCell>
              <TableCell>{receipt.totalValue}</TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  receipt.type === 'admin' 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {receipt.type.charAt(0).toUpperCase() + receipt.type.slice(1)}
                </span>
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
                    onClick={() => onDownloadReceipt(receipt.id)}
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
