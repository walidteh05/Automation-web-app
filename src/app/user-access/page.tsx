import HomeAuthGuard from "../../components/HomeAuthGuard";
import UserAccessWorkspace from "../../components/UserAccessWorkspace";

const allowedUserAccessRoles = ["admin"] as const;

export default function UserAccessPage() {
  return (
    <HomeAuthGuard allowedRoles={allowedUserAccessRoles}>
      <UserAccessWorkspace />
    </HomeAuthGuard>
  );
}
