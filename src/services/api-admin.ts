import axios from "axios";

// Base URL for API calls
const API_URL =
  process.env.NODE_ENV === "production"
    ? "/api"
    : "https://backend-goldsmith.onrender.com/api";

// Configuration for API requests
const config = {
  headers: {
    "Content-Type": "application/json",
  },
};

/**
 * Work Receipt Services
 */
export const adminReceiptServices = {
  // Get all clients
  getClients: async () => {
    const response = await fetch("/api/clients");
    if (!response.ok) throw new Error("Failed to fetch clients");
    return response.json();
  },

  // Get single client by ID
  getClientById: async (id) => {
    const response = await fetch(`/api/clients/${id}`);
    if (!response.ok) throw new Error("Failed to fetch client");
    return response.json();
  },

  // Generate voucher ID
  generateVoucherId: async () => {
    const response = await fetch("/api/admin-receipts/generate-voucher-id");
    if (!response.ok) throw new Error("Failed to generate voucher ID");
    return response.json();
  },

  // Create Work Receipt
  createAdminReceipt: async (receiptData) => {
    const response = await fetch("/api/admin-receipts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(receiptData),
    });
    if (!response.ok) throw new Error("Failed to create Work Receipt");
    return response.json();
  },
};

/**
 * Work Bill Services
 */
export const adminBillServices = {
  // Get all Work Bills
  getAdminBills: async (params = {}) => {
    try {
      // Simulate API call
      // In production, use: const { data } = await axios.get(`${API_URL}/admin-bills`, { ...config, params });

      // Mock data for demo
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockData = [
        {
          _id: "1",
          clientName: "Golden Creations",
          status: "complete",
          voucherId: "GA-2304-1001",
          createdAt: new Date().toISOString(),
          given: {
            date: new Date().toISOString(),
            total: 100,
          },
          received: {
            date: new Date().toISOString(),
            total: 95,
          },
        },
        {
          _id: "2",
          clientName: "Silver Linings",
          status: "incomplete",
          voucherId: "GA-2304-1002",
          createdAt: new Date().toISOString(),
          given: {
            date: new Date().toISOString(),
            total: 50,
          },
          received: {
            date: new Date().toISOString(),
            total: 30,
          },
        },
        {
          _id: "3",
          clientName: "Gem Masters",
          status: "empty",
          voucherId: "GA-2304-1003",
          createdAt: new Date().toISOString(),
          given: {
            date: new Date().toISOString(),
            total: 0,
          },
          received: {
            date: new Date().toISOString(),
            total: 0,
          },
        },
        {
          _id: "4",
          clientName: "Platinum Plus",
          status: "complete",
          voucherId: "GA-2304-1004",
          createdAt: new Date().toISOString(),
          given: {
            date: new Date().toISOString(),
            total: 75,
          },
          received: {
            date: new Date().toISOString(),
            total: 70,
          },
        },
        {
          _id: "5",
          clientName: "Diamond Designs",
          status: "complete",
          voucherId: "GA-2304-1005",
          createdAt: new Date().toISOString(),
          given: {
            date: new Date().toISOString(),
            total: 120,
          },
          received: {
            date: new Date().toISOString(),
            total: 115,
          },
        },
      ];

      return mockData;
    } catch (error) {
      throw error;
    }
  },

  // Get Work Bill by ID
  getAdminBillById: async (id: string) => {
    try {
      // Simulate API call
      // In production, use: const { data } = await axios.get(`${API_URL}/admin-bills/${id}`, config);

      // Mock data for demo
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockData = {
        _id: id,
        clientId: "client123",
        clientName: "Golden Creations",
        status: "complete",
        voucherId: `GA-2304-${1000 + parseInt(id)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        given: {
          date: new Date().toISOString(),
          items: [
            {
              productName: "Gold Bar",
              pureWeight: "100",
              purePercent: "99.5",
              melting: "92.5",
              total: 107.57,
            },
          ],
          totalPureWeight: 99.5,
          total: 107.57,
        },
        received: {
          date: new Date().toISOString(),
          items: [
            {
              productName: "Gold Ring",
              finalOrnamentsWt: "50",
              stoneWeight: "5",
              makingChargePercent: "10",
              subTotal: 45,
              total: 4.5,
            },
          ],
          totalOrnamentsWt: 50,
          totalStoneWeight: 5,
          totalSubTotal: 45,
          total: 4.5,
        },
      };

      return mockData;
    } catch (error) {
      throw error;
    }
  },

  // Delete an Work Bill
  deleteAdminBill: async (id: string) => {
    try {
      // Simulate API call
      // In production, use: const { data } = await axios.delete(`${API_URL}/admin-bills/${id}`, config);

      // Mock response for demo
      await new Promise((resolve) => setTimeout(resolve, 800));

      return { message: "Work Bill deleted successfully" };
    } catch (error) {
      throw error;
    }
  },
};
