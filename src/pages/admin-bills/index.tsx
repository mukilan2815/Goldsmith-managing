import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Eye, Trash, Edit, Search, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import axios from "axios";

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
}

// Admin Receipt API functions
const adminReceiptApi = {
  getAdminReceipts: async (): Promise<AdminReceipt[]> => {
    try {
      const response = await api.get("/admin-receipts");
      return response.data as AdminReceipt[];
    } catch (error) {
      console.error("Error fetching admin receipts:", error);
      throw error;
    }
  },

  getAdminReceiptById: async (id: string): Promise<AdminReceipt> => {
    try {
      const response = await api.get(`/admin-receipts/${id}`);
      return response.data as AdminReceipt;
    } catch (error) {
      console.error(`Error fetching admin receipt ${id}:`, error);
      throw error;
    }
  },

  deleteAdminReceipt: async (id: string): Promise<void> => {
    try {
      await api.delete(`/admin-receipts/${id}`);
    } catch (error) {
      console.error(`Error deleting admin receipt ${id}:`, error);
      throw error;
    }
  },

  searchAdminReceipts: async (searchParams: {
    [key: string]: any;
  }): Promise<AdminReceipt[]> => {
    try {
      const response = await api.get("/admin-receipts/search", {
        params: searchParams,
      });
      return response.data as AdminReceipt[];
    } catch (error) {
      console.error("Error searching admin receipts:", error);
      throw error;
    }
  },
};

const AdminReceiptsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [receiptsPerPage] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: adminReceipts = [],
    isLoading,
    isError,
  } = useQuery<AdminReceipt[]>({
    queryKey: ["adminReceipts"],
    queryFn: adminReceiptApi.getAdminReceipts,
  });

  const deleteMutation = useMutation({
    mutationFn: adminReceiptApi.deleteAdminReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminReceipts"] });
      toast({
        title: "Success",
        description: "Admin receipt deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete admin receipt",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this admin receipt?")) {
      deleteMutation.mutate(id);
    }
  };

  // Filter receipts based on search term
  const filteredReceipts = adminReceipts.filter(
    (receipt) =>
      receipt.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.voucherId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const indexOfLastReceipt = page * receiptsPerPage;
  const indexOfFirstReceipt = indexOfLastReceipt - receiptsPerPage;
  const currentReceipts = filteredReceipts.slice(
    indexOfFirstReceipt,
    indexOfLastReceipt
  );
  const totalPages = Math.ceil(filteredReceipts.length / receiptsPerPage);

  // Format date safely
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Calculate balance
  const calculateBalance = (receipt: AdminReceipt) => {
    const givenTotal = receipt.given?.total || 0;
    const receivedTotal = receipt.received?.total || 0;
    return (givenTotal - receivedTotal).toFixed(2);
  };

  return (
    <div className="container p-6 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-serif font-bold">Admin Receipts</h1>
        <Button
          asChild
          className="bg-yellow-400 hover:bg-yellow-500 text-black"
        >
          <Link to="/admin-receipts/new">
            <Plus className="mr-2 h-4 w-4" /> New Receipt
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Receipts</CardTitle>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by client name or voucher ID..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1); // Reset to first page when searching
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-2">Loading receipts...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-destructive">
              <p className="text-lg font-medium">
                Error loading admin receipts
              </p>
              <p className="mt-2">
                Please try again later or check your connection
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() =>
                  queryClient.refetchQueries({ queryKey: ["adminReceipts"] })
                }
              >
                Retry
              </Button>
            </div>
          ) : adminReceipts.length > 0 ? (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher ID</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Given Date</TableHead>
                      <TableHead>Given Total</TableHead>
                      <TableHead>Received Date</TableHead>
                      <TableHead>Received Total</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentReceipts.map((receipt) => (
                      <TableRow key={receipt._id}>
                        <TableCell className="font-medium">
                          {receipt.voucherId || "N/A"}
                        </TableCell>
                        <TableCell>{receipt.clientName || "N/A"}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs capitalize ${
                              receipt.status === "complete"
                                ? "bg-green-100 text-green-800"
                                : receipt.status === "incomplete"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {receipt.status || "unknown"}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(receipt.given?.date)}</TableCell>
                        <TableCell>
                          {receipt.given?.total?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell>
                          {formatDate(receipt.received?.date)}
                        </TableCell>
                        <TableCell>
                          {receipt.received?.total?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell
                          className={`font-medium ${
                            parseFloat(calculateBalance(receipt)) > 0
                              ? "text-green-600"
                              : parseFloat(calculateBalance(receipt)) < 0
                              ? "text-red-600"
                              : ""
                          }`}
                        >
                          {calculateBalance(receipt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/admin-receipts/${receipt._id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/admin-receipts/edit/${receipt._id}`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(receipt._id)}
                              disabled={deleteMutation.isPending}
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
                        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                        className={
                          page === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pageNumber) => (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            onClick={() => setPage(pageNumber)}
                            isActive={page === pageNumber}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setPage((prev) => Math.min(prev + 1, totalPages))
                        }
                        className={
                          page === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-lg text-muted-foreground mb-4">
                {searchTerm
                  ? "No matching admin receipts found"
                  : "No admin receipts found"}
              </p>
              <Button
                asChild
                className="bg-yellow-400 hover:bg-yellow-500 text-black"
              >
                <Link to="/admin-receipts/new">
                  <Plus className="mr-2 h-4 w-4" /> Create New Receipt
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReceiptsPage;
