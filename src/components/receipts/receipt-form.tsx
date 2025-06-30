// Modified ReceiptForm component with client state persistence

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { Loader } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Form } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ReceiptItem } from "@/models/Receipt";
import { receiptServices } from "@/services/receipt-services";
import { clientServices } from "@/services/api";

// Import component parts
import { ClientInfoBanner } from "./components/ClientInfoBanner";
import { ReceiptDetailsForm } from "./components/ReceiptDetailsForm";
import { GivenItemsTable } from "./components/GivenItemsTable";
import { ReceivedItemsTable } from "./components/ReceivedItemsTable";
import { BalanceSummary } from "./components/BalanceSummary";
import { StatusIndicator } from "./components/StatusIndicator";
import { FormActions } from "./components/FormActions";

// Validation schema
const receiptItemSchema = z.object({
  itemName: z.string().min(1, { message: "Item name is required" }),
  tag: z.string().optional(),
  grossWt: z.coerce
    .number()
    .min(0, { message: "Gross weight must be 0 or positive" }),
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
    `SH-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [metalType, setMetalType] = useState("Gold");
  const [items, setItems] = useState<ReceiptItem[]>([
    {
      id: uuidv4(),
      itemName: "",
      tag: "",
      grossWt: "",
      stoneWt: "",
      meltingTouch: "",
      netWt: 0,
      finalWt: 0,
      stoneAmt: "",
      date: new Date().toISOString().split("T")[0], // Add date field
    },
  ]);
  const [overallWeight, setOverallWeight] = useState(0);
  const [activeTab, setActiveTab] = useState<"given" | "received">("given");
  const [receivedItems, setReceivedItems] = useState([
    {
      id: uuidv4(),
      receivedGold: "",
      melting: "",
      finalWt: 0,
      date: new Date().toISOString().split("T")[0], // Add date field
    },
  ]);
  const [clientBalance, setClientBalance] = useState(0);
  const [manualClientBalance, setManualClientBalance] = useState(0);
  const [finalWtBalanceTag, setFinalWtBalanceTag] = useState("");
  const [itemErrors, setItemErrors] = useState<{
    [key: string]: { [field: string]: string };
  }>({});
  const [receivedItemErrors, setReceivedItemErrors] = useState<{
    [key: string]: { [field: string]: string };
  }>({});

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
          setManualClientBalance(balanceValue); // Initialize manual balance with current balance

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
                date: new Date().toISOString().split("T")[0], // Add date field
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
            setManualClientBalance(balanceValue); // Initialize manual balance with current balance
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
                  date: new Date().toISOString().split("T")[0], // Add date field
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

  // Validate a single item
  const validateItem = (item: ReceiptItem) => {
    const errors: { [field: string]: string } = {};

    if (item.tag?.toUpperCase() === "BALANCE") {
      return errors; // Skip validation for balance rows
    }

    const gross = Number(item.grossWt);
    const stone = Number(item.stoneWt);
    const melt = Number(item.meltingTouch);

    if (!item.itemName?.trim()) {
      errors.itemName = "Item name is required";
    }
    if (item.grossWt === "" || !Number.isFinite(gross) || gross <= 0) {
      errors.grossWt = "Gross weight must be greater than 0";
    }
    if (item.stoneWt !== "" && (!Number.isFinite(stone) || stone < 0)) {
      errors.stoneWt = "Stone weight cannot be negative";
    }
    if (
      item.meltingTouch === "" ||
      !Number.isFinite(melt) ||
      melt <= 0 ||
      melt > 100
    ) {
      errors.meltingTouch = "Melting % must be between 1 and 100";
    }
    if (Number.isFinite(stone) && Number.isFinite(gross) && stone > gross) {
      errors.stoneWt = "Stone weight cannot exceed gross weight";
    }

    return errors;
  };

  // Validate all items
  const validateAllItems = () => {
    const errors: { [key: string]: { [field: string]: string } } = {};
    items.forEach((item) => {
      const itemValidation = validateItem(item);
      if (Object.keys(itemValidation).length > 0) {
        errors[item.id] = itemValidation;
      }
    });
    setItemErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate a single received item
  const validateReceivedItem = (item: any) => {
    const errors: { [field: string]: string } = {};

    const recGold = Number(item.receivedGold);
    const recMelt = Number(item.melting);

    // Only validate if there's some input - allow completely empty items
    const hasAnyInput = item.receivedGold !== "" || item.melting !== "";

    if (hasAnyInput) {
      if (
        item.receivedGold === "" ||
        !Number.isFinite(recGold) ||
        recGold <= 0
      ) {
        errors.receivedGold = "Received gold must be greater than 0";
      }
      if (
        item.melting === "" ||
        !Number.isFinite(recMelt) ||
        recMelt <= 0 ||
        recMelt > 100
      ) {
        errors.melting = "Melting % must be between 1 and 100";
      }
    }

    return errors;
  };

  // Validate all received items
  const validateAllReceivedItems = () => {
    const errors: { [key: string]: { [field: string]: string } } = {};
    receivedItems.forEach((item) => {
      const itemValidation = validateReceivedItem(item);
      if (Object.keys(itemValidation).length > 0) {
        errors[item.id] = itemValidation;
      }
    });
    setReceivedItemErrors(errors);
    return Object.keys(errors).length === 0;
  };
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
      itemName: "",
      tag: "",
      grossWt: "",
      stoneWt: "",
      meltingTouch: "",
      netWt: 0,
      finalWt: 0,
      stoneAmt: "",
      date: new Date().toISOString().split("T")[0], // Add date field
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
            const grossWt =
              field === "grossWt"
                ? Number(value) || 0
                : Number(item.grossWt) || 0;
            const stoneWt =
              field === "stoneWt"
                ? Number(value) || 0
                : Number(item.stoneWt) || 0;
            const meltingTouch =
              field === "meltingTouch"
                ? Number(value) || 0
                : Number(item.meltingTouch) || 0;

            const { netWt, finalWt } = calculateDerivedValues(
              grossWt,
              stoneWt,
              meltingTouch
            );
            updatedItem.netWt = netWt;
            updatedItem.finalWt = finalWt;
          }

          // Validate the updated item and update errors
          const itemValidation = validateItem(updatedItem);
          setItemErrors((prev) => {
            const newErrors = { ...prev };
            if (Object.keys(itemValidation).length > 0) {
              newErrors[id] = itemValidation;
            } else {
              delete newErrors[id];
            }
            return newErrors;
          });

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
      {
        id: uuidv4(),
        receivedGold: "",
        melting: "",
        finalWt: 0,
        date: new Date().toISOString().split("T")[0], // Add date field
      },
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
          // Calculate final weight: receivedGold - (receivedGold * melting / 100)
          const receivedGold = Number(updated.receivedGold) || 0;
          const melting = Number(updated.melting) || 0;
          updated.finalWt = receivedGold - (receivedGold * melting) / 100;

          // Validate the updated item and update errors
          const itemValidation = validateReceivedItem(updated);
          setReceivedItemErrors((prev) => {
            const newErrors = { ...prev };
            if (Object.keys(itemValidation).length > 0) {
              newErrors[id] = itemValidation;
            } else {
              delete newErrors[id];
            }
            return newErrors;
          });

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
      const receivedGold = Number(item.receivedGold) || 0;
      const melting = Number(item.melting) || 0;
      const finalWt = receivedGold - (receivedGold * melting) / 100;
      return {
        finalWt: acc.finalWt + finalWt,
      };
    },
    { finalWt: 0 }
  );

  // Calculate balance and new client balance
  const balance = totals.finalWeight - receivedTotals.finalWt;
  const newClientBalance = manualClientBalance; // Use manual balance instead of calculated

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

      // 3) Validate all items
      const itemsValid = validateAllItems();
      if (!itemsValid) {
        toast({
          variant: "destructive",
          title: "Item Validation Errors",
          description: "Please fix all item errors before saving.",
        });
        return setIsSubmitting(false);
      }

      // 4) Check if received items are filled (optional validation)
      const hasReceivedItems = receivedItems.some(
        (item) =>
          (item.receivedGold && Number(item.receivedGold) > 0) ||
          (item.melting && Number(item.melting) > 0)
      );

      let receivedValid = true;
      if (hasReceivedItems) {
        receivedValid = validateAllReceivedItems();
        if (!receivedValid) {
          toast({
            variant: "destructive",
            title: "Received Item Validation Errors",
            description: "Please fix all received item errors before saving.",
          });
          return setIsSubmitting(false);
        }
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

      // Only calculate received totals if there are valid received items
      if (hasReceivedItems) {
        receivedItems.forEach((r) => {
          receivedFinal += parseFloat(r.finalWt.toString()) || 0;
        });
      }

      const balanceChange = parseFloat((totalFinal - receivedFinal).toFixed(3));
      const finalClientBalance = parseFloat(manualClientBalance.toFixed(3)); // Use manual balance

      // Determine receipt status
      const receiptStatus = hasReceivedItems ? "complete" : "incomplete";

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
        status: receiptStatus,
        givenItems: items.map((it) => ({
          itemName: it.itemName,
          tag: it.tag || "",
          grossWt: parseFloat(it.grossWt.toString()),
          stoneWt: parseFloat(it.stoneWt.toString()),
          meltingTouch: parseFloat(it.meltingTouch.toString()),
          netWt: parseFloat(it.netWt.toString()),
          finalWt: parseFloat(it.finalWt.toString()),
          stoneAmt: parseFloat(it.stoneAmt.toString()),
          date: it.date || new Date().toISOString().split("T")[0], // Include date field
        })),
        receivedItems: hasReceivedItems
          ? receivedItems.map((r) => ({
              receivedGold: parseFloat(r.receivedGold.toString()),
              melting: parseFloat(r.melting.toString()),
              finalWt: parseFloat(r.finalWt.toString()),
              date: r.date || new Date().toISOString().split("T")[0], // Include date field
            }))
          : [],
        previousBalance: parseFloat(clientBalance.toFixed(3)),
        finalWtBalanceTag: finalWtBalanceTag, // Include the tag field
      };

      // 7) Update client balance first
      await clientServices.updateClient(clientId, {
        balance: finalClientBalance,
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
        description: `Receipt ${voucherId} saved${
          receiptStatus === "incomplete" ? " as incomplete" : ""
        }.`,
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
          <ClientInfoBanner client={client} locationState={location.state} />
        )}

        {/* Receipt Details */}
        <ReceiptDetailsForm
          form={form}
          voucherId={voucherId}
          metalType={metalType}
          setMetalType={setMetalType}
          overallWeight={overallWeight}
          setOverallWeight={setOverallWeight}
        />

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
            <GivenItemsTable
              items={items}
              itemErrors={itemErrors}
              onUpdateItem={updateItem}
              onAddItem={addItem}
              onRemoveItem={removeItem}
              totals={totals}
            />
          </TabsContent>
          <TabsContent value="received">
            <ReceivedItemsTable
              receivedItems={receivedItems}
              receivedItemErrors={receivedItemErrors}
              onUpdateReceivedItem={updateReceivedItem}
              onAddReceivedItem={addReceivedItem}
              onRemoveReceivedItem={removeReceivedItem}
              receivedTotals={receivedTotals}
            />
          </TabsContent>
        </Tabs>

        {/* Balance Summary */}
        <BalanceSummary
          totals={totals}
          receivedTotals={receivedTotals}
          newClientBalance={newClientBalance}
          balanceToAdd={balanceToAdd}
          manualClientBalance={manualClientBalance}
          setManualClientBalance={setManualClientBalance}
          finalWtBalanceTag={finalWtBalanceTag}
          setFinalWtBalanceTag={setFinalWtBalanceTag}
        />

        {/* Status Indicator */}
        <StatusIndicator receivedItems={receivedItems} />

        {/* Form Actions */}
        <FormActions
          onBack={() => navigate(previousPath)}
          onSave={handleSaveClick}
          isSubmitting={isSubmitting}
          isDisabled={isSubmitting || !client}
          receivedItems={receivedItems}
        />
      </form>
    </Form>
  );
}
