"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { ActivitiesPage } from "@/crm-pages/ActivitiesPage";
import { CustomersPage } from "@/crm-pages/CustomersPage";
import { Dashboard } from "@/crm-pages/Dashboard";
import { LeadsPage } from "@/crm-pages/LeadsPage";
import { OpportunitiesPage } from "@/crm-pages/OpportunitiesPage";
import { TicketsPage } from "@/crm-pages/TicketsPage";
import { UsersPage } from "@/crm-pages/UsersPage";

export default function CrmApp() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "customers":
        return <CustomersPage />;
      case "leads":
        return <LeadsPage />;
      case "opportunities":
        return <OpportunitiesPage />;
      case "activities":
        return <ActivitiesPage />;
      case "tickets":
        return <TicketsPage />;
      case "users":
        return <UsersPage />;
      default:
        return (
          <div className="flex flex-1 items-center justify-center p-8 text-gray-500">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold text-gray-300">
                Coming Soon
              </h2>
              <p>The {currentPage} page is under construction.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F4F5F7]">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
        {renderPage()}
      </div>
    </div>
  );
}
