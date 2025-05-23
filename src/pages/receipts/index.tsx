
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, Eye, Edit, Trash, Download, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { receiptServices } from "@/services/api";

export default function ReceiptsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<string | null>(null);

  // Fetch receipts
  const {
    data: receiptsData,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => receiptServices.getReceipts(),
    meta: {
      onError: (err: any) => {
        console.error("Error fetching receipts:", err);
        toast({
          title: "Error",
          description: "Failed to load receipts. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const receipts = receiptsData?.receipts || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => receiptServices.deleteReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({
        title: "Receipt Deleted",
        description: "The receipt has been successfully removed.",
      });
      setDeleteDialogOpen(false);
      setReceiptToDelete(null);
    },
    onError: (err: any) => {
      console.error("Error deleting receipt:", err);
      toast({
        title: "Error",
        description: "Failed to delete receipt. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Filter receipts based on search term and filter type
  const filteredReceipts = receipts.filter((receipt) => {
    const searchLower = searchTerm.toLowerCase();
    let matches = true;
    
    // Search term filter
    if (searchTerm) {
      matches =
        receipt.clientInfo?.clientName?.toLowerCase().includes(searchLower) ||
        receipt.clientInfo?.shopName?.toLowerCase().includes(searchLower) ||
        receipt?.voucherId?.toLowerCase().includes(searchLower);
      
      if (!matches) return false;
    }
    
    // Type filter (if implemented in the future)
    
    return matches;
  });

  const handleCreateReceipt = () => {
    navigate("/receipts/select-client");
  };

  const handleViewReceipt = (id: string) => {
    navigate(`/receipts/${id}`);
  };

  const handleEditReceipt = (id: string) => {
    navigate(`/receipts/${id}/edit`);
  };

  const openDeleteDialog = (id: string) => {
    setReceiptToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteReceipt = () => {
    if (!receiptToDelete) return;
    deleteMutation.mutate(receiptToDelete);
  };

  const handleDownloadPDF = (id: string) => {
    toast({
      title: "PDF Download",
      description: "PDF download feature will be implemented soon.",
    });
  };

  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">Receipts</h1>
          <p className="text-muted-foreground">
            Manage your client receipts
          </p>
        </div>
        <Button onClick={handleCreateReceipt} className="mt-4 md:mt-0">
          <Plus className="mr-2 h-4 w-4" /> Create Receipt
        </Button>
      </div>

      <div className="bg-card card-premium rounded-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client name, shop name or voucher ID"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Receipts</SelectItem>
              <SelectItem value="regular">Regular Receipts</SelectItem>
              <SelectItem value="admin">Admin Receipts</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-lg">Loading receipts...</span>
            </div>
          ) : isError ? (
            <div className="text-center py-10 text-destructive">
              <p>Failed to load receipts</p>
              <p className="text-sm mt-2">Please try refreshing the page</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher ID</TableHead>
                  <TableHead>Shop Name</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Gross Wt (g)</TableHead>
                  <TableHead className="text-right">Final Wt (g)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.length > 0 ? (
                  filteredReceipts.map((receipt) => (
                    <TableRow key={receipt._id}>
                      <TableCell>{receipt.voucherId}</TableCell>
                      <TableCell className="font-medium">{receipt.clientInfo.shopName}</TableCell>
                      <TableCell>{receipt.clientInfo.clientName}</TableCell>
                      <TableCell>{new Date(receipt.issueDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">{receipt.totals.grossWt.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{receipt.totals.finalWt.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleViewReceipt(receipt._id)}
                            title="View Receipt"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditReceipt(receipt._id)}
                            title="Edit Receipt"
                          >
                            <Edit className="h-4 w-4" />
                          </Button> */}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDownloadPDF(receipt._id)}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openDeleteDialog(receipt._id)}
                            title="Delete Receipt"
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      {searchTerm ? "No receipts match your search" : "No receipts found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this receipt? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteReceipt}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
