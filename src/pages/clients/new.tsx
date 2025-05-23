
import { ClientForm } from "@/components/clients/client-form";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function NewClientPage() {
  const navigate = useNavigate();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <motion.div 
      className="container mx-auto py-8 px-4 sm:px-6 h-full w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="mb-4">
        <Button
          variant="ghost"
          className="mb-2"
          onClick={() => navigate("/clients")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
        </Button>
      </motion.div>

      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-3xl font-serif font-bold">Add New Client</h1>
        <p className="text-muted-foreground mt-1">
          Register a new client for your goldsmith business
        </p>
      </motion.div>

      <motion.div 
        variants={itemVariants} 
        className="bg-card rounded-lg p-6 shadow-md border border-border"
      >
        <ClientForm />
      </motion.div>
    </motion.div>
  );
}
