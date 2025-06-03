import { useState, useEffect } from "react";
import {
  Users,
  FileSpreadsheet,
  Weight,
  FileText,
  Calendar,
  Loader,
  AlertCircle,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  ReceiptsTrendChart,
  MetalTypeTrendChart,
  WeightProcessedChart,
} from "@/components/dashboard/overview-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { analyticsServices } from "@/services/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Dashboard() {
  const [dateRange, setDateRange] = useState("this-month");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activityFilter, setActivityFilter] = useState("all");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching dashboard statistics");
        const data = await analyticsServices.getDashboardStats();
        console.log("Dashboard stats received:", data);

        if (data && data.stats) {
          setDashboardData(data);
        } else {
          throw new Error("Invalid data format received");
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(
          "Failed to load dashboard data. Please check your connection and try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Handle date range change
  const handleDateRangeChange = (value) => {
    setDateRange(value);
    // In a more complete implementation, this would refresh the data with new date range
  };

  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your goldsmith business
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          <>
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-card animate-pulse rounded-lg"
                ></div>
              ))}
          </>
        ) : (
          <>
            <StatCard
              title="Total Clients"
              value={dashboardData?.stats.totalClients.value || "0"}
              description="Active clients"
              icon={<Users className="h-4 w-4" />}
              trend={
                dashboardData?.stats.totalClients.trend || {
                  value: 0,
                  isPositive: true,
                }
              }
            />
            <StatCard
              title="Total Receipts"
              value={dashboardData?.stats.totalReceipts.value || "0"}
              description="All receipts"
              icon={<FileText className="h-4 w-4" />}
              trend={
                dashboardData?.stats.totalReceipts.trend || {
                  value: 0,
                  isPositive: true,
                }
              }
            />
            <StatCard
              title="Work Receipts"
              value={dashboardData?.stats.adminReceipts.value || "0"}
              description="Special receipts"
              icon={<FileSpreadsheet className="h-4 w-4" />}
              trend={
                dashboardData?.stats.adminReceipts.trend || {
                  value: 0,
                  isPositive: true,
                }
              }
            />
            <StatCard
              title="Total Weight"
              value={dashboardData?.stats.totalWeight.value || "0 g"}
              description="Gold processed"
              icon={<Weight className="h-4 w-4" />}
              trend={
                dashboardData?.stats.totalWeight.trend || {
                  value: 0,
                  isPositive: true,
                }
              }
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ReceiptsTrendChart />
        <MetalTypeTrendChart />
      </div>

      <div className="mb-8">
        <WeightProcessedChart />
      </div>

      {/* Recent Activity */}
      <div className="bg-card card-premium rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif font-medium">Recent Activity</h2>
          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="receipts">Receipts</SelectItem>
              <SelectItem value="clients">Clients</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : dashboardData?.recentActivity &&
            dashboardData.recentActivity.length > 0 ? (
            dashboardData.recentActivity.map((activity, i) => (
              <div
                key={activity._id || i}
                className="flex items-center gap-4 p-3 rounded-md hover:bg-accent/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                  <FileText className="h-5 w-5 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Receipt #{activity.voucherId} -{" "}
                    {activity.clientInfo?.clientName || "Unknown Client"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.metalType} - {activity.totals?.grossWt || 0}g
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No recent activity found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
