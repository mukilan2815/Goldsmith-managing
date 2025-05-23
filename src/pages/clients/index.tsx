
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileText, Edit, Trash, Receipt } from "lucide-react";
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

// Temporary client mock data for UI development
const initialClients = [
  {
    id: "1",
    shopName: "Golden Creations",
    clientName: "John Smith",
    phoneNumber: "555-123-4567",
    address: "123 Jewel Street, Diamond City",
    createdAt: "2024-04-15T10:30:00Z",
  },
  {
    id: "2",
    shopName: "Silver Linings",
    clientName: "Sarah Johnson",
    phoneNumber: "555-987-6543",
    address: "456 Precious Lane, Gold Town",
    createdAt: "2024-05-01T14:45:00Z",
  },
  {
    id: "3",
    shopName: "Gem Masters",
    clientName: "Michael Brown",
    phoneNumber: "555-456-7890",
    address: "789 Crystal Avenue, Platinum Heights",
    createdAt: "2024-05-10T09:15:00Z",
  },
];

export default function CustomerDetailsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState(initialClients);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  // Filter clients based on search term
  const filteredClients = clients.filter((client) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.shopName.toLowerCase().includes(searchLower) ||
      client.clientName.toLowerCase().includes(searchLower) ||
      client.phoneNumber.includes(searchTerm)
    );
  });

  const handleEditClient = (id: string) => {
    navigate(`/clients/${id}/edit`);
  };

  const handleViewDetails = (id: string) => {
    navigate(`/clients/${id}`);
  };

  const openDeleteDialog = (id: string) => {
    setClientToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClient = () => {
    if (!clientToDelete) return;
    
    // In a real app, this would make an API call
    setClients(clients.filter((client) => client.id !== clientToDelete));
    
    toast({
      title: "Client Deleted",
      description: "The client has been successfully removed.",
    });
    
    setDeleteDialogOpen(false);
    setClientToDelete(null);
  };

  // New function to create receipt for a client
  const handleCreateReceipt = (client) => {
    navigate("/receipts/new", { state: { client } });
  };

  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">Customer Details</h1>
          <p className="text-muted-foreground">
            Manage your goldsmith business clients
          </p>
        </div>
      </div>

      <div className="bg-card card-premium rounded-lg p-6 mb-8">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client name, shop name or phone number"
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop Name</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.shopName}</TableCell>
                    <TableCell>{client.clientName}</TableCell>
                    <TableCell>{client.phoneNumber}</TableCell>
                    <TableCell>
                      {new Date(client.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleViewDetails(client.id)}
                          title="View Details"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditClient(client.id)}
                          title="Edit Client"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCreateReceipt(client)}
                          title="Create Receipt"
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openDeleteDialog(client.id)}
                          title="Delete Client"
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
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    {searchTerm ? "No clients match your search" : "No clients found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteClient}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
