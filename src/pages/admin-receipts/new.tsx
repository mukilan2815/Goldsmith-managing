import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Plus,
  Loader,
  Calendar,
  Save,
  Trash2,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import axios from "axios";

const api = axios.create({
  baseURL: "https://backend-goldsmith.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

const clientApi = {
  getClients: async (): Promise<Client[]> => {
    const response = await api.get("/clients");
    const data = response.data;
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data.clients)
      ? data.clients
      : [];
    return rawList.map((c: any) => ({
      id: c._id,
      name: c.clientName,
      shopName: c.shopName,
      phoneNumber: c.phoneNumber,
      address: c.address,
      balance: c.balance || 0,
    }));
  },

  getClientById: async (id: string) => {
    const response = await api.get(`/clients/${id}`);
    const c = response.data;
    return {
      id: c._id,
      name: c.clientName,
      shopName: c.shopName,
      phoneNumber: c.phoneNumber,
      address: c.address,
      balance: c.balance || 0,
    };
  },
};

const adminReceiptApi = {
  getAdminReceipts: async (clientId: string | null = null) => {
    const params = clientId ? { clientId } : {};
    const response = await api.get("/admin-receipts", { params });
    return response.data;
  },

  getAdminReceiptById: async (id: string) => {
    const response = await api.get(`/admin-receipts/${id}`);
    return response.data;
  },

  createAdminReceipt: async (receiptData: any) => {
    const response = await api.post("/admin-receipts", receiptData);
    return response.data;
  },

  updateAdminReceipt: async (id: string, receiptData: any) => {
    const response = await api.put(`/admin-receipts/${id}`, receiptData);
    return response.data;
  },

  deleteAdminReceipt: async (id: string) => {
    const response = await api.delete(`/admin-receipts/${id}`);
    return response.data;
  },

  generateVoucherId: async () => {
    const response = await api.get("/admin-receipts/generate-voucher-id");
    return response.data.voucherId;
  },
};

const mockClients = [
  {
    id: "683eb8582febef63b0100fc8",
    name: "test",
    shopName: "Testing shop",
    phoneNumber: "07448359935",
    address: "Muthumariyamman muttai kadai , Teachers colony podanur",
    balance: 0,
  },
  {
    id: "1002",
    name: "Silver Linings",
    shopName: "Silver Shop",
    phoneNumber: "9080705040",
    address: "456 Silver Ave",
    balance: 1000,
  },
  {
    id: "1003",
    name: "Gem Masters",
    shopName: "Gem World",
    phoneNumber: "9845939045",
    address: "789 Gem Blvd",
    balance: -500,
  },
  {
    id: "1004",
    name: "Platinum Plus",
    shopName: "Platinum Gallery",
    phoneNumber: "8090847974",
    address: "101 Platinum Rd",
    balance: 2500,
  },
  {
    id: "1005",
    name: "Diamond Designs",
    shopName: "Diamond Hub",
    phoneNumber: "7070707070",
    address: "202 Diamond Lane",
    balance: 0,
  },
];

interface Client {
  id: string;
  name: string;
  shopName: string;
  phoneNumber: string;
  address: string;
  balance: number;
}

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

export default function NewAdminReceiptPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<string>("given");
  const [isSubmittingGiven, setIsSubmittingGiven] = useState<boolean>(false);
  const [isSubmittingReceived, setIsSubmittingReceived] =
    useState<boolean>(false);
  const [voucherId, setVoucherId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState<boolean>(false);
  const [shopNameFilter, setShopNameFilter] = useState<string>("");
  const [clientNameFilter, setClientNameFilter] = useState<string>("");
  const [phoneFilter, setPhoneFilter] = useState<string>("");
  const [givenDate, setGivenDate] = useState<Date>(new Date());
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
  const [receivedDate, setReceivedDate] = useState<Date>(new Date());
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
  const [manualGivenTotal, setManualGivenTotal] = useState<number>(0);
  const [manualReceivedTotal, setManualReceivedTotal] = useState<number>(0);
  const [operation, setOperation] = useState<string>("subtract-given-received");
  const [clientBalance, setClientBalance] = useState<number>(0);

  useEffect(() => {
    const initPage = async () => {
      try {
        if (!id) {
          try {
            const generatedId = await adminReceiptApi.generateVoucherId();
            setVoucherId(generatedId);
          } catch (error) {
            setVoucherId(
              `GA-${new Date().getFullYear().toString().substr(-2)}${(
                new Date().getMonth() + 1
              )
                .toString()
                .padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`
            );
          }
        }

        await loadClients();

        if (id) {
          await loadReceiptData(id);
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to initialize page. Please try again.",
        });
      }
    };

    initPage();
  }, [id]);

  const loadClients = async () => {
    setIsLoadingClients(true);
    try {
      const clientsData = await clientApi.getClients();
      if (Array.isArray(clientsData)) {
        setClients(clientsData);
      } else {
        setClients(mockClients);
        toast({
          variant: "warning",
          title: "Warning",
          description:
            "Using mock client data due to API response format issue.",
        });
      }
    } catch (error) {
      setClients(mockClients);
      toast({
        variant: "warning",
        title: "Warning",
        description: "Using mock client data due to API error.",
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  const loadReceiptData = async (receiptId: string) => {
    setIsLoading(true);
    try {
      const receipt = await adminReceiptApi.getAdminReceiptById(receiptId);

      if (receipt.voucherId) {
        setVoucherId(receipt.voucherId);
      }

      try {
        if (receipt.clientId) {
          const client = await clientApi.getClientById(receipt.clientId);
          if (client) {
            setSelectedClient(client);
            setClientBalance(client.balance || 0);
          }
        }
      } catch (clientError) {
        if (receipt.clientName) {
          setSelectedClient({
            id: receipt.clientId || "unknown",
            name: receipt.clientName,
            shopName: "Unknown Shop",
            phoneNumber: "",
            address: "",
            balance: 0,
          });
          setClientBalance(0);
        }
      }

      if (receipt.given) {
        if (receipt.given.date) {
          setGivenDate(new Date(receipt.given.date));
        }
        if (
          Array.isArray(receipt.given.items) &&
          receipt.given.items.length > 0
        ) {
          setGivenItems(
            receipt.given.items.map((item: any) => ({
              ...item,
              id: item.id || uuidv4(),
            }))
          );
        }
        if (typeof receipt.given.total === "number") {
          setManualGivenTotal(receipt.given.total);
        }
      }

      if (receipt.received) {
        if (receipt.received.date) {
          setReceivedDate(new Date(receipt.received.date));
        }
        if (
          Array.isArray(receipt.received.items) &&
          receipt.received.items.length > 0
        ) {
          setReceivedItems(
            receipt.received.items.map((item: any) => ({
              ...item,
              id: item.id || uuidv4(),
            }))
          );
        }
        if (typeof receipt.received.total === "number") {
          setManualReceivedTotal(receipt.received.total);
        }
      }

      if (receipt.manualCalculations) {
        setManualGivenTotal(receipt.manualCalculations.givenTotal || 0);
        setManualReceivedTotal(receipt.manualCalculations.receivedTotal || 0);
        setOperation(
          receipt.manualCalculations.operation || "subtract-given-received"
        );
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load receipt data. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClients = Array.isArray(clients)
    ? clients.filter((client) => {
        const matchesShopName = client.shopName
          .toLowerCase()
          .includes(shopNameFilter.toLowerCase());
        const matchesClientName = client.name
          .toLowerCase()
          .includes(clientNameFilter.toLowerCase());
        const matchesPhone = client.phoneNumber.includes(phoneFilter);

        return matchesShopName && matchesClientName && matchesPhone;
      })
    : [];

  const handleSelectClient = async (client: Client) => {
    try {
      const clientData = await clientApi.getClientById(client.id);
      setSelectedClient(clientData);
      setClientBalance(clientData.balance || 0);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load client balance",
      });
    }
  };

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

  const updateGivenItem = (
    id: string,
    field: keyof GivenItem,
    value: string
  ) => {
    setGivenItems(
      givenItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          if (["pureWeight", "purePercent", "melting"].includes(field)) {
            const pureWeight = parseFloat(updatedItem.pureWeight) || 0;
            const purePercent = parseFloat(updatedItem.purePercent) || 0;
            const melting = parseFloat(updatedItem.melting) || 1;

            // Assuming total is in grams for consistency with balance
            updatedItem.total = (pureWeight * purePercent) / 100 / melting;
          }

          return updatedItem;
        }
        return item;
      })
    );
  };

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

  const updateReceivedItem = (
    id: string,
    field: keyof ReceivedItem,
    value: string
  ) => {
    setReceivedItems(
      receivedItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

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

            updatedItem.subTotal = finalOrnamentsWt - stoneWeight;
            updatedItem.total =
              updatedItem.subTotal * (1 + makingChargePercent / 100);
          }

          return updatedItem;
        }
        return item;
      })
    );
  };

  const givenTotals = {
    totalPureWeight: givenItems.reduce((acc, item) => {
      const pureWeight = parseFloat(item.pureWeight) || 0;
      const purePercent = parseFloat(item.purePercent) || 0;
      return acc + (pureWeight * purePercent) / 100;
    }, 0),
    total: givenItems.reduce((acc, item) => acc + item.total, 0),
  };

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

  useEffect(() => {
    setManualGivenTotal(givenTotals.total);
  }, [givenTotals.total]);

  useEffect(() => {
    setManualReceivedTotal(receivedTotals.total);
  }, [receivedTotals.total]);

  const calculateManualResult = () => {
    const given = manualGivenTotal || 0;
    const received = manualReceivedTotal || 0;
    let result;
    switch (operation) {
      case "subtract-given-received":
        result = given - received;
        break;
      case "subtract-received-given":
        result = received - given;
        break;
      case "add":
        result = given + received;
        break;
      default:
        result = 0;
    }
    return result;
  };

  const calculateNewBalance = () => {
    const hasGivenItems = givenItems.some((item) => item.productName);
    const hasReceivedItems = receivedItems.some((item) => item.productName);

    let balanceAdjustment = 0;
    if (hasGivenItems && hasReceivedItems) {
      balanceAdjustment = calculateManualResult();
    } else if (hasGivenItems) {
      balanceAdjustment = givenTotals.total;
    } else if (hasReceivedItems) {
      balanceAdjustment = -receivedTotals.total;
    }

    return clientBalance + balanceAdjustment;
  };

  const saveGivenData = async () => {
    if (!selectedClient) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a client first",
      });
      return;
    }

    setIsSubmittingGiven(true);

    try {
      // Validate given items
      for (const item of givenItems) {
        if (
          !item.productName ||
          !item.pureWeight ||
          !item.purePercent ||
          !item.melting ||
          parseFloat(item.pureWeight) <= 0 ||
          parseFloat(item.purePercent) <= 0 ||
          parseFloat(item.melting) <= 0
        ) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description:
              "Please fill all required fields with valid values for each given item",
          });
          setIsSubmittingGiven(false);
          return;
        }
      }

      // Calculate balance adjustment
      const hasReceivedItems = receivedItems.some((item) => item.productName);
      const balanceAdjustment = hasReceivedItems
        ? calculateManualResult()
        : givenTotals.total;
      const newBalance = clientBalance + balanceAdjustment;

      // Update client balance in the database
      await api.put(`/clients/${selectedClient.id}`, {
        balance: newBalance,
      });

      // Prepare given data
      const givenData = {
        date: givenDate,
        items: givenItems,
        totalPureWeight: givenTotals.totalPureWeight,
        total: givenTotals.total,
      };

      const status = hasReceivedItems ? "complete" : "incomplete";

      // Prepare receipt data
      const receiptData = {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        given: givenData,
        status,
        manualCalculations: {
          givenTotal: manualGivenTotal,
          receivedTotal: manualReceivedTotal,
          operation,
          result: calculateManualResult(),
        },
      };

      if (id) {
        // Update existing receipt
        await adminReceiptApi.updateAdminReceipt(id, {
          given: givenData,
          status,
          manualCalculations: {
            givenTotal: manualGivenTotal,
            receivedTotal: manualReceivedTotal,
            operation,
            result: calculateManualResult(),
          },
        });
      } else {
        // Create new receipt
        if (hasReceivedItems) {
          receiptData.received = {
            date: receivedDate,
            items: receivedItems,
            totalOrnamentsWt: receivedTotals.totalOrnamentsWt,
            totalStoneWeight: receivedTotals.totalStoneWeight,
            totalSubTotal: receivedTotals.totalSubTotal,
            total: receivedTotals.total,
          };
        }

        const newReceipt = await adminReceiptApi.createAdminReceipt(
          receiptData
        );
        if (newReceipt && newReceipt._id) {
          navigate(`/admin-receipts/${newReceipt._id}`, { replace: true });
        }
      }

      // Update frontend state
      setClientBalance(newBalance);

      toast({
        title: "Success",
        description: `Given items saved successfully. New balance: ${newBalance.toFixed(
          2
        )}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response?.data?.message || "Failed to save given items",
      });
    } finally {
      setIsSubmittingGiven(false);
    }
  };

  const saveReceivedData = async () => {
    if (!selectedClient) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a client first",
      });
      return;
    }

    setIsSubmittingReceived(true);

    try {
      // Validate received items
      for (const item of receivedItems) {
        if (
          !item.productName ||
          !item.finalOrnamentsWt ||
          !item.makingChargePercent ||
          parseFloat(item.finalOrnamentsWt) <= 0 ||
          parseFloat(item.makingChargePercent) < 0
        ) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description:
              "Please fill all required fields with valid values for each received item",
          });
          setIsSubmittingReceived(false);
          return;
        }
      }

      // Calculate balance adjustment
      const hasGivenItems = givenItems.some((item) => item.productName);
      const balanceAdjustment = hasGivenItems
        ? calculateManualResult()
        : -receivedTotals.total;
      const newBalance = clientBalance + balanceAdjustment;

      // Update client balance in the database
      await api.put(`/clients/${selectedClient.id}`, {
        balance: newBalance,
      });

      // Prepare received data
      const receivedData = {
        date: receivedDate,
        items: receivedItems,
        totalOrnamentsWt: receivedTotals.totalOrnamentsWt,
        totalStoneWeight: receivedTotals.totalStoneWeight,
        totalSubTotal: receivedTotals.totalSubTotal,
        total: receivedTotals.total,
      };

      const status = hasGivenItems ? "completed" : "incomplete";

      // Prepare receipt data
      const receiptData = {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        received: receivedData,
        status,
        manualCalculations: {
          givenTotal: manualGivenTotal,
          receivedTotal: manualReceivedTotal,
          operation,
          result: calculateManualResult(),
        },
      };

      if (id) {
        // Update existing receipt
        await adminReceiptApi.updateAdminReceipt(id, {
          received: receivedData,
          status,
          manualCalculations: {
            givenTotal: manualGivenTotal,
            receivedTotal: manualReceivedTotal,
            operation,
            result: calculateManualResult(),
          },
        });
      } else {
        // Create new receipt
        if (hasGivenItems) {
          receiptData.given = {
            date: givenDate,
            items: givenItems,
            totalPureWeight: givenTotals.totalPureWeight,
            total: givenTotals.total,
          };
        }

        const newReceipt = await adminReceiptApi.createAdminReceipt(
          receiptData
        );
        if (newReceipt && newReceipt._id) {
          navigate(`/admin-receipts/${newReceipt._id}`, { replace: true });
        }
      }

      // Update frontend state
      setClientBalance(newBalance);

      toast({
        title: "Success",
        description: `Received items saved successfully. New balance: ${newBalance.toFixed(
          2
        )}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response?.data?.message || "Failed to save received items",
      });
    } finally {
      setIsSubmittingReceived(false);
    }
  };

  return (
    <div className="container py-6">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/admin-receipts")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Work Receipts
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {!selectedClient
            ? "Work Receipt - Select Client"
            : `Work Receipt for: ${selectedClient.name}`}
        </h1>
        <p className="text-muted-foreground">
          {selectedClient
            ? "Manage given and received items. Data will be saved to the database."
            : "Filter and select a client. Client data is loaded from the database."}
        </p>
        {selectedClient && (
          <div className="mt-4 p-4 border rounded-md bg-muted/50">
            <div className="flex justify-between items-center">
              <div className="font-medium text-lg">
                Current Balance: {clientBalance.toFixed(2)} | New Balance After
                this form: {calculateNewBalance().toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>

      {!selectedClient ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Client</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <Input
                  type="text"
                  placeholder="Filter by Shop Name"
                  value={shopNameFilter}
                  onChange={(e) => setShopNameFilter(e.target.value)}
                />
              </div>
              <div>
                <Input
                  type="text"
                  placeholder="Filter by Client Name"
                  value={clientNameFilter}
                  onChange={(e) => setClientNameFilter(e.target.value)}
                />
              </div>
              <div>
                <Input
                  type="text"
                  placeholder="Filter by Phone Number"
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingClients ? (
              <div className="text-center py-6">
                <Loader className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading clients...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <div key={client.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{client.name}</h3>
                          <div className="text-sm text-muted-foreground">
                            <div>Shop: {client.shopName}</div>
                            <div>Phone: {client.phoneNumber}</div>
                            <div>Address: {client.address}</div>
                            <div>Balance: {client.balance.toFixed(2)}</div>
                          </div>
                        </div>
                        <Button
                          className="bg-yellow-400 hover:bg-yellow-500 text-black"
                          onClick={() => handleSelectClient(client)}
                        >
                          Select Client
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    No clients found matching the filters
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-xl">
                  Work Receipt for: {selectedClient.name}
                </CardTitle>
                <CardDescription>
                  Manage given and received items. Data will be saved to the
                  database.
                </CardDescription>
              </div>
              <div className="bg-primary/10 px-3 py-1 rounded-md text-primary font-medium">
                Voucher ID: {voucherId}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="given">Given Items</TabsTrigger>
                  <TabsTrigger value="received">Received Items</TabsTrigger>
                </TabsList>

                <TabsContent value="given" className="space-y-6 pt-4">
                  <div className="bg-card rounded-md border">
                    <div className="p-4 flex flex-col md:flex-row justify-between md:items-center border-b">
                      <h3 className="text-lg font-medium">
                        Given Details (Client: {selectedClient.name})
                      </h3>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full md:w-[240px] mt-2 md:mt-0 justify-start text-left font-normal"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {givenDate ? (
                              format(givenDate, "PPP")
                            ) : (
                              <span>Pick Given Date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <CalendarComponent
                            mode="single"
                            selected={givenDate}
                            onSelect={setGivenDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="p-4">
                      <div className="space-y-4">
                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-7 gap-4 p-3 bg-muted/50 rounded-md">
                          <div className="col-span-2 font-medium">
                            Product Name
                          </div>
                          <div className="font-medium">Pure Weight (g)</div>
                          <div className="font-medium">Pure %</div>
                          <div className="font-medium">Melting</div>
                          <div className="font-medium">Total (g)</div>
                          <div className="font-medium">Action</div>
                        </div>

                        {/* Table Rows */}
                        {givenItems.map((item) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-1 md:grid-cols-7 gap-3 p-2 border rounded-md"
                          >
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium mb-1 block md:hidden">
                                Product Name
                              </label>
                              <Input
                                placeholder="Product Name"
                                value={item.productName}
                                onChange={(e) =>
                                  updateGivenItem(
                                    item.id,
                                    "productName",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block md:hidden">
                                Pure Weight (g)
                              </label>
                              <Input
                                type="number"
                                placeholder="Pure Weight"
                                value={item.pureWeight}
                                min="0"
                                step="0.01"
                                onChange={(e) =>
                                  updateGivenItem(
                                    item.id,
                                    "pureWeight",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block md:hidden">
                                Pure %
                              </label>
                              <Input
                                type="number"
                                placeholder="Pure %"
                                value={item.purePercent}
                                min="0"
                                step="0.01"
                                onChange={(e) =>
                                  updateGivenItem(
                                    item.id,
                                    "purePercent",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block md:hidden">
                                Melting
                              </label>
                              <Input
                                type="number"
                                placeholder="Melting"
                                value={item.melting}
                                min="0.01"
                                step="0.01"
                                onChange={(e) =>
                                  updateGivenItem(
                                    item.id,
                                    "melting",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block md:hidden">
                                Total (g)
                              </label>
                              <div className="font-medium">
                                {item.total.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeGivenItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        {/* Totals Row */}
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-3 border rounded-md bg-muted/50 font-medium">
                          <div className="md:col-span-2">Totals</div>
                          <div>{givenTotals.totalPureWeight.toFixed(2)}</div>
                          <div>-</div>
                          <div>-</div>
                          <div>{givenTotals.total.toFixed(2)}</div>
                          <div></div>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={addGivenItem}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                      </div>

                      {/* Save Button Section */}
                      <div className="mt-6 flex justify-end">
                        <Button
                          className="bg-yellow-400 hover:bg-yellow-500 text-black"
                          onClick={saveGivenData}
                          disabled={isSubmittingGiven}
                        >
                          {isSubmittingGiven ? (
                            <>
                              <Loader className="mr-2 h-4 w-4 animate-spin" />{" "}
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" /> Save Given Items
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="received" className="space-y-6 pt-4">
                  <div className="bg-card rounded-md border">
                    <div className="p-4 flex flex-col md:flex-row justify-between md:items-center border-b">
                      <h3 className="text-lg font-medium">
                        Received Details (Client: {selectedClient.name})
                      </h3>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full md:w-[240px] mt-2 md:mt-0 justify-start text-left font-normal"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {receivedDate ? (
                              format(receivedDate, "PPP")
                            ) : (
                              <span>Pick Received Date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <CalendarComponent
                            mode="single"
                            selected={receivedDate}
                            onSelect={setReceivedDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="p-4">
                      <div className="space-y-4">
                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-7 gap-4 p-3 bg-muted/50 rounded-md">
                          <div className="col-span-2 font-medium">
                            Product Name
                          </div>
                          <div className="font-medium">
                            Final Ornaments Wt (g)
                          </div>
                          <div className="font-medium">Stone Weight (g)</div>
                          <div className="font-medium">Making Charge %</div>
                          <div className="font-medium">Total (g)</div>
                          <div className="font-medium">Action</div>
                        </div>

                        {/* Table Rows */}
                        {receivedItems.map((item) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-1 md:grid-cols-7 gap-4 p-3 border rounded-md"
                          >
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium mb-1 block md:hidden">
                                Product Name
                              </label>
                              <Input
                                placeholder="Product Name"
                                value={item.productName}
                                onChange={(e) =>
                                  updateReceivedItem(
                                    item.id,
                                    "productName",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block md:hidden">
                                Final Ornaments Wt (g)
                              </label>
                              <Input
                                type="number"
                                placeholder="Final Ornaments Wt"
                                value={item.finalOrnamentsWt}
                                min="0"
                                step="0.01"
                                onChange={(e) =>
                                  updateReceivedItem(
                                    item.id,
                                    "finalOrnamentsWt",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block md:hidden">
                                Stone Weight (g)
                              </label>
                              <Input
                                type="number"
                                placeholder="Stone Weight"
                                value={item.stoneWeight}
                                min="0"
                                step="0.01"
                                onChange={(e) =>
                                  updateReceivedItem(
                                    item.id,
                                    "stoneWeight",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block md:hidden">
                                Making Charge %
                              </label>
                              <Input
                                type="number"
                                placeholder="Making Charge %"
                                value={item.makingChargePercent}
                                min="0"
                                step="0.01"
                                onChange={(e) =>
                                  updateReceivedItem(
                                    item.id,
                                    "makingChargePercent",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block md:hidden">
                                Total (g)
                              </label>
                              <div className="font-medium">
                                {item.total.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeReceivedItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        {/* Totals Row */}
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-3 border rounded-md bg-muted/50 font-medium">
                          <div className="md:col-span-2">Totals</div>
                          <div>
                            {receivedTotals.totalOrnamentsWt.toFixed(2)}
                          </div>
                          <div>
                            {receivedTotals.totalStoneWeight.toFixed(2)}
                          </div>
                          <div>-</div>
                          <div>{receivedTotals.total.toFixed(2)}</div>
                          <div></div>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={addReceivedItem}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                      </div>

                      {/* Grand Total and Save Button */}
                      <div className="mt-6 p-4 border rounded-md bg-muted/50">
                        <div className="flex justify-between items-center">
                          <div className="font-medium">
                            Grand Total: {receivedTotals.total.toFixed(2)}
                          </div>
                          <Button
                            className="bg-yellow-400 hover:bg-yellow-500 text-black"
                            onClick={saveReceivedData}
                            disabled={isSubmittingReceived}
                          >
                            {isSubmittingReceived ? (
                              <>
                                <Loader className="mr-2 h-4 w-4 animate-spin" />{" "}
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" /> Save Received
                                Items
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manual Calculation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Given Total (g)
                  </label>
                  <Input
                    type="number"
                    value={manualGivenTotal}
                    min="0"
                    step="0.01"
                    onChange={(e) =>
                      setManualGivenTotal(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Operation
                  </label>
                  <select
                    className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                    value={operation}
                    onChange={(e) => setOperation(e.target.value)}
                  >
                    <option value="subtract-given-received">
                      Given - Received
                    </option>
                    <option value="subtract-received-given">
                      Received - Given
                    </option>
                    <option value="add">Given + Received</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Received Total (g)
                  </label>
                  <Input
                    type="number"
                    value={manualReceivedTotal}
                    min="0"
                    step="0.01"
                    onChange={(e) =>
                      setManualReceivedTotal(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>

              <div className="mt-6 p-4 border rounded-md bg-muted/50">
                <div className="flex justify-between items-center">
                  <div className="font-medium">Result:</div>
                  <div className="text-xl font-bold">
                    {calculateManualResult().toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
