"""Mobile preview checks executed with the browser automation page fixture; no auth mocking."""


async def test_preview_recovery(page):
    try:
        await page.set_viewport_size({"width": 375, "height": 667})
        await page.get_by_test_id("welcome-screen").wait_for(timeout=20000)
        assert await page.get_by_test_id("app-splash").count() == 0
        assert await page.get_by_test_id("clerk-connectivity-check").count() == 0
        print("PASS: guest preview exits connectivity check")
        for testid in ["welcome-login-button", "welcome-signup-button", "welcome-signin-button",
                       "welcome-plan-per_video", "welcome-plan-part_time", "welcome-plan-full_time"]:
            target = page.get_by_test_id(testid)
            await target.scroll_into_view_if_needed()
            await target.click(force=True)
            await page.get_by_test_id("sign-in-not-configured").wait_for(timeout=5000)
            assert await page.get_by_test_id("sign-in-google-button").count() == 0
            print(f"PASS: {testid} opens unavailable state")
            await page.get_by_test_id("sign-in-back-button").click(force=True)
            await page.get_by_test_id("welcome-screen").wait_for(timeout=5000)
        await page.get_by_test_id("welcome-login-button").click(force=True)
        await page.get_by_test_id("sign-in-not-configured").wait_for()
        print("Back touch target:", await page.get_by_test_id("sign-in-back-button").bounding_box())
        await page.screenshot(path="/tmp/sign-in-unavailable.jpg", quality=40, full_page=False)
        await page.goto(page.url)
        await page.get_by_test_id("sign-in-not-configured").wait_for(timeout=20000)
        await page.get_by_test_id("sign-in-back-button").click(force=True)
        await page.get_by_test_id("welcome-screen").wait_for(timeout=5000)
        print("PASS: deep-link back returns to Welcome")
        await page.goto(page.url.rstrip("/") + "/offer/TEST_missing_presenter")
        await page.get_by_test_id("welcome-screen").wait_for(timeout=20000)
        print("BLOCKED: send-offer error state is behind signed-out gate")
        error_text = await page.evaluate('''() => {
          const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
          return errorElements.map(el => el.textContent).join(", ");
        }''')
        print(f"Found error message: {error_text}" if error_text else "No error messages found on the page")
    except Exception as exc:
        print(f"FAIL: {exc}")
        raise

async def main():
    import os
    from dotenv import dotenv_values
    from playwright.async_api import async_playwright

    env = dotenv_values("/app/frontend/.env")
    url = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or env["EXPO_PUBLIC_BACKEND_URL"]
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url)
        await test_preview_recovery(page)
        await browser.close()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())