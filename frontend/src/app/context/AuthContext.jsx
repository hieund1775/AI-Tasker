import {
  createContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from "react";
import {
  login as apiLogin,
  register as apiRegister,
} from "../../services/authService.js";
import api from "../../services/api.js";

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const decoded = JSON.parse(json);
    if (decoded.exp && Date.now() >= decoded.exp * 1000) return null;
    return decoded;
  } catch {
    return null;
  }
}

function createDemoToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const body = {
    sub: payload.sub || `user-${Date.now()}`,
    email: payload.email,
    role: payload.role,
    name: payload.name || payload.email?.split("@")[0] || "",
    iat: nowInSeconds,
    exp: nowInSeconds + 24 * 60 * 60,
  };
  const encode = (obj) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${encode(header)}.${encode(body)}.demo-signature`;
}

function demoRoleFromEmail(email) {
  if (email.toLowerCase().includes("admin")) return "admin";
  if (email.toLowerCase().includes("expert")) return "expert";
  return "client";
}

const TOKEN_STORAGE_KEY = "aitasker_auth_token";
const USER_STORAGE_KEY = "aitasker_user_info";

const AUTH_ACTIONS = {
  LOGIN_START: "LOGIN_START",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILURE: "LOGIN_FAILURE",
  LOGOUT: "LOGOUT",
  RESTORE_SESSION: "RESTORE_SESSION",
  CLEAR_ERROR: "CLEAR_ERROR",
};

const initialState = {
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  usingDemo: false,
};

function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return { ...state, loading: true, error: null };
    case AUTH_ACTIONS.LOGIN_SUCCESS: {
      const { token, user, usingDemo = false } = action.payload;
      return {
        ...state,
        token,
        user,
        role: user.role,
        isAuthenticated: true,
        loading: false,
        error: null,
        usingDemo,
      };
    }
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        role: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        role: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        usingDemo: false,
      };
    case AUTH_ACTIONS.RESTORE_SESSION: {
      const { token, user } = action.payload;
      const isDemo = token?.endsWith(".demo-signature") ?? false;
      return {
        ...state,
        token,
        user,
        role: user.role,
        isAuthenticated: true,
        loading: false,
        error: null,
        usingDemo: isDemo,
      };
    }
    case AUTH_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    default:
      return state;
  }
}

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);

      if (!storedToken) {
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
        return;
      }
      let user = null;
      if (storedUser) {
        user = JSON.parse(storedUser);
      } else {
        const payload = decodeJwtPayload(storedToken);
        if (!payload) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
          return;
        }
        user = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          role: payload.role,
          hasProfile: true,
        };
      }
      dispatch({
        type: AUTH_ACTIONS.RESTORE_SESSION,
        payload: { token: storedToken, user },
      });
    } catch {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const handleAuthSuccess = useCallback((token, user, usingDemo = false) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    let finalUser = user;
    if (!finalUser) {
      const payload = decodeJwtPayload(token);
      if (payload)
        finalUser = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          role: payload.role,
          hasProfile: true,
        };
    }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(finalUser));
    dispatch({
      type: AUTH_ACTIONS.LOGIN_SUCCESS,
      payload: { token, user: finalUser, usingDemo },
    });
    return finalUser;
  }, []);

  const login = useCallback(
    async (email, password) => {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      try {
        const response = await apiLogin(email, password);
        const normalizedRole = response.role
          ? response.role.toLowerCase()
          : "client";
        let hasCompletedProfile = true;

        if (normalizedRole === "expert") {
          try {
            await api.experts.checkProfile();
            hasCompletedProfile = true;
          } catch (err) {
            hasCompletedProfile = false;
          }
        }
        const userObj = {
          id: response.userId,
          role: normalizedRole,
          email: email,
          name: email.split("@")[0],
          hasProfile: hasCompletedProfile,
        };
        return handleAuthSuccess(response.token, userObj, false);
      } catch (apiError) {
        if (apiError.status && apiError.status !== 0) {
          const message = apiError.data?.message || "Đăng nhập thất bại.";
          dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: message });
          throw apiError;
        }
      }
      try {
        if (!email || !password)
          throw new Error("Email and password are required.");
        if (password.length < 3) throw new Error("Invalid email or password.");
        const role = demoRoleFromEmail(email);
        const token = createDemoToken({
          email,
          role,
          name: email.split("@")[0],
        });
        return handleAuthSuccess(
          token,
          { role, email, name: email.split("@")[0], hasProfile: true },
          true,
        );
      } catch (demoError) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: demoError.message,
        });
        throw demoError;
      }
    },
    [handleAuthSuccess],
  );

  const register = useCallback(
    async ({ name, email, password, confirmPassword, role }) => {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      try {
        const response = await apiRegister({ name, email, password, role });

        // Expert: auto-login with hasProfile=false so they go straight to
        // profile completion instead of login → edit-profile round-trip.
        if (role === "expert" && response.token) {
          const userObj = {
            id: response.user?.id || `user-${Date.now()}`,
            role: "expert",
            email,
            name,
            hasProfile: false,
          };
          handleAuthSuccess(response.token, userObj, false);
          return { success: true, role: "expert" };
        }

        // Client / Admin: current behaviour — go to login page
        dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
        return { success: true, role };
      } catch (apiError) {
        if (apiError.status && apiError.status !== 0) {
          const message = apiError.data?.message || "Đăng ký thất bại.";
          dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: message });
          throw apiError;
        }
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: "Lỗi kết nối tới máy chủ.",
        });
        throw apiError;
      }
    },
    [handleAuthSuccess],
  );

  // HÀM GỌI API COMPLETE PROFILE MỚI
  const completeExpertProfile = useCallback(
    async (profileData) => {
      try {
        await api.auth.completeProfile(profileData);
        const updatedUser = { ...state.user, hasProfile: true };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            token: state.token,
            user: updatedUser,
            usingDemo: state.usingDemo,
          },
        });
        return true;
      } catch (apiError) {
        throw apiError;
      }
    },
    [state.user, state.token, state.usingDemo],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      login,
      register,
      logout,
      clearError,
      completeExpertProfile,
    }), // <--- Đã export hàm
    [state, login, register, logout, clearError, completeExpertProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
