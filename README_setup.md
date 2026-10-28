# Clone, Update, and Test Mortgage Payoff Lab

The weather integration is on `watson_local_test`. The separate weather
repository is included as a Git submodule inside `weather_app/`.

## First-time users

Open a terminal in the folder where you want to keep the project:

```bash
git clone --branch watson_local_test --recurse-submodules https://github.com/faruklmu17/mortgage_calculator.git
cd mortgage_calculator
```

This selects the new branch and downloads the weather repository into
`mortgage_calculator/weather_app/`. A plain clone checks out the default
branch and does not download submodule contents automatically.

## Existing users

From your existing `mortgage_calculator` directory, check for local changes:

```bash
git status
```

Commit or stash local changes before switching branches. Then run:

```bash
git fetch origin
git switch watson_local_test
git pull --ff-only
git submodule update --init --recursive
```

If the local branch does not exist, `git switch` creates it from
`origin/watson_local_test`. Otherwise it switches to the existing branch.

`git pull` alone may leave `weather_app` empty or at an older version.
The submodule command downloads it and checks out the weather commit
recorded by the mortgage repository. Users staying on `main` will not get
this integration until it is merged into `main`.

For later updates while on `watson_local_test`:

```bash
git pull --ff-only
git submodule update --init --recursive
```

Save any changes inside `weather_app` before updating it. If the pull
reports diverging histories, resolve your local and remote commits before continuing.

## Set up and run

Install Node.js 20.19+ or 22.12+, npm, and Python 3 with pip and venv.
First-time dependency installation requires internet access.

Each user supplies their own OpenWeatherMap API key. Follow the API-key
instructions in [README.md](README.md), then create
`mortgage_calculator/weather_app/.env` with:

```dotenv
API_KEY=your_openweathermap_key
```

Replace the placeholder with your actual key. Keep this file local; it is
ignored by Git and is not included when cloning. Calculators work without a key.

From `mortgage_calculator`, run:

```bash
./run.sh
```

The script installs missing dependencies and starts both apps. Open the
Local URL printed by Vite, usually <http://127.0.0.1:5173/>. Weather requires
port **5001** to be available. Allow location access or search by city.
Press **Ctrl+C** to stop both servers; restart after changing the API key.

## Run tests

From `mortgage_calculator`, run:

```bash
npm ci
npm test
npm run build
```

`npm ci` installs Node dependencies, `npm test` runs the Vitest calculation
suite, and `npm run build` checks the production build. These checks do not
need a weather API key or running Flask server.

For a browser check, run `./run.sh` and verify both calculator tabs, city
search, location permission behavior, and the layout on a narrow screen.
The automated calculation suite does not verify live weather or browser permissions.

To view the production build after building:

```bash
npm run preview -- --host 127.0.0.1 --port 4173
```

Open the URL printed by Vite. Keep Flask running on port **5001** to use weather.
