async function waitForRenderedPage(page) {
  // Fonts can report ready before a pending stylesheet has introduced them.
  await page.waitForLoadState('load');
  await page.evaluate(() => document.fonts.ready);
}

module.exports = { waitForRenderedPage };
