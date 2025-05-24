import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

// Form validation schema
const clientFormSchema = z.object({
  shopName: z.string().optional(),
  clientName: z.string().min(1, "Client name is required"),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  active: z.boolean().default(true),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      shopName: "",
      clientName: "",
      phoneNumber: "",
      address: "",
      email: "",
      active: true,
    },
  });

  useEffect(() => {
    if (!id) {
      setError("Client ID is missing");
      setIsLoading(false);
      return;
    }

    const fetchClient = async () => {
      try {
        setIsLoading(true);
        const response =
          await axios.get(`https://backend-goldsmith.onrender.com/api/clients/api/clients/${id}`);
        form.reset(response.data);
      } catch (err) {
        console.error("Failed to fetch client:", err);
        setError(err.response?.data?.message || "Failed to load client data");
        toast.error("Failed to load client data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
  }, [id, form]);

  const handleBackClick = () => {
    navigate(id ? `/clients/${id}` : "/clients");
  };

  const handleSubmit = async (data: ClientFormValues) => {
    try {
      setIsLoading(true);
      await axios.put(`https://backend-goldsmith.onrender.com/api/clients/${id}`, data);
      toast.success("Client updated successfully");
      navigate(`/clients/${id}`);
    } catch (err) {
      console.error("Failed to update client:", err);
      setError(err.response?.data?.message || "Failed to update client");
      toast.error("Failed to update client");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-6">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={handleBackClick}
        disabled={isLoading}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Client Details
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold">Edit Client</h1>
        <p className="text-muted-foreground">Update client information</p>
      </div>

      <div className="bg-card rounded-lg p-6 shadow-sm">
        {error ? (
          <div className="text-center text-destructive py-8">{error}</div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="shopName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shop Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter shop name"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name*</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter client name"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter phone number"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter email"
                          type="email"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter address"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-4">
                      <FormLabel>Active</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackClick}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}
