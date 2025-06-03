import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { Trash, Plus, Loader, Calendar, Save } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

// Types for our form items
interface GivenItem {
  id: string;
  productName: string;
  pureWeight: string;
  purePercent: string;
  melting: string;
  total: number;
}

interface ReceivedItem {
  id: string;
  productName: string;
  finalOrnamentsWt: string;
  stoneWeight: string;
  makingChargePercent: string;
  subTotal: number;
  total: number;
}

// Validation schema for given items
const givenItemSchema = z.object({
  productName: z.string().min(1, { message: "Product name is required" }),
  pureWeight: z.string().min(1, { message: "Pure weight is required" }),
  purePercent: z.string().min(1, { message: "Pure percent is required" }),
  melting: z.string().min(1, { message: "Melting is required" }),
});

// Validation schema for received items
const receivedItemSchema = z.object({
  productName: z.string().min(1, { message: "Product name is required" }),
  finalOrnamentsWt: z
    .string()
    .min(1, { message: "Final ornaments weight is required" }),
  stoneWeight: z.string().min(1, { message: "Stone weight is required" }),
  makingChargePercent: z
    .string()
    .min(1, { message: "Making charge percent is required" }),
});

// Main form schema
const adminReceiptSchema = z.object({
  givenDate: z.date({
    required_error: "Given date is required",
  }),
  receivedDate: z.date({
    required_error: "Received date is required",
  }),
  manualGivenTotal: z.number().optional(),
  manualReceivedTotal: z.number().optional(),
  operation: z
    .enum(["subtract-given-received", "subtract-received-given", "add"])
    .optional(),
});

type AdminReceiptFormValues = z.infer<typeof adminReceiptSchema>;

interface AdminReceiptFormProps {
  selectedClient: {
    id: string;
    name: string;
  };
  receiptData?: any;
}

export function AdminReceiptForm({
  selectedClient,
  receiptData,
}: AdminReceiptFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("given");
  const [isSubmittingGiven, setIsSubmittingGiven] = useState(false);
  const [isSubmittingReceived, setIsSubmittingReceived] = useState(false);
  const [voucherId, setVoucherId] = useState("");

  // Items state
  const [givenItems, setGivenItems] = useState<GivenItem[]>([
    {
      id: uuidv4(),
      productName: "",
      pureWeight: "",
      purePercent: "",
      melting: "",
      total: 0,
    },
  ]);

  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([
    {
      id: uuidv4(),
      productName: "",
      finalOrnamentsWt: "",
      stoneWeight: "0",
      makingChargePercent: "",
      subTotal: 0,
      total: 0,
    },
  ]);

  // Form initialization
  const form = useForm<AdminReceiptFormValues>({
    resolver: zodResolver(adminReceiptSchema),
    defaultValues: {
      givenDate: receiptData?.given?.date
        ? new Date(receiptData.given.date)
        : new Date(),
      receivedDate: receiptData?.received?.date
        ? new Date(receiptData.received.date)
        : new Date(),
      manualGivenTotal: receiptData?.manualCalculation?.givenTotal || 0,
      manualReceivedTotal: receiptData?.manualCalculation?.receivedTotal || 0,
      operation:
        receiptData?.manualCalculation?.operation || "subtract-given-received",
    },
  });

  // Generate voucher ID on component mount
  useEffect(() => {
    if (receiptData && receiptData.voucherId) {
      setVoucherId(receiptData.voucherId);
    } else {
      const generateVoucherId = async () => {
        try {
          // Normally, we'd call an API to get a voucher ID
          // For now, we'll generate a mock one
          const date = new Date();
          const year = date.getFullYear().toString().substr(-2);
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const randomNum = Math.floor(1000 + Math.random() * 9000);

          setVoucherId(`GA-${year}${month}-${randomNum}`);
        } catch (error) {
          console.error("Failed to generate voucher ID:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to generate voucher ID",
          });
        }
      };

      generateVoucherId();
    }
  }, [receiptData, toast]);

  // Initialize form with existing data if editing
  useEffect(() => {
    if (receiptData) {
      if (
        receiptData.given &&
        receiptData.given.items &&
        receiptData.given.items.length > 0
      ) {
        const formattedGivenItems = receiptData.given.items.map(
          (item: any) => ({
            id: item.id || uuidv4(),
            productName: item.productName || "",
            pureWeight: String(item.pureWeight || ""),
            purePercent: String(item.purePercent || ""),
            melting: String(item.melting || ""),
            total: item.total || 0,
          })
        );
        setGivenItems(formattedGivenItems);
      }

      if (
        receiptData.received &&
        receiptData.received.items &&
        receiptData.received.items.length > 0
      ) {
        const formattedReceivedItems = receiptData.received.items.map(
          (item: any) => ({
            id: item.id || uuidv4(),
            productName: item.productName || "",
            finalOrnamentsWt: String(item.finalOrnamentsWt || ""),
            stoneWeight: String(item.stoneWeight || "0"),
            makingChargePercent: String(item.makingChargePercent || ""),
            subTotal: item.subTotal || 0,
            total: item.total || 0,
          })
        );
        setReceivedItems(formattedReceivedItems);
      }
    }
  }, [receiptData]);

  // Add a new given item
  const addGivenItem = () => {
    const newItem: GivenItem = {
      id: uuidv4(),
      productName: "",
      pureWeight: "",
      purePercent: "",
      melting: "",
      total: 0,
    };

    setGivenItems([...givenItems, newItem]);
  };

  // Remove a given item
  const removeGivenItem = (id: string) => {
    if (givenItems.length > 1) {
      setGivenItems(givenItems.filter((item) => item.id !== id));
    } else {
      toast({
        variant: "destructive",
        title: "Cannot remove",
        description: "At least one given item is required",
      });
    }
  };

  // Add a new received item
  const addReceivedItem = () => {
    const newItem: ReceivedItem = {
      id: uuidv4(),
      productName: "",
      finalOrnamentsWt: "",
      stoneWeight: "0",
      makingChargePercent: "",
      subTotal: 0,
      total: 0,
    };

    setReceivedItems([...receivedItems, newItem]);
  };

  // Remove a received item
  const removeReceivedItem = (id: string) => {
    if (receivedItems.length > 1) {
      setReceivedItems(receivedItems.filter((item) => item.id !== id));
    } else {
      toast({
        variant: "destructive",
        title: "Cannot remove",
        description: "At least one received item is required",
      });
    }
  };

  // Update given item field
  const updateGivenItem = (
    id: string,
    field: keyof Omit<GivenItem, "id" | "total">,
    value: string
  ) => {
    setGivenItems(
      givenItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // Recalculate total if necessary fields are provided
          if (["pureWeight", "purePercent", "melting"].includes(field)) {
            const pureWeight = parseFloat(updatedItem.pureWeight) || 0;
            const purePercent = parseFloat(updatedItem.purePercent) || 0;
            const melting = parseFloat(updatedItem.melting) || 1;

            // Calculate as (Pure Weight * Pure Percent) / Melting
            updatedItem.total = (pureWeight * purePercent) / melting;
          }

          return updatedItem;
        }
        return item;
      })
    );
  };

  // Update received item field
  const updateReceivedItem = (
    id: string,
    field: keyof Omit<ReceivedItem, "id" | "subTotal" | "total">,
    value: string
  ) => {
    setReceivedItems(
      receivedItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // Recalculate subtotal and total if necessary fields are provided
          if (
            ["finalOrnamentsWt", "stoneWeight", "makingChargePercent"].includes(
              field
            )
          ) {
            const finalOrnamentsWt =
              parseFloat(updatedItem.finalOrnamentsWt) || 0;
            const stoneWeight = parseFloat(updatedItem.stoneWeight) || 0;
            const makingChargePercent =
              parseFloat(updatedItem.makingChargePercent) || 0;

            // Calculate SubTotal = (finalOrnamentsWt - stoneWeight)
            updatedItem.subTotal = finalOrnamentsWt - stoneWeight;

            // Calculate Total = SubTotal * (makingChargePercent / 100) - making charge value
            updatedItem.total =
              updatedItem.subTotal * (makingChargePercent / 100);
          }

          return updatedItem;
        }
        return item;
      })
    );
  };

  // Calculate given totals
  const givenTotals = {
    totalPureWeight: givenItems.reduce((acc, item) => {
      const pureWeight = parseFloat(item.pureWeight) || 0;
      const purePercent = parseFloat(item.purePercent) || 0;
      return acc + (pureWeight * purePercent) / 100;
    }, 0),
    total: givenItems.reduce((acc, item) => acc + item.total, 0),
  };

  // Calculate received totals
  const receivedTotals = {
    totalOrnamentsWt: receivedItems.reduce(
      (acc, item) => acc + (parseFloat(item.finalOrnamentsWt) || 0),
      0
    ),
    totalStoneWeight: receivedItems.reduce(
      (acc, item) => acc + (parseFloat(item.stoneWeight) || 0),
      0
    ),
    totalSubTotal: receivedItems.reduce((acc, item) => acc + item.subTotal, 0),
    total: receivedItems.reduce((acc, item) => acc + item.total, 0),
  };

  // Calculate manual result
  const calculateManualResult = () => {
    const givenTotal = form.watch("manualGivenTotal") || 0;
    const receivedTotal = form.watch("manualReceivedTotal") || 0;
    const operation = form.watch("operation");

    switch (operation) {
      case "subtract-given-received":
        return givenTotal - receivedTotal;
      case "subtract-received-given":
        return receivedTotal - givenTotal;
      case "add":
        return givenTotal + receivedTotal;
      default:
        return 0;
    }
  };

  // Save Given Data
  const saveGivenData = async () => {
    setIsSubmittingGiven(true);

    try {
      const givenDate = form.getValues("givenDate");

      if (!givenDate) {
        toast({
          variant: "destructive",
          title: "Missing Date",
          description: "Please select a given date",
        });
        setIsSubmittingGiven(false);
        return;
      }

      // Validate given items
      for (const item of givenItems) {
        try {
          givenItemSchema.parse(item);
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please fill all required fields for each given item",
          });
          setIsSubmittingGiven(false);
          return;
        }
      }

      const givenData = {
        date: givenDate,
        items: givenItems,
        totalPureWeight: givenTotals.totalPureWeight,
        total: givenTotals.total,
      };

      console.log("Saving given data:", givenData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      toast({
        title: "Success",
        description: "Given items saved successfully",
      });
    } catch (error) {
      console.error("Error saving given data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save given items",
      });
    } finally {
      setIsSubmittingGiven(false);
    }
  };

  // Save Received Data
  const saveReceivedData = async () => {
    setIsSubmittingReceived(true);

    try {
      const receivedDate = form.getValues("receivedDate");

      if (!receivedDate) {
        toast({
          variant: "destructive",
          title: "Missing Date",
          description: "Please select a received date",
        });
        setIsSubmittingReceived(false);
        return;
      }

      // Validate received items
      for (const item of receivedItems) {
        try {
          receivedItemSchema.parse(item);
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description:
              "Please fill all required fields for each received item",
          });
          setIsSubmittingReceived(false);
          return;
        }
      }

      const receivedData = {
        date: receivedDate,
        items: receivedItems,
        totalOrnamentsWt: receivedTotals.totalOrnamentsWt,
        totalStoneWeight: receivedTotals.totalStoneWeight,
        totalSubTotal: receivedTotals.totalSubTotal,
        total: receivedTotals.total,
      };

      console.log("Saving received data:", receivedData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      toast({
        title: "Success",
        description: "Received items saved successfully",
      });
    } catch (error) {
      console.error("Error saving received data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save received items",
      });
    } finally {
      setIsSubmittingReceived(false);
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-medium">
            Work Receipt for: {selectedClient.name}
          </h2>
          <div className="bg-primary/10 px-3 py-1 rounded-md text-primary font-medium">
            Voucher ID: {voucherId}
          </div>
        </div>

        {/* Tabbed Interface for Given and Received Items */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="given" className="flex-1">
              Given Items
            </TabsTrigger>
            <TabsTrigger value="received" className="flex-1">
              Received Items
            </TabsTrigger>
          </TabsList>

          {/* Given Items Tab */}
          <TabsContent value="given" className="mt-4">
            <div className="bg-background/50 p-6 rounded-md border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">
                  Given Details (Client: {selectedClient.name})
                </h3>
              </div>

              {/* Given Date */}
              <div className="flex justify-end mb-4">
                <FormField
                  control={form.control}
                  name="givenDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-[240px] justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick Given Date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Given Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 px-2 text-sm font-medium text-center">
                        S.No.
                      </th>
                      <th className="py-2 px-2 text-sm font-medium text-center">
                        Product Name
                      </th>
                      <th className="py-2 px-2 text-sm font-medium text-center">
                        Pure Weight
                      </th>
                      <th className="py-2 px-2 text-sm font-medium text-center">
                        Pure %
                      </th>
                      <th className="py-2 px-2 text-sm font-medium text-center">
                        Melting
                      </th>
                      <th className="py-2 px-2 text-sm font-medium text-center">
                        Total
                      </th>
                      <th className="w-10 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {givenItems.map((item, index) => (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="py-2 px-2 text-center">{index + 1}</td>
                        <td className="py-2 px-2">
                          <Input
                            value={item.productName}
                            onChange={(e) =>
                              updateGivenItem(
                                item.id,
                                "productName",
                                e.target.value
                              )
                            }
                            placeholder="Product name"
                            className="bg-card border border-input"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            value={item.pureWeight}
                            onChange={(e) =>
                              updateGivenItem(
                                item.id,
                                "pureWeight",
                                e.target.value
                              )
                            }
                            placeholder="0.00"
                            className="bg-card border border-input text-center"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            value={item.purePercent}
                            onChange={(e) =>
                              updateGivenItem(
                                item.id,
                                "purePercent",
                                e.target.value
                              )
                            }
                            placeholder="0.00"
                            className="bg-card border border-input text-center"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            value={item.melting}
                            onChange={(e) =>
                              updateGivenItem(
                                item.id,
                                "melting",
                                e.target.value
                              )
                            }
                            placeholder="0.00"
                            className="bg-card border border-input text-center"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          {item.total.toFixed(3)}
                        </td>
                        <td className="py-2 px-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGivenItem(item.id)}
                            className="h-8 w-8 p-0"
                            disabled={givenItems.length === 1}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}

                    {/* Totals Row */}
                    <tr className="font-medium bg-accent/20">
                      <td colSpan={5} className="py-2 px-2 text-right">
                        Total:
                      </td>
                      <td className="py-2 px-2 text-center">
                        {givenTotals.total.toFixed(3)}
                      </td>
                      <td className="py-2 px-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between mt-4">
                <Button
                  type="button"
                  onClick={addGivenItem}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Given Item
                </Button>
                <Button
                  type="button"
                  onClick={saveGivenData}
                  variant="default"
                  disabled={isSubmittingGiven}
                >
                  {isSubmittingGiven && (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="mr-2 h-4 w-4" /> Save Given Data
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Received Items Tab */}
          <TabsContent value="received" className="mt-4">
            <div className="bg-background/50 p-6 rounded-md border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">
                  Received Details (Client: {selectedClient.name})
                </h3>
              </div>

              {/* Received Date */}
              <div className="flex justify-end mb-4">
                <FormField
                  control={form.control}
                  name="receivedDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-[240px] justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick Received Date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Received Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 px-2 text-sm font-medium text-center">
                        S.No.
                      </th>
                      <th className="py-2 px-2 text-sm font-medium text-center">
                        Product Name
                      </th>
                      <th className="py-2 px-2 text-sm font-medium text-center">
                        Final Ornaments Wt
                      </th>
                      <th className="py-2 px-2 text-sm font-medium text-center">
                        Stone Weight
                      </th>
                      <th className="py-2 px-2 text-sm font-medium text-center">
                        Sub Total
                      </th>
                      <th className="py-2 px-2 text-sm font-medium text-center">
                        Making Charge (%)
                      </th>
                      <th className="py-2 px-2 text-sm font-medium text-center">
                        Total
                      </th>
                      <th className="w-10 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivedItems.map((item, index) => (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="py-2 px-2 text-center">{index + 1}</td>
                        <td className="py-2 px-2">
                          <Input
                            value={item.productName}
                            onChange={(e) =>
                              updateReceivedItem(
                                item.id,
                                "productName",
                                e.target.value
                              )
                            }
                            placeholder="Product name"
                            className="bg-card border border-input"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            value={item.finalOrnamentsWt}
                            onChange={(e) =>
                              updateReceivedItem(
                                item.id,
                                "finalOrnamentsWt",
                                e.target.value
                              )
                            }
                            placeholder="0.00"
                            className="bg-card border border-input text-center"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            value={item.stoneWeight}
                            onChange={(e) =>
                              updateReceivedItem(
                                item.id,
                                "stoneWeight",
                                e.target.value
                              )
                            }
                            placeholder="0.00"
                            className="bg-card border border-input text-center"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          {item.subTotal.toFixed(3)}
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            value={item.makingChargePercent}
                            onChange={(e) =>
                              updateReceivedItem(
                                item.id,
                                "makingChargePercent",
                                e.target.value
                              )
                            }
                            placeholder="0.00"
                            className="bg-card border border-input text-center"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          {item.total.toFixed(3)}
                        </td>
                        <td className="py-2 px-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeReceivedItem(item.id)}
                            className="h-8 w-8 p-0"
                            disabled={receivedItems.length === 1}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}

                    {/* Totals Rows */}
                    <tr className="font-medium bg-accent/20">
                      <td colSpan={2} className="py-2 px-2 text-right">
                        Total:
                      </td>
                      <td className="py-2 px-2 text-center">
                        {receivedTotals.totalOrnamentsWt.toFixed(3)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {receivedTotals.totalStoneWeight.toFixed(3)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {receivedTotals.totalSubTotal.toFixed(3)}
                      </td>
                      <td className="py-2 px-2"></td>
                      <td className="py-2 px-2 text-center">
                        {receivedTotals.total.toFixed(3)}
                      </td>
                      <td className="py-2 px-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between mt-4">
                <Button
                  type="button"
                  onClick={addReceivedItem}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Received Item
                </Button>
                <Button
                  type="button"
                  onClick={saveReceivedData}
                  variant="default"
                  disabled={isSubmittingReceived}
                >
                  {isSubmittingReceived && (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="mr-2 h-4 w-4" /> Save Received Data
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Manual Calculation Section */}
        <div className="bg-background/50 p-6 rounded-md border mt-6">
          <h3 className="text-lg font-medium mb-2">Manual Comparison</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Manually input totals for comparison. This section is for on-screen
            calculation only and is not saved with the receipt.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <FormLabel>Given Total</FormLabel>
              <Input
                type="number"
                placeholder="Enter Given Total"
                value={form.watch("manualGivenTotal") || ""}
                onChange={(e) =>
                  form.setValue(
                    "manualGivenTotal",
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <FormLabel>Operation</FormLabel>
              <select
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.watch("operation")}
                onChange={(e) =>
                  form.setValue("operation", e.target.value as any)
                }
              >
                <option value="subtract-given-received">
                  Subtract (Given - Received)
                </option>
                <option value="subtract-received-given">
                  Subtract (Received - Given)
                </option>
                <option value="add">Add</option>
              </select>
            </div>

            <div className="space-y-2">
              <FormLabel>Received Total</FormLabel>
              <Input
                type="number"
                placeholder="Enter Received Total"
                value={form.watch("manualReceivedTotal") || ""}
                onChange={(e) =>
                  form.setValue(
                    "manualReceivedTotal",
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <FormLabel>Result</FormLabel>
              <div className="w-full h-10 flex items-center justify-center border rounded-md bg-muted/20 font-medium">
                {calculateManualResult().toFixed(3)}
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
              Incomplete
            </span>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin-receipts")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
