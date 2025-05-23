
import { api } from './api-config';

export const clientServices = {
  // Get all clients
  getClients: async (params = {}) => {
    try {
      const response = await api.get('/clients', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
  },
  
  // Get client by ID
  getClient: async (id) => {
    try {
      const response = await api.get(`/clients/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching client ${id}:`, error);
      throw error;
    }
  },
  
  // Create new client
  createClient: async (clientData) => {
    try {
      const response = await api.post('/clients', clientData);
      return response.data;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  },
  
  // Update client
  updateClient: async (id, clientData) => {
    try {
      const response = await api.put(`/clients/${id}`, clientData);
      return response.data;
    } catch (error) {
      console.error(`Error updating client ${id}:`, error);
      throw error;
    }
  },
  
  // Delete client
  deleteClient: async (id) => {
    try {
      const response = await api.delete(`/clients/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting client ${id}:`, error);
      throw error;
    }
  },
  
  // Search clients
  searchClients: async (query) => {
    try {
      const response = await api.get(`/clients/search?query=${query}`);
      return response.data;
    } catch (error) {
      console.error('Error searching clients:', error);
      throw error;
    }
  }
};
