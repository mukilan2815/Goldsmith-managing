export interface ReceivedItem {
  id: string;
  description: string;
  type: string;
  weight: number | string;
  amount: number | string;
  date?: string; // Add date field for each received item
}

export interface ReceiptItem {
  id: string;
  itemName: string; // Changed from description
  tag?: string;
  grossWt: number | string; // Allow string for empty state
  stoneWt: number | string; // Allow string for empty state
  meltingTouch: number | string; // Allow string for empty state
  netWt: number; // Always calculated, so number
  finalWt: number; // Always calculated, so number
  stoneAmt?: number | string; // Allow string for empty state
  date?: string; // Add date field for each item
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
  givenItems: ReceiptItem[]; // Changed from items to givenItems
  receivedItems?: ReceivedItem[]; // Add receivedItems
  totals: {
    // Changed from individual total fields
    grossWt: number;
    stoneWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
    totalInvoiceAmount?: number; // Add total invoice amount
  };
  overallWeight?: number;
  paymentStatus: "Pending" | "Paid" | "Partial"; // Added this field
  isCompleted: boolean; // Added this field
  status: "incomplete" | "complete" | "cancelled"; // Receipt status field
  createdAt: string | Date;
  updatedAt: string | Date;
  // Removed unit as it wasn't in the MongoDB document
  // Removed totalAmount as it wasn't in the MongoDB document
}
