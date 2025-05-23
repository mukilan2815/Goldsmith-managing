
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Eye, Trash, Download, Search } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Mock data for client bills
const mockClientBills = [
  {
    id: "1",
    clientName: "John Smith",
    shopName: "Golden Creations",
    issueDate: new Date().toISOString(),
    metalType: "Gold",
    totalFinalWeight: 120.5,
    totalStoneAmount: 450,
    voucherId: "RC-123456"
  },
  {
    id: "2",
    clientName: "Sarah Johnson",
    shopName: "Silver Linings",
    issueDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    metalType: "Silver",
    totalFinalWeight: 350.25,
    totalStoneAmount: 120,
    voucherId: "RC-123457"
  },
  {
    id: "3",
    clientName: "Michael Brown",
    shopName: "Gem Masters",
    issueDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    metalType: "Platinum",
    totalFinalWeight: 85.75,
    totalStoneAmount: 1200,
    voucherId: "RC-123458"
  },
  {
    id: "4",
    clientName: "Emma Wilson",
    shopName: "Royal Jewels",
    issueDate: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    metalType: "Gold",
    totalFinalWeight: 65.30,
    totalStoneAmount: 850,
    voucherId: "RC-123459"
  },
  {
    id: "5",
    clientName: "David Lee",
    shopName: "Precious Metals",
    issueDate: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
    metalType: "Silver",
    totalFinalWeight: 425.10,
    totalStoneAmount: 90,
    voucherId: "RC-123460"
  }
];

// Mock service for client bills
const clientBillService = {
  getClientBills: async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return mockClientBills;
  },
  
  deleteClientBill: async (id: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { message: "Client bill deleted successfully" };
  }
};

const ClientBillsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [billsPerPage] = useState(10);
  const { toast } = useToast();
  
  const {
    data: clientBills,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['clientBills'],
    queryFn: clientBillService.getClientBills
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client bill?')) {
      try {
        await clientBillService.deleteClientBill(id);
        toast({
          title: "Success",
          description: "Client bill deleted successfully",
        });
        refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete client bill",
          variant: "destructive",
        });
      }
    }
  };

  const handleDownload = (id: string) => {
    // In a real application, this would make an API call to download the PDF
    toast({
      title: "Download Initiated",
      description: "Your PDF is being generated and will download shortly.",
    });
  };

  // Filter bills based on search term
  const filteredBills = clientBills 
    ? clientBills.filter(bill => 
        bill.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.voucherId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];
  
  // Calculate pagination
  const indexOfLastBill = page * billsPerPage;
  const indexOfFirstBill = indexOfLastBill - billsPerPage;
  const currentBills = filteredBills.slice(indexOfFirstBill, indexOfLastBill);
  const totalPages = Math.ceil(filteredBills.length / billsPerPage);

  return (
    <div className="container p-6 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-serif font-bold">Client Bills</h1>
        <Button asChild>
          <Link to="/receipts/select-client">New Client Receipt</Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Client Bills</CardTitle>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by client name, shop name or voucher ID..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-4">Loading...</p>
          ) : isError ? (
            <p className="text-center py-4 text-destructive">
              Error loading client bills. Please try again later.
            </p>
          ) : currentBills.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher ID</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Shop Name</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Metal Type</TableHead>
                      <TableHead>Final Weight</TableHead>
                      <TableHead>Stone Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.voucherId}</TableCell>
                        <TableCell>{bill.clientName}</TableCell>
                        <TableCell>{bill.shopName}</TableCell>
                        <TableCell>{new Date(bill.issueDate).toLocaleDateString()}</TableCell>
                        <TableCell>{bill.metalType}</TableCell>
                        <TableCell>{bill.totalFinalWeight.toFixed(2)}</TableCell>
                        <TableCell>{bill.totalStoneAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/receipts/${bill.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownload(bill.id)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDelete(bill.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                        className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {[...Array(totalPages)].map((_, i) => (
                      <PaginationItem key={i + 1}>
                        <PaginationLink
                          onClick={() => setPage(i + 1)}
                          isActive={page === i + 1}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                        className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          ) : (
            <div className="py-4 text-center">
              <p>No client bills found</p>
              <Button asChild className="mt-4">
                <Link to="/receipts/select-client">Create New Client Receipt</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientBillsPage;
