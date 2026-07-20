# NSEnvio Hosting Plan

Hosting recommendation for the NSEnvio stack: SQL Server + .NET 10 API + React SPA + Razor Pages.
Customer base is 99%+ USA. Current tenant count: 4–5.

---

## Current recommendation (4–5 tenants)

**Single Vultr server — New Jersey or Dallas**

| Item | Cost |
|------|------|
| 4 vCPU / 8 GB RAM / 160 GB NVMe / 5 TB bandwidth | $48/mo |
| Automated backups | $10/mo |
| Cloudflare free tier (CDN, SSL, DDoS) | $0 |
| Domain (yearly ~$12) | ~$1/mo |
| **Total** | **~$59/mo** |

Everything runs on one server:
- **SQL Server Express** (free — 10 GB/DB limit; 4–5 small tenant DBs comfortably fit)
- **.NET API + Razor Pages** behind Nginx reverse proxy
- **React SPA** as static files served by Nginx
- **Cloudflare** in front for US CDN edge, SSL termination, DDoS protection

---

## Upgrade triggers

Do nothing until one of these happens:

| Trigger | Action |
|---------|--------|
| Any tenant DB hits **10 GB** | Upgrade SQL Server to paid, or move that tenant to Azure SQL Basic ($5/mo/DB) |
| Server CPU > **70% sustained** during business hours | Upgrade Vultr to 6–8 vCPU (~$96/mo) — still cheaper than Azure |
| **10+ tenants** | Move to Azure East US + SQL Elastic Pool (~$150–200/mo for the pool) |

---

## Scaling path

| Phase | Setup | Cost |
|-------|-------|------|
| **Now** (4–5 tenants) | Single Vultr server + SQL Express + Cloudflare | ~$59/mo |
| **Growth** (10–20 tenants) | Split DB to separate server, or Azure SQL Elastic Pool | ~$150–200/mo |
| **Scale** (20+ tenants) | Azure East US — App Service + Elastic Pool + Static Web App | ~$300–400/mo |

---

## Why not Azure now?

For 4–5 tenants Azure is overkill and 2–3× more expensive:
- Azure SQL Basic per DB = $5 × 5 DBs = $25
- App Service B2 = $60
- Total Azure minimum = ~$90/mo vs $59/mo on Vultr

Azure becomes the right call when you have 10+ tenants or need managed backups/failover/compliance.

---

## Key money-saving tip

Keep tenant DBs small — archive old HBL data after 2–3 years.
The cost difference between a 2 GB and 15 GB DB multiplied by 20 tenants is significant on Azure SQL.

---

## Data center choice

Always pick **US East (New Jersey / Virginia)** as the primary region.
Lowest latency for the largest US population concentration (East Coast + Midwest).
Add **US Central (Dallas / Chicago)** as a secondary if you ever need geo-redundancy.
