
import { api } from './api-config';

export const analyticsServices = {
  getDashboardStats: async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error; 
    }
  },
  
  getSalesByDate: async (startDate, endDate) => {
    try {
      const response = await api.get(`/analytics/sales?startDate=${startDate}&endDate=${endDate}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sales data:', error);
      throw error;
    }
  },
  
  getMetalTypeDistribution: async () => {
    try {
      const response = await api.get('/analytics/metal-types');
      return response.data;
    } catch (error) {
      console.error('Error fetching metal type distribution:', error);
      throw error;
    }
  },
  
  getYearlyComparison: async () => {
    try {
      const response = await api.get('/analytics/yearly-comparison');
      return response.data;
    } catch (error) {
      console.error('Error fetching yearly comparison:', error);
      throw error;
    }
  }
};
