import { Link } from "react-router-dom";
import {
  User,
  Users,
  FileText,
  Receipt,
  FileBarChart2,
  FileStack,
} from "lucide-react";

const quickLinks = [
  {
    title: "New Client",
    href: "/clients/new",
    icon: <User className="h-4 w-4" />,
  },
  {
    title: "Customer Details",
    href: "/clients",
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: "Shop Reciept ",
    href: "/receipts/select-client",
    icon: <Receipt className="h-4 w-4" />,
  },
  {
    title: "Shop Bill",
    href: "/receipts",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Work Receipt",
    href: "/admin-receipts/new", // Changed from "/admin-receipts" to "/admin-receipts/new"
    icon: <FileBarChart2 className="h-4 w-4" />,
  },
  {
    title: "Work Bill",
    href: "/admin-bills",
    icon: <FileStack className="h-4 w-4" />,
  },
];

export function QuickLinks() {
  return (
    <div className="px-3 py-2">
      <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
        Quick Links
      </h2>
      <div className="space-y-1">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-accent"
          >
            {link.icon}
            <span>{link.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
