import { screen, waitFor } from "@testing-library/react";
import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import type { CalendarConnection } from "@/features/calendar-sync/types";
import { captureLocationHref } from "../../test/utils/location";
import { setSearchParams } from "../../test/utils/nextNavigation";
import { captureWrite, mockGets } from "../../test/utils/pageHarness";
import { renderWithProviders } from "../../test/utils/renderWithProviders";
import { CalendarSyncPage } from "./CalendarSyncPage";

const connection = (overrides: Partial<CalendarConnection> = {}): CalendarConnection => ({
  id: "conn-1",
  provider: "google",
  providerAccountEmail: "rep@example.com",
  status: "active",
  lastError: null,
  lastSyncedAt: "2026-08-08T10:00:00.000Z",
  createdAt: "2026-08-01T10:00:00.000Z",
  ...overrides,
});

const renderPage = () => renderWithProviders(<CalendarSyncPage />);

describe("CalendarSyncPage — connections list", () => {
  it("shows both providers as not connected when there are no connections", async () => {
    mockGets({ "/calendar-sync/connections": [] });
    renderPage();

    expect(await screen.findAllByText("Not connected")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Connect" })).toHaveLength(2);
  });

  it("shows a connected provider's account email and status", async () => {
    mockGets({ "/calendar-sync/connections": [connection()] });
    renderPage();

    expect(await screen.findByText(/rep@example.com/)).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sync now/ })).toBeInTheDocument();
  });

  it("shows the error status and message for an errored connection", async () => {
    mockGets({
      "/calendar-sync/connections": [
        connection({ status: "error", lastError: "Token refresh failed" }),
      ],
    });
    renderPage();

    expect(await screen.findByText("Error")).toBeInTheDocument();
    expect(screen.getByText(/Token refresh failed/)).toBeInTheDocument();
  });
});

describe("CalendarSyncPage — connect flow", () => {
  it("redirects the browser to the provider's authorize URL", async () => {
    mockGets({ "/calendar-sync/connections": [] });
    mockGets({ "/calendar-sync/google/authorize": { url: "https://accounts.google.com/authorize" } });
    const { assign, restore } = captureLocationHref();
    const { user } = renderPage();

    await screen.findAllByText("Not connected");
    const [googleConnect] = screen.getAllByRole("button", { name: "Connect" });
    await user.click(googleConnect);

    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://accounts.google.com/authorize"));
    restore();
  });
});

describe("CalendarSyncPage — sync now / disconnect", () => {
  it("triggers a manual sync", async () => {
    mockGets({ "/calendar-sync/connections": [connection()] });
    const write = captureWrite("post", "/calendar-sync/conn-1/sync-now", () =>
      HttpResponse.json(connection()) as unknown as Response,
    );
    const { user } = renderPage();

    await user.click(await screen.findByRole("button", { name: /Sync now/ }));
    await waitFor(() => expect(write.called).toBe(true));
  });

  it("requires confirmation before disconnecting", async () => {
    mockGets({ "/calendar-sync/connections": [connection()] });
    const write = captureWrite("delete", "/calendar-sync/conn-1", () => new Response(null, { status: 204 }));
    const { user } = renderPage();

    await user.click(await screen.findByRole("button", { name: /Disconnect/ }));
    expect(await screen.findByText("Disconnect calendar?")).toBeInTheDocument();
    expect(write.called).toBe(false);

    await user.click(screen.getByRole("button", { name: "Disconnect" }));
    await waitFor(() => expect(write.called).toBe(true));
  });
});

describe("CalendarSyncPage — OAuth callback banners", () => {
  it("shows a success banner after ?connected=google", async () => {
    setSearchParams("connected=google");
    mockGets({ "/calendar-sync/connections": [connection()] });
    renderPage();

    expect(await screen.findByText(/Google Calendar connected/)).toBeInTheDocument();
  });

  it("shows an error banner after ?error=connection_failed", async () => {
    setSearchParams("error=connection_failed");
    mockGets({ "/calendar-sync/connections": [] });
    renderPage();

    expect(
      await screen.findByText("Couldn't complete the connection. Please try again."),
    ).toBeInTheDocument();
  });
});
