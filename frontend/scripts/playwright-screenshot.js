// playwright-screenshot.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport for consistent screenshots
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    await page.goto('http://localhost:4000'); // Your app URL

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: 'screenshot.png',
      fullPage: true,
    });

    console.log('✅ Screenshot saved as screenshot.png');
  } catch (error) {
    console.error('❌ Error taking screenshot:', error);
  } finally {
    await browser.close();
  }
})();
