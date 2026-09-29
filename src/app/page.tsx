import HomeAuthGuard from "../components/HomeAuthGuard";
import AutomationDashboard from "../components/AutomationDashboard";

export default function Home() {
  return (
    <HomeAuthGuard>
      <AutomationDashboard />
    </HomeAuthGuard>
  );
}
