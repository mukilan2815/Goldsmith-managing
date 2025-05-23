
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Search, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { clientServices } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export default function ClientSelectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch clients using react-query
  const {
    data: clientsData,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientServices.getClients(),
    meta: {
      onError: (err: any) => {
        console.error("Error fetching clients:", err);
        toast({
          title: "Error",
          description: "Failed to load clients. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const filteredClients = clientsData?.clients?.filter(
    (client) =>
      (client.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phoneNumber?.includes(searchTerm)) || false
  ) || [];

  // Select client and navigate to receipt creation
  const selectClient = (client) => {
    navigate("/receipts/new", { 
      state: { 
        client,
        from: location.pathname // Store the current path to return to when cancelled
      } 
    });
  };

  return (
    <div className="container py-6">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/receipts")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Receipts
      </Button>
      
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold">Select Client</h1>
        <p className="text-muted-foreground">
          Choose a client to create a receipt for
        </p>
      </div>

      <div className="bg-card card-premium rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client name, shop name or phone number"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => navigate("/clients/new")}>
            <UserPlus className="mr-2 h-4 w-4" /> New Client
          </Button>
        </div>

        <div className="overflow-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-lg">Loading clients...</span>
            </div>
          ) : isError ? (
            <div className="text-center py-10 text-destructive">
              <p>Failed to load clients</p>
              <p className="text-sm mt-2">Please try refreshing the page</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop Name</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <TableRow key={client._id}>
                      <TableCell className="font-medium">{client.shopName}</TableCell>
                      <TableCell>{client.clientName}</TableCell>
                      <TableCell>{client.phoneNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{client.address}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => selectClient(client)}
                          size="sm"
                        >
                          Select
                        </Button>
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
          )}
        </div>
      </div>
    </div>
  );
}
