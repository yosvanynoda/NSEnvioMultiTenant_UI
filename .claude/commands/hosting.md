# NSEnvio Hosting Plan

Hosting recommendation for the NSEnvio stack: **Linux + PostgreSQL + .NET 10 API + React SPA** (migrated off Windows/SQL Server/SmarterASP.NET shared hosting — see the Postgres migration project memory for full conversion history).
Customer base is 99%+ USA. Current tenant count: 4-5, of which ~75% are legacy accounts being **gradually onboarded** from an old SQL-Server-only setup onto the full app (not simultaneous — rolling migration).

---

## Finalized: OVHcloud VPS-2 2027 — Vinthill, VA

| Item | Cost |
|------|------|
| 4 vCores / 8 GB RAM / 75 GB SSD NVMe | **$8.50/mo** ($102/12mo, 15% prepay discount, ex. taxes — confirmed via checkout screenshot) |
| OS | **Ubuntu 26.04 LTS** (free) — best .NET/PostgreSQL/Nginx docs coverage vs. Debian/Fedora/Alma/Rocky/CloudLinux/FreeBSD alternatives offered on this plan |
| Automated Backup Standard (24h retention) | included (normally $7.20, discounted to $0) |
| Unlimited traffic / 1 Gbps public bandwidth | included |
| Commitment | 12 months |
| Domain (yearly ~$12) | ~$1/mo |

**Undecided add-on: Premium automatic backup** (+$2.20/mo, 7-day rolling restore vs. the included 24h-only retention). User doesn't think it's needed but is still weighing it given how cheap the base config is — **decision pending**, don't assume either way until confirmed.

Everything runs on one Linux server:
- **PostgreSQL 16** + pgBouncer (transaction pooling — matters once the larger tenant, 200-400 users, is on this box)
- **.NET 10 API** as a systemd service behind Nginx reverse proxy
- **React SPA** as static files served by Nginx
- **Cloudflare** free tier in front for CDN edge, SSL termination, DDoS protection
- UFW + Fail2ban

**Database access — SSH tunnel, no public Postgres port.** UFW only allows 22 (SSH)/443; Postgres's 5432 stays bound to `localhost` (or firewalled off entirely), never exposed publicly — not even on a non-standard port, since real attackers/bots do full port sweeps rather than just probing 5432. For connecting DBeaver (or any client) from a local PC to the production database, use an SSH tunnel through the already-open port 22:
```bash
ssh -L 5433:localhost:5432 youruser@your-server-ip
```
then point the DB client at `localhost:5433`. DBeaver also has a built-in "SSH" tab in its connection editor that handles this automatically without a manual `ssh -L` command.

**Port 80 stays closed — Certbot uses DNS-01, not HTTP-01.** Since the site is HTTPS-only, there's no need to keep 80 open just to redirect http→https. The only other common reason to keep 80 open is Certbot's default HTTP-01 challenge for Let's Encrypt cert issuance/renewal — avoided here by using the **`certbot-dns-cloudflare`** plugin instead, which proves domain ownership via a Cloudflare API-created DNS TXT record rather than an HTTP listener. Renewal stays fully automated (~60-90 day cycle) with zero port-80 exposure. Final firewall rule: **UFW allows only 22 and 443.**

**Remote server access — SSH day-to-day, OVH web console as emergency fallback.** All normal administration (installing packages, configuring Nginx/Postgres, deploying the API, checking logs) happens over SSH from a terminal — no GUI/remote desktop needed or used for this stack. OVH also provides a browser-based **KVM console** through their Control Panel, which is the fallback for when SSH itself is unreachable (e.g. a UFW misconfiguration locks out normal access, or the network stack fails to come up) — acts like a virtual keyboard/monitor for the box. The same OVH panel also handles higher-level VPS controls: reboot/reinstall OS, manage the included backups, view resource usage, adjust network/firewall settings.

**Windows dev PC tooling — mostly already built in, no PuTTY needed:**
- **OpenSSH Client** — built into Windows 10/11 since 1809; works from PowerShell, Command Prompt, or Git Bash. `ssh youruser@your-server-ip`.
- **`ssh-keygen`** — also built-in, for generating a key pair so the server can be set up for key-based auth (paste the public key into OVH at VPS provisioning) instead of password login — pairs with the UFW/Fail2ban hardening already planned.
- **`scp`** — built-in, quick file transfers over the same SSH connection (e.g. pushing a published build).
- Optional: **Windows Terminal** (better tab/session management), **WinSCP** (GUI drag-and-drop SFTP alternative to `scp`), **VS Code Remote-SSH extension** (browse/edit server files directly from the editor).

**Why OVHcloud Vinthill over Vultr Miami:** Miami was the original draw for OVHcloud, but that's only offered on OVH's metered Public Cloud "Local Zone" product, not the classic flat-rate VPS line — VPS-2 2027's only North American locations are Vinthill, VA and Beauharnois, Canada. Vinthill still beats Vultr Miami (~$58/mo incl. backup) on price by roughly 7x; the Virginia-vs-Miami latency difference (~15-25ms) isn't expected to be perceptible for this form/CRUD-heavy shipping app, especially with Cloudflare's CDN handling static assets from the edge closest to each user regardless of origin.

**Why not Windows/SmarterASP.NET shared hosting anymore:** IIS app-pool sharing caused real production incidents (HTTP 500.35 multiple-apps-per-pool, mysterious 503s needing pool restarts) — moving to a dedicated Linux VPS with one app per systemd service removes that whole failure class.

---

## Migration note: legacy DB-only tenants

~75% of current tenants only have a SQL Server database on the old SmarterASP.NET shared host (no web app usage) — a legacy system predating NSEnvio. Plan is to move **all** of them onto the new Postgres-backed NSEnvio app gradually, not as a single cutover. Sizing above assumes this rolling onboarding, not all tenants hitting the app simultaneously on day one — re-check CPU/RAM headroom as each legacy tenant goes live on the real app.

---

## Migration note: per-subdomain DNS cutover (legacy Razor app customers)

Two customers are currently active on the old Razor web app, on subdomains of the same `noda-soft.com` domain. They want to move to the new NSEnvio app but are waiting to see how the `mayabe` migration performs first — they should **not** be blocked or affected by moving the domain to Cloudflare.

Key point: moving DNS *management* to Cloudflare and cutting over a *specific tenant's* DNS are separate steps, done independently:
1. Audit every existing DNS record at SmarterASP.NET (all tenant subdomains, including these two customers' and `mayabe`'s) and note what IP each points to.
2. Add the domain to Cloudflare and replicate every record exactly before switching anything — verify Cloudflare's auto-scanned records against the SmarterASP.NET list manually; a missed record is the real risk, not the nameserver switch itself.
3. Switch nameservers at the registrar to Cloudflare's. Since every record still points to the same SmarterASP.NET IPs, this step is invisible to all customers.
4. Only when a specific tenant is ready to migrate, update *that tenant's* subdomain record in Cloudflare to point at the new OVH server. Every other subdomain — including the two Razor-app customers — keeps resolving to SmarterASP.NET untouched for as long as needed.

So the two waiting customers don't need to wait for the domain to move to Cloudflare at all — only their own subdomain record needs to stay pointed at SmarterASP.NET until they're individually cut over.

---

## Upgrade triggers

Do nothing until one of these happens:

| Trigger | Action |
|---------|--------|
| Any tenant DB approaches available disk (75 GB NVMe shared across all tenant DBs) | Add block storage or move largest tenant to its own instance |
| Server CPU > **70% sustained** during business hours | Upgrade OVHcloud VPS to 6-8 vCores |
| **10+ tenants**, or all legacy tenants fully onboarded | Re-evaluate managed Postgres (e.g. separate DB host) or a second VPS split app/DB |

---

## Data center choice

**OVHcloud VPS Vinthill, VA (US-East)** — Miami isn't available on the classic VPS line (only via OVH's pricier metered Public Cloud product), so Vinthill is the practical choice; still East Coast, ~15-25ms further from Florida than Miami would be.
No secondary region currently planned; revisit if tenant geography shifts or 10+ tenant scale is reached.

---

## Status: finalized

Config decided: OVHcloud VPS-2 2027, Vinthill VA, 4 vCores/8GB/75GB NVMe, Ubuntu 26.04, standard 24h backup (no premium 7-day add-on), 12-month term, ~$8.50/mo. **Purchase deliberately delayed**: user wants to observe how the first migrated customer (`mayabe`, went live 2026-07-29 on the existing site4now Postgres hosting) performs for about a week before buying/provisioning the OVH box — that customer's cutover is targeted for next week. While waiting, user is lining up the supporting tools/services needed for the eventual move (see checklist below).

**Still open**: whether to add the Premium automatic backup (+$2.20/mo, 7-day rolling restore vs. included 24h) — user is leaning against it but wants to think it over; not a blocker to purchasing, can be added later.

---

## Environments: Demo stays on SmarterASP.NET, only Prod moves to OVH

Demo is already fully working on site4now Postgres hosting (verified 2026-07-27) and carries no real customer traffic — no reason to relocate it. Decided **not** to co-locate Demo on the same OVH box as Prod (avoids resource contention and blast-radius risk on a modest 4-core/8GB box), and decided **not** to spin up a second OVH VPS for it either, since site4now costs nothing extra per environment. Demo only needs to move off site4now if/when that account is fully retired — not planned yet.

---

## Pre-migration tooling checklist (in progress, purchase/setup not yet started)

- **Domain**: confirmed — `noda-soft.com` is registered (not just hosted) through SmarterASP.NET (status: completed, WHOIS privacy on, expires 2026-09-27). No transfer needed for the OVH migration: just add it to Cloudflare as a DNS zone and point records at the new server, leaving registration at SmarterASP.NET as-is. Transferring registrars later (e.g. to consolidate under Cloudflare Registrar) is optional cleanup, not a migration blocker — standard EPP-code transfer process applies whenever that's done.
- **Transactional email (SMTP relay)**: app-only, not corporate mailboxes — user confirmed no Google Workspace/365 needed, just something like SendGrid/SES/Mailgun for the app's existing `EmailSetting`/`EmailTemplate`-driven emails.
- **Backup storage**: keep OVH's included whole-disk snapshot (24h) for fast full-server rollback, **plus** a separate `pg_dump`-per-tenant cron job pushed to off-server object storage (OVH Object Storage or Backblaze B2) — tenant DBs are the priority (config DB rarely changes, needs less frequent backup).
- **Certbot** (Let's Encrypt) — free, for the Nginx origin cert (needed for Cloudflare "Full strict" SSL mode).
- **Uptime/latency monitor** — UptimeRobot or healthchecks.io (free tier), should run from day one on the new box.
- **SSH keys + UFW + Fail2ban** — security baseline, no cost.
- **Deployment mechanism** — not yet decided: manual `git pull`/`dotnet publish`/systemd restart vs. a simple CI pipeline (e.g. GitHub Actions).

**Out of scope for the user**: a customer has requested heavy customization on top of the app and will pay for it, but that's being handled by someone else on the business side — user's own involvement is technical (build/host/migrate) only, not that customization work itself.
