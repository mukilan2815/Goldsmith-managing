import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileText, Edit, Trash, Receipt, Loader2 } from "lucide-react";
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

export default function CustomerDetailsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch clients from API
  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/api/clients");
      setClients(response.data.clients || []);
    } catch (err) {
      setError("Failed to fetch clients. Please try again.");
      console.error("Error fetching clients:", err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  // Search clients
  const searchClients = async () => {
    if (!searchTerm || searchTerm.length < 2) {
      fetchClients();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `/api/clients/search?query=${encodeURIComponent(searchTerm)}`
      );
      setClients(response.data);
    } catch (err) {
      setError("Failed to search clients. Please try again.");
      console.error("Error searching clients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm && searchTerm.length >= 2) {
      searchClients();
    } else {
      fetchClients();
    }
  }, [searchTerm]);

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

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      setDeleteLoading(true);
      await axios.delete(`/api/clients/${clientToDelete}`);
      fetchClients(); // Refresh the list
      toast({
        title: "Client Deleted",
        description:
          "The client has been successfully removed or marked as inactive.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete client. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting client:", err);
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const handleCreateReceipt = (client: Client) => {
    navigate("/receipts/new", { state: { client } });
  };

  // Filter clients based on search term (client-side fallback)
  const filteredClients = clients.filter((client) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.shopName?.toLowerCase().includes(searchLower) ||
      client.clientName?.toLowerCase().includes(searchLower) ||
      client.phoneNumber?.includes(searchTerm)
    );
  });

  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">Customer Details</h1>
          <p className="text-muted-foreground">
            Manage your goldsmith business clients
          </p>
        </div>
        <Button onClick={() => navigate("/clients/new")}>Add New Client</Button>
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

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop Name</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Loading clients...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TableRow key={client._id}>
                    <TableCell className="font-medium">
                      {client.shopName || "-"}
                    </TableCell>
                    <TableCell>{client.clientName}</TableCell>
                    <TableCell>{client.phoneNumber || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          client.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {client.active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(client.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleViewDetails(client._id)}
                          title="View Details"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditClient(client._id)}
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
                          onClick={() => openDeleteDialog(client._id)}
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
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-muted-foreground"
                  >
                    {searchTerm
                      ? "No clients match your search"
                      : "No clients found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this client? If the client has
              receipts, they will be marked as inactive instead of being
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClient}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
