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
    if (!token) return null;

    // Support the backend's mock token format: mock-jwt-token-for-{guid}
    if (token.startsWith("mock-jwt-token-for-")) {
      const guid = token.substring("mock-jwt-token-for-".length);
      return {
        sub: guid,
        role: "client", // Fallback role, will be overridden by storedUser if available
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // Mock 30 days
      };
    }

    const parts = token?.split(".");
    if (!parts || parts.length !== 3) {
      return null;
    }
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
    
    const binary = atob(padded);
    const json = decodeURIComponent(escape(binary));
    const decoded = JSON.parse(json);
    
    // Allow up to 12 hours clock skew or expired token to be restored.
    // The backend API calls will reject expired tokens with 401 anyway,
    // which will log the user out cleanly. This prevents local clock drift from breaking F5.
    if (decoded.exp && (Date.now() - 12 * 60 * 60 * 1000) >= decoded.exp * 1000) {
      return null;
    }
    return decoded;
  } catch (e) {
    console.error("JWT Decode error:", e);
    return null;
  }
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

  const restoreSession = useCallback(() => {
    try {
      const storedToken =
        localStorage.getItem(TOKEN_STORAGE_KEY) ||
        sessionStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser =
        localStorage.getItem(USER_STORAGE_KEY) ||
        sessionStorage.getItem(USER_STORAGE_KEY);

      if (!storedToken) {
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
        return;
      }
      const payload = decodeJwtPayload(storedToken);
      if (!payload) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(USER_STORAGE_KEY);
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
        return;
      }
      let user = null;
      if (storedUser) {
        user = JSON.parse(storedUser);
        if (user) {
          const rawRole = user.role || user.Role || "";
          user.role = rawRole ? rawRole.toLowerCase() : "client";
          user.id = user.id || user.Id || "";
        }
      } else {
        user = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          role: payload.role ? payload.role.toLowerCase() : "client",
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
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    function handleUnauthorized() {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      try {
        window.dispatchEvent(new Event("aitasker_auth_sync"));
      } catch (e) {}
    }
    const handleSync = () => restoreSession();

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    window.addEventListener("storage", handleSync);
    window.addEventListener("aitasker_auth_sync", handleSync);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("aitasker_auth_sync", handleSync);
    };
  }, [restoreSession]);

  const handleAuthSuccess = useCallback((token, user, usingDemo = false) => {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (e) {}

    let finalUser = user;
    if (!finalUser) {
      const payload = decodeJwtPayload(token);
      if (payload)
        finalUser = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          role: payload.role ? payload.role.toLowerCase() : "client",
          hasProfile: true,
        };
    } else if (finalUser && finalUser.role) {
      finalUser.role = finalUser.role.toLowerCase();
    }
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(finalUser));
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(finalUser));
      window.dispatchEvent(new Event("aitasker_auth_sync"));
    } catch (e) {}

    dispatch({
      type: AUTH_ACTIONS.LOGIN_SUCCESS,
      payload: { token, user: finalUser, usingDemo },
    });
    return finalUser;
  }, []);

  const login = useCallback(
    async (email, password) => {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      // -------------------------------------------------------------------
      // REAL API MODE - call backend, no demo fallback
      // -------------------------------------------------------------------
      try {
        const response = await apiLogin(email, password);
        const roleFromResponse =
          response.user?.role || response.user?.Role || response.role || response.Role || "client";
        const normalizedRole = roleFromResponse.toLowerCase();
        let hasCompletedProfile = true;

        const userId = response.user?.id || response.user?.Id || response.userId || response.UserId;

        if (normalizedRole === "expert" && userId) {
          try {
            const userDetails = await api.users.getById(userId);
            hasCompletedProfile = !!(userDetails && userDetails.expertProfile);
          } catch (_err) {
            hasCompletedProfile = false;
          }
        }
        const userObj = {
          id: userId,
          role: normalizedRole,
          email: email,
          name: response.user?.fullName || response.user?.FullName || response.user?.name || response.user?.Name || email.split("@")[0],
          phoneNumber: response.user?.phoneNumber || response.user?.PhoneNumber || response.phoneNumber || response.PhoneNumber || "",
          hasProfile: hasCompletedProfile,
        };
        return handleAuthSuccess(response.token, userObj, false);
      } catch (apiError) {
        const message =
          apiError.data?.message ||
          apiError.message ||
          "Login failed. Please check your credentials.";
        dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: message });
        throw apiError;
      }
    },
    [handleAuthSuccess],
  );

  const register = useCallback(
    async ({ name, email, phoneNumber, password, confirmPassword, role }) => {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      try {
        await apiRegister({ name, email, phoneNumber, password, role });
        dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
        return true;
      } catch (apiError) {
        if (apiError.status && apiError.status !== 0) {
          const message = apiError.data?.message || "Registration failed.";
          dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: message });
          throw apiError;
        }
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: "Connection to server failed.",
        });
        throw apiError;
      }
    },
    [],
  );

  // NEW COMPLETE PROFILE API CALL
  const completeExpertProfile = useCallback(
    async (profileData) => {
      try {
        await api.auth.completeProfile(state.user?.id, profileData);
        const updatedUser = { ...state.user, hasProfile: true };
        try {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
          sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
          window.dispatchEvent(new Event("aitasker_auth_sync"));
        } catch (e) {}
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
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      window.dispatchEvent(new Event("aitasker_auth_sync"));
    } catch (e) {}
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
    }), // <--- Exported function
    [state, login, register, logout, clearError, completeExpertProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context) return context;

  // Safe fallback if called outside AuthProvider context or during hot reload
  try {
    const rawUser =
      localStorage.getItem(USER_STORAGE_KEY) ||
      sessionStorage.getItem(USER_STORAGE_KEY) ||
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");
    const user = rawUser ? JSON.parse(rawUser) : null;
    const token =
      localStorage.getItem(TOKEN_STORAGE_KEY) ||
      sessionStorage.getItem(TOKEN_STORAGE_KEY) ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      null;
    return {
      user,
      token,
      isAuthenticated: !!user,
      loading: false,
      error: null,
      login: async () => {},
      logout: async () => {},
      register: async () => {},
      clearError: () => {},
      completeExpertProfile: async () => {},
    };
  } catch (e) {
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      login: async () => {},
      logout: async () => {},
      register: async () => {},
      clearError: () => {},
      completeExpertProfile: async () => {},
    };
  }
}
    return {
      user,
      token,
      isAuthenticated: !!user,
      loading: false,
      error: null,
      login: async () => {},
      logout: async () => {},
      register: async () => {},
      clearError: () => {},
      completeExpertProfile: async () => {},
    };
  } catch (e) {
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      login: async () => {},
      logout: async () => {},
      register: async () => {},
      clearError: () => {},
      completeExpertProfile: async () => {},
    };
  }
}
