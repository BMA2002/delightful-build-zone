import { Outlet } from "react-router-dom";
import GlobalHeader from "./GlobalHeader";

const AppLayout = () => (
  <div className="min-h-screen bg-pattern">
    <GlobalHeader />
    <main className="max-w-[1400px] mx-auto px-8 py-10">
      <Outlet />
    </main>
  </div>
);

export default AppLayout;
