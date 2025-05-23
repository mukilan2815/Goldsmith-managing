// Updated receipt-form-submit.js

export const submitReceiptForm = async (data, navigate) => {
  try {
    console.log("Starting submitReceiptForm with data:", data);

    // Format the data according to the API requirements
    const formattedData = {
      clientId: data.client.id,
      clientName: data.client.name,
      shopName: data.client.shopName,
      phoneNumber: data.client.mobile,
      metalType: data.metalType,
      overallWeight: data.overallWeight || 0,
      issueDate: data.date.toISOString(),
      voucherId: data.voucherId,
      tableData: data.items.map((item) => ({
        description: item.description,
        tag: item.tag || "",
        grossWeight: parseFloat(item.grossWeight) || 0,
        stoneWeight: parseFloat(item.stoneWeight) || 0,
        meltingPercent: parseFloat(item.meltingPercent) || 0,
        netWeight: parseFloat(item.netWeight) || 0,
        finalWeight: parseFloat(item.finalWeight) || 0,
        stoneAmount: parseFloat(item.stoneAmount) || 0,
      })),
      totals: {
        grossWt: data.items.reduce(
          (sum, item) => sum + (parseFloat(item.grossWeight) || 0),
          0
        ),
        stoneWt: data.items.reduce(
          (sum, item) => sum + (parseFloat(item.stoneWeight) || 0),
          0
        ),
        netWt: data.items.reduce(
          (sum, item) => sum + (parseFloat(item.netWeight) || 0),
          0
        ),
        finalWt: data.items.reduce(
          (sum, item) => sum + (parseFloat(item.finalWeight) || 0),
          0
        ),
        stoneAmt: data.items.reduce(
          (sum, item) => sum + (parseFloat(item.stoneAmount) || 0),
          0
        ),
      },
    };

    console.log("Formatted data for API:", formattedData);

    // Make the API call
    const response = await fetch("/api/receipts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formattedData),
    });

    const result = await response.json();
    console.log("API response:", result);

    if (!result.success) {
      console.error("API error:", result.message);
      throw new Error(result.message || "Failed to save receipt");
    }

    // Navigate to receipt details page on success
    navigate(`/receipts/${result._id}`);
    return true;
  } catch (error) {
    console.error("Error in submitReceiptForm:", error);
    throw error;
  }
};
