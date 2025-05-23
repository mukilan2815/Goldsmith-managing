
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReceiptForm } from "@/components/receipts/receipt-form";
import { useToast } from "@/hooks/use-toast";
import { clientServices } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export default function NewReceiptPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState(null);
  const [previousPath, setPreviousPath] = useState("/receipts/select-client");
  const clientId = location.state?.client?._id;

  // If clientId is available but full client info is not,
  // fetch complete client details
  const {
    data: clientData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientServices.getClient(clientId),
    enabled: !!clientId && !location.state?.client?.address, // Only fetch if we have clientId but need more details
    meta: {
      onSuccess: (data: any) => {
        setClient(data);
      }
    }
  });

  // Error handling moved outside the useQuery
  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: "Failed to load client details. Please try again.",
        variant: "destructive",
      });
      console.error("Error fetching client:", isError);
    }
  }, [isError, toast]);

  // Check if client data was passed via location state
  useEffect(() => {
    if (location.state?.client) {
      setClient(location.state.client);
    }
    
    // Store the previous path if it exists in the state
    if (location.state?.from) {
      setPreviousPath(location.state.from);
    }
  }, [location]);

  // If no client is selected, redirect to client selection page
  useEffect(() => {
    if (!location.state?.client && !isLoading && !clientData) {
      toast({
        title: "Client Required",
        description: "Please select a client first to create a receipt.",
      });
      navigate("/receipts/select-client");
    }
  }, [location.state, navigate, toast, isLoading, clientData]);

  if (isLoading) {
    return (
      <div className="container py-6 flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-lg">Loading client details...</p>
      </div>
    );
  }

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
        <h1 className="text-3xl font-serif font-bold">Create New Receipt</h1>
        <p className="text-muted-foreground">
          {client 
            ? `Creating receipt for ${client.shopName || client.clientName}`
            : "Create a new receipt by filling out the form below"}
        </p>
      </div>

      <div className="bg-card card-premium rounded-lg p-6">
        <ReceiptForm client={client} previousPath={previousPath} />
      </div>
    </div>
  );
}
