export interface ReceiptItem {
  id: string;
  itemName: string; // Changed from description
  tag?: string;
  grossWt: number; // Changed from grossWeight
  stoneWt: number; // Changed from stoneWeight
  meltingTouch: number; // Changed from meltingPercent
  netWt: number; // Changed from netWeight
  finalWt: number; // Changed from finalWeight
  stoneAmt?: number; // Changed from stoneAmount
  // Removed rate and amount as they weren't in the MongoDB document
}

export interface Receipt {
  _id: string; // Changed from id to match MongoDB
  clientId: string; // Changed from client object to just ID
  clientInfo: {
    // Changed structure to match MongoDB
    clientName: string; // Changed from name
    shopName: string;
    phoneNumber: string; // Changed from mobile
    address?: string;
  };
  metalType: string;
  issueDate: string | Date; // Changed from date
  voucherId: string; // Added this field
  items: ReceiptItem[];
  totals: {
    // Changed from individual total fields
    grossWt: number;
    stoneWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
  };
  overallWeight?: number;
  paymentStatus: "Pending" | "Paid" | "Partial"; // Added this field
  isCompleted: boolean; // Added this field
  createdAt: string | Date;
  updatedAt: string | Date;
  // Removed unit as it wasn't in the MongoDB document
  // Removed totalAmount as it wasn't in the MongoDB document
}
