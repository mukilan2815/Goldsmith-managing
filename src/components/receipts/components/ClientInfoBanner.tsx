interface ClientInfoBannerProps {
  client: {
    id: string;
    shopName: string;
    clientName: string;
    phoneNumber: string;
    address?: string;
  };
  locationState?: any;
}

export function ClientInfoBanner({
  client,
  locationState,
}: ClientInfoBannerProps) {
  return (
    <div className="bg-primary/10 p-4 rounded-md mb-4">
      <h3 className="font-medium">Selected Client:</h3>
      <div className="flex flex-wrap gap-x-6 mt-1">
        <span>
          <strong>Shop:</strong> {client.shopName}
        </span>
        <span>
          <strong>Name:</strong> {client.clientName}
        </span>
        <span>
          <strong>Phone:</strong> {client.phoneNumber}
        </span>
        <span></span>
        {Array.isArray(locationState?.client?.balanceHistory) &&
          locationState.client.balanceHistory.length > 0 && (
            <span>
              <strong> Balance :</strong>{" "}
              {(() => {
                const last =
                  locationState.client.balanceHistory[
                    locationState.client.balanceHistory.length - 1
                  ];
                return `${last.amount > 0 ? "+" : ""}${last.amount}`;
              })()}
            </span>
          )}
      </div>
    </div>
  );
}
