import { vi } from "vitest";

const signInEmailMock = vi.hoisted(() => vi.fn());
const signUpEmailMock = vi.hoisted(() => vi.fn());
const getSessionMock = vi.hoisted(() => vi.fn());
const requestPasswordResetMock = vi.hoisted(() => vi.fn());
const resetPasswordMock = vi.hoisted(() => vi.fn());

export {
  signInEmailMock,
  signUpEmailMock,
  getSessionMock,
  requestPasswordResetMock,
  resetPasswordMock
};

vi.mock("~/shared/api/auth-client", () => ({
  authClient: {
    signIn: { email: signInEmailMock },
    signUp: { email: signUpEmailMock },
    getSession: getSessionMock,
    requestPasswordReset: requestPasswordResetMock,
    resetPassword: resetPasswordMock
  }
}));

export function resetAuthClientMocks() {
  signInEmailMock.mockReset();
  signUpEmailMock.mockReset();
  getSessionMock.mockReset();
  requestPasswordResetMock.mockReset();
  resetPasswordMock.mockReset();
}
