
export interface ReceiptItem {
  id: string;
  description: string;
  tag?: string;
  grossWeight: number;
  stoneWeight: number;
  meltingPercent: number;
  rate: number;
  netWeight: number;
  finalWeight: number;
  amount: number;
  stoneAmount?: number;
}

export interface Receipt {
  id: string;
  client: {
    id: string;
    name: string;
    shopName: string;
    mobile: string;
    address: string;
  };
  date: Date;
  metalType: string;
  overallWeight?: number;
  unit?: string;
  items: ReceiptItem[];
  totalGrossWeight: number;
  totalStoneWeight: number;
  totalNetWeight: number;
  totalFinalWeight: number;
  totalAmount: number;
  totalStoneAmount: number;
  createdAt: string;
  updatedAt: string;
}
