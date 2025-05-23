
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { clientServices, receiptServices } from '../services/api';
import { toast } from '@/components/ui/use-toast';

// Define types for our state
interface Client {
  id: string;
  shopName: string;
  clientName: string;
  phoneNumber: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

interface ReceiptItem {
  itemName: string;
  tag: string;
  grossWt: number;
  stoneWt: number;
  meltingTouch: number;
  stoneAmt: number;
}

interface Receipt {
  id: string;
  clientId: string;
  clientInfo: {
    clientName: string;
    shopName: string;
    phoneNumber: string;
  };
  metalType: string;
  issueDate: string;
  items: ReceiptItem[];
  totals: {
    grossWt: number;
    stoneWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface DataContextType {
  clients: Client[];
  receipts: Receipt[];
  isLoading: {
    clients: boolean;
    receipts: boolean;
  };
  error: {
    clients: string | null;
    receipts: string | null;
  };
  fetchClients: () => Promise<void>;
  fetchReceipts: () => Promise<void>;
  fetchClientReceipts: (clientId: string) => Promise<Receipt[]>;
  addClient: (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Client>;
  updateClient: (id: string, clientData: Partial<Client>) => Promise<Client>;
  deleteClient: (id: string) => Promise<void>;
  addReceipt: (receiptData: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Receipt>;
  updateReceipt: (id: string, receiptData: Partial<Receipt>) => Promise<Receipt>;
  deleteReceipt: (id: string) => Promise<void>;
  generateVoucherId: () => Promise<string>;
}

// Create the context with default values
const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider component
export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState({
    clients: false,
    receipts: false,
  });
  const [error, setError] = useState({
    clients: null as string | null,
    receipts: null as string | null,
  });

  // Fetch all clients
  const fetchClients = async () => {
    setIsLoading(prev => ({ ...prev, clients: true }));
    setError(prev => ({ ...prev, clients: null }));
    
    try {
      const data = await clientServices.getClients();
      setClients(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch clients';
      setError(prev => ({ ...prev, clients: errorMessage }));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(prev => ({ ...prev, clients: false }));
    }
  };

  // Fetch all receipts
  const fetchReceipts = async () => {
    setIsLoading(prev => ({ ...prev, receipts: true }));
    setError(prev => ({ ...prev, receipts: null }));
    
    try {
      const data = await receiptServices.getReceipts();
      setReceipts(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch receipts';
      setError(prev => ({ ...prev, receipts: errorMessage }));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(prev => ({ ...prev, receipts: false }));
    }
  };

  // Fetch receipts for a specific client
  const fetchClientReceipts = async (clientId: string) => {
    try {
      const data = await receiptServices.getClientReceipts(clientId);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch client receipts';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return [];
    }
  };

  // Add new client
  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newClient = await clientServices.createClient(clientData);
      setClients(prev => [...prev, newClient]);
      toast({
        title: 'Success',
        description: 'Client added successfully',
      });
      return newClient;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add client';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Update client
  const updateClient = async (id: string, clientData: Partial<Client>) => {
    try {
      const updatedClient = await clientServices.updateClient(id, clientData);
      setClients(prev => prev.map(client => client.id === id ? updatedClient : client));
      toast({
        title: 'Success',
        description: 'Client updated successfully',
      });
      return updatedClient;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update client';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Delete client
  const deleteClient = async (id: string) => {
    try {
      await clientServices.deleteClient(id);
      setClients(prev => prev.filter(client => client.id !== id));
      toast({
        title: 'Success',
        description: 'Client deleted successfully',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete client';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Add new receipt
  const addReceipt = async (receiptData: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newReceipt = await receiptServices.createReceipt(receiptData);
      setReceipts(prev => [...prev, newReceipt]);
      toast({
        title: 'Success',
        description: 'Receipt added successfully',
      });
      return newReceipt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add receipt';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Update receipt
  const updateReceipt = async (id: string, receiptData: Partial<Receipt>) => {
    try {
      const updatedReceipt = await receiptServices.updateReceipt(id, receiptData);
      setReceipts(prev => prev.map(receipt => receipt.id === id ? updatedReceipt : receipt));
      toast({
        title: 'Success',
        description: 'Receipt updated successfully',
      });
      return updatedReceipt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update receipt';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Delete receipt
  const deleteReceipt = async (id: string) => {
    try {
      await receiptServices.deleteReceipt(id);
      setReceipts(prev => prev.filter(receipt => receipt.id !== id));
      toast({
        title: 'Success',
        description: 'Receipt deleted successfully',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete receipt';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Generate a unique voucher ID
  const generateVoucherId = async () => {
    try {
      const data = await receiptServices.generateVoucherId();
      return data.voucherId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate voucher ID';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      // Return a fallback ID in case of error
      return `GS-${Date.now().toString().slice(-6)}`;
    }
  };

  // Value object for the context provider
  const value = {
    clients,
    receipts,
    isLoading,
    error,
    fetchClients,
    fetchReceipts,
    fetchClientReceipts,
    addClient,
    updateClient,
    deleteClient,
    addReceipt,
    updateReceipt,
    deleteReceipt,
    generateVoucherId,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// Custom hook to use the context
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
