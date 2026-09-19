# Mortgage Payoff Lab: React Migration Plan

A step-by-step workflow for migrating Mortgage Payoff Lab with local Qwen in VS Code.

## Direct instructions for Qwen

You are the coding agent executing this plan inside the user's VS Code workspace. Use available file and terminal tools to perform the requested work. Do not merely describe edits when you can apply them.

### Select exactly one numbered step

1. If the user specifies a number, such as **Complete Step 3**, perform only that numbered step after checking prerequisites.
2. If the user says **Start this plan**, perform **Step 1 only**: read existing repository instructions, inspect available tools, list project files, and inspect Git status if terminal access exists. Create or update `MIGRATION_STATUS.md` with observed facts. Do not modify application code or switch branches yet.
3. If the user says **Continue**, read the status file and complete the next unfinished numbered step. Resolve blockers before moving forward. Do not skip failed prerequisites.
4. Complete the selected step, verify it, update the status file, report results, and stop. Do not automatically execute all 18 steps.
5. Step 18 publishes the site. It requires an explicit publishing request; a generic **Continue** does not authorize publishing.

Use step numbers 1, 2, 3, and so on throughout reports.

### Tools and evidence

- Read any existing `AGENTS.md` before editing. If missing, follow this plan and create it in Step 5.
- Read relevant files in small groups. Do not reload the whole repository on every turn.
- Use actual file-editing and terminal tools when available.
- If a tool fails, report its actual error. Do not invent file contents or results.
- If required tools are unavailable, supply the exact patch or command for the user to apply.
- Run development servers in a separate terminal or supported background session. Record the URL; do not wait indefinitely for a server to finish.
- Mark browser checks as pending if you cannot perform them. Ask for the specific observations needed.
- A successful build does not prove calculation or interface correctness.
- Preserve existing user changes and previous migration progress.
- Create the status file if it is missing; do not assume that the audit or instruction files exist before their steps.
- Treat code blocks under the selected step as task instructions and examples. Inspect current state before executing commands.
- Human setup actions, such as selecting a VS Code model, remain the user's responsibility.

### Completion report

```text
Step completed: [number and name, or blocked]
Files changed: [actual paths, or none]
Checks run: [commands and results]
Manual checks pending: [specific checks, or none]
Blockers: [specific problem, or none]
Next step: [number and name]
Stopped after the requested step.
```

### First prompt to paste into Qwen

```text
Read MIGRATION_PLAN.md and any existing AGENTS.md.
Start with Step 1 only. Use your tools to inspect this workspace
and confirm file and terminal access. Create or update
MIGRATION_STATUS.md with observed facts.
Do not modify application code or switch branches yet.
Report the result and stop.
```

### Example follow-up prompts

```text
Complete Step 2 only. Check Git status first and preserve existing
work. Update MIGRATION_STATUS.md, report results, and stop.
```

```text
Complete Step 3 only. Read the source and write MIGRATION_AUDIT.md.
Do not modify application code. Update MIGRATION_STATUS.md,
report results, and stop.
```

The detailed sections below retain all 18 steps, commands, prompts, and checkpoints. They describe the overall plan; execute only the requested numbered step.

## Goal and scope

Convert the interactive mortgage calculator from vanilla JavaScript to **React + Vite + JavaScript**, while preserving the existing design, calculations, URLs, and GitHub Pages hosting.

Keep the FAQ, educational sections, and SEO metadata in static HTML. Both calculator tabs share one React root. This is a deliberate incremental migration; the entire page does not need to be rendered by React.

Preserve:

- Mortgage calculation results and validation
- Monthly and one-time extra-payment behavior
- Existing appearance and responsive layouts
- Chart.js visualizations
- Client-side handling of mortgage inputs
- GitHub Pages deployment and the custom domain
- `/privacy.html`, SEO metadata, verification files, and educational content

| Purpose | Technology |
| --- | --- |
| Interactive interface | React |
| Language | JavaScript and JSX |
| Development and build | Vite |
| Charts | Chart.js and react-chartjs-2 |
| Calculation tests | Vitest |
| Styling | Existing CSS |
| Hosting | GitHub Pages |
| Coding assistance | Local Qwen through your VS Code extension |

Do not add routing, a backend, a database, TypeScript, or a new styling framework for this migration.

This plan is based on the supplied README. Qwen must inspect the actual source before implementing it. No repository audit or migration tests have been performed as part of writing this plan.

## Step 1 — Establish how you will work with Qwen

Qwen is the model. Your VS Code extension provides access to files, editing tools, and terminal commands.

1. Open the existing repository folder in VS Code.
2. Select your local Qwen model in your AI extension.
3. Confirm that the extension can read selected workspace files.
4. Check whether it can edit files and execute commands.
5. If it only supports chat, apply suggested edits and run commands yourself.
6. Save this file as `MIGRATION_PLAN.md` at the repository root.

Do not assume local inference means every extension feature is local. If that matters to you, inspect its model, embedding, and telemetry configuration.

Give Qwen **one step at a time**. Avoid requesting a complete rewrite in one response.

General prompt (the user should also specify a step number):

```text
You are helping me migrate Mortgage Payoff Lab from vanilla
HTML/CSS/JavaScript to React with Vite.

First read MIGRATION_PLAN.md.

Complete only the numbered step explicitly requested by the user.
For example, "Complete Step 3" means perform the source audit only.
After reporting the results, stop. Do not begin Step 4.

Before editing:
1. Read the relevant existing files.
2. Explain the current behavior.
3. List the files you intend to change.

After editing:
1. Summarize the changes.
2. Run the relevant checks if you have terminal access.
3. Report the commands and actual results.
4. Explain what I should check in the browser.
5. Update MIGRATION_STATUS.md.

Do not claim a test passed unless you ran it.
Do not push, merge, or deploy.
```

**Checkpoint:** Qwen can identify the repository's actual files and explain what it has read.

## Step 2 — Protect the working version

In the VS Code terminal:

```bash
git status
git branch --show-current
```

If there are uncommitted changes, review and commit the work you want to preserve before continuing. Avoid mixing unrelated edits into the migration.

The README says `v1` deploys to production. Confirm that this matches the workflow.

Once the working tree is clean:

```bash
git switch v1
git pull --ff-only
git switch -c react-migration
```

If the migration branch already exists, inspect it and use it rather than creating it again.

Record the starting commit:

```bash
git rev-parse HEAD
```

Save that value in `MIGRATION_STATUS.md` as the baseline commit. You can also create a local reference tag if this name does not already exist:

```bash
git tag before-react-migration
```

Do not push changes to `v1` during development.

**Checkpoint:** You are on `react-migration`, the original site still works, and the baseline commit is recorded.

## Step 3 — Audit the existing code

Attach or explicitly reference:

- `index.html`
- `script.js`
- `style.css`
- `privacy.html`
- `.github/workflows/deploy.yml`
- `README.md`

Prompt:

```text
Perform a read-only audit of this repository.

Inspect index.html, script.js, style.css, privacy.html,
README.md, and .github/workflows/deploy.yml.

Identify:
1. All calculator inputs and default values.
2. All mortgage and amortization functions.
3. Input parsing, formatting, and validation.
4. DOM event listeners and direct DOM updates.
5. Tab-switching and value synchronization.
6. Chart creation and update logic.
7. Demo animations, timers, and sessionStorage usage.
8. SEO metadata and static educational content.
9. External fonts, scripts, styles, and other requests.
10. The actual deployment branch and workflow behavior.

Describe exactly when a one-time payment is applied.

Identify ambiguities or likely bugs separately from migration work.
Do not silently fix them.

Write the findings to MIGRATION_AUDIT.md.
Do not modify application files.
```

Read the audit and correct misunderstandings before implementation.

**Checkpoint:** The behavior inventory is grounded in actual source code.

## Step 4 — Capture baseline behavior

Run the original site locally:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

Record screenshots of:

- Main calculator on desktop
- Extra-payment calculator on desktop
- Main calculator on a narrow mobile viewport
- Validation messages
- Chart and result cards

Record actual inputs and outputs for these cases:

| Case | Inputs or action | What to record |
| --- | --- | --- |
| Standard loan | $400,000 home, $80,000 down, 6.5%, 30 years | Principal, P&I, total interest |
| Zero interest | Same principal, 0%, 30 years | Payment and interest |
| Full down payment | Down payment equals price | Zero-loan behavior |
| Monthly extra | $200 extra per month | Remaining time and interest |
| One-time extra | $10,000 lump sum | Remaining time and interest |
| Current balance | Balance below original principal | Baseline and accelerated results |
| No extra | Extra payment is zero | Matching baseline and accelerated results |
| Empty input | Clear a numeric field | Editing and validation behavior |
| Invalid input | Negative rate or excessive down payment | Error behavior |
| Tab change | Change values, then switch tabs | Synchronization behavior |

Record all other inputs, including tax, insurance, HOA, and the precise current balance, so each case is reproducible.

Prompt:

```text
Create BASELINE_CASES.md with a table for recording inputs,
displayed outputs, screenshots, and notes.

Use the audit to suggest exact reproducible cases.
Do not invent observed outputs or claim browser tests were run.

Separate:
- Existing behavior we need to preserve.
- Suspected bugs requiring an explicit decision.
```

A baseline documents existing behavior; it does not prove the existing math is correct.

**Checkpoint:** Concrete cases are available for comparison.

## Step 5 — Add persistent instructions for Qwen

Create `AGENTS.md` at the repository root. If one exists, merge these rules without replacing unrelated instructions.

```markdown
# Project Instructions

## Goal

Migrate Mortgage Payoff Lab to React with Vite and JavaScript,
preserving existing behavior and appearance.

## Scope

- Work on the react-migration branch.
- Complete only the requested migration step.
- Keep calculations entirely client-side.
- Reuse the existing CSS.
- Keep mortgage mathematics independent of React.
- Preserve static SEO and educational content.
- Keep /privacy.html working.

## Restrictions

- Do not push, merge, deploy, or change DNS.
- Do not add a backend, database, analytics, or user accounts.
- Do not introduce TypeScript, routing, or a styling framework.
- Do not rewrite unrelated code.
- Do not silently change calculation semantics or rounding.
- Do not use destructive Git commands.
- Do not delete original implementation files before parity checks.

## React Guidelines

- Use function components and hooks.
- Use React state for calculator inputs.
- Derive calculated results from inputs.
- Do not store redundant calculated values in state.
- Do not directly mutate React-managed DOM.
- Clean up timers and chart resources.
- Handle blank and partially entered numeric values.

## Verification

- Run relevant tests and the production build.
- Report actual command results.
- Separate automated checks from manual checks.
- Update MIGRATION_STATUS.md after each step.
```

Some extensions do not automatically load `AGENTS.md`. Explicitly ask Qwen to read it at the start of each new session.

## Step 6 — Prepare Node.js and Vite

Check your tools:

```bash
node --version
npm --version
```

Use a supported Node.js LTS release compatible with the Vite version you install. Verify the current requirements at <https://vite.dev/guide/>. Use the same supported Node major version locally and in CI where practical.

For an existing repository, add Vite directly instead of scaffolding over existing files.

Prompt:

```text
Read AGENTS.md and the migration audit.

Add a minimal React + Vite development setup to this existing repo.

Requirements:
- Preserve the current application and HTML.
- Do not run a project generator over the existing directory.
- Add React and React DOM.
- Add Vite and @vitejs/plugin-react as development dependencies.
- Add dev, build, and preview npm scripts.
- Add vite.config.js with the React plugin.
- Use base "/" for the existing root custom domain.
- Extend .gitignore for node_modules, dist, and *.local.
- Preserve existing .gitignore entries.
- Keep package-lock.json for the reviewed commit.

Verify that the existing site still works through Vite.
Do not migrate calculator behavior yet.
```

Expected scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

Run:

```bash
npm run dev
```

Open the address printed in the terminal. Stop the development server with `Ctrl+C` when needed.

**Checkpoint:** The existing app runs through Vite before UI conversion. Production asset handling is completed in Step 13; development success alone is not production verification.

## Step 7 — Extract and test calculation functions

Do this before changing the interface.

| File | Responsibility |
| --- | --- |
| `src/lib/mortgage.js` | Principal, P&I, monthly expense totals |
| `src/lib/amortization.js` | Baseline and accelerated payoff schedules |
| `src/lib/validation.js` | Validity checks |
| `src/lib/formatting.js` | Currency and duration presentation |
| `src/lib/mortgage.test.js` | Payment tests |
| `src/lib/amortization.test.js` | Payoff tests |

Prompt:

```text
Extract the existing calculation logic into pure JavaScript modules.

Pure functions must:
- Receive inputs through arguments.
- Return results.
- Avoid document, window, React, and sessionStorage.
- Avoid formatting numeric results into display strings.

Preserve calculation order, payment timing, rounding rules,
and final-payment behavior initially.

Wire the existing vanilla interface to these extracted functions,
so they are exercised before the React migration.
Update script loading to use ES modules where necessary, and check
for inline handlers or globals affected by that change.

Add Vitest and a "test": "vitest run" npm script.

Write meaningful tests using baseline cases and independent checks.
Report existing bugs separately instead of encoding them as
correct behavior. Resolve agreed fixes in separate changes.
```

Tests should cover:

- Standard amortization
- Zero interest and zero principal
- No extra payment
- Monthly and one-time extra payments
- A lump sum larger than the remaining balance
- A final payment smaller than the regular payment
- Current balance below original principal
- Invalid or nonfinite values
- Payments insufficient to reduce the balance
- Reaching the simulation's 600-month limit

For the simulation limit, use an explicit status such as `limit-reached`. Do not present an unpaid balance at month 600 as a completed payoff. If the existing code does this, record and fix it explicitly.

Independent checks:

- At 0% interest, $120,000 over 120 months means $1,000 monthly P&I.
- With zero extra payment, both simulations should match.
- For valid amortizing loans, positive extra principal should not increase payoff time or total interest.
- Sum of principal paid plus remaining principal should reconcile to the starting balance within an explicitly chosen rounding tolerance.

Run:

```bash
npm test
npm run build
```

**Checkpoint:** The vanilla UI uses tested calculation modules, and discrepancies are understood.

## Step 8 — Create the React boundary and shared state

Use one React root around both calculator tabs so they can share data.

Keep the header, footer, FAQ, educational sections, metadata, and JSON-LD outside that root initially.

Suggested components:

```text
CalculatorApp
  CalculatorTabs
  PaymentCalculator
    MortgageForm
    PaymentSummary
    PaymentChart
  ExtraPaymentCalculator
    ExtraPaymentForm
    PayoffComparison
```

Prompt:

```text
Create a React root for the interactive calculator area.
Keep surrounding static page content intact.

Create CalculatorApp and the two calculator tab components.
Keep shared mortgage inputs in their nearest common parent.

Document:
- Which state is shared.
- Which state belongs only to the extra-payment form.
- When values synchronize between tabs.
- Whether manual extra-payment inputs are preserved or reset.

Preserve observed synchronization behavior from the baseline.

For migrated elements, remove the corresponding legacy listeners.
Ensure legacy code does not mutate React-managed elements.
Do not remove behavior that has not yet been migrated.

If a tab is temporarily unfinished, make that explicit in the
migration status. Do not leave legacy code targeting missing nodes.
```

**Checkpoint:** React renders, tabs work, and no duplicate event handlers remain on migrated elements.

## Step 9 — Convert the main mortgage calculator

Prompt:

```text
Convert the main mortgage calculator to React.

Use the extracted calculation and formatting functions.
Preserve existing CSS classes and layout where practical.

Support:
- Home price
- Dollar/percentage down-payment toggle
- Interest rate
- Loan term
- Annual property taxes
- Annual insurance
- Monthly HOA
- All existing result cards and validation messages

Keep raw input strings while editing so users can clear a field
or enter decimals naturally. Parse validated inputs for calculation.

Do not display NaN or Infinity.
Do not format currency on every keystroke if it disrupts typing.

Derive results from inputs.
Do not duplicate derived results in separate state.
Do not add useMemo unless it serves a clear purpose.
```

Check manually:

- Clear and retype every numeric field.
- Enter decimals and paste values.
- Switch down-payment units.
- Navigate with the keyboard.
- Compare results with baseline cases.
- Check mobile layout.

**Checkpoint:** The main calculator matches the agreed behavior and remains comfortable to edit.

## Step 10 — Convert the extra-payment calculator

Prompt:

```text
Convert Extra Payment Magic to React using the tested
amortization module.

Preserve:
- Original contractual monthly P&I
- Current balance input
- Monthly extra-payment mode
- One-time extra-payment mode
- Existing lump-sum timing
- Baseline remaining time and interest
- Accelerated remaining time and interest
- Interest saved and time saved
- Tab synchronization behavior

Do not recompute the contractual payment using current balance
as though it were a new loan.

Keep taxes, insurance, and HOA outside the principal-payoff
simulation.

Handle oversized extra payments and small final payments.
Show a clear non-success result for invalid or non-amortizing
scenarios and simulation limits.
```

Compare both versions using identical inputs for every test case.

**Checkpoint:** Supported repayment scenarios match except for explicitly approved bug fixes.

## Step 11 — Integrate the chart

Install:

```bash
npm install chart.js react-chartjs-2
```

Prompt:

```text
Move the payment donut chart into PaymentChart.jsx using
Chart.js and react-chartjs-2.

Preserve categories, colors, legend, tooltips, and responsiveness.
Register required Chart.js components.
Pass numeric chart data through props.
Handle an all-zero breakdown cleanly.

Remove the old Chart.js CDN script and legacy chart instance
only after the React chart works.

Keep payment amounts available as readable text outside the chart.
```

**Checkpoint:** The chart updates without duplicate canvas instances or console errors.

## Step 12 — Reintroduce animations and the demo

Leave animation until calculation and input behavior are stable.

Prompt:

```text
Migrate the intro demo and typewriter behavior.

Preserve the existing sessionStorage key and session behavior.

Requirements:
- Clean up every timer on unmount.
- Stop the demo when the user begins interacting.
- Do not overwrite values the user has entered.
- Respect prefers-reduced-motion.
- Keep placeholders separate from actual values where appropriate.
- Make effects safe under React StrictMode.
- Do not disable StrictMode to hide duplicate-effect bugs.
```

Check first visit in a fresh session, reload in the same session, typing during the demo, switching tabs during the demo, and reduced-motion settings.

**Checkpoint:** Animations support the interface without interfering with input.

## Step 13 — Preserve static files, privacy, and SEO

Suggested static assets:

```text
public/
  CNAME
  robots.txt
  sitemap.xml
  preview.png
  googleb4f539193a03794c.html
  privacy.html
```

A copied `privacy.html` must reference assets that exist in the build. If it uses `style.css`, provide a deliberate static stylesheet for the page or configure it as a Vite HTML entry. Avoid two conflicting copies of the same output file. Do not assume development behavior proves the built page works.

Prompt:

```text
Audit production output and preserve all existing public URLs.

Check:
- Page title and description
- Canonical URL
- Open Graph and Twitter metadata
- JSON-LD
- Static FAQ and educational content
- robots.txt and sitemap.xml
- Google verification file
- preview.png
- CNAME
- /privacy.html and its styles

Keep root index.html as Vite's entry point.
Do not place another index.html in public.
Keep metadata and educational content present in built HTML.

Preserve the deployment domain. Do not introduce a router.

Review privacy statements against actual network behavior.
Do not claim no data leaves the browser merely because
mortgage calculations are local.
```

CDN scripts and Google Fonts cause network requests. Distinguish **mortgage inputs are processed locally** from **no data leaves your browser**.

Also check terminology: PITI is principal, interest, taxes, and insurance; HOA is additional.

**Checkpoint:** Public files and static content survive the build, and privacy wording matches implementation.

## Step 14 — Verify the production build

Run:

```bash
npm test
npm run build
npm run preview
```

Use the preview URL printed by Vite. This serves the generated output to be deployed.

### Calculations

- [ ] Main calculator matches baseline cases.
- [ ] Zero-interest and zero-principal behavior is correct.
- [ ] Monthly extra payments work.
- [ ] One-time payments work.
- [ ] Final payments do not overpay principal.
- [ ] Invalid and limit-reached scenarios are clearly identified.

### Interaction

- [ ] Blank fields and decimal entry work.
- [ ] Down-payment toggle works.
- [ ] Tab synchronization matches agreed behavior.
- [ ] Demo stops when the user interacts.
- [ ] Keyboard navigation and labels work.

### Layout

- [ ] Desktop layout matches the original.
- [ ] Mobile layout has no horizontal overflow.
- [ ] Chart resizes correctly.
- [ ] Validation messages are readable.

### Production files

- [ ] `/privacy.html` opens directly and is styled.
- [ ] `robots.txt` and `sitemap.xml` are present.
- [ ] Verification file is present.
- [ ] Social preview image loads.
- [ ] `CNAME` contains the correct domain.
- [ ] Static educational content exists in built HTML.

### Runtime

- [ ] No unexpected browser console errors.
- [ ] No missing asset requests.
- [ ] Calculator interactions do not transmit mortgage inputs.

Prompt:

```text
Review the migration against BASELINE_CASES.md and the production
verification checklist in MIGRATION_PLAN.md.

Run checks available to you.
Clearly label browser checks you cannot perform.

Report:
- Passed checks
- Failed checks
- Unverified checks
- Intentional behavior changes
- Remaining release blockers

Do not describe the migration as complete while blockers remain.
```

## Step 15 — Update GitHub Actions

Deploy `dist/` rather than the source repository.

Prompt:

```text
Inspect and update .github/workflows/deploy.yml for Vite.

Preserve deployment from v1 and the existing manual trigger.
Restrict deployment to the intended production branch, including
manual runs, so a manual run from another branch cannot publish it.

The workflow must:
1. Check out the repository.
2. Set up a supported Node.js version compatible with the project.
3. Install dependencies using npm ci.
4. Run npm test.
5. Run npm run build.
6. Upload dist as the GitHub Pages artifact.
7. Deploy using the existing Pages mechanism.

Preserve required Pages permissions, environment, and concurrency.
Use supported official action versions after checking their docs.

Do not deploy pull requests.
Do not change DNS, CNAME, or the custom domain.
Do not push or trigger deployment.
```

If adding pull-request validation, use a separate build/test job without deployment. Commit `package-lock.json` so `npm ci` can run.

**Checkpoint:** The workflow separates validation from deployment and uploads only the built site.

## Step 16 — Remove obsolete code and update documentation

Prompt:

```text
After confirming feature parity, remove unused legacy JavaScript
and unused CDN dependencies.

Search for references before deleting or moving files.

Update README.md to describe:
- React, Vite, and JavaScript
- Required Node.js setup
- npm install
- npm run dev
- npm test
- npm run build
- npm run preview
- Updated project structure
- GitHub Pages deployment from dist
- Client-side calculation behavior
- Static educational content and privacy page

Remove obsolete no-build-step and no-package.json claims.
Keep historical details in the migration documents.
```

After cleanup:

```bash
npm test
npm run build
```

**Checkpoint:** No obsolete code is loaded, and instructions match the repository.

## Step 17 — Review and commit

At each completed step:

```bash
git diff --stat
git diff
git status
```

Use VS Code's Source Control panel to step only intended files. Commit after reviewing each coherent step, rather than waiting until the end.

Suggested commit messages:

```text
docs: record migration audit and baseline
build: add React and Vite setup
refactor: extract and test mortgage calculations
feat: migrate main calculator to React
feat: migrate extra-payment calculator
feat: integrate payment chart and demo
fix: preserve static pages and production assets
ci: build and deploy Vite output
docs: update setup and migration instructions
```

Before release:

```bash
git diff before-react-migration..HEAD --stat
```

If you did not create that tag, use the recorded baseline commit instead. Review full changes through a pull request.

## Step 18 — Publish after verification

The following actions are for you to perform when ready, or authorize explicitly for your local agent:

1. Push the migration branch.
2. Open a pull request targeting `v1`.
3. Review changes and automated test results.
4. Merge when ready to deploy.
5. Monitor GitHub Actions deployment.
6. Test the live site, including `/privacy.html`.
7. Repeat a standard loan and both extra-payment scenarios.

Merging into `v1` triggers deployment according to the README.

If release fails, revert through a reviewed Git revert or the pull request's revert mechanism, then redeploy. Avoid force-pushing or rewriting production history.

## Migration status template

Create `MIGRATION_STATUS.md` with:

```markdown
# Migration Status

## Baseline
- Branch: react-migration
- Baseline commit:
- Reference tag: before-react-migration

## Current Step
Step: 1
Status: not started

## Step Tracking
Track each numbered step as not started, in progress, blocked, or complete.
Mark complete only after recording the required evidence.

## Completed
- [ ]

## Decisions
- JavaScript and JSX
- React with Vite
- Existing CSS retained
- Shared React root for both calculator tabs
- Static FAQ and educational content retained
- No backend or router

## Verification
- Command:
- Result:
- Manual checks completed:

## Known Issues
-

## Files Changed in Latest Step
-

## Next Task
-

## Deployment
Not deployed.
```

## Restart prompt for a new Qwen session

```text
Read:
- AGENTS.md
- MIGRATION_PLAN.md
- MIGRATION_STATUS.md
- MIGRATION_AUDIT.md

Inspect git status and files relevant to the current step.

Summarize current state, then complete only the numbered step
requested by the user. For "Continue", use the next unfinished step
recorded in MIGRATION_STATUS.md. Resolve blockers before advancing.
Preserve existing work and report actual verification.
Update the status file, report results, and stop.
Do not push, merge, or deploy.
```

## Troubleshooting prompt

```text
The current step has a problem. Do not rewrite unrelated files.

Expected behavior:
[Describe what should happen.]

Actual behavior:
[Describe what happens.]

Error output:
[Paste terminal or browser console output.]

Inspect the relevant files, identify the likely cause, make the
smallest appropriate fix, and rerun relevant checks.
Do not delete tests or weaken assertions simply to make them pass.
Update MIGRATION_STATUS.md with the result.
```

## Official references

- [Add React to an existing project](https://react.dev/learn/add-react-to-an-existing-project)
- [Thinking in React](https://react.dev/learn/thinking-in-react)
- [Vite setup and prerequisites](https://vite.dev/guide/)
- [Vite static deployment](https://vite.dev/guide/static-deploy.html)

Start with Step 1. After setup and branch protection are complete, perform Step 3, the source audit. Let actual code determine component boundaries and test details.
