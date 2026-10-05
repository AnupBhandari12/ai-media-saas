export const FREE_BETA_LIMITS = {
  imagesPerMonth: 30,
  videosPerMonth: 10,
};

export function getCurrentMonthStart() {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1
    )
  );
}