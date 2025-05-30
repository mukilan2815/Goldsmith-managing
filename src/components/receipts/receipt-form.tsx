// Modified ReceiptForm component with client state persistence

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { Trash, Plus, Loader, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { ReceiptItem } from "@/models/Receipt";
import { receiptServices } from "@/services/receipt-services";
import { clientServices } from "@/services/api"; // Import client services

// Validation schema
const receiptItemSchema = z.object({
  description: z.string().min(1, { message: "Description is required" }),
  tag: z.string().optional(),
  grossWeight: z.coerce.number().positive({ message: "Must be positive" }),
  stoneWeight: z.coerce.number().min(0, { message: "Cannot be negative" }),
  meltingPercent: z.coerce
    .number()
    .min(0, { message: "Min 0%" })
    .max(100, { message: "Max 100%" }),
  stoneAmount: z.coerce
    .number()
    .min(0, { message: "Cannot be negative" })
    .optional(),
});

const receiptFormSchema = z.object({
  date: z.date({
    required_error: "Date is required",
  }),
  metalType: z.string().min(1, { message: "Metal type is required" }),
  overallWeight: z.coerce
    .number()
    .positive({ message: "Must be positive" })
    .optional(),
  unit: z.string().optional(),
  items: z
    .array(receiptItemSchema)
    .min(1, { message: "Add at least one item" })
    .refine(
      (items) => {
        return items.every((item) => item.stoneWeight <= item.grossWeight);
      },
      {
        message: "Stone weight cannot exceed gross weight",
        path: ["items"],
      }
    ),
});

type ReceiptFormValues = z.infer<typeof receiptFormSchema>;

interface ReceiptFormProps {
  defaultValues?: ReceiptFormValues;
  client?: {
    id: string;
    shopName: string;
    clientName: string;
    phoneNumber: string;
    address?: string;
  };
  receiptId?: string;
  previousPath?: string;
}

export function ReceiptForm({
  defaultValues,
  client: propClient,
  receiptId,
  previousPath = "/receipts/select-client",
}: ReceiptFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voucherId, setVoucherId] = useState(
    `RC-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [metalType, setMetalType] = useState("Gold");
  const [items, setItems] = useState<ReceiptItem[]>([
    {
      id: uuidv4(),
      description: "",
      tag: "",
      grossWeight: 0,
      stoneWeight: 0,
      meltingPercent: 0,
      rate: 0,
      netWeight: 0,
      finalWeight: 0,
      amount: 0,
      stoneAmount: 0,
    },
  ]);
  const [overallWeight, setOverallWeight] = useState(0);

  // Get client from location state or props
  const [client, setClient] = useState(propClient || location.state?.client);
  const [isLoadingClient, setIsLoadingClient] = useState(false);

  // If client ID is in URL params, fetch client data
  useEffect(() => {
    const fetchClientIfNeeded = async () => {
      // If we already have client data, no need to fetch
      if (client) return;

      // Check if client ID is in URL
      const urlParams = new URLSearchParams(window.location.search);
      const clientId = urlParams.get("clientId");

      if (clientId) {
        setIsLoadingClient(true);
        try {
          // Fetch client data using the ID
          const response = await clientServices.getClient(clientId);
          if (response && response.client) {
            // Format client data to match expected structure
            const clientData = {
              id: response.client._id,
              clientName: response.client.clientName,
              shopName: response.client.shopName,
              phoneNumber: response.client.phoneNumber,
              address: response.client.address || "",
            };
            setClient(clientData);
          } else {
            throw new Error("Client not found");
          }
        } catch (error) {
          console.error("Error fetching client:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description:
              "Failed to load client data. Please select a client again.",
          });
          // Redirect to client selection page
          navigate(previousPath);
        } finally {
          setIsLoadingClient(false);
        }
      } else if (!location.state?.client) {
        // No client ID in URL and no client in state, redirect to selection
        toast({
          variant: "destructive",
          title: "No Client Selected",
          description: "Please select a client before creating a receipt.",
        });
        navigate(previousPath);
      }
    };

    fetchClientIfNeeded();
  }, [propClient, location.state, navigate, previousPath, toast]);

  // Generate a real voucher ID when component mounts
  useEffect(() => {
    const fetchVoucherId = async () => {
      try {
        const response = await receiptServices.generateVoucherId();
        if (response && response.voucherId) {
          setVoucherId(response.voucherId);
        }
      } catch (error) {
        console.error("Error fetching voucher ID:", error);
        // Keep the randomly generated one if API fails
      }
    };

    fetchVoucherId();
  }, []);

  // Initialize form with client data if provided
  const today = new Date();
  const initialValues = defaultValues || {
    date: today,
    metalType: metalType,
    overallWeight: 0,
    unit: "g",
    items: items,
  };

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptFormSchema),
    defaultValues: initialValues,
  });

  // Calculate derived values
  const calculateDerivedValues = (
    grossWeight: number,
    stoneWeight: number,
    meltingPercent: number
  ) => {
    const netWeight = grossWeight - stoneWeight;
    const finalWeight = (netWeight * meltingPercent) / 100;

    return {
      netWeight,
      finalWeight,
    };
  };

  // Add a new item row
  const addItem = () => {
    const newItem: ReceiptItem = {
      id: uuidv4(),
      description: "",
      tag: "",
      grossWeight: 0,
      stoneWeight: 0,
      meltingPercent: 0,
      rate: 0,
      netWeight: 0,
      finalWeight: 0,
      amount: 0,
      stoneAmount: 0,
    };

    setItems([...items, newItem]);
  };

  // Remove an item row
  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    } else {
      toast({
        variant: "destructive",
        title: "Cannot remove",
        description: "At least one item is required",
      });
    }
  };

  // Update an item field
  const updateItem = (id: string, field: string, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // Recalculate derived values if needed
          if (
            ["grossWeight", "stoneWeight", "meltingPercent"].includes(field)
          ) {
            const { netWeight, finalWeight } = calculateDerivedValues(
              field === "grossWeight" ? value : item.grossWeight,
              field === "stoneWeight" ? value : item.stoneWeight,
              field === "meltingPercent" ? value : item.meltingPercent
            );

            updatedItem.netWeight = netWeight;
            updatedItem.finalWeight = finalWeight;
          }

          return updatedItem;
        }
        return item;
      })
    );
  };

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => {
      return {
        grossWeight: acc.grossWeight + (Number(item.grossWeight) || 0),
        stoneWeight: acc.stoneWeight + (Number(item.stoneWeight) || 0),
        netWeight: acc.netWeight + (Number(item.netWeight) || 0),
        finalWeight: acc.finalWeight + (Number(item.finalWeight) || 0),
        stoneAmount: acc.stoneAmount + (Number(item.stoneAmount) || 0),
      };
    },
    {
      grossWeight: 0,
      stoneWeight: 0,
      netWeight: 0,
      finalWeight: 0,
      stoneAmount: 0,
    }
  );

  const handleSaveClick = async () => {
    console.log("Save button clicked");
    console.log("Current client:", client);

    // Set loading state
    setIsSubmitting(true);

    try {
      // Validate client exists - using _id property
      if (!client || !client._id) {
        toast({
          variant: "destructive",
          title: "Missing Client",
          description: "Please select a client before creating a receipt.",
        });
        setIsSubmitting(false);
        return;
      }

      // Get form values
      const formValues = form.getValues();
      console.log("Form values:", formValues);

      // Validate required fields
      const formState = form.getFieldState("items");
      if (formState.invalid) {
        console.log("Form validation failed");
        form.handleSubmit(() => {})(); // Trigger validation without submission
        setIsSubmitting(false);
        return;
      }

      // Format data for API
      const formattedData = {
        clientId: client._id,
        metalType: formValues.metalType, // Add as top-level property
        clientInfo: {
          clientName: client.clientName,
          shopName: client.shopName,
          phoneNumber: client.phoneNumber,
          metalType: formValues.metalType,
        },
        overallWeight: formValues.overallWeight,
        issueDate: formValues.date.toISOString(),
        voucherId: voucherId,
        tableData: items.map((item) => ({
          itemName: item.description,
          description: item.description,
          tag: item.tag || "",
          grossWeight: parseFloat(item.grossWeight.toString()),
          stoneWeight: parseFloat(item.stoneWeight.toString()),
          meltingPercent: parseFloat(item.meltingPercent.toString()),
          netWeight: parseFloat(item.netWeight.toString()),
          finalWeight: parseFloat(item.finalWeight.toString()),
          stoneAmount: parseFloat(item.stoneAmount?.toString()),
        })),
        totals: {
          grossWt: totals.grossWeight,
          stoneWt: totals.stoneWeight,
          netWt: totals.netWeight,
          finalWt: totals.finalWeight,
          stoneAmt: totals.stoneAmount,
        },
      };
      console.log("Sending data to API:", formattedData);

      // Updated API URL with correct port (5000)
      const API_URL = "https://backend-goldsmith.onrender.com/api/receipts";
      console.log("Using API URL:", API_URL);

      // Make API call with the correct URL
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });

      // Handle response
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(`API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log("API success response:", result);

      if (!result.success) {
        console.error("API returned error:", result.message);
        throw new Error(result.message || "Failed to save receipt");
      }

      // Show success message
      toast({
        title: "Success",
        description: `Receipt saved successfully with ID: ${result.data._id}`,
      });

      // Navigate to receipt details page
      navigate(`/receipts/${result.data._id}`);
    } catch (error) {
      console.error("Error saving receipt:", error);

      // Show error message
      toast({
        variant: "destructive",
        title: "Error Saving Receipt",
        description:
          error.message || "Failed to save receipt. Please try again.",
      });

      setIsSubmitting(false);
    }
  };

  // If still loading client data, show loading state
  if (isLoadingClient) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading client data...</span>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form className="space-y-6">
        {/* Client Info Banner */}
        {client && (
          <div className="bg-primary/10 p-4 rounded-md mb-4">
            <h3 className="font-medium">Selected Client:</h3>
            <div className="flex flex-wrap gap-x-6 mt-1">
              <span>
                <strong>Shop:</strong> {client.shopName}
              </span>
              <span>
                <strong>Name:</strong> {client.clientName}
              </span>
              <span>
                <strong>Phone:</strong> {client.phoneNumber}
              </span>
            </div>
          </div>
        )}

        {/* Receipt Details */}
        <div className="bg-background/50 p-6 rounded-md border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Receipt Details</h3>
            <div className="bg-primary/10 px-3 py-1 rounded-md text-primary font-medium">
              Voucher ID: {voucherId}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={`w-full pl-3 text-left font-normal ${
                            !field.value ? "text-muted-foreground" : ""
                          }`}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <Calendar className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Metal Type */}
            <FormField
              control={form.control}
              name="metalType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metal Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setMetalType(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select metal type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Gold">Gold</SelectItem>
                      <SelectItem value="Silver">Silver</SelectItem>
                      <SelectItem value="Platinum">Platinum</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Overall Weight */}
            <FormField
              control={form.control}
              name="overallWeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Weight (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      value={field.value || ""}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        field.onChange(value);
                        setOverallWeight(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Unit */}
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="g">Grams (g)</SelectItem>
                      <SelectItem value="oz">Ounces (oz)</SelectItem>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-background/50 p-6 rounded-md border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="flex items-center"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Item
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-left font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="p-2 text-left font-medium text-muted-foreground">
                    Tag
                  </th>
                  <th className="p-2 text-left font-medium text-muted-foreground">
                    Gross Wt.
                  </th>
                  <th className="p-2 text-left font-medium text-muted-foreground">
                    Stone Wt.
                  </th>
                  <th className="p-2 text-left font-medium text-muted-foreground">
                    Net Wt.
                  </th>
                  <th className="p-2 text-left font-medium text-muted-foreground">
                    Melting %
                  </th>
                  <th className="p-2 text-left font-medium text-muted-foreground">
                    Final Wt.
                  </th>
                  <th className="p-2 text-left font-medium text-muted-foreground">
                    Stone Amt.
                  </th>
                  <th className="p-2 text-left font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">
                      <Input
                        placeholder="Item description"
                        // value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, "description", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        placeholder="Tag"
                        // value={item.tag}
                        onChange={(e) =>
                          updateItem(item.id, "tag", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        // value={item.grossWeight}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "grossWeight",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        // value={item.stoneWeight}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "stoneWeight",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        readOnly
                        value={item.netWeight.toFixed(2)}
                        className="bg-muted/30"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        max="100"
                        // value={item.meltingPercent}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "meltingPercent",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        readOnly
                        value={item.finalWeight.toFixed(2)}
                        className="bg-muted/30"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        // value={item.stoneAmount || 0}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "stoneAmount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-medium">
                  <td colSpan={2} className="p-2 text-right">
                    Totals:
                  </td>
                  <td className="p-2">{totals.grossWeight.toFixed(2)}</td>
                  <td className="p-2">{totals.stoneWeight.toFixed(2)}</td>
                  <td className="p-2">{totals.netWeight.toFixed(2)}</td>
                  <td className="p-2"></td>
                  <td className="p-2">{totals.finalWeight.toFixed(2)}</td>
                  <td className="p-2">{totals.stoneAmount.toFixed(2)}</td>
                  <td className="p-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(previousPath)}
          >
            Back
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || !client}
            onClick={handleSaveClick}
          >
            {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Save Receipt
          </Button>
        </div>
      </form>
    </Form>
  );
}
