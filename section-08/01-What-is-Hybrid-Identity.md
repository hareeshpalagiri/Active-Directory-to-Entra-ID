# 🔗 What is Hybrid Identity?

> **Simple Definition:** Hybrid Identity means your organization has **one foot on-premise (Active Directory)** and **one foot in the cloud (Microsoft Entra ID)** — and both sides know who you are, with a single username and password.

---

## 🌍 The Real-World Analogy

Imagine you work at a large bank.

- Your **office badge** lets you into the building (on-premise AD)
- Your **mobile app** lets you approve transactions from anywhere (cloud Entra ID)
- But HR only has **one record of you** — same name, same ID

That's **Hybrid Identity** — one identity, working in two places.

---

## 🏗️ The Big Picture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        YOUR ORGANIZATION                            │
│                                                                     │
│   ON-PREMISE (HQ)                    CLOUD (Microsoft Azure)        │
│   ┌─────────────────┐                ┌─────────────────────┐        │
│   │                 │                │                     │        │
│   │  Active         │◄──────────────►│  Microsoft          │        │
│   │  Directory      │   SYNC / TRUST │  Entra ID           │        │
│   │  (AD DS)        │                │  (Azure AD)         │        │
│   │                 │                │                     │        │
│   │  👤 alice@corp  │                │  👤 alice@corp.com  │        │
│   └─────────────────┘                └─────────────────────┘        │
│          │                                      │                   │
│          ▼                                      ▼                   │
│   🖥️ Office PC                         ☁️ Microsoft 365             │
│   📁 File Shares                        📧 Outlook Online           │
│   🖨️ Printers                          🤝 Teams, SharePoint         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🤔 Why Does Hybrid Identity Exist?

Most companies **can't go 100% cloud overnight**. Here's why:

| Reason | Example |
|--------|---------|
| 🏛️ Legacy Applications | Old ERP systems only talk to AD |
| 🔒 Compliance | Data must stay on-premise (banking, healthcare) |
| 💰 Cost | Migrating everything is expensive |
| ⏱️ Gradual Migration | Move workloads to cloud in phases |
| 🌐 Hybrid Workforce | Some users need both cloud apps and local resources |

---

## 🔄 How Does It Work? (The 3 Pillars)

```
┌───────────────────────────────────────────────────────────┐
│                  HYBRID IDENTITY PILLARS                  │
│                                                           │
│  PILLAR 1          PILLAR 2            PILLAR 3           │
│  ┌───────────┐    ┌────────────┐    ┌──────────────┐     │
│  │           │    │            │    │              │     │
│  │  IDENTITY │    │   AUTH     │    │   DEVICE     │     │
│  │   SYNC    │    │  METHOD    │    │   TRUST      │     │
│  │           │    │            │    │              │     │
│  │ AD users  │    │ How users  │    │ Joining PCs  │     │
│  │ copied to │    │ prove who  │    │ to both AD   │     │
│  │ Entra ID  │    │ they are   │    │ & Entra ID   │     │
│  └───────────┘    └────────────┘    └──────────────┘     │
│                                                           │
│  (Entra Connect)  (PHS/PTA/ADFS)   (Hybrid AAD Join)     │
└───────────────────────────────────────────────────────────┘
```

---

## 👮 Security Engineer's POV

> **As a security engineer, hybrid identity is your biggest attack surface.**

Here's what keeps security engineers up at night:

```
⚠️  HYBRID IDENTITY THREATS

  ON-PREMISE COMPROMISE          CLOUD COMPROMISE
  ┌──────────────────┐           ┌─────────────────────┐
  │ If AD is hacked  │──────────►│ Cloud identities are │
  │ (Golden Ticket,  │  SYNC →   │ also compromised!    │
  │  DCSync)         │           │                      │
  └──────────────────┘           └─────────────────────┘

  THE BRIDGE (Entra Connect) IS A HIGH-VALUE TARGET!
  If an attacker controls the sync account → they own both worlds
```

**Key concern:** Entra Connect runs with **very high privileges** in both environments. If compromised, an attacker can:
- Reset any synced user's password in the cloud
- Impersonate any account
- Move from on-prem breach → full cloud takeover

---

## 📊 Hybrid vs Pure Cloud vs Pure On-Premise

```
                PURE ON-PREM     HYBRID          PURE CLOUD
                ─────────────   ─────────────   ─────────────
Identity Store   AD only         AD + Entra ID   Entra ID only
Auth             Kerberos/NTLM   Mixed           OAuth/OIDC
Apps             Legacy apps     Both            Modern SaaS
MFA              Limited         Strong           Native
Complexity        Low             HIGH             Medium
Attack Surface   Physical         WIDEST          Cloud
Migration Effort  None            Medium           Full rewrite
```

---

## 🗺️ Your Hybrid Identity Journey

Most organizations follow this path:

```
PHASE 1          PHASE 2           PHASE 3           PHASE 4
   │                │                 │                 │
   ▼                ▼                 ▼                 ▼
┌──────┐        ┌───────┐         ┌───────┐         ┌──────┐
│ Pure │        │Install│         │Enable │         │ Pure │
│  AD  │───────►│Entra  │────────►│Cloud  │────────►│Cloud │
│      │        │Connect│         │Apps   │         │      │
└──────┘        └───────┘         └───────┘         └──────┘
 Most corps       SYNC              M365 /            Future
 today            identities        Teams/etc         goal
```

---

## 🔑 Key Terms You'll See in This Section

| Term | What it means |
|------|--------------|
| **Entra Connect** | The software that syncs AD → Entra ID |
| **Password Hash Sync (PHS)** | Syncs password hashes to cloud |
| **Pass-Through Auth (PTA)** | Cloud asks AD to verify passwords |
| **ADFS** | On-prem federation server for SSO |
| **Hybrid AAD Join** | Device registered in both AD and Entra ID |
| **Seamless SSO** | Sign in once, access everything |

---

## ✅ Summary

```
┌────────────────────────────────────────────────────┐
│  HYBRID IDENTITY IN ONE LINE:                      │
│                                                    │
│  "One identity (AD) → synced to cloud (Entra ID)  │
│   → access everything, everywhere, securely"       │
│                                                    │
│  🔑 ONE user account                               │
│  🖥️  Works on-premise                              │
│  ☁️  Works in the cloud                            │
│  🔒 Security spans BOTH worlds                     │
└────────────────────────────────────────────────────┘
```

---

**Next →** [02 - Entra Connect Deep Dive](./02-Entra-Connect.md)
