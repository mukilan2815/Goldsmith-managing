interface ReceivedItem {
  id: string;
  receivedGold: string | number;
  melting: string | number;
  finalWt: number;
}

interface StatusIndicatorProps {
  receivedItems: ReceivedItem[];
}

export function StatusIndicator({ receivedItems }: StatusIndicatorProps) {
  const hasReceivedItems = receivedItems.some(
    (item) =>
      (item.receivedGold && Number(item.receivedGold) > 0) ||
      (item.melting && Number(item.melting) > 0)
  );

  if (!hasReceivedItems) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
        <div className="flex items-center">
          <div className="text-yellow-600 text-sm">
            ⚠️ No received items entered. Receipt will be saved as{" "}
            <strong>incomplete</strong>.
          </div>
        </div>
      </div>
    );
  }
  return null;
}
