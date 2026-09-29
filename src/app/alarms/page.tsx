import HomeAuthGuard from "../../components/HomeAuthGuard";
import AlarmRecordsWorkspace from "../../components/AlarmRecordsWorkspace";

const allowedAlarmRoles = ["admin", "technician"] as const;

export default function AlarmsPage() {
  return (
    <HomeAuthGuard allowedRoles={allowedAlarmRoles}>
      <AlarmRecordsWorkspace />
    </HomeAuthGuard>
  );
}