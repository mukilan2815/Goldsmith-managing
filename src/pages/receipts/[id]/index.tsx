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

      // Given Date Section
      y = 65;
      doc.setFontSize(12);
      doc.setFont("helvetica", "thin");
      const givenDate = receipt.data.issueDate
        ? new Date(receipt.data.issueDate)
            .toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
            .toUpperCase()
        : "-";
      doc.setFont("helvetica", "bold");
      doc.text("Given Date :", marginLeft, y);
      doc.setFont("helvetica", "normal");
      doc.text(
        givenDate,
        marginLeft + doc.getTextWidth("Given Date : ") + 1,
        y
      );

      // First Table (Given Items)
      const givenItems = Array.isArray(receipt.data.givenItems)
        ? receipt.data.givenItems.filter(
            (item) => item.itemName !== "Previous Balance"
          )
        : [];

      autoTable(doc, {
        startY: y + 3,
        head: [
          [
            "S.NO",
            "Product Name",
            "Pure(wt)",
            "Pure%",
            "Melting",
            "Total",
            "Date",
          ],
        ],
        body: givenItems.map((item, index) => [
          index + 1,
          item.itemName || "-",
          formatNumber(item.grossWt, 3),
          formatNumber(item.meltingTouch, 2),
          formatNumber(item.meltingTouch, 2),
          formatNumber(item.finalWt, 3),
          item.date ? format(new Date(item.date), "dd/MM/yyyy") : "—",
        ]),
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0] },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineWidth: 0.1, // Thin border for head
          lineColor: [0, 0, 0],
        },
        bodyStyles: {
          lineWidth: 0.1, // Match border thickness with head
          lineColor: [0, 0, 0],
        },
        margin: { left: 15, right: 25 },
        columnStyles: {
          0: { cellWidth: 12 }, // S.NO
          1: { cellWidth: 35 }, // Product Name
          2: { cellWidth: 22 }, // Pure(wt)
          3: { cellWidth: 20 }, // Pure%
          4: { cellWidth: 20 }, // Melting
          5: { cellWidth: 22 }, // Total
          6: { cellWidth: 22 }, // Date
        },
      });

      // Received Date Section
      let newY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "thin");
      const receivedDate = receipt.data.issueDate
        ? new Date(receipt.data.issueDate)
            .toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
            .toUpperCase()
        : "-";
      doc.setFont("helvetica", "bold");
      doc.text("Received Date :", marginLeft, newY);
      doc.setFont("helvetica", "normal");
      doc.text(
        receivedDate,
        marginLeft + doc.getTextWidth("Received Date : ") + 1,
        newY
      );

      // Second Table (Received Items)
      const receivedItems = Array.isArray(receipt.data.receivedItems)
        ? receipt.data.receivedItems
        : [];

      autoTable(doc, {
        startY: newY + 3,
        head: [
          [
            "S.NO",
            "Product Name",
            "Date",
            "Final Ornament(wt)",
            "Stone Weight",
            "Touch",
            "MC",
            "Subtotal",
            "Total",
          ],
        ],
        body: receivedItems.map((item, index) => [
          index + 1,
          "Received Item " + (index + 1), // Product name placeholder
          item.date ? format(new Date(item.date), "dd/MM/yyyy") : "—",
          formatNumber(item.receivedGold, 3),
          formatNumber(0, 3), // Stone weight not available in current structure
          formatNumber(item.melting, 2),
          formatNumber(0, 2), // MC not available in current structure
          formatNumber(item.receivedGold, 3),
          formatNumber(item.finalWt, 3),
        ]),
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0] },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineWidth: 0.1, // Thin border for head
          lineColor: [0, 0, 0],
        },
        bodyStyles: {
          lineWidth: 0.1, // Match border thickness with head
          lineColor: [0, 0, 0],
        },
        margin: { left: 15, right: 25 },
        columnStyles: {
          0: { cellWidth: 12 }, // S.NO
          1: { cellWidth: 20 }, // Product Name
          2: { cellWidth: 18 }, // Date
          3: { cellWidth: 20 }, // Final Ornament(wt)
          4: { cellWidth: 17 }, // Stone Weight
          5: { cellWidth: 15 }, // Touch
          6: { cellWidth: 15 }, // MC
          7: { cellWidth: 17 }, // Subtotal
          8: { cellWidth: 19 }, // Total
        },
      });

      // Totals Section (Right-aligned as in the image)
      let finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const totalsX = pageWidth - 80;

      // Use the actual balance data from the response
      const actualBalance = receipt.data.balance || 0;
      const previousBalance = receipt.data.previousBalance || 0;
      const newBalance = receipt.data.newBalance || 0;
      const totalGrossWt = receipt.data.totals?.grossWt || 0;
      const totalNetWt = receipt.data.totals?.netWt || 0;
      const totalFinalWt = receipt.data.totals?.finalWt || 0;

      doc.text(
        `OD Balance   : ${formatNumber(previousBalance, 3)}`,
        totalsX,
        finalY
      );
      finalY += 6;
      doc.text(
        `Current Balance    : ${formatNumber(actualBalance, 3)}`,
        totalsX,
        finalY
      );
      finalY += 6;
      doc.text(
        `New Balance        : ${formatNumber(newBalance, 3)}`,
        totalsX,
        finalY
      );

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
            <h2 className="text-xl font-medium mb-4">Given Items</h2>
            <div className="overflow-x-auto mb-8">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-1 text-sm font-medium">
                      Description
                    </th>
                    <th className="text-center py-2 px-1 text-sm font-medium">
                      Date
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
                      Melting %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.data.givenItems
                    ?.filter((item) => item.itemName !== "Previous Balance")
                    .map((item, index) => (
                      <tr
                        key={item._id || index}
                        className="border-b last:border-b-0"
                      >
                        <td className="py-2 px-1">{item.itemName}</td>
                        <td className="py-2 px-1 text-center text-sm">
                          {item.date
                            ? format(new Date(item.date), "dd/MM/yyyy")
                            : "-"}
                        </td>
                        <td className="py-2 px-1 text-right">
                          {formatNumber(item.grossWt, 3)}
                        </td>
                        <td className="py-2 px-1 text-right">
                          {formatNumber(item.stoneWt, 3)}
                        </td>
                        <td className="py-2 px-1 text-right">
                          {formatNumber(item.netWt, 3)}
                        </td>
                        <td className="py-2 px-1 text-right">
                          {formatNumber(item.finalWt, 3)}
                        </td>
                        <td className="py-2 px-1 text-right">
                          {formatNumber(item.stoneAmt, 2)}
                        </td>
                        <td className="py-2 px-1 text-right">
                          {formatNumber(item.meltingTouch, 2)}%
                        </td>
                      </tr>
                    ))}

                  <tr className="font-medium bg-accent/20 print:bg-gray-100">
                    <td className="py-2 px-1 text-left" colSpan={2}>
                      Totals
                    </td>
                    <td className="py-2 px-1 text-right">
                      {formatNumber(
                        receipt.data.givenItems
                          ?.filter(
                            (item) => item.itemName !== "Previous Balance"
                          )
                          .reduce(
                            (acc, item) => acc + Number(item.grossWt || 0),
                            0
                          ) || 0,
                        3
                      )}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {formatNumber(
                        receipt.data.givenItems
                          ?.filter(
                            (item) => item.itemName !== "Previous Balance"
                          )
                          .reduce(
                            (acc, item) => acc + Number(item.stoneWt || 0),
                            0
                          ) || 0,
                        3
                      )}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {formatNumber(
                        receipt.data.givenItems
                          ?.filter(
                            (item) => item.itemName !== "Previous Balance"
                          )
                          .reduce(
                            (acc, item) => acc + Number(item.netWt || 0),
                            0
                          ) || 0,
                        3
                      )}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {formatNumber(
                        receipt.data.givenItems
                          ?.filter(
                            (item) => item.itemName !== "Previous Balance"
                          )
                          .reduce(
                            (acc, item) => acc + Number(item.finalWt || 0),
                            0
                          ) || 0,
                        3
                      )}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {formatNumber(
                        receipt.data.givenItems
                          ?.filter(
                            (item) => item.itemName !== "Previous Balance"
                          )
                          .reduce(
                            (acc, item) => acc + Number(item.stoneAmt || 0),
                            0
                          ) || 0,
                        2
                      )}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {receipt.data.givenItems &&
                      receipt.data.givenItems.filter(
                        (item) => item.itemName !== "Previous Balance"
                      ).length > 0
                        ? formatNumber(
                            receipt.data.givenItems
                              .filter(
                                (item) => item.itemName !== "Previous Balance"
                              )
                              .reduce(
                                (acc, item) =>
                                  acc + Number(item.meltingTouch || 0),
                                0
                              ) /
                              receipt.data.givenItems.filter(
                                (item) => item.itemName !== "Previous Balance"
                              ).length,
                            2
                          ) + "%"
                        : "0.00%"}
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
                      S.No
                    </th>
                    <th className="text-center py-2 px-1 text-sm font-medium">
                      Date
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Received Gold (g)
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Melting %
                    </th>
                    <th className="text-right py-2 px-1 text-sm font-medium">
                      Final Weight (g)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.data.receivedItems &&
                  receipt.data.receivedItems.length > 0 ? (
                    <>
                      {receipt.data.receivedItems.map((item, idx) => (
                        <tr
                          key={item.id || idx}
                          className="border-b last:border-b-0"
                        >
                          <td className="py-2 px-1 text-center">{idx + 1}</td>
                          <td className="py-2 px-1 text-center text-sm">
                            {item.date
                              ? format(new Date(item.date), "dd/MM/yyyy")
                              : format(new Date(), "dd/MM/yyyy")}
                          </td>
                          <td className="py-2 px-1 text-right">
                            {formatNumber(item.receivedGold, 3)}
                          </td>
                          <td className="py-2 px-1 text-right">
                            {formatNumber(item.melting, 2)}%
                          </td>
                          <td className="py-2 px-1 text-right">
                            {formatNumber(item.finalWt, 3)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-medium bg-accent/20 print:bg-gray-100">
                        <td className="py-2 px-1 text-left" colSpan={2}>
                          Totals
                        </td>
                        <td className="py-2 px-1 text-right">
                          {formatNumber(
                            receipt.data.receivedItems.reduce(
                              (acc, item) =>
                                acc + Number(item.receivedGold || 0),
                              0
                            ),
                            3
                          )}
                        </td>
                        <td className="py-2 px-1 text-right">
                          {receipt.data.receivedItems.length > 0
                            ? formatNumber(
                                receipt.data.receivedItems.reduce(
                                  (acc, item) =>
                                    acc + Number(item.melting || 0),
                                  0
                                ) / receipt.data.receivedItems.length,
                                2
                              ) + "%"
                            : "0.00%"}
                        </td>
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
                      <td
                        colSpan={5}
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
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  <StatusBadge status={receipt.data.status || "incomplete"} />
                </div>
              </div>
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
