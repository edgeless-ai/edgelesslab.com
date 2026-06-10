import asyncio
from playwright.async_api import async_playwright

async def main():
    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.on("console", lambda msg: None)
        await page.goto("http://127.0.0.1:8766/index.html")
        # Wait for p5.js to initialise
        await page.wait_for_timeout(2000)
        canvas = await page.query_selector("canvas")
        assert canvas is not None, "p5.js canvas not found"
        box = await canvas.bounding_box()
        assert box["width"] == 960 and box["height"] == 640, f"Unexpected canvas size: {box}"

        # Simulate a slider change (move threshold to 80%)
        slider = await page.query_selector("#threshold")
        await slider.evaluate("el => el.value = 80")
        await slider.evaluate("el => el.dispatchEvent(new Event('input'))")
        await page.wait_for_timeout(1000)

        # Simulate a click on the canvas (reshuffle)
        await canvas.click()
        await page.wait_for_timeout(2000)

        await browser.close()
    if errors:
        print("ERRORS:")
        for e in errors:
            print(e)
        raise SystemExit(1)
    else:
        print("OK: Canvas 960x640, slider change + click reshuffle, no JS errors.")

asyncio.run(main())
