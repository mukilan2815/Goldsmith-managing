import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Download,
  Loader,
  Printer,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { receiptServices } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Extend jsPDF type to include autoTable for TypeScript
declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

export default function ReceiptDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Fetch receipt by ID directly instead of fetching all receipts
  const {
    data: receipt,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["receipt", id],
    queryFn: () => receiptServices.getReceipt(id),
    enabled: !!id,
    meta: {
      onError: (err) => {
        console.error("Error fetching receipt:", err);
        toast({
          title: "Error",
          description: "Failed to load receipt details. Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  // Debug log to check receipt data structure
  useEffect(() => {
    if (receipt) {
      console.log("Receipt data:", receipt);
    }
  }, [receipt]);

  const handleEditReceipt = () => {
    navigate(`/receipts/${id}/edit`, {
      state: { receiptData: receipt }, // Pass the receipt data via state
    });
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleShareReceipt = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Receipt ${receipt?.voucherId || id}`,
          text: `Receipt details for ${receipt?.clientInfo?.shopName}`,
          url: window.location.href,
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Receipt link copied to clipboard",
        });
      }
    } catch (error) {
      console.error("Error sharing receipt:", error);
      toast({
        title: "Sharing Failed",
        description:
          "Could not share the receipt.data. Try copying the URL manually.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!receipt) return;

    setIsGeneratingPDF(true);

    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Receipt", 105, 15, { align: "center" });
      doc.setFontSize(12);
      doc.text(`Voucher ID: ${receipt.data.voucherId || id}`, 105, 25, {
        align: "center",
      });
      const issueDate = receipt.data.issueDate
        ? new Date(receipt.data.issueDate)
        : new Date();
      doc.text(`Date: ${format(issueDate, "PPP")}`, 105, 30, {
        align: "center",
      });

      doc.setFontSize(14);
      doc.text("Client Information", 14, 40);
      doc.setFontSize(10);
      doc.text(`Shop Name: ${receipt.data.clientInfo?.shopName || ""}`, 14, 48);
      doc.text(`Client Name: ${receipt.data.clientInfo?.clientName || ""}`, 14, 54);
      doc.text(`Phone: ${receipt.data.clientInfo?.phoneNumber || ""}`, 14, 60);

      doc.setFontSize(12);
      doc.text(`Metal Type: ${receipt.data.metalType || ""}`, 14, 76);

      const tableColumn = [
        "Description",
        "Gross Wt",
        "Stone Wt",
        "Net Wt",
        "Final Wt",
        "Stone Amt",
      ];
      const tableRows = [];

      receipt.data.items?.forEach((item) => {
        const itemData = [
          item.itemName || "",
          parseFloat(item.grossWeight ).toFixed(2),
          parseFloat(item.stoneWeight ).toFixed(2),
          parseFloat(item.netWeight ).toFixed(2),
          parseFloat(item.finalWeight ).toFixed(2),
          parseFloat(item.stoneAmount ).toFixed(2),
        ];
        tableRows.push(itemData);
      });

      const totals = receipt.data.totals || {};
      const totalsRow = [
        "Totals",
        parseFloat(totals.grossWt ).toFixed(2),
        parseFloat(totals.stoneWt ).toFixed(2),
        parseFloat(totals.netWt ).toFixed(2),
        parseFloat(totals.finalWt ).toFixed(2),
        parseFloat(totals.stoneAmt ).toFixed(2),
      ];
      tableRows.push(totalsRow);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 90,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 66, 66] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        foot: [totalsRow],
        footStyles: { fillColor: [200, 200, 200], fontStyle: "bold" },
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Generated on ${format(
            new Date(),
            "PPP"
          )} - Page ${i} of ${pageCount}`,
          105,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        );
      }

      doc.save(`Receipt-${receipt.data.voucherId || id}.pdf`);

      toast({
        title: "PDF Downloaded",
        description: "Receipt has been downloaded as PDF",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "PDF Generation Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex justify-center items-center py-20">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading receipt details...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container py-6">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/receipts")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Receipts
        </Button>
        <div className="text-center text-destructive py-8">
          Failed to load receipt details.{" "}
          {error?.message || "Please try again."}
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="container py-6">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/receipts")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Receipts
        </Button>
        <div className="text-center py-8">Receipt not found</div>
      </div>
    );
  }

  return (
    <div className="container py-6 print:py-0">
      <div className="print:hidden">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/receipts")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Receipts
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold">Receipt Details</h1>
            <p className="text-muted-foreground">
              {receipt.data.clientInfo?.shopName} -{" "}
              {receipt.data.clientInfo?.clientName}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Voucher ID: {receipt.data.voucherId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <Button variant="outline" onClick={handleEditReceipt}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" onClick={handlePrintReceipt}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={handleShareReceipt}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
              {isGeneratingPDF ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden print:block mb-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Receipt</h1>
          <p className="text-lg mt-2">Voucher ID: {receipt.data.voucherId}</p>
          <p className="mt-1">
            Date:{" "}
            {receipt.data.issueDate
              ? format(new Date(receipt.data.issueDate), "PPP")
              : "N/A"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="col-span-2">
          <div className="bg-card card-premium rounded-lg p-6 print:p-0 print:bg-transparent print:shadow-none">
            <h2 className="text-xl font-medium mb-4">Receipt Items</h2>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-1 text-sm font-medium">
                      Description
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Gross Wt (g)
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Stone Wt (g)
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Net Wt (g)
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Final Wt (g)
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Stone Amt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.data.items?.map((item, index) => (
                    <tr
                      key={item._id || index}
                      className="border-b last:border-b-0"
                    >
                      <td className="py-2 px-1">{item.itemName}</td>
                      <td className="py-2 px-1 text-right">
                        {parseFloat(item.grossWt ).toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-right">
                        {parseFloat(item.stoneWt ).toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-right">
                        {parseFloat(item.netWt ).toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-right">
                        {parseFloat(item.finalWt ).toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-right">
                        {parseFloat(item.stoneAmt ).toFixed(2)}
                      </td>
                    </tr>
                  ))}

                  <tr className="font-medium bg-accent/20 print:bg-gray-100">
                    <td className="py-2 px-1 text-left">Totals</td>
                    <td className="py-2 px-1 text-right">
                      {parseFloat(receipt.data.totals?.grossWt ).toFixed(2)}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {parseFloat(receipt.data.totals?.stoneWt ).toFixed(2)}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {parseFloat(receipt.data.totals?.netWt ).toFixed(2)}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {parseFloat(receipt.data.totals?.finalWt ).toFixed(2)}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {parseFloat(receipt.data.totals?.stoneAmt ).toFixed(
                        2
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-card card-premium rounded-lg p-6 mb-6 print:p-0 print:bg-transparent print:shadow-none">
            <h2 className="text-xl font-medium mb-4">Client Information</h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Shop Name</p>
                <p className="font-medium">
                  {receipt.data.clientInfo?.shopName || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Client Name</p>
                <p className="font-medium">
                  {receipt.data.clientInfo?.clientName || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Mobile Number</p>
                <p className="font-medium">
                  {receipt.data.clientInfo?.phoneNumber || "-"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card card-premium rounded-lg p-6 print:p-0 print:bg-transparent print:shadow-none">
            <h2 className="text-xl font-medium mb-4">Receipt Information</h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Metal Type</p>
                <p className="font-medium">{receipt.data.metalType || "-"}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Issue Date</p>
                <p className="font-medium">
                  {receipt.data.issueDate
                    ? format(new Date(receipt.data.issueDate), "PPP")
                    : "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="font-medium">
                  {receipt.data.createdAt
                    ? format(new Date(receipt.data.createdAt), "PPP p")
                    : "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {receipt.data.updatedAt
                    ? format(new Date(receipt.data.updatedAt), "PPP p")
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden print:block mt-8 text-center text-sm text-gray-500">
        <p>Generated on {format(new Date(), "PPP p")}</p>
      </div>
    </div>
  );
}
