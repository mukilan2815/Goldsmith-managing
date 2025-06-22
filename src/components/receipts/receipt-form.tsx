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
import { clientServices } from "@/services/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Validation schema
const receiptItemSchema = z.object({
  itemName: z.string().min(1, { message: "Item name is required" }),
  tag: z.string().optional(),
  grossWt: z.coerce.number().positive({ message: "Gross weight is required" }),
  stoneWt: z.coerce.number().min(0, { message: "Cannot be negative" }),
  meltingTouch: z.coerce
    .number()
    .min(0, { message: "Min 0%" })
    .max(100, { message: "Max 100%" }),
  netWt: z.coerce.number().optional(),
  finalWt: z.coerce.number().optional(),
  stoneAmt: z.coerce
    .number()
    .min(0, { message: "Cannot be negative" })
    .optional(),
});

const receiptFormSchema = z.object({
  date: z.date({
    required_error: "Date is required",
  }),
  metalType: z.string().min(1, { message: "Metal type is required" }),
  overallWeight: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : Number(val)),
    z.number().nonnegative({ message: "Must be 0 or positive" }).optional()
  ),
  unit: z.string().optional(),
  items: z
    .array(receiptItemSchema)
    .min(1, { message: "Add at least one item" })
    .refine(
      (items) => {
        return items.every((item) => item.stoneWt <= item.grossWt);
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
      itemName: "Item 1", // Default valid name
      tag: "",
      grossWt: 1, // Default valid gross weight
      stoneWt: 0,
      meltingTouch: 10,
      netWt: 1,
      finalWt: 1,
      stoneAmt: 0,
    },
  ]);
  const [overallWeight, setOverallWeight] = useState(0);
  const [activeTab, setActiveTab] = useState<"given" | "received">("given");
  const [receivedItems, setReceivedItems] = useState([
    {
      id: uuidv4(),
      receivedGold: 0,
      melting: 0,
      finalWt: 0,
    },
  ]);
  const [clientBalance, setClientBalance] = useState(0);

  // Get client from location state or props
  const [client, setClient] = useState(() => {
    const c = propClient || location.state?.client;
    if (!c) return undefined;
    // If id is missing but _id exists, normalize
    return { ...c, id: c.id || c._id };
  });
  const [isLoadingClient, setIsLoadingClient] = useState(false);

  // Helper to extract balance from MongoDB Extended JSON
  function extractBalance(balance: any): number {
    if (typeof balance === "number") return balance;
    if (balance && typeof balance === "object") {
      if ("$numberInt" in balance) return parseInt(balance.$numberInt, 10);
      if ("$numberDouble" in balance) return parseFloat(balance.$numberDouble);
      if ("$numberLong" in balance) return parseInt(balance.$numberLong, 10);
    }
    return 0;
  }

  // Fetch client data and balance when client changes
  useEffect(() => {
    const fetchClientData = async () => {
      if (!client?.id) return;
      setIsLoadingClient(true);
      try {
        // Fetch client details
        const clientResponse = await clientServices.getClient(client.id);
        if (clientResponse && clientResponse.client) {
          const clientData = {
            id: clientResponse.client._id,
            clientName: clientResponse.client.clientName,
            shopName: clientResponse.client.shopName,
            phoneNumber: clientResponse.client.phoneNumber,
            address: clientResponse.client.address || "",
          };
          setClient(clientData);

          // Use balance from client object (extract value)
          const balanceValue = extractBalance(clientResponse.client.balance);
          setClientBalance(balanceValue);

          // Always add Previous Balance row for any non-zero balance
          if (
            balanceValue !== 0 &&
            !items.some((item) => item.tag === "BALANCE")
          ) {
            setItems([
              {
                id: uuidv4(),
                itemName: "Previous Balance",
                tag: "BALANCE",
                grossWt: balanceValue, // use the real value, can be negative
                stoneWt: 0,
                meltingTouch: 100,
                netWt: balanceValue,
                finalWt: balanceValue,
                stoneAmt: 0,
              },
              ...items,
            ]);
          }
        }
      } catch (error) {
        console.error("Error fetching client data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load client data. Please try again.",
        });
      } finally {
        setIsLoadingClient(false);
      }
    };
    fetchClientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If client ID is in URL params but not in state/props, fetch client data
  useEffect(() => {
    const fetchClientIfNeeded = async () => {
      if (client) return;
      const urlParams = new URLSearchParams(window.location.search);
      const clientId = urlParams.get("clientId");
      if (clientId) {
        setIsLoadingClient(true);
        try {
          const response = await clientServices.getClient(clientId);
          if (response && response.client) {
            const clientData = {
              id: response.client._id,
              clientName: response.client.clientName,
              shopName: response.client.shopName,
              phoneNumber: response.client.phoneNumber,
              address: response.client.address || "",
            };
            setClient(clientData);
            // Use balance from client object (extract value)
            const balanceValue = extractBalance(response.client.balance);
            setClientBalance(balanceValue);
            if (
              balanceValue !== 0 &&
              !items.some((item) => item.tag === "BALANCE")
            ) {
              setItems([
                {
                  id: uuidv4(),
                  itemName: "Previous Balance",
                  tag: "BALANCE",
                  grossWt: balanceValue, // use the real value, can be negative
                  stoneWt: 0,
                  meltingTouch: 100,
                  netWt: balanceValue,
                  finalWt: balanceValue,
                  stoneAmt: 0,
                },
                ...items,
              ]);
            }
          }
        } catch (error) {
          console.error("Error fetching client:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description:
              "Failed to load client data. Please select a client again.",
          });
          navigate(previousPath);
        } finally {
          setIsLoadingClient(false);
        }
      } else if (!location.state?.client) {
        toast({
          variant: "destructive",
          title: "No Client Selected",
          description: "Please select a client before creating a receipt.",
        });
        navigate(previousPath);
      }
    };
    fetchClientIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propClient, location.state, navigate, previousPath, toast]);

  // Generate voucher ID
  useEffect(() => {
    const fetchVoucherId = async () => {
      try {
        const response = await receiptServices.generateVoucherId();
        if (response && response.voucherId) {
          setVoucherId(response.voucherId);
        }
      } catch (error) {
        console.error("Error fetching voucher ID:", error);
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
    grossWt: number,
    stoneWt: number,
    meltingTouch: number
  ) => {
    const netWt = grossWt - stoneWt;
    const finalWt = (netWt * meltingTouch) / 100;
    return {
      netWt,
      finalWt,
    };
  };

  // Add a new item row
  const addItem = () => {
    const newItem: ReceiptItem = {
      id: uuidv4(),
      itemName: `Item ${items.length + 1}`,
      tag: "",
      grossWt: 1,
      stoneWt: 0,
      meltingTouch: 100,
      netWt: 1,
      finalWt: 1,
      stoneAmt: 0,
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
          if (["grossWt", "stoneWt", "meltingTouch"].includes(field)) {
            const { netWt, finalWt } = calculateDerivedValues(
              field === "grossWt" ? value : item.grossWt,
              field === "stoneWt" ? value : item.stoneWt,
              field === "meltingTouch" ? value : item.meltingTouch
            );
            updatedItem.netWt = netWt;
            updatedItem.finalWt = finalWt;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  // Add a new received item row
  const addReceivedItem = () => {
    setReceivedItems([
      ...receivedItems,
      { id: uuidv4(), receivedGold: 0, melting: 0, finalWt: 0 },
    ]);
  };

  // Remove a received item row
  const removeReceivedItem = (id: string) => {
    if (receivedItems.length > 1) {
      setReceivedItems(receivedItems.filter((item) => item.id !== id));
    } else {
      toast({
        variant: "destructive",
        title: "Cannot remove",
        description: "At least one item is required",
      });
    }
  };

  // Update a received item field
  const updateReceivedItem = (id: string, field: string, value: any) => {
    setReceivedItems(
      receivedItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          updated.finalWt =
            (Number(updated.receivedGold) * Number(updated.melting)) / 100;
          return updated;
        }
        return item;
      })
    );
  };

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => {
      return {
        grossWeight: acc.grossWeight + (Number(item.grossWt) || 0),
        stoneWeight: acc.stoneWeight + (Number(item.stoneWt) || 0),
        netWeight: acc.netWeight + (Number(item.netWt) || 0),
        finalWeight: acc.finalWeight + (Number(item.finalWt) || 0),
        stoneAmount: acc.stoneAmount + (Number(item.stoneAmt) || 0),
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

  // Calculate received totals
  const receivedTotals = receivedItems.reduce(
    (acc, item) => {
      const finalWt = (Number(item.receivedGold) * Number(item.melting)) / 100;
      return {
        finalWt: acc.finalWt + finalWt,
      };
    },
    { finalWt: 0 }
  );

  // Calculate balance and new client balance
  const balance = totals.finalWeight - receivedTotals.finalWt;
  const newClientBalance = clientBalance + balance;

  const balanceToAdd = clientBalance;

  <div className="bg-muted/10 p-3 rounded-md">
    <div className="text-sm text-muted-foreground">Final Wt. + Balance</div>
    <div className="text-lg font-semibold">
      {(totals.finalWeight + balanceToAdd).toFixed(3)}g
    </div>
  </div>;

  const handleSaveClick = async () => {
    setIsSubmitting(true);

    try {
      // 1) Ensure client exists
      const clientId = client?.id ?? client?._id;
      if (!client || !clientId) {
        toast({
          variant: "destructive",
          title: "Missing Client",
          description: "Please select a client before creating a receipt.",
        });
        return setIsSubmitting(false);
      }

      // 2) Trigger form‐level validation
      const formIsValid = await form.trigger();
      if (!formIsValid) {
        console.error("Form validation errors:", form.formState.errors);
        toast({
          variant: "destructive",
          title: "Form Errors",
          description: "Please fix all errors before saving.",
        });
        return setIsSubmitting(false);
      }

      // 3) Validate each given item (skip BALANCE rows)
      const itemValidationErrors = [];
      items.forEach((item, idx) => {
        if (item.tag?.toUpperCase() === "BALANCE") return;

        const rowErrors = [];
        const gross = Number(item.grossWt);
        const stone = Number(item.stoneWt);
        const melt = Number(item.meltingTouch);

        if (!item.itemName?.trim()) {
          rowErrors.push("Item name is required");
        }
        if (!Number.isFinite(gross) || gross <= 0) {
          rowErrors.push("Gross weight must be positive");
        }
        if (!Number.isFinite(stone) || stone < 0) {
          rowErrors.push("Stone weight cannot be negative");
        }
        if (!Number.isFinite(melt) || melt < 0 || melt > 100) {
          rowErrors.push("Melting % must be between 0 and 100");
        }
        if (stone > gross) {
          rowErrors.push("Stone weight cannot exceed gross weight");
        }

        if (rowErrors.length > 0) {
          itemValidationErrors.push(`Row ${idx + 1}: ${rowErrors.join(", ")}`);
        }
      });

      if (itemValidationErrors.length) {
        toast({
          variant: "destructive",
          title: "Item Validation Errors",
          description: itemValidationErrors.join("\n"),
        });
        return setIsSubmitting(false);
      }

      // 4) Validate received items with detailed error handling
      console.log("Raw receivedItems:", receivedItems); // Debug log
      const receivedInvalid = receivedItems.some((r, idx) => {
        const errors = [];
        const recGold = r.receivedGold;
        const recMelt = r.melting;
        const recFinal = r.finalWt;

        // Validate receivedGold
        if (recGold === undefined || recGold === "" || recGold === null) {
          errors.push(`Row ${idx + 1}: Received gold is missing or empty`);
        } else {
          const numGold = Number(recGold);
          if (!Number.isFinite(numGold) || numGold < 0) {
            errors.push(
              `Row ${idx + 1}: Received gold must be a positive number`
            );
          }
        }

        // Validate melting
        if (recMelt === undefined || recMelt === "" || recMelt === null) {
          errors.push(`Row ${idx + 1}: Melting is missing or empty`);
        } else {
          const numMelt = Number(recMelt);
          if (!Number.isFinite(numMelt) || numMelt < 0 || numMelt > 100) {
            errors.push(`Row ${idx + 1}: Melting % must be between 0 and 100`);
          }
        }

        // Validate finalWt
        if (recFinal === undefined || recFinal === "" || recFinal === null) {
          errors.push(`Row ${idx + 1}: Final weight is missing or empty`);
        } else {
          const numFinal = Number(recFinal);
          if (!Number.isFinite(numFinal) || numFinal < 0) {
            errors.push(`Row ${idx + 1}: Final weight must be non-negative`);
          }
        }

        if (errors.length > 0) {
          console.log(
            `Validation errors for received item ${idx + 1}:`,
            errors
          ); // Debug log
          toast({
            variant: "destructive",
            title: "Invalid Received Items",
            description: errors.join("\n"),
          });
          return true;
        }
        return false;
      });

      if (receivedInvalid) {
        return setIsSubmitting(false);
      }

      // 5) Compute totals
      let totalGross = 0,
        totalStone = 0,
        totalNet = 0,
        totalFinal = 0,
        totalStoneAmt = 0,
        receivedFinal = 0;

      items.forEach((it) => {
        totalGross += parseFloat(it.grossWt.toString()) || 0;
        totalStone += parseFloat(it.stoneWt.toString()) || 0;
        totalNet += parseFloat(it.netWt.toString()) || 0;
        totalFinal += parseFloat(it.finalWt.toString()) || 0;
        totalStoneAmt += parseFloat(it.stoneAmt.toString()) || 0;
      });
      receivedItems.forEach((r) => {
        receivedFinal += parseFloat(r.finalWt.toString()) || 0;
      });

      const balanceChange = parseFloat((totalFinal - receivedFinal).toFixed(3));
      const newClientBalance = parseFloat(
        (clientBalance + balanceChange).toFixed(3)
      );

      // 6) Build payload for backend
      const payload = {
        clientId,
        clientInfo: {
          clientName: client.clientName,
          shopName: client.shopName || "",
          phoneNumber: client.phoneNumber || "",
          address: client.address || "",
        },
        metalType: form.getValues().metalType,
        issueDate: form.getValues().date.toISOString(),
        voucherId,
        givenItems: items.map((it) => ({
          itemName: it.itemName,
          tag: it.tag || "",
          grossWt: parseFloat(it.grossWt.toString()),
          stoneWt: parseFloat(it.stoneWt.toString()),
          meltingTouch: parseFloat(it.meltingTouch.toString()),
          netWt: parseFloat(it.netWt.toString()),
          finalWt: parseFloat(it.finalWt.toString()),
          stoneAmt: parseFloat(it.stoneAmt.toString()),
        })),
        receivedItems: receivedItems.map((r) => ({
          receivedGold: parseFloat(r.receivedGold.toString()),
          melting: parseFloat(r.melting.toString()),
          finalWt: parseFloat(r.finalWt.toString()),
        })),
        previousBalance: parseFloat(clientBalance.toFixed(3)),
      };

      // 7) Update client balance first
      await clientServices.updateClient(clientId, {
        balance: newClientBalance,
        balanceDescription: `Receipt ${voucherId} adjustment`,
      });

      // 8) Create receipt
      const receiptResponse = await receiptServices.createReceipt(payload);
      if (!receiptResponse?.success) {
        throw new Error(receiptResponse?.message || "Failed to save receipt");
      }

      // 9) Success toast & navigation
      toast({
        title: "Success",
        description: `Receipt ${voucherId} saved. New balance: ${newClientBalance}g`,
      });
      navigate(`/receipts/${receiptResponse.data._id}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: msg,
      });
    } finally {
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
              <span></span>
              {Array.isArray(location.state?.client?.balanceHistory) &&
                location.state.client.balanceHistory.length > 0 && (
                  <span>
                    <strong> Balance :</strong>{" "}
                    {(() => {
                      const last =
                        location.state.client.balanceHistory[
                          location.state.client.balanceHistory.length - 1
                        ];
                      return `${last.amount > 0 ? "+" : ""}${last.amount}`;
                    })()}
                  </span>
                )}
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

        {/* Tabs for Given Items and Received Items */}
        <Tabs
          defaultValue="given"
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "given" | "received")}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="given">Given Items</TabsTrigger>
            <TabsTrigger value="received">Received Items</TabsTrigger>
          </TabsList>
          <TabsContent value="given">
            {/* Given Items Table (existing code) */}
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
                        Melting %
                      </th>
                      <th className="p-2 text-left font-medium text-muted-foreground">
                        Net Wt.
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
                    {items.map((item, idx) => {
                      const itemErrors =
                        form.formState.errors.items?.[idx] || {};
                      return (
                        <tr key={item.id} className="border-b">
                          <td className="p-2">
                            <Input
                              placeholder="Item name"
                              value={item.itemName}
                              onChange={(e) =>
                                updateItem(item.id, "itemName", e.target.value)
                              }
                            />
                            {itemErrors.itemName && (
                              <div className="text-xs text-destructive mt-1">
                                {itemErrors.itemName.message}
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            <Input
                              placeholder="Tag"
                              value={item.tag}
                              onChange={(e) =>
                                updateItem(item.id, "tag", e.target.value)
                              }
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              placeholder="0.000"
                              step="0.01"
                              min="0"
                              value={item.grossWt}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "grossWt",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                            {itemErrors.grossWt && (
                              <div className="text-xs text-destructive mt-1">
                                {itemErrors.grossWt.message}
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              placeholder="0.000"
                              step="0.01"
                              min="0"
                              value={item.stoneWt}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "stoneWt",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              placeholder="0.000"
                              step="0.01"
                              min="0"
                              max="100"
                              value={item.meltingTouch}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "meltingTouch",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              readOnly
                              value={item.netWt.toFixed(3)}
                              className="bg-muted/30"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              readOnly
                              value={item.finalWt.toFixed(3)}
                              className="bg-muted/30"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              placeholder="0.000"
                              step="0.01"
                              min="0"
                              value={item.stoneAmt}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "stoneAmt",
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
                      );
                    })}
                    <tr className="bg-muted/30 font-medium">
                      <td colSpan={2} className="p-2 text-right">
                        Totals:
                      </td>
                      <td className="p-2">{totals.grossWeight.toFixed(3)}</td>
                      <td className="p-2">{totals.stoneWeight.toFixed(3)}</td>
                      <td className="p-2">{totals.netWeight.toFixed(3)}</td>
                      <td className="p-2">
                        {items
                          .map((item) => item.meltingTouch)
                          .reduce((acc, curr) => acc + (curr || 0), 0)}
                      </td>
                      <td className="p-2">{totals.finalWeight.toFixed(3)}</td>
                      <td className="p-2">{totals.stoneAmount.toFixed(3)}</td>
                      <td className="p-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="received">
            <div className="bg-background/50 p-6 rounded-md border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Received Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addReceivedItem}
                  className="flex items-center"
                >
                  <Plus className="mr-1 h-4 w-4" /> Add Received Item
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="p-2 text-left font-medium text-muted-foreground">
                        S.No
                      </th>
                      <th className="p-2 text-left font-medium text-muted-foreground">
                        Received Gold
                      </th>
                      <th className="p-2 text-left font-medium text-muted-foreground">
                        Melting
                      </th>
                      <th className="p-2 text-left font-medium text-muted-foreground">
                        Final Wt.
                      </th>
                      <th className="p-2 text-left font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivedItems.map((item, idx) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            placeholder="0.000"
                            step="0.01"
                            min="0"
                            value={item.receivedGold}
                            onChange={(e) =>
                              updateReceivedItem(
                                item.id,
                                "receivedGold",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            placeholder="0.000"
                            step="0.01"
                            min="0"
                            max="100"
                            value={item.melting}
                            onChange={(e) =>
                              updateReceivedItem(
                                item.id,
                                "melting",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            readOnly
                            value={(
                              (Number(item.receivedGold) *
                                Number(item.melting)) /
                              100
                            ).toFixed(3)}
                            className="bg-muted/30"
                          />
                        </td>
                        <td className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeReceivedItem(item.id)}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/30 font-medium">
                      <td colSpan={3} className="p-2 text-right">
                        Totals:
                      </td>
                      <td className="p-2">
                        {receivedTotals.finalWt.toFixed(3)}
                      </td>
                      <td className="p-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Show balance summary */}
        <div className="bg-background/50 p-4 rounded-md border mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-muted/10 p-3 rounded-md">
              <div className="text-sm text-muted-foreground">
                Given Final Wt.
              </div>
              <div className="text-lg font-semibold">
                {totals.finalWeight.toFixed(3)}g
              </div>
            </div>
            <div className="bg-muted/10 p-3 rounded-md">
              <div className="text-sm text-muted-foreground">
                Received Final Wt.
              </div>
              <div className="text-lg font-semibold">
                {receivedTotals.finalWt.toFixed(3)}g
              </div>
            </div>
            <div className="bg-primary/10 p-3 rounded-md">
              <div className="text-sm text-primary">New Client Balance</div>
              <div className="text-lg font-semibold text-primary">
                {newClientBalance.toFixed(3)}g
              </div>
            </div>
            <div className="bg-muted/10 p-3 rounded-md">
              <div className="text-sm text-muted-foreground">
                Final Wt. + Balance
              </div>
              <div className="text-lg font-semibold">
                {(totals.finalWeight + balanceToAdd).toFixed(3)}g
              </div>
            </div>
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
