import { Link, Routes, Route, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Tenants from "./pages/Tenants";
import Leases from "./pages/Leases";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import { useAuth, signOut } from "./lib/auth";

export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
    
  return (
    <div className="min-h-screen grid grid-cols-[220px_1fr]">
      {/* Sidebar */}
      <aside className="bg-slate-900 text-slate-100 flex flex-col p-4">
        <div className="font-bold tracking-wide mb-4">Management Console</div>

        <nav className="flex flex-col gap-1 flex-1">
          <Link className="px-3 py-2 rounded hover:bg-slate-800" to="/">
            Dashboard
          </Link>
          <Link className="px-3 py-2 rounded hover:bg-slate-800" to="/properties">
            Properties
          </Link>
          <Link className="px-3 py-2 rounded hover:bg-slate-800" to="/tenants">
            Tenants
          </Link>
          <Link className="px-3 py-2 rounded hover:bg-slate-800" to="/leases">
            Leases
          </Link>
          <Link className="px-3 py-2 rounded hover:bg-slate-800" to="/payments">
            Payments
          </Link>
          <Link className="px-3 py-2 rounded hover:bg-slate-800" to="/settings">
            Settings
          </Link>
        </nav>

        {/* Footer area with user + sign out */}
        <div className="border-t border-slate-700 pt-3 mt-4 text-xs text-slate-400">
          {user?.email && (
            <div className="mb-2 truncate">{user.email}</div>
          )}
          <button
            onClick={() => {
              signOut();
              navigate("/login");
            }}
            className="pm-btn w-full"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="bg-slate-50 p-6">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/leases" element={<Leases />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
