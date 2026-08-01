import { describe, expect, it } from "vitest";
import { captureRequest, describeApiContract } from "../../../../test/utils/apiContract";
import { userApi } from "./userApi";

describeApiContract("userApi", [
  {
    name: "getStaff -> GET /users/staff (directory for owner pickers)",
    call: () => userApi.getStaff(),
    method: "GET",
    path: "/users/staff",
    respond: () => Response.json([]),
  },
  {
    name: "createStaff -> POST /users (the admin invite flow)",
    call: () =>
      userApi.createStaff({ email: "sam@example.com", firstName: "Sam", lastName: "Staff", role: "User" }),
    method: "POST",
    path: "/users",
    body: { email: "sam@example.com", firstName: "Sam", lastName: "Staff", role: "User" },
  },
]);

describe("userApi.createStaff", () => {
  it("posts to /users, not /users/staff — the directory endpoint is read-only", async () => {
    const req = await captureRequest(() =>
      userApi.createStaff({ email: "a@b.com", firstName: "A", lastName: "B", role: "Admin" }),
    );
    expect(req.pathname).toBe("/api/backend/users");
  });

  it("carries the role so Keycloak provisions the right permissions", async () => {
    const req = await captureRequest(() =>
      userApi.createStaff({ email: "a@b.com", firstName: "A", lastName: "B", role: "Administrator" }),
    );
    expect(JSON.parse(req.body).role).toBe("Administrator");
  });

  it("sends no password — the invite email sets it", async () => {
    const req = await captureRequest(() =>
      userApi.createStaff({ email: "a@b.com", firstName: "A", lastName: "B", role: "User" }),
    );
    expect(JSON.parse(req.body)).not.toHaveProperty("password");
  });
});
