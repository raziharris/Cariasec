export async function onboard(page, name = "Pemain Ujian", language = "ms") {
  await page.locator("#player-name").fill(name);
  await page
    .getByRole("radio", {
      name: language === "en" ? "English" : "Bahasa Malaysia",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", {
      name: language === "en" ? "Continue" : "Teruskan",
      exact: true,
    })
    .click();
}
