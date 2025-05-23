
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ClientForm } from "@/components/clients/client-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Mock client data retrieval - would be replaced with API calls
const getClient = (id: string) => {
  const mockClients = [
    {
      id: "1",
      shopName: "Golden Creations",
      clientName: "John Smith",
      phoneNumber: "555-123-4567",
      address: "123 Jewel Street, Diamond City",
    },
    {
      id: "2",
      shopName: "Silver Linings",
      clientName: "Sarah Johnson",
      phoneNumber: "555-987-6543",
      address: "456 Precious Lane, Gold Town",
    },
    {
      id: "3",
      shopName: "Gem Masters",
      clientName: "Michael Brown",
      phoneNumber: "555-456-7890",
      address: "789 Crystal Avenue, Platinum Heights",
    },
  ];
  
  return mockClients.find(client => client.id === id);
};

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("Client ID is missing");
      setIsLoading(false);
      return;
    }

    try {
      // Simulate API call
      setTimeout(() => {
        const foundClient = getClient(id);
        if (foundClient) {
          setClient(foundClient);
        } else {
          setError("Client not found");
        }
        setIsLoading(false);
      }, 500);
    } catch (err) {
      setError("Failed to load client data");
      setIsLoading(false);
    }
  }, [id]);

  return (
    <div className="container py-6">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate(`/clients/${id}`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Client Details
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold">Edit Client</h1>
        <p className="text-muted-foreground">
          Update client information
        </p>
      </div>

      <div className="bg-card card-premium rounded-lg p-6">
        {isLoading ? (
          <div className="text-center py-8">Loading client data...</div>
        ) : error ? (
          <div className="text-center text-destructive py-8">{error}</div>
        ) : client ? (
          <ClientForm defaultValues={client} clientId={id} />
        ) : null}
      </div>
    </div>
  );
}
