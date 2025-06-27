import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReceivedItem {
  id: string;
  receivedGold: string | number;
  melting: string | number;
  finalWt: number;
}

interface FormActionsProps {
  onBack: () => void;
  onSave: () => void;
  isSubmitting: boolean;
  isDisabled: boolean;
  receivedItems: ReceivedItem[];
}

export function FormActions({
  onBack,
  onSave,
  isSubmitting,
  isDisabled,
  receivedItems,
}: FormActionsProps) {
  const hasReceivedItems = receivedItems.some(
    (item) =>
      (item.receivedGold && Number(item.receivedGold) > 0) ||
      (item.melting && Number(item.melting) > 0)
  );

  return (
    <div className="flex justify-between">
      <Button type="button" variant="outline" onClick={onBack}>
        Back
      </Button>
      <Button type="button" disabled={isDisabled} onClick={onSave}>
        {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
        {hasReceivedItems ? "Save Receipt" : "Save as Incomplete"}
      </Button>
    </div>
  );
}
