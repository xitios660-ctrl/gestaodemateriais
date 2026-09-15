import { api } from "./api";

jest.mock("axios", () => ({
  create: () => ({
    post: jest.fn(),
    interceptors: { response: { use: jest.fn() } },
  }),
}));
const rejectResponse = api.interceptors.response.use.mock.calls[0][1];

test("an old session probe cannot broadcast expiry after a successful login", async () => {
  const expired = jest.fn();
  window.addEventListener("auth:expired", expired);
  api.post.mockRejectedValue(new Error("no old refresh session"));
  const error = {
    response: { status: 401 },
    config: { url: "/auth/me", _sessionProbe: true },
  };
  await expect(rejectResponse(error)).rejects.toBe(error);
  expect(expired).not.toHaveBeenCalled();
  window.removeEventListener("auth:expired", expired);
});

test("an expired authenticated request still ends the session", async () => {
  const expired = jest.fn();
  window.addEventListener("auth:expired", expired);
  api.post.mockRejectedValue(new Error("expired refresh session"));
  const error = { response: { status: 401 }, config: { url: "/tickets" } };
  await expect(rejectResponse(error)).rejects.toBe(error);
  expect(expired).toHaveBeenCalledTimes(1);
  window.removeEventListener("auth:expired", expired);
});
