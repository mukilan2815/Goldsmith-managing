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

declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

const formatNumber = (
  value: number | string | undefined,
  decimals: number
): string => {
  if (value === undefined || value === null) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? "-" : num.toFixed(decimals);
};

export default function ReceiptDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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
        toast({
          title: "Error",
          description: "Failed to load receipt details. Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  useEffect(() => {
    if (receipt) {
      console.log("Receipt data:", receipt);
    }
  }, [receipt]);

  const handleEditReceipt = () => {
    navigate(`/receipts/${id}/edit`, {
      state: { receiptData: receipt },
    });
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleShareReceipt = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Receipt ${receipt?.data.voucherId || id}`,
          text: `Receipt details for ${receipt?.data.clientInfo?.shopName}`,
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
      toast({
        title: "Sharing Failed",
        description:
          "Could not share the receipt. Try copying the URL manually.",
        variant: "destructive",
      });
    }
  };
  const generatePDF = async () => {
    if (!receipt) return;

    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Golden border
      doc.setDrawColor(204, 153, 0);
      doc.setLineWidth(0.5);
      doc.rect(5, 5, 200, 287);

      // 1. First try using a properly encoded base64 logo
      try {
        // Example of a properly formatted base64 image (replace with your actual logo)
        const base64Logo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."; // shortened for example
        doc.addImage(base64Logo, "PNG", pageWidth / 2 - 20, 10, 40, 15);
      } catch (error) {
        console.log("Base64 logo failed, trying URL...");

        // 2. Fallback to loading from URL
        try {
          const logoUrl = "/logo.png"; // or "/logo.jpg"
          const response = await fetch(logoUrl);
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          doc.addImage(dataUrl, "PNG", pageWidth / 2 - 20, 10, 40, 15);
        } catch (urlError) {
          console.log("URL logo failed, using text fallback");

          // 3. Final fallback to text
          doc.setFontSize(16);
          doc.setTextColor(204, 153, 0);
          doc.setFont("helvetica", "bold");
          doc.text("COMPANY LOGO", pageWidth / 2, 20, { align: "center" });
        }
      }

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      let y = 30;
      const marginLeft = 15;
      const labelWidth = 35; // width for label column to align colons

      // Helper to draw label and value with aligned colon
      const drawLabelValue = (label: string, value: string, y: number) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, marginLeft, y, { baseline: "top" });
        doc.text(":", marginLeft + labelWidth, y, { baseline: "top" });
        doc.setFont("helvetica", "normal");
        doc.text(value, marginLeft + labelWidth + 3, y, { baseline: "top" });
      };

      drawLabelValue(
        "Name",
        `${receipt.data.clientInfo?.clientName || "-"}`,
        y
      );
      y += 6;

      drawLabelValue(
        "Date",
        receipt.data.issueDate
          ? new Date(receipt.data.issueDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : "-",
        y
      );
      y += 6;

      drawLabelValue("Shop", `${receipt.data.clientInfo?.shopName || "-"}`, y);
      y += 6;

      drawLabelValue(
        "Phone Number",
        `${receipt.data.clientInfo?.phoneNumber || "-"}`,
        y
      );
      y += 6;

      y = 60;
      autoTable(doc, {
        startY: y,
        head: [
          [
            "S.NO",
            "Item",
            "Gross Wt",
            "Stone Wt",
            "Melting",
            "Net Wt",
            "Final Wt",
            "Stone Amt",
          ],
        ],
        body: receipt.data.items?.map((item, index) => [
          index + 1,
          item.itemName || "-",
          formatNumber(item.grossWt, 3),
          formatNumber(item.stoneWt, 3),
          formatNumber(item.meltingTouch, 3),
          formatNumber(item.netWt, 3),
          formatNumber(item.finalWt, 3),
          formatNumber(item.stoneAmt, 2),
        ]),
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 2,
          textColor: [0, 0, 0],
          lineWidth: 0.3,
          lineColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineWidth: 0.3,
          lineColor: [0, 0, 0],
        },
        bodyStyles: {
          lineWidth: 0.3,
          lineColor: [0, 0, 0],
        },
        margin: { left: marginLeft, right: 15 },
      });

      let finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(11);
      const totalsX = pageWidth - 50;
      doc.text(
        `Gross Total: ${formatNumber(receipt.data.totals?.grossWt, 3)}`,
        totalsX,
        finalY,
        { align: "right" }
      );
      finalY += 6;
      doc.text(
        `Stone Total: ${formatNumber(receipt.data.totals?.stoneWt, 3)}`,
        totalsX,
        finalY,
        { align: "right" }
      );
      finalY += 6;
      doc.text(
        `Net Total: ${formatNumber(receipt.data.totals?.netWt, 3)}`,
        totalsX,
        finalY,
        { align: "right" }
      );

      doc.setFontSize(10);

      doc.setFont("helvetica", "bold");
      doc.text("Antiques", 180, pageHeight - 30, { align: "center" });
      doc.text("Jewellery Manufacturers", 180, pageHeight - 25, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");

      doc.save(
        `receipt_${receipt.data.clientInfo?.clientName || "unknown"}_${
          receipt.data.voucherId || id
        }.pdf`
      );
    } catch (error) {
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
            <Button onClick={generatePDF} disabled={isGeneratingPDF}>
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
            <h2 className="text-xl font-medium mb-4">Given Items</h2>
            <div className="overflow-x-auto mb-8">
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
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Melting
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
                        {parseFloat(item.grossWt).toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-right">
                        {parseFloat(item.stoneWt).toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-right">
                        {parseFloat(item.netWt).toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-right">
                        {parseFloat(item.finalWt).toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-right">
                        {parseFloat(item.stoneAmt).toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-right">
                        {parseFloat(item.meltingTouch).toFixed(2)}
                      </td>
                    </tr>
                  ))}

                  <tr className="font-medium bg-accent/20 print:bg-gray-100">
                    <td className="py-2 px-1 text-left">Totals</td>
                    <td className="py-2 px-1 text-right">
                      {parseFloat(receipt.data.totals?.grossWt).toFixed(2)}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {parseFloat(receipt.data.totals?.stoneWt).toFixed(2)}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {parseFloat(receipt.data.totals?.netWt).toFixed(2)}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {parseFloat(receipt.data.totals?.finalWt).toFixed(2)}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {parseFloat(receipt.data.totals?.stoneAmt).toFixed(2)}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {receipt.data.items && receipt.data.items.length > 0
                        ? receipt.data.items
                            .reduce(
                              (acc, item) =>
                                acc + Number(item.meltingTouch || 0),
                              0
                            )
                            .toFixed(2)
                        : "0.00"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Received Items Table */}
            <h2 className="text-xl font-medium mb-4 mt-8">Received Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-1 text-sm font-medium">
                      S.No
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Received Gold
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Melting
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Final Wt.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.data.receivedItems &&
                  receipt.data.receivedItems.length > 0 ? (
                    <>
                      {receipt.data.receivedItems.map((item, idx) => (
                        <tr
                          key={item._id || idx}
                          className="border-b last:border-b-0"
                        >
                          <td className="py-2 px-1">{item.sNo || idx + 1}</td>
                          <td className="py-2 px-1 text-right">
                            {Number(item.receivedGold).toFixed(3)}
                          </td>
                          <td className="py-2 px-1 text-right">
                            {Number(item.melting).toFixed(2)}
                          </td>
                          <td className="py-2 px-1 text-right">
                            {Number(item.finalWt).toFixed(3)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-medium bg-accent/20 print:bg-gray-100">
                        <td className="py-2 px-1 text-left" colSpan={3}>
                          Total Final Wt.
                        </td>
                        <td className="py-2 px-1 text-right">
                          {receipt.data.receivedItems
                            .reduce(
                              (acc, item) => acc + Number(item.finalWt),
                              0
                            )
                            .toFixed(3)}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-4 text-muted-foreground"
                      >
                        No received items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>{" "}
        {/* End of col-span-2 main card */}
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
      {/* End of grid */}

      <div className="hidden print:block mt-8 text-center text-sm text-gray-500">
        <p>Generated on {format(new Date(), "PPP p")}</p>
      </div>
    </div>
  );
}
