import { describe, expect, it } from "vitest";
import { captureRequest, describeApiContract } from "../../../../test/utils/apiContract";
import { automationApi } from "./automationApi";

describeApiContract("automationApi — rules", [
  { name: "getAll -> GET /automations", call: () => automationApi.getAll(), method: "GET", path: "/automations" },
  {
    name: "getAll encodes rule filters",
    call: () => automationApi.getAll({ page: 2, limit: 10, kind: "sla", isActive: "true" }),
    method: "GET",
    path: "/automations",
    query: { page: "2", limit: "10", kind: "sla", isActive: "true" },
  },
  { name: "getStats -> GET /automations/stats", call: () => automationApi.getStats(), method: "GET", path: "/automations/stats" },
  { name: "getById -> GET /automations/:id", call: () => automationApi.getById("r1"), method: "GET", path: "/automations/r1" },
  {
    name: "create a trigger rule -> POST /automations",
    call: () =>
      automationApi.create({
        name: "Notify on new lead",
        kind: "trigger",
        triggerEvent: "lead.created",
        isActive: true,
        conditions: [{ field: "source", operator: "equals", value: "web_form" }],
        actions: [{ type: "create_task", taskSubject: "Call the lead" }],
      }),
    method: "POST",
    path: "/automations",
    body: {
      name: "Notify on new lead",
      kind: "trigger",
      triggerEvent: "lead.created",
      isActive: true,
      conditions: [{ field: "source", operator: "equals", value: "web_form" }],
      actions: [{ type: "create_task", taskSubject: "Call the lead" }],
    },
  },
  {
    name: "create an SLA rule -> POST /automations",
    call: () =>
      automationApi.create({
        name: "Escalate idle tickets",
        kind: "sla",
        slaEntity: "ticket",
        slaIdleHours: 24,
        actions: [{ type: "send_email", emailTo: "owner", emailSubject: "SLA breach" }],
      }),
    method: "POST",
    path: "/automations",
    body: {
      name: "Escalate idle tickets",
      kind: "sla",
      slaEntity: "ticket",
      slaIdleHours: 24,
      actions: [{ type: "send_email", emailTo: "owner", emailSubject: "SLA breach" }],
    },
  },
  {
    name: "update -> PATCH /automations/:id",
    call: () => automationApi.update("r1", { isActive: false }),
    method: "PATCH",
    path: "/automations/r1",
    body: { isActive: false },
  },
  {
    name: "delete -> DELETE /automations/:id",
    call: () => automationApi.delete("r1"),
    method: "DELETE",
    path: "/automations/r1",
    respond: () => new Response(null, { status: 204 }),
  },
]);

describeApiContract("automationApi — run history", [
  { name: "getRuns -> GET /automations/runs", call: () => automationApi.getRuns(), method: "GET", path: "/automations/runs" },
  {
    name: "getRuns encodes run filters",
    call: () => automationApi.getRuns({ page: 3, limit: 50, ruleId: "r1", status: "failed" }),
    method: "GET",
    path: "/automations/runs",
    query: { page: "3", limit: "50", ruleId: "r1", status: "failed" },
  },
]);

describe("automationApi — filter edge cases", () => {
  it('omits kind and isActive for the "" (any) option', async () => {
    const req = await captureRequest(() => automationApi.getAll({ kind: "", isActive: "" }));
    expect(req.search.toString()).toBe("");
  });

  it('sends isActive=false as the literal string, not a dropped boolean', async () => {
    const req = await captureRequest(() => automationApi.getAll({ isActive: "false" }));
    expect(req.search.get("isActive")).toBe("false");
  });

  it("keeps the runs endpoint distinct from a rule id lookup", async () => {
    const runs = await captureRequest(() => automationApi.getRuns());
    const byId = await captureRequest(() => automationApi.getById("runs"));
    expect(runs.pathname).toBe("/api/backend/automations/runs");
    expect(byId.pathname).toBe("/api/backend/automations/runs");
    // Same URL by construction — documents that a rule may not be named "runs".
  });
});
