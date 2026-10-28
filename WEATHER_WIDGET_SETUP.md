# Add the Flask weather app to the mortgage website

This guide embeds the existing Flask weather page in the React mortgage
website using an iframe. The weather repository is nested inside
`mortgage_calculator/weather_app` as a Git submodule.

The iframe displays a running weather website; it does not combine the
repositories. Flask keeps the OpenWeatherMap API key on its server.

## Current status (2026-10-24)

Steps 1–5 are complete locally. Public hosting in step 6 is deferred at
your request; the integration currently uses your local Flask server.

- Mortgage website: <http://127.0.0.1:5173/>
- Weather strip: <http://127.0.0.1:5001/?layout=strip>
- Browser checks passed for live weather, city search, unknown-city errors,
  calculations on both mortgage tabs, and iframe layout at 390px and 320px.
- All 92 calculation tests and the production build passed.

Both servers must be running. If either process stops or you restart your
computer, use the commands below to restart it. No public deployment has
been performed.

## 1. Start the weather app

Open a terminal:

```bash
cd mortgage_calculator
git submodule update --init --recursive
cd weather_app
```

If the virtual environment already exists, activate it:

```bash
source weather_env/bin/activate
```

If the virtual environment is missing, create and activate it:

```bash
python3 -m venv weather_env
source weather_env/bin/activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Make sure `weather_app/.env` contains your real OpenWeatherMap key:

```dotenv
API_KEY=your_openweathermap_api_key_here
```

Replace the placeholder with your key. Keep `.env` out of Git and do not
put the key in React code or a Vite environment variable exposed to the browser.

Start Flask on port **5001**, which avoids the common macOS port 5000 conflict:

```bash
flask --app app run --host 127.0.0.1 --port 5001
```

Open this address to confirm the weather page works:

```text
http://127.0.0.1:5001/?city=New%20Haven
```

Leave this terminal running.

## 2. Weather strip widget

`src/components/WeatherWidget.jsx` embeds the local weather submodule at
`http://127.0.0.1:5001/?layout=strip`. It allows optional geolocation and
keeps city search inside the iframe. Without location permission, visitors
can enter a city manually.

The widget accepts `weather:resize` messages only from its own iframe and
the configured weather origin. It uses the reported content height to fit
the strip, with responsive CSS fallback heights until a message arrives.
`style.css` gives the strip the calculator's glass background, rounded
corners, matching maximum width, and horizontal padding.

## 3. Widget placement

`src/App.jsx` renders `<WeatherWidget />` before the calculator's `<main>`.
The weather strip stays above the calculator on both tabs. The calculator
inputs, calculations, and static educational content remain unchanged.

## 4. Start the mortgage website

Open a **second terminal**:

```bash
cd /Users/Watson/workWS/web_devel/mortgage_calculator
npm run dev
```

If dependencies have not been installed, run `npm ci` before `npm run dev`.

Open the URL Vite prints. Look above the calculator to see the weather strip.
Both the Flask and Vite processes must remain running.

## 5. Check the integration

Confirm that:

- Location access shows local weather, or city search works when access is declined.
- Searching for another city updates the embedded page.
- An unknown city displays a friendly error.
- Both mortgage calculator tabs still work.
- The embedded page remains usable on a narrow screen.

Then run these commands in the mortgage calculator repository:

```bash
npm test
npm run build
```

These commands check the existing calculation tests and production build.
They do not verify the live weather integration; use the browser checks above.

## 6. Make the weather available to public visitors

GitHub Pages serves static files and cannot run Flask. Your mortgage website
can stay on GitHub Pages, but the Flask app needs a separate host.

1. Deploy the weather repository to a host that supports Python/Flask.
2. Configure `API_KEY` as an environment variable on that host.
3. Follow the host's production Flask deployment instructions rather than
   exposing the local development server.
4. Confirm that the weather page works at its public HTTPS address.
5. Ensure the weather host allows embedding by your mortgage website. Its
   `X-Frame-Options` or Content Security Policy headers can block an iframe.
6. Replace `WEATHER_ORIGIN` in `WeatherWidget.jsx` with the public HTTPS origin.
   The iframe URL and resize message validation both use this constant:

```jsx
const WEATHER_ORIGIN = 'https://your-weather-host.example';
```

That address is a placeholder; use the actual address supplied by your host.
Use HTTPS for the embedded weather page on the public HTTPS mortgage website.
Update the mortgage site's privacy page to describe the embedded weather
service and its external requests before publishing the integration.

This guide does not change the mortgage deployment workflow or require
switching branches. Keep development on `watson_local_test`.

## Local hosting limitations

`localhost` and `127.0.0.1` always refer to the computer viewing the page.
Publishing an iframe with that address would not connect visitors to your
computer. Keep the local address for local testing only.

Turning your computer on is not enough to serve weather publicly: Flask must
be running and reachable through a public address. A tunnel can expose a
local service, but it depends on your computer and the tunnel staying online.
Separately hosted Flask avoids that dependency.

The API key can remain private on either a local or hosted Flask server.
Keeping it private does not require keeping Flask on your personal computer.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Iframe is blank or reports a connection error | Confirm Flask is running on port 5001 and open its URL directly. |
| Weather API key error | Check `API_KEY` in the weather app's `.env` or hosting environment, then restart Flask. |
| Weather shows literal Jinja placeholders | Open the Flask URL rather than serving the template as a static file. |
| Public iframe refuses to load | Check HTTPS, browser console errors, and the weather host's embedding headers. |
| Weather content is clipped or scrolls | Check that embed.js loads and weather:resize messages match WEATHER_ORIGIN; inspect the mobile layout. |
| Mortgage page works but weather stops | The weather app runs separately; check its process, hosting, and API connectivity. |

## References

- [GitHub Pages hosting limitations](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Browser mixed-content rules](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Mixed_content)
- [Embedding restrictions with X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options)
