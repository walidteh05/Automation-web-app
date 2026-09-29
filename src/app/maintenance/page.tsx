import HomeAuthGuard from "../../components/HomeAuthGuard";
import MaintenanceRecordsWorkspace from "../../components/MaintenanceRecordsWorkspace";

const allowedMaintenanceRoles = ["admin", "technician"] as const;

export default function MaintenancePage() {
  return (
    <HomeAuthGuard allowedRoles={allowedMaintenanceRoles}>
      <MaintenanceRecordsWorkspace />
    </HomeAuthGuard>
  );
}