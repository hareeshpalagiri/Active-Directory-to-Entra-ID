# ⚙️ Microsoft Entra Connect (Azure AD Connect)

> **Simple Definition:** Entra Connect is the **bridge** between your on-premise Active Directory and Microsoft Entra ID (cloud). It copies your users, groups, and password info from AD into the cloud automatically.

---

## 🌉 The Bridge Analogy

Think of it like a **postal service** between two cities:

```
┌──────────────────┐         ┌─────────────────┐         ┌──────────────────┐
│                  │         │                 │         │                  │
│  Active          │         │  ENTRA CONNECT  │         │  Microsoft       │
│  Directory       │────────►│                 │────────►│  Entra ID        │
│  (On-Premise)    │  copies │  📦 Post Office │  sends  │  (Cloud)         │
│                  │         │                 │         │                  │
│  👤 Users        │         │  Every 30 mins  │         │  👤 Same Users   │
│  👥 Groups       │         │  by default     │         │  👥 Same Groups  │
│  🔑 Passwords    │         │                 │         │  🔑 Auth tokens  │
└──────────────────┘         └─────────────────┘         └──────────────────┘
```

---

## 🏗️ How Entra Connect Works Internally

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        ENTRA CONNECT SERVER                              │
│                                                                          │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────┐     │
│  │             │    │                  │    │                     │     │
│  │  AD         │    │  CONNECTOR       │    │  ENTRA ID           │     │
│  │  Connector  │    │  SPACE           │    │  Connector          │     │
│  │             │    │  (Local Cache)   │    │                     │     │
│  │  Reads from │───►│  Staging Area    │───►│  Writes to cloud    │     │
│  │  AD every   │    │                  │    │                     │     │
│  │  30 mins    │    │  🔄 Sync Rules   │    │  HTTPS/SOAP         │     │
│  └─────────────┘    └──────────────────┘    └─────────────────────┘     │
│                              │                                           │
│                              ▼                                           │
│                     ┌────────────────┐                                   │
│                     │  METAVERSE     │                                   │
│                     │  (Central DB)  │                                   │
│                     │                │                                   │
│                     │  Master record │                                   │
│                     │  of all objs   │                                   │
│                     └────────────────┘                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 What Gets Synced?

```
AD OBJECT              ENTRA ID OBJECT
─────────────────────────────────────────────────────

👤 User Account    →   Cloud User (with UPN)
👥 Security Group  →   Cloud Group
📧 Distribution    →   Mail-enabled Group
🖥️ Computer Obj   →   Registered Device (if enabled)
📞 Contact         →   External Contact

ATTRIBUTES SYNCED:
  ✅ displayName, givenName, surname
  ✅ userPrincipalName (UPN)
  ✅ mail, proxyAddresses
  ✅ department, title, manager
  ✅ Password hash (if PHS enabled)
  ✅ Group memberships

NOT SYNCED by default:
  ❌ Group Policies (GPOs)
  ❌ OU Structure
  ❌ Computer configurations
  ❌ Kerberos tickets
```

---

## 🛠️ Installation Overview

```
INSTALLATION STEPS (Simplified)

  Step 1         Step 2          Step 3         Step 4
    │               │               │              │
    ▼               ▼               ▼              ▼
┌────────┐     ┌─────────┐     ┌────────┐     ┌────────┐
│Download│     │ Connect │     │Choose  │     │Run     │
│Entra   │────►│ to your │────►│Auth    │────►│Initial │
│Connect │     │ AD and  │     │Method  │────►│Sync    │
│from MS │     │ Entra   │     │(PHS/   │     │        │
│        │     │         │     │ PTA)   │     │        │
└────────┘     └─────────┘     └────────┘     └────────┘

Recommended: Windows Server 2019+ dedicated server
Minimum: 4 GB RAM, Standard_D2s_v3 equivalent
```

---

## 🔃 Sync Cycle Explained

```
DEFAULT SYNC SCHEDULE:

  AD Change                    Cloud Updated
     │                              │
     ▼                              │
  ┌────────────────────────────┐    │
  │  DELTA SYNC (every 30 min) │    │
  │                            │    │
  │  Only syncs changes!       │───►│
  │  New users, modified attrs │    │
  │  Deleted accounts          │    │
  └────────────────────────────┘    │
                                    │
  Full Sync (manual/first run)      │
  ┌────────────────────────────┐    │
  │  Syncs EVERYTHING          │───►│
  │  Takes longer              │    │
  │  Run after major changes   │    │
  └────────────────────────────┘    ▼


  FORCE A SYNC (PowerShell):
  ─────────────────────────────────────────────────
  Start-ADSyncSyncCycle -PolicyType Delta    # Quick
  Start-ADSyncSyncCycle -PolicyType Initial  # Full
```

---

## ⚡ Filtering: Sync Only What You Need

You don't have to sync ALL users. Filter by:

```
FILTERING OPTIONS:

  ┌─────────────────────────────────────────────────────┐
  │                                                     │
  │  BY OU (Organizational Unit)                        │
  │  ───────────────────────────                        │
  │  Sync only:  OU=Employees,DC=corp,DC=com            │
  │  Skip:       OU=ServiceAccounts,DC=corp,DC=com      │
  │                                                     │
  │  BY GROUP                                           │
  │  ──────────                                         │
  │  Only sync members of "CloudUsers" group            │
  │  Good for phased rollouts!                          │
  │                                                     │
  │  BY DOMAIN                                          │
  │  ─────────                                          │
  │  Multi-forest? Choose which domains to include      │
  │                                                     │
  │  BY ATTRIBUTE                                       │
  │  ────────────                                       │
  │  Only sync users where cloudEnabled=TRUE            │
  │                                                     │
  └─────────────────────────────────────────────────────┘
```

---

## 🏢 Multi-Forest Scenarios

Many large enterprises have multiple AD forests:

```
MULTI-FOREST TOPOLOGY:

  FOREST 1 (Corp HQ)          FOREST 2 (Acquired Company)
  ┌────────────────┐           ┌────────────────────────┐
  │  corp.local    │           │  acquired.local         │
  │                │           │                         │
  │  50,000 users  │           │  10,000 users           │
  └───────┬────────┘           └────────────┬────────────┘
          │                                 │
          │          ┌──────────┐           │
          └─────────►│  ENTRA   │◄──────────┘
                     │ CONNECT  │
                     │          │
                     └────┬─────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  Entra ID   │
                   │             │
                   │ 60,000 users│
                   │  (combined) │
                   └─────────────┘

  All users get a single cloud identity!
```

---

## 👮 Security Engineer's POV

> ⚠️ **Entra Connect server is one of the most sensitive servers in your environment. Treat it like a Domain Controller.**

```
🚨 HIGH-VALUE ATTACK TARGET:

  The Entra Connect service account has:
  ├── 🔑 Replicate Directory Changes permission (in AD)
  ├── 🔑 Ability to reset cloud user passwords
  ├── 🔑 Write access to Entra ID (if writeback enabled)
  └── 🔑 Access to password hashes (if PHS enabled)

  REAL ATTACK: AADInternals tool can:
  ──────────────────────────────────
  1. Extract the Entra Connect service account creds
  2. Use them to call Azure AD APIs directly
  3. Reset MFA, change passwords of ANY synced user
  4. Even Global Admins can be targeted this way!

  DEFENSE:
  ✅ Patch Entra Connect regularly (new vulns found often)
  ✅ Restrict who can log in to the Entra Connect server
  ✅ Enable Azure AD Connect Health monitoring
  ✅ Alert on unexpected password resets from sync account
  ✅ Use Entra Connect Cloud Sync for lower privilege model
```

---

## 🆕 Entra Connect Cloud Sync (New Version)

Microsoft released a **lighter-weight alternative** to Entra Connect:

```
ENTRA CONNECT vs ENTRA CONNECT CLOUD SYNC

  CLASSIC CONNECT              CLOUD SYNC
  ───────────────────────      ─────────────────────────
  Heavy server required        Lightweight agent
  Single server                Multiple agents (HA!)
  Complex setup                Simple setup
  High privilege account       Lower privilege
  GUI wizard                   JSON config / portal
  All sync features            Limited but growing
  
  BEST FOR:
  Large enterprises            Small/medium or new setups
  Complex sync rules           Simple user sync
  Writeback scenarios          Cloud-first approach
```

---

## 🔍 Monitoring Entra Connect Health

```
AZURE AD CONNECT HEALTH shows you:

  ┌─────────────────────────────────────────────────┐
  │  📊 SYNC DASHBOARD                              │
  │                                                 │
  │  Last Sync: 14 minutes ago         ✅ Healthy   │
  │  Objects Synced: 48,293                         │
  │  Sync Errors: 3  ⚠️                             │
  │                                                 │
  │  COMMON ERRORS:                                 │
  │  ──────────────                                 │
  │  ❌ Duplicate UPN (two users same email)        │
  │  ❌ Invalid characters in attribute             │
  │  ❌ Object too large                            │
  │  ❌ Admin role conflict                         │
  └─────────────────────────────────────────────────┘

  Enable via: Entra Portal → Entra Connect Health
```

---

## ✅ Summary

```
┌───────────────────────────────────────────────────────┐
│  ENTRA CONNECT IN A NUTSHELL:                         │
│                                                       │
│  📥 Reads from AD every 30 minutes                    │
│  📤 Writes changes to Entra ID (cloud)                │
│  🔄 Keeps both worlds in sync                         │
│  ⚙️  Configurable filters (OU, Group, Attribute)      │
│  ⚠️  HIGH PRIVILEGE server - protect it well!        │
│  🆕 Cloud Sync = lighter modern alternative           │
└───────────────────────────────────────────────────────┘
```

---

**← Previous:** [01 - What is Hybrid Identity](./01-What-is-Hybrid-Identity.md)
**Next →** [03 - Password Hash Sync](./03-Password-Hash-Sync.md)
