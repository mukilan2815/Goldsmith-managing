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
import { Skeleton } from "@/components/ui/skeleton";

// API configuration
const API_BASE_URL = "http://localhost:5000/api";

// Form validation schema
const clientFormSchema = z.object({
  shopName: z.string().min(1, "Shop name is required"),
  clientName: z.string().min(1, "Client name is required"),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^[0-9]+$/, "Phone number must contain only digits"),
  address: z.string().min(1, "Address is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  active: z.boolean().default(true),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        const response = await axios.get(`${API_BASE_URL}/clients/${id}`);

        if (!response.data) {
          throw new Error("Client not found");
        }

        // Transform empty strings to undefined for optional fields
        const clientData = {
          ...response.data,
          email: response.data.email || "",
        };

        form.reset(clientData);
      } catch (err) {
        console.error("Failed to fetch client:", err);
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to load client data";
        setError(errorMessage);
        toast.error(errorMessage);
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
      setIsSubmitting(true);
      setError("");

      // Clean up data before sending
      const payload = {
        ...data,
        email: data.email || undefined, // Convert empty string to undefined
      };

      await axios.put(`${API_BASE_URL}/clients/${id}`, payload);

      toast.success("Client updated successfully", {
        action: {
          label: "View",
          onClick: () => navigate(`/clients/${id}`),
        },
      });

      navigate(`/clients/${id}`);
    } catch (err) {
      console.error("Failed to update client:", err);
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to update client";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-6">
        <Button variant="ghost" className="mb-6" onClick={handleBackClick}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Client Details
        </Button>

        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-6">
        <Button variant="ghost" className="mb-6" onClick={handleBackClick}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Client Details
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold">Edit Client</h1>
          <p className="text-muted-foreground">Update client information</p>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm">
          <div className="text-center text-destructive py-8">{error}</div>
          <div className="flex justify-end gap-4">
            <Button onClick={handleBackClick}>Back</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <Button variant="ghost" className="mb-6" onClick={handleBackClick}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Client Details
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold">Edit Client</h1>
        <p className="text-muted-foreground">Update client information</p>
      </div>

      <div className="bg-card rounded-lg p-6 shadow-sm">
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
                    <FormLabel>Shop Name*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter shop name"
                        {...field}
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
                    <FormLabel>Phone Number*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter phone number"
                        {...field}
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
                    <FormLabel>Address*</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter address"
                        {...field}
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {error && (
              <div className="text-destructive text-sm text-center">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBackClick}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
