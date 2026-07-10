# Cloudflare Pages + Access setup

Host `playbook.html` at a permanent URL with a personal login. Estimated time: 15 minutes.

---

## Step 1 — Deploy with Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and log in
2. In the sidebar: **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Authorise Cloudflare to access your GitHub account
4. Select the repository: `AGM82/cursor-guardrails`
5. Configure build:
   - **Framework preset:** None
   - **Build command:** _(leave empty)_
   - **Build output directory:** `/` (forward slash — serves from repo root)
6. Click **Save and Deploy**

Your site is now live at:

```
https://cursor-guardrails.pages.dev/playbook.html
```

Every time a PR merges to `main`, Cloudflare Pages re-deploys automatically. No action needed.

**Optional:** Add a custom domain under **Custom domains** on the Pages project settings.

---

## Step 2 — Protect with Cloudflare Access (login)

1. In the Cloudflare sidebar: **Zero Trust** → **Access** → **Applications** → **Add an application**
2. Choose **Cloudflare Pages**
3. From the dropdown, select `cursor-guardrails`
4. Name: `Cursor Guardrails Playbook`
5. Session duration: `24 hours` (or longer — your preference)
6. Under **Policies** → **Add policy**:
   - Policy name: `Owner only`
   - Action: `Allow`
   - Add include rule:
     - To use **email OTP**: Rule type = `Emails`, Value = your email address
     - To use **Google sign-in**: first add Google as an identity provider under **Settings → Authentication**, then Rule type = `Emails` with your Google account email
7. Click **Save**

From now on, visiting `cursor-guardrails.pages.dev/playbook.html` shows a Cloudflare login screen before the page loads.

### Zero Trust free plan limits

- Up to 50 users — more than enough for a personal tool
- No credit card required
- Supported identity providers: email OTP, Google, GitHub, Microsoft (all free)

---

## Step 3 — Create the `guardrail-review` label on GitHub

The weekly workflow tags issues with `guardrail-review`. Create the label once:

1. Go to `github.com/AGM82/cursor-guardrails/labels`
2. Click **New label**
3. Name: `guardrail-review`
4. Colour: `#6366f1` (indigo — matches the playbook theme)
5. Click **Create label**

---

## Step 4 — Test the weekly workflow manually

Run the workflow once with dry-run enabled to confirm it works:

1. Go to `github.com/AGM82/cursor-guardrails/actions`
2. Click **Weekly guardrail review** in the sidebar
3. Click **Run workflow** → tick **Dry run** → **Run workflow**
4. Open the run when it appears and check the Summary tab — you should see a findings table

Then run without dry-run to confirm an issue is created:

1. **Run workflow** again, leave **Dry run** unticked
2. Check `github.com/AGM82/cursor-guardrails/issues` — a `[guardrail-review]` issue should appear

---

## Step 5 — Add the playbook to your browser

1. Open `https://cursor-guardrails.pages.dev/playbook.html`
2. Log in (email OTP or Google)
3. In the **Settings bar** at the top, enter your local template path, e.g.:
   ```
   C:\Users\andrewM\OneDrive - Lombard Insurance\Documents\Projects\cursor-guardrails
   ```
4. Click **Save** — every prompt and command on the page is now pre-filled
5. Bookmark the URL or add it as a browser shortcut / pinned tab

---

## What updates automatically

| What                    | How                                                       |
| ----------------------- | --------------------------------------------------------- |
| `playbook.html` content | Redeploys every time a PR merges to `main`                |
| Updates section         | Fetches live from GitHub Issues API on every page load    |
| Changelog section       | Fetches live from GitHub Releases API on every page load  |
| Projects registry       | Stored in browser localStorage — persists across visits   |
| Health check state      | Stored in browser localStorage — persists until you reset |

---

## Troubleshooting

**Login loop:** If Cloudflare Access keeps redirecting after login, clear cookies for `cloudflareaccess.com` and try again.

**Updates section shows nothing:** Confirm the `guardrail-review` label exists on GitHub (Step 3) and that at least one open issue has that label.

**Workflow fails with "label not found":** Create the label in Step 3 before running the workflow.
