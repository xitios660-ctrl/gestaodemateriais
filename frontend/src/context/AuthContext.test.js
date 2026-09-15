import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "./AuthContext";
import { api } from "../lib/api";
jest.mock(
  "react-router-dom",
  () => ({ useLocation: () => ({ pathname: "/admin" }) }),
  { virtual: true },
);
jest.mock("../lib/api", () => ({ api: { get: jest.fn(), post: jest.fn() } }));
let holder, root;
function State() {
  const auth = useAuth();
  return (
    <>
      <p>{auth.loading ? "checking" : auth.user?.name || "anonymous"}</p>
      <button onClick={() => auth.login("fake@example.com", "test-only")}>
        Login
      </button>
    </>
  );
}
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  holder = document.createElement("div");
  document.body.appendChild(holder);
  root = createRoot(holder);
  jest.clearAllMocks();
});
afterEach(async () => {
  await act(async () => root.unmount());
  holder.remove();
});
test("protected route stays in checking state until the session probe completes", async () => {
  let resolveProbe;
  api.get.mockReturnValue(
    new Promise((resolve) => {
      resolveProbe = resolve;
    }),
  );
  await act(async () =>
    root.render(
      <AuthProvider>
        <State />
      </AuthProvider>,
    ),
  );
  expect(holder.textContent).toContain("checking");
  await act(async () => resolveProbe({ data: { name: "QA account" } }));
  expect(holder.textContent).toContain("QA account");
});
test("a delayed anonymous session probe cannot overwrite a successful login", async () => {
  let rejectProbe;
  api.get.mockReturnValue(
    new Promise((_, reject) => {
      rejectProbe = reject;
    }),
  );
  api.post.mockResolvedValue({ data: { name: "QA account" } });
  await act(async () =>
    root.render(
      <AuthProvider>
        <State />
      </AuthProvider>,
    ),
  );
  await act(async () => holder.querySelector("button").click());
  expect(holder.textContent).toContain("QA account");
  await act(async () => rejectProbe(new Error("old session")));
  expect(holder.textContent).toContain("QA account");
});
