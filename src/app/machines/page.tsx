import HomeAuthGuard from "../../components/HomeAuthGuard";
import MachinesWorkspace from "../../components/MachinesWorkspace";

const allowedMachineRoles = ["admin", "technician"] as const;

export default function MachinesPage() {
  return (
    <HomeAuthGuard allowedRoles={allowedMachineRoles}>
      <MachinesWorkspace />
    </HomeAuthGuard>
  );
}