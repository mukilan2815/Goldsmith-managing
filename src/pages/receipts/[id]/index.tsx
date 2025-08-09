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
import { StatusBadge } from "@/components/ui/status-badge";
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
      // Add local storage for tag
      onSuccess: (data) => {
        if (data?.data?._id) {
          const storedTag = localStorage.getItem(`receipt_tag_${data.data._id}`);
          if (storedTag) {
            // Set the tag in the receipt data
            data.data.finalWtBalanceTag = storedTag;
          }
        }
        return data;
      },
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
      // Debug: Log the receipt data structure
      console.log('Receipt Data:', JSON.stringify(receipt, null, 2));
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();

      // Set golden border (approximating the color from the image)
      doc.setDrawColor(204, 153, 0); // Golden border color (RGB)
      doc.setLineWidth(1);
      doc.rect(5, 5, 200, 287); // A4 page border (210x297 mm, with 5mm margin)

      // Add logo at the top center
      const logoPath = "/logo.jpg"; // Using the provided logo path
      try {
        doc.addImage(logoPath, "JPEG", 85, 5, 40, 20); // Centered logo, adjusted size to fit design
      } catch (logoError) {
        console.warn("Logo not found, continuing without logo");
      }

      // Dynamic Fields (aligned with design)
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0); // Black text
      let y = 35;
      const marginLeft = 25;

      // Use client details for Name, Shop, and Phone Number with bold side titles
      doc.setFont("helvetica", "bold");
      doc.text("Name", marginLeft, y);
      doc.setFont("helvetica", "normal");
      doc.text(
        `: ${receipt.data.clientInfo?.clientName || "-"}`,
        marginLeft + 35,
        y
      );
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Shop", marginLeft, y);
      doc.setFont("helvetica", "normal");
      doc.text(
        `: ${receipt.data.clientInfo?.shopName || "-"}`,
        marginLeft + 35,
        y
      );
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Phone Number", marginLeft, y);
      doc.setFont("helvetica", "normal");
      doc.text(
        `: ${receipt.data.clientInfo?.phoneNumber || "-"}`,
        marginLeft + 35,
        y
      );
      y += 6;

      // Given Details Section
      y = 65;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Given Details", marginLeft, y);
      y += 5;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const givenDate = receipt.data.issueDate
        ? new Date(receipt.data.issueDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "-";
      doc.text(`Date: ${givenDate}`, marginLeft, y);
      y += 2;

      // First Table (Given Items) - Filter out Previous Balance
      const givenItems = Array.isArray(receipt.data.givenItems)
        ? receipt.data.givenItems.filter((item) => item.itemName !== "Previous Balance")
        : [];

      const givenTableBody = givenItems.map((item, index) => [
        index + 1,
        item.itemName,
        formatNumber(item.grossWt, 3),
        item.stoneWt ? formatNumber(item.stoneWt, 3) : "0.000",
        formatNumber(item.netWt, 3),
        formatNumber(item.meltingTouch, 2),
        formatNumber(item.finalWt, 3),
        item.stoneAmt ? formatNumber(item.stoneAmt, 2) : "0.00",
        item.tag || "-",
      ]);

      // Add totals row for given items
      if (givenItems.length > 0) {
        givenTableBody.push([
          "",
          "Total:",
          formatNumber(
            givenItems.reduce((acc, item) => acc + Number(item.grossWt || 0), 0)
          ),
          formatNumber(
            givenItems.reduce((acc, item) => acc + Number(item.stoneWt || 0), 0)
          ),
          formatNumber(
            givenItems.reduce((acc, item) => acc + Number(item.netWt || 0), 0)
          ),
          "",
          formatNumber(
            givenItems.reduce((acc, item) => acc + Number(item.finalWt || 0), 0)
          ),
          formatNumber(
            givenItems.reduce((acc, item) => acc + Number(item.stoneAmt || 0), 0)
          ),
          ""
        ]);
      }

      autoTable(doc, {
        startY: y + 3,
        head: [
          [
            "S.NO",
            "Product Name",
            "Gross Wt",
            "Stone Wt",
            "Net Wt",
            "Melting %",
            "Final Wt",
            "Stone Amt",
            "Tag",
          ],
        ],
        body: givenTableBody,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0] },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        bodyStyles: {
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        didParseCell: function (data) {
          // Make the totals row bold
          if (data.row.index === givenTableBody.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
        margin: { left: 15, right: 25 },
        columnStyles: {
          0: { cellWidth: 10 },  // S.NO
          1: { cellWidth: 25 },  // Product Name
          2: { cellWidth: 15 },  // Gross Wt
          3: { cellWidth: 15 },  // Stone Wt
          4: { cellWidth: 15 },  // Net Wt
          5: { cellWidth: 15 },  // Melting %
          6: { cellWidth: 15 },  // Final Wt
          7: { cellWidth: 15 },  // Stone Amt
          8: { cellWidth: 12 },  // Tag
        },
      });

      // Received Details Section
      let newY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Received Details", marginLeft, newY);
      newY += 5;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const receivedDate = receipt.data.issueDate
        ? new Date(receipt.data.issueDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "-";
      doc.text(`Date: ${receivedDate}`, marginLeft, newY);
      newY += 2;

      // Second Table (Received Items)
      const receivedItems = Array.isArray(receipt.data.receivedItems)
        ? receipt.data.receivedItems
        : [];

      const receivedTableBody = receivedItems.map((item, index) => [
        index + 1,
        "Received Item " + (index + 1), // Product name placeholder
        format(new Date(), "dd/MM/yyyy"), // Always show current date
        formatNumber(item.receivedGold, 3),
        formatNumber(item.stoneWt || 0, 3), // Added stone weight
        formatNumber(item.melting, 2),
        formatNumber(0, 2), // MC not available in current structure
        formatNumber(item.stoneAmt || 0, 2), // Added stone amount
        formatNumber(item.receivedGold, 3),
        formatNumber(item.finalWt, 3),
      ]);

      // Add totals row for received items
      receivedTableBody.push([
        "",
        "Total:",
        "",
        formatNumber(
          receivedItems.reduce(
            (acc, item) => acc + Number(item.receivedGold || 0),
            0
          )
        ),
        formatNumber(
          receivedItems.reduce(
            (acc, item) => acc + Number(item.stoneWt || 0),
            0
          )
        ),
        "",
        "",
        formatNumber(
          receivedItems.reduce(
            (acc, item) => acc + Number(item.stoneAmt || 0),
            0
          )
        ),
        formatNumber(
          receivedItems.reduce(
            (acc, item) => acc + Number(item.receivedGold || 0),
            0
          )
        ),
        formatNumber(
          receivedItems.reduce(
            (acc, item) => acc + Number(item.finalWt || 0),
            0
          )
        ),
      ]);

      autoTable(doc, {
        startY: newY + 3,
        head: [
          [
            "S.NO",
            "Product Name",
            "Date",
            "Final Ornament(wt)",
            "Stone Wt",
            "Touch",
            "MC",
            "Stone Amt",
            "Subtotal",
            "Total",
          ],
        ],
        body: receivedTableBody,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0] },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        bodyStyles: {
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        didParseCell: function (data) {
          // Make the totals row bold
          if (data.row.index === receivedTableBody.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
        margin: { left: 15, right: 25 },
        columnStyles: {
          0: { cellWidth: 10 },  // S.NO
          1: { cellWidth: 20 },  // Product Name
          2: { cellWidth: 20 },  // Date
          3: { cellWidth: 15 },  // Final Ornament(wt)
          4: { cellWidth: 15 },  // Stone Wt
          5: { cellWidth: 12 },  // Touch
          6: { cellWidth: 12 },  // MC
          7: { cellWidth: 15 },  // Stone Amt
          8: { cellWidth: 15 },  // Subtotal
          9: { cellWidth: 15 },  // Total
        },
      });

      // Balance Summary Section with horizontal table layout
      let finalY = (doc as any).lastAutoTable.finalY + 10;

     

      // Calculate given total excluding Previous Balance
      const givenTotal = givenItems.reduce(
        (sum, item) => sum + Number(item.finalWt || 0),
        0
      );

      const receivedTotal = receivedItems.reduce(
        (acc, item) => acc + Number(item.finalWt || 0),
        0
      );

      // Get OD Balance value from the given items
      const odBalanceItem = receipt.data.givenItems.find(
        (item) => item.itemName === "Previous Balance"
      );
      const odBalance = odBalanceItem ? odBalanceItem.finalWt : 0;

      const balanceValues = [
        formatNumber(odBalance, 3), // OD Balance
        formatNumber(givenTotal, 3), // Given Total
        formatNumber(receivedTotal, 3), // Received Total
        formatNumber(givenTotal - receivedTotal, 3), // Balance
        receipt.data.finalWtBalanceTag || "", // Final Weight Balance Tag
      ];

   
      // Create a summary table that matches the website UI
      newY = (doc as any).lastAutoTable.finalY + 10;
      
      // Create a table with headers and data
      const summaryTable = [
        [ 'Given Final Wt', 'Received Final Wt', 'OD Balance','Final Wt. + Balance'],
        [
          formatNumber(givenTotal, 3),
          formatNumber(receivedTotal, 3),
          formatNumber(odBalance, 3),
          `${formatNumber(givenTotal - receivedTotal, 3)} + ${formatNumber(Number(odBalance), 3)} = ${formatNumber(givenTotal - receivedTotal + Number(odBalance), 3)}`
        ]
      ];
      
      // Add the first summary table
      autoTable(doc, {
        startY: newY,
        head: [summaryTable[0]],
        body: [summaryTable[1]],
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 4,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          font: 'helvetica',
          textColor: [0, 0, 0],
          halign: 'center'
        },
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 40, halign: 'right' },
          1: { cellWidth: 40, halign: 'right' },
          2: { cellWidth: 40, halign: 'right' },
          3: { cellWidth: 60, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 15, right: 25 }
      });
      
      // Add some space between tables
      newY = (doc as any).lastAutoTable.finalY + 10;
      
      // Add final weight balance, stone weight, and voucher ID section
      const detailsY = newY;
      
      // Debug: Log the values we're trying to display
      console.log('finalWtBalanceTag:', receipt.data.finalWtBalanceTag);
      console.log('stoneWeight:', receipt.data.stoneWeight);
      console.log('voucherId:', receipt.data.voucherId);
      
      // Final Weight Balance Tag
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Final Wt. Balance Tag:", 25, detailsY + 5);
      doc.setFont("helvetica", "normal");
      doc.text(
        receipt.data.finalWtBalanceTag || "-",
        70,
        detailsY + 5
      );
      
      // Voucher ID
      doc.setFont("helvetica", "bold");
      doc.text("Voucher ID:", 120, detailsY + 5);
      doc.setFont("helvetica", "normal");
      doc.text(
        receipt.data.voucherId || "-",
        155,
        detailsY + 5
      );

      newY = detailsY + 30; // Add some space after the details

      // Save the PDF
      const fileName = `receipt_${
        receipt.data.clientInfo?.clientName?.replace(/[^a-zA-Z0-9]/g, "_") ||
        "unknown"
      }.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF Generation Error:", err);
      toast({
        title: "PDF Generation Failed",
        description: "Unable to generate PDF. Please try again.",
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
            <h2 className="text-xl font-medium mb-4">Items</h2>
            <div className="overflow-x-auto mb-8">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-center py-2 px-1 text-sm font-medium">
                      Date
                    </th>
                    <th className="text-left py-2 px-1 text-sm font-medium">
                      Description
                    </th>
                    <th className="text-center py-2 px-1 text-sm font-medium">
                      Tag
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Gross Wt.
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Stone Wt.
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Melting %
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Net Wt.
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Final Wt.
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Stone Amt.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Regular items */}
                  {receipt.data.givenItems
                    ?.filter((item) => item.itemName !== "Previous Balance")
                    .map((item, index) => (
                      <tr
                        key={item._id || index}
                        className="border-b last:border-b-0"
                      >
                        <td className="py-2 px-1 text-center text-sm">
                          {item.date
                            ? format(new Date(item.date), "dd-MM-yyyy")
                            : format(new Date(), "dd-MM-yyyy")}
                        </td>
                        <td className="py-2 px-1">
                          {item.itemName || "Item name"}
                        </td>
                        <td className="py-2 px-1 text-center text-sm">
                          {item.tag || "Tag"}
                        </td>
                        <td className="py-2 px-1 text-right">
                          {formatNumber(item.grossWt || 0, 3)}
                        </td>
                        <td className="py-2 px-1 text-right">
                          {formatNumber(item.stoneWt || 0, 3)}
                        </td>
                        <td className="py-2 px-1 text-right">
                          {formatNumber(item.meltingTouch || 0, 3)}
                        </td>
                        <td className="py-2 px-1 text-right">
                          {formatNumber(item.netWt || 0, 3)}
                        </td>
                        <td className="py-2 px-1 text-right">
                          {formatNumber(item.finalWt || 0, 3)}
                        </td>
                        <td className="py-2 px-1 text-right">
                          {formatNumber(item.stoneAmt || 0, 3)}
                        </td>
                      </tr>
                    ))}
                  {/* OD Balance row removed as per requirements */}

                  <tr className="font-medium bg-accent/20 print:bg-gray-100">
                    <td className="py-2 px-1 text-left" colSpan={3}>
                      Totals:
                    </td>
                    <td className="py-2 px-1 text-right">
                      {formatNumber(
                        receipt.data.givenItems
                          ?.filter((item) => item.itemName !== "Previous Balance")
                          .reduce((sum, item) => sum + Number(item.grossWt || 0), 0) || 0,
                        3
                      )}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {formatNumber(
                        receipt.data.givenItems
                          ?.filter((item) => item.itemName !== "Previous Balance")
                          .reduce((sum, item) => sum + Number(item.stoneWt || 0), 0) || 0,
                        3
                      )}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {formatNumber(
                        receipt.data.givenItems
                          ?.filter((item) => item.itemName !== "Previous Balance")
                          .reduce((sum, item) => sum + Number(item.netWt || 0), 0) || 0,
                        3
                      )}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {formatNumber(
                        receipt.data.givenItems
                          ?.filter((item) => item.itemName !== "Previous Balance")
                          .reduce((sum, item) => sum + Number(item.finalWt || 0), 0) || 0,
                        3
                      )}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {formatNumber(
                        receipt.data.givenItems
                          ?.filter((item) => item.itemName !== "Previous Balance")
                          .reduce((sum, item) => sum + Number(item.stoneAmt || 0), 0) || 0,
                        3
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Received Items Table */}
            <h2 className="text-xl font-medium mb-4 mt-8">Received Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-center py-2 px-1 text-sm font-medium">
                      Date
                    </th>
                    <th className="text-center py-2 px-1 text-sm font-medium">
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
                          key={item.id || item._id || idx}
                          className="border-b last:border-b-0"
                        >
                          <td className="py-2 px-1 text-center text-sm">
                            {item.date
                              ? format(new Date(item.date), "dd-MM-yyyy")
                              : format(new Date(), "dd-MM-yyyy")}
                          </td>
                          <td className="py-2 px-1 text-center">{idx + 1}</td>
                          <td className="py-2 px-1 text-right">
                            {formatNumber(item.receivedGold || 0, 3)}
                          </td>
                          <td className="py-2 px-1 text-right">
                            {formatNumber(item.melting || 0, 3)}
                          </td>
                          <td className="py-2 px-1 text-right">
                            {formatNumber(item.finalWt || 0, 3)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-medium bg-accent/20 print:bg-gray-100">
                        <td className="py-2 px-1 text-left" colSpan={2}>
                          Totals:
                        </td>
                        <td className="py-2 px-1 text-right">
                          {formatNumber(
                            receipt.data.receivedItems.reduce(
                              (acc, item) => acc + Number(item.receivedGold || 0),
                              0
                            ),
                            3
                          )}
                        </td>
                        <td className="py-2 px-1 text-right">-</td>
                        <td className="py-2 px-1 text-right">
                          {formatNumber(
                            receipt.data.receivedItems.reduce(
                              (acc, item) => acc + Number(item.finalWt || 0),
                              0
                            ),
                            3
                          )}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td className="py-2 px-1 text-center text-sm">
                        {format(new Date(), "dd-MM-yyyy")}
                      </td>
                      <td className="py-2 px-1 text-center">-</td>
                      <td className="py-2 px-1 text-right text-muted-foreground text-sm">
                        not filled yet
                      </td>
                      <td className="py-2 px-1 text-right text-muted-foreground text-sm">
                        not filled yet
                      </td>
                      <td className="py-2 px-1 text-right text-muted-foreground text-sm">
                        not filled yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Section - Moved below Received Items */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-muted-foreground">Given Final Wt.</p>
                <p className="font-medium">
                  {formatNumber(
                    receipt.data.givenItems
                      ?.filter((item) => item.itemName !== "Previous Balance")
                      .reduce((sum, item) => sum + Number(item.finalWt || 0), 0) || 0,
                    3
                  )}g
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-muted-foreground">
                  Received Final Wt.
                </p>
                <p className="font-medium">
                  {receipt.data.receivedItems &&
                  receipt.data.receivedItems.length > 0 ? (
                    receipt.data.givenItems?.find(
                      (item) => item.itemName === "Previous Balance"
                    ) ? (
                      <>
                        {formatNumber(
                          receipt.data.receivedItems.reduce(
                            (acc, item) => acc + Number(item.finalWt || 0),
                            0
                          ),
                          3
                        )}
                        g
                      </>
                    ) : (
                      `${formatNumber(
                        receipt.data.receivedItems.reduce(
                          (acc, item) => acc + Number(item.finalWt || 0),
                          0
                        ),
                        3
                      )}g`
                    )
                  ) : (
                    "empty"
                  )}
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-muted-foreground">OD Balance</p>
                <p className="font-medium">
                  {formatNumber(
                    receipt.data.givenItems?.find(
                      (item) => item.itemName === "Previous Balance"
                    )?.finalWt || 0,
                    3
                  )}
                  g
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-muted-foreground">
                    Final Wt. + Balance
                  </p>
                  {receipt.data.finalWtBalanceTag && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {receipt.data.finalWtBalanceTag}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {formatNumber(
                      Number(
                        receipt.data.givenItems.reduce(
                          (acc, item) => acc + Number(item.finalWt || 0),
                          0
                        )
                      ) -
                      Number(
                        receipt.data.receivedItems.reduce(
                          (acc, item) => acc + Number(item.finalWt || 0),
                          0
                        )
                      ) -
                      Number(
                        receipt.data.givenItems.find(
                          (item) => item.itemName === "Previous Balance"
                        )?.finalWt || 0
                      ),
                      3
                    )}
                    {" + "}
                    {formatNumber(
                      Number(
                        receipt.data.givenItems.find(
                          (item) => item.itemName === "Previous Balance"
                        )?.finalWt || 0
                      ),
                      3
                    )}
                    {" = "}
                    {formatNumber(
                      Number(
                        receipt.data.givenItems.reduce(
                          (acc, item) => acc + Number(item.finalWt || 0),
                          0
                        )
                      ) -
                      Number(
                        receipt.data.receivedItems.reduce(
                          (acc, item) => acc + Number(item.finalWt || 0),
                          0
                        )
                      ),
                      3
                    )}
                    g
                  </p>
                  {receipt.data.finalWtBalanceTag && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {receipt.data.finalWtBalanceTag}
                    </span>
                  )}
                </div>
              </div>
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
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">
                  {receipt.data.clientInfo?.address || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Client ID</p>
                <p className="font-medium text-xs">
                  {receipt.data.clientId || "-"}
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
