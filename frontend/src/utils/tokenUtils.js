// src/utils/tokenUtils.js

export const getAccessToken = () => {
  try {
    const token = localStorage.getItem("token");
    if (token && typeof token === "string" && token.length > 0) {
      return token;
    }
    return null;
  } catch {
    return null;
  }
};
