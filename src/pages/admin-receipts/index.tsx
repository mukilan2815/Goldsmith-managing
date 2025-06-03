import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { adminReceiptServices } from "@/services/api-admin";
import { Eye, Trash, Edit, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface AdminReceipt {
  _id: string;
  clientName: string;
  status: "complete" | "incomplete" | "empty";
  voucherId: string;
  createdAt: string;
  updatedAt: string;
  given: {
    date: string;
    total: number;
  };
  received: {
    date: string;
    total: number;
  };
}

const AdminReceiptsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [receiptsPerPage] = useState(10);
  const { toast } = useToast();

  const {
    data: adminReceipts,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["adminReceipts"],
    queryFn: adminReceiptServices.getAdminReceipts,
  });

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this Work Receipt?")) {
      try {
        await adminReceiptServices.deleteAdminReceipt(id);
        toast({
          title: "Success",
          description: "Work Receipt deleted successfully",
        });
        refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete Work Receipt",
          variant: "destructive",
        });
      }
    }
  };

  // Filter receipts based on search term
  const filteredReceipts = adminReceipts
    ? adminReceipts.filter(
        (receipt: AdminReceipt) =>
          receipt.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          receipt.voucherId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Calculate pagination
  const indexOfLastReceipt = page * receiptsPerPage;
  const indexOfFirstReceipt = indexOfLastReceipt - receiptsPerPage;
  const currentReceipts = filteredReceipts.slice(
    indexOfFirstReceipt,
    indexOfLastReceipt
  );
  const totalPages = Math.ceil(filteredReceipts.length / receiptsPerPage);

  return (
    <div className="container p-6 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-serif font-bold">Work Receipts</h1>
        <Button asChild>
          <Link to="/admin-receipts/new">New Work Receipt</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Work Receipts</CardTitle>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by client name or voucher ID..."
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
              Error loading Work Receipts. Please try again later.
            </p>
          ) : filteredReceipts.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher ID</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Given Date</TableHead>
                      <TableHead>Received Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentReceipts.map((receipt: AdminReceipt) => (
                      <TableRow key={receipt._id}>
                        <TableCell className="font-medium">
                          {receipt.voucherId}
                        </TableCell>
                        <TableCell>{receipt.clientName}</TableCell>
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
                            {receipt.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(receipt.given.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(receipt.received.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/admin-receipts/${receipt._id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/admin-receipts/${receipt._id}/edit`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(receipt._id)}
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
            <div className="py-4 text-center">
              <p>No Work Receipts found</p>
              <Button asChild className="mt-4">
                <Link to="/admin-receipts/new">Create New Work Receipt</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReceiptsPage;
