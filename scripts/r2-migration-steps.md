# Cloudflare R2 Migration for Pen-Plotter Assets

## Steps that require your hands in a browser

### Step 1: Create Cloudflare account (5 min)
1. Go to `dash.cloudflare.com`
2. Sign up with your email
3. Free plan is fine

### Step 2: Add edgelesslab.com to Cloudflare (10 min)
1. In Cloudflare dashboard, click "Add a site"
2. Enter `edgelesslab.com`
3. Select the **Free** plan
4. Cloudflare will scan your existing DNS records (A records for GitHub Pages, CNAME, etc.)
5. **Verify the scan found these records** (they should auto-import):
   - `A` record: `edgelesslab.com` -> `185.199.108.153` (GitHub Pages)
   - `A` record: `edgelesslab.com` -> `185.199.109.153`
   - `A` record: `edgelesslab.com` -> `185.199.110.153`
   - `A` record: `edgelesslab.com` -> `185.199.111.153`
   - `CNAME`: `www` -> `edgelesslab.com` (if it exists)
6. Accept the imported records
7. Cloudflare gives you two nameservers (something like `ada.ns.cloudflare.com` and `chad.ns.cloudflare.com`)

### Step 3: Change nameservers at Google Domains (5 min)
1. Go to `domains.google.com` (or wherever edgelesslab.com is registered)
2. Find `edgelesslab.com` -> DNS settings
3. Switch from "Default name servers" to "Custom name servers"
4. Enter the two Cloudflare nameservers from step 2
5. Save
6. **Propagation takes 1-48 hours** (usually 15-30 min). Cloudflare will email you when it's active.

### Step 4: Create R2 bucket (5 min, after Cloudflare is active)
1. In Cloudflare dashboard -> R2 Object Storage
2. Create bucket: `edgeless-assets`
3. Location: Automatic (or US East if prompted)

### Step 5: Set up custom domain for R2 bucket (5 min)
1. In R2 -> `edgeless-assets` -> Settings -> Public access
2. Click "Connect custom domain"
3. Enter: `assets.edgelesslab.com`
4. Cloudflare auto-creates the DNS record

### Step 6: Add CORS rule (2 min)
1. R2 -> `edgeless-assets` -> Settings -> CORS
2. Add rule:
   - Allowed origins: `https://edgelesslab.com`
   - Allowed methods: `GET`, `HEAD`
   - Max age: `86400`

### Step 7: Create R2 API token (3 min)
1. Cloudflare dashboard -> R2 -> Manage R2 API Tokens
2. Create token with "Object Read & Write" permission, scoped to `edgeless-assets` bucket
3. Copy the **Access Key ID** and **Secret Access Key**
4. Also note your **Account ID** (visible in the R2 overview URL or dashboard sidebar)

### Step 8: Come back here and tell me the three values
I need:
- Account ID
- Access Key ID
- Secret Access Key

I'll configure rclone and do the upload. Or you can run `! rclone config` and I'll walk you through it.

---

## Steps I will do automatically once you're back

1. Configure rclone with your R2 credentials
2. Upload all 35,797 files (~495MB, takes 5-10 min at 32 parallel transfers)
3. Verify upload (spot-check a few URLs)
4. Update `index.html` and `addendum.html` to use `assets.edgelesslab.com` paths
5. Update `.gitignore` to exclude `public/pen-plotter/assets/`
6. Remove assets from git tracking (`git rm --cached`)
7. Commit, build, deploy
8. Verify the gallery loads from R2

## What happens during migration (zero downtime)

- The nameserver change is invisible to users (same A records, same site)
- The R2 upload happens while the old site is still serving
- I switch the HTML to R2 URLs and deploy in one atomic commit
- If anything breaks, reverting is one `git revert`
