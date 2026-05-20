import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-background p-4">
      <main className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center animate-fade-in">
          <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-lg mb-4">
            <span className="text-2xl font-bold">C</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">CRM Pro</h1>
          <p className="text-muted-foreground mt-2">Elevate your business management</p>
        </div>
        {children}
      </main>
    </div>
  );
}
