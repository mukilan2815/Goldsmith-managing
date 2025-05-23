
import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { analyticsServices } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#B066FE"];

export function ReceiptsTrendChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const today = new Date();
        const startDate = new Date();
        startDate.setMonth(today.getMonth() - 5);
        startDate.setDate(1);
        
        console.log("Fetching receipt trends from:", startDate.toISOString().split('T')[0], "to:", today.toISOString().split('T')[0]);
        
        const response = await analyticsServices.getSalesByDate(
          startDate.toISOString().split('T')[0],
          today.toISOString().split('T')[0]
        );
        
        console.log("Receipt trends data:", response);
        
        if (!response || response.length === 0) {
          console.log("No data returned for receipt trends");
          setData([
            { name: "No Data", receipts: 0, weight: 0 }
          ]);
        } else {
          const processedData = processMonthlyData(response);
          setData(processedData);
        }
      } catch (error) {
        console.error("Error fetching receipt trends:", error);
        setError("Failed to load receipt trends. Please try again.");
        // Set fallback data
        setData([
          { name: "Jan", receipts: 0, weight: 0 },
          { name: "Feb", receipts: 0, weight: 0 },
          { name: "Mar", receipts: 0, weight: 0 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const processMonthlyData = (rawData) => {
    // Group by month
    const monthlyData = {};
    
    if (!Array.isArray(rawData) || rawData.length === 0) {
      return [{ name: "No Data", receipts: 0, weight: 0 }];
    }
    
    rawData.forEach(item => {
      if (!item || !item.date) return;
      
      const date = new Date(item.date);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          name: monthYear,
          receipts: 0,
          weight: 0
        };
      }
      
      monthlyData[monthYear].receipts += item.count || 0;
      monthlyData[monthYear].weight += item.totalWeight || 0;
    });
    
    return Object.values(monthlyData);
  };

  return (
    <Card className="w-full animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle>Receipt Trends</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="receipts"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
                name="Receipts"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="weight"
                stroke="#82ca9d"
                name="Weight (g)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function MetalTypeTrendChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching metal type distribution");
        const response = await analyticsServices.getMetalTypeDistribution();
        
        console.log("Metal type distribution data:", response);
        
        if (!response || response.length === 0) {
          console.log("No data returned for metal type distribution");
          setData([
            { name: "Gold", type: "Gold", value: 0, count: 0 },
            { name: "Silver", type: "Silver", value: 0, count: 0 }
          ]);
        } else {
          // Add a name property for the chart
          const processedData = response.map(item => ({
            ...item,
            name: item.type || "Unknown",
            value: item.count // For pie chart
          }));
          setData(processedData);
        }
      } catch (error) {
        console.error("Error fetching metal type distribution:", error);
        setError("Failed to load metal type distribution. Please try again.");
        
        // Set fallback data
        setData([
          { name: "Gold", type: "Gold", value: 0, count: 0 },
          { name: "Silver", type: "Silver", value: 0, count: 0 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Card className="w-full animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle>Metal Type Distribution</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function WeightProcessedChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching yearly comparison data");
        const yearlyData = await analyticsServices.getYearlyComparison();
        
        console.log("Yearly comparison data:", yearlyData);
        
        if (!yearlyData || (!yearlyData.currentYear && !yearlyData.previousYear)) {
          console.log("No data returned for yearly comparison");
          // Create sample data if no real data
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          setData(months.map(month => ({ 
            name: month, 
            currentYear: 0, 
            previousYear: 0 
          })));
        } else {
          // Process data for comparison chart
          const processedData = processYearlyData(yearlyData);
          setData(processedData);
        }
      } catch (error) {
        console.error("Error fetching weight processed data:", error);
        setError("Failed to load yearly comparison data. Please try again.");
        
        // Create fallback data
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        setData(months.map(month => ({ 
          name: month, 
          currentYear: 0, 
          previousYear: 0 
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const processYearlyData = (data) => {
    if (!data) return [];
    
    const { currentYear = [], previousYear = [] } = data;
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    
    return months.map((month, idx) => {
      const monthNum = idx + 1;
      
      const currYearData = currentYear.find(item => item && item.month === monthNum) || { totalWeight: 0 };
      const prevYearData = previousYear.find(item => item && item.month === monthNum) || { totalWeight: 0 };
      
      return {
        name: month,
        currentYear: currYearData.totalWeight || 0,
        previousYear: prevYearData.totalWeight || 0,
      };
    });
  };

  return (
    <Card className="w-full animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle>Weight Processed - Yearly Comparison</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="currentYear" name="Current Year" fill="#8884d8" />
              <Bar dataKey="previousYear" name="Previous Year" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
