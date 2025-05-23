import { api } from './api-config';

export const receiptServices = {
  // Get all receipts
  getReceipts: async (params = {}) => {
    try {
      const response = await api.get('/receipts', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching receipts:', error);
      throw error;
    }
  },
  
  // Get receipt by ID
  getReceipt: async (id) => {
    try {
      const response = await api.get(`/receipts/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching receipt ${id}:`, error);
      throw error;
    }
  },
  
  // Get receipts by client ID
  getClientReceipts: async (clientId, params = {}) => {
    try {
      const response = await api.get(`/receipts/client/${clientId}`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching receipts for client ${clientId}:`, error);
      throw error;
    }
  },
  
  // Create new receipt
  createReceipt: async (receiptData) => {
    try {
      console.log('Sending receipt data to server:', JSON.stringify(receiptData));
      
      // Ensure data format exactly matches the expected MongoDB structure
      // We're keeping the strings as strings and not converting numbers to allow the backend to handle any necessary coercions
      const response = await api.post('/receipts', receiptData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Receipt creation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating receipt:', error);
      throw error;
    }
  },
  
  // Update receipt
  updateReceipt: async (id, receiptData) => {
    try {
      const response = await api.put(`/receipts/${id}`, receiptData);
      return response.data;
    } catch (error) {
      console.error(`Error updating receipt ${id}:`, error);
      throw error;
    }
  },
  
  // Delete receipt
  deleteReceipt: async (id) => {
    try {
      const response = await api.delete(`/receipts/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting receipt ${id}:`, error);
      throw error;
    }
  },
  
  // Generate unique voucher ID
  generateVoucherId: async () => {
    try {
      const response = await api.get('/receipts/generate-voucher-id');
      return response.data;
    } catch (error) {
      console.error('Error generating voucher ID:', error);
      throw error;
    }
  },
  
  // Search receipts
  searchReceipts: async (query) => {
    try {
      const response = await api.get(`/receipts/search?query=${query}`);
      return response.data;
    } catch (error) {
      console.error('Error searching receipts:', error);
      throw error;
    }
  }
};
