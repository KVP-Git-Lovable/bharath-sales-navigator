import { Layout } from "@/components/Layout";
import MyDeliveriesTab from "@/components/packing/MyDeliveriesTab";
import { ModuleHelpButton } from "@/components/help/ModuleHelpButton";

const MyDeliveries = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="p-4 border-b bg-card">
          <h1 className="text-xl font-bold">My Deliveries</h1>
          <p className="text-sm text-muted-foreground">
            View and manage your assigned deliveries
          </p>
        </div>
        <div className="p-4">
          <MyDeliveriesTab />
        </div>
      </div>
    </Layout>
  );
};

export default MyDeliveries;
