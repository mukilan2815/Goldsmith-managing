
import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();
  
  const handleToggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <Sidebar 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className={`flex flex-1 flex-col min-h-screen max-h-screen overflow-y-auto transition-all duration-300 ${sidebarOpen && !isMobile ? 'ml-64' : 'ml-0'}`}>
          <Navbar onMenuClick={handleToggleSidebar} />
          <main className="flex-1 pb-8 w-full animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
