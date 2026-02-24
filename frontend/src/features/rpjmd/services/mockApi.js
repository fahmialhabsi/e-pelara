// src/services/mockApi.js
export const fetchKPI = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        programs: 18,
        activities: 56,
        indicators: 124,
      });
    }, 500);
  });
};

export const fetchTrend = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        years: ["2020", "2021", "2022", "2023", "2024"],
        values: [64, 70, 75, 80, 85],
      });
    }, 500);
  });
};
