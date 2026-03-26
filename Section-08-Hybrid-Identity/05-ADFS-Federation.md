# 🏛️ ADFS Federation (Active Directory Federation Services)

> **Simple Definition:** ADFS is an on-premise server that acts as a **trusted passport office** — it issues security tokens that prove your identity, so you can access cloud apps without sending your password to Microsoft at all.

---

## 🛂 The Passport Analogy

```
WITHOUT ADFS:                           WITH ADFS:
────────────────────────────────        ─────────────────────────────────
You hand your password to every         You get a PASSPORT from your
  website you visit.                    government (ADFS).
Risky — each site could leak it.        Show the passport → get in.
                                        Password stays at the passport
                                        office (your org).
```

---

## 🏗️ ADFS Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        ADFS ARCHITECTURE                             │
│                                                                      │
│  INTERNAL NETWORK (Corp)            DMZ               INTERNET       │
│  ┌──────────────────────┐    ┌────────────────┐                      │
│  │                      │    │                │                      │
│  │  ┌───────────┐       │    │  WAP Server    │    ┌─────────────┐  │
│  │  │   ADFS    │       │    │  (Web App      │    │ Microsoft   │  │
│  │  │  Server   │◄──────┼────┤   Proxy)       │◄───│   365 /     │  │
│  │  │           │       │    │                │    │ Entra ID    │  │
│  │  │  Token    │       │    │  Public-facing │    │             │  │
│  │  │  issuer   │       │    │  ADFS proxy    │    │ Trusts ADFS │  │
│  │  └─────┬─────┘       │    └────────────────┘    └─────────────┘  │
│  │        │             │                                            │
│  │        ▼             │                                            │
│  │  ┌───────────┐       │                                            │
│  │  │   Active  │       │                                            │
│  │  │ Directory │       │                                            │
│  │  └───────────┘       │                                            │
│  └──────────────────────┘                                            │
│                                                                      │
│  ⚠️  Requires: ADFS servers + WAP servers + certificates + DNS      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🌊 ADFS Login Flow Step by Step

```
USER TRIES TO ACCESS OFFICE 365

  Step 1: Browser goes to login.microsoft.com
  ──────────────────────────────────────────
  User: outlook.office.com
  Microsoft: "Who are you? Where do you come from?"
  (Home Realm Discovery based on email domain)

  Step 2: Redirected to company ADFS
  ──────────────────────────────────────────
  Browser → https://adfs.contoso.com/adfs/ls
  User sees: CONTOSO LOGIN PAGE (their own!)
  Types: username + password (to their own server!)

  Step 3: ADFS validates with AD
  ──────────────────────────────────────────
  ADFS → Active Directory: "Verify these creds"
  AD: ✅ "Valid!"

  Step 4: ADFS issues a SAML token
  ──────────────────────────────────────────
  ADFS creates a signed token:
  ┌─────────────────────────────────────┐
  │  SAML ASSERTION                     │
  │  Subject: alice@contoso.com         │
  │  Issuer: adfs.contoso.com           │
  │  Valid: 10:00 AM - 11:00 AM         │
  │  Claims: [groups, roles, dept...]   │
  │  Signed with: ADFS cert (private)   │
  └─────────────────────────────────────┘

  Step 5: Browser sends token to Microsoft
  ──────────────────────────────────────────
  Microsoft validates signature with ADFS public cert
  ✅ "We trust Contoso's ADFS. Alice is in!"
  User sees their inbox. 📧
```

---

## 🪙 What Are Claims?

ADFS passes claims (facts about the user) to applications:

```
CLAIM TYPES:
─────────────────────────────────────────────────────

  NAME CLAIM:        alice@contoso.com
  GROUP CLAIM:       Finance-Team, VPN-Users
  ROLE CLAIM:        Admin, Viewer
  DEPARTMENT:        Finance
  EMPLOYEE ID:       EMP-12345
  CUSTOM CLAIM:      ClearanceLevel=Secret

CLAIM RULES (You control what apps see):
─────────────────────────────────────────────────────

  Rule 1: Send group membership as role claim
  Rule 2: Only send dept if user is in HR-Portal group
  Rule 3: Block access if account = disabled in AD
  Rule 4: Add custom attribute from AD to token

  POWER: Apps can make auth decisions based on claims
  Example: SharePoint only allows Finance claims → finance docs
```

---

## 🏢 ADFS for Different Scenarios

```
SCENARIO 1: Single Forest
──────────────────────────────────────────────────
  Corp AD → ADFS → Microsoft 365
  Simple and common. One ADFS farm.

SCENARIO 2: Multi-Forest with Trust
──────────────────────────────────────────────────
  Forest A          Forest B
     │                 │
     └────► ADFS ◄─────┘
             │
          Entra ID
  Users from both forests → single ADFS

SCENARIO 3: B2B / Partner Federation
──────────────────────────────────────────────────
  YOUR ADFS ◄────SAML Trust────► PARTNER ADFS
  
  Partner users log into their own ADFS
  → Get token trusted by your ADFS
  → Access your resources
  No accounts needed in your AD!

SCENARIO 4: Claims Provider Trust
──────────────────────────────────────────────────
  Social logins or 3rd party IdP → ADFS → Your apps
  ADFS acts as a hub/broker
```

---

## 📊 ADFS vs PHS vs PTA

```
                ADFS           PTA            PHS
               ──────────     ──────────     ──────────
Password sent  Never          Forwarded      Hash only
               to cloud       on-prem        (safe)

Auth location  On-prem        On-prem        Cloud

Extra servers  Yes (many!)    PTA agents     None

Complexity     VERY HIGH      Medium         Low

Works if AD    ❌ No          ❌ No          ✅ Yes
  is down

SSO to other   ✅ Yes         Limited        Limited
  IdPs/partners

Claims control ✅ Full        Limited        Limited

Cost           High           Low            Low

When to use    Legacy, complex Compliance    Most orgs
               partner B2B    (no hash cloud)
```

---

## 🔄 ADFS High Availability

```
PRODUCTION ADFS FARM (Minimum Recommended):

  INTERNAL                     DMZ
  ┌─────────────────────┐      ┌───────────────────┐
  │  ADFS Server 1  ┐   │      │  WAP Server 1  ┐  │
  │  ADFS Server 2  ├──►│─────►│  WAP Server 2  │  │
  │  ADFS Server 3  ┘   │      └───────────────────┘
  │       │             │
  │  Load Balancer      │      External LB/WAF
  │       │             │      in front of WAP
  │  SQL Server         │
  │  (Config DB)        │      ⚠️ This is a LOT of infra!
  └─────────────────────┘      (Why most orgs move to PTA/PHS)
```

---

## 👮 Security Engineer's POV

> ⚠️ **ADFS is a massive, complex attack surface. It's being deprecated by Microsoft for good reason.**

```
🚨 FAMOUS ADFS ATTACKS:

  GOLDEN SAML (CVE-2020-ADFS)
  ────────────────────────────────────────────────────
  SolarWinds attackers used this technique!

  1. Attacker compromises AD → gets ADFS signing cert
  2. Forges SAML tokens for ANY user (even admin)
  3. Logs into cloud apps with forged identity
  4. No alerts, no anomalies visible
  5. Can persist even after password reset!

  This is what happened in the SolarWinds attack →
  Attackers got into Microsoft 365 government tenants


  CVE-2018-8340 (ADFS Bypass)
  ────────────────────────────────────────────────────
  Unpatched ADFS could allow auth bypass


  TOKEN REPLAY ATTACKS
  ────────────────────────────────────────────────────
  Stolen SAML tokens can be replayed if:
  - Token lifetime is too long
  - Replay detection not implemented


🛡️  DEFENSIVE MEASURES:
  ✅ Patch ADFS IMMEDIATELY (critical vulns released often)
  ✅ Export and protect ADFS signing certs (HSM ideal!)
  ✅ Enable ADFS Extranet Lockout
  ✅ Set short token lifetimes (< 1 hour)
  ✅ Monitor: Event ID 1200, 1202 (token issuance)
  ✅ Alert on: Token issued for admin accounts
  ✅ Consider migrating AWAY from ADFS!


🔍  DETECT GOLDEN SAML:
  Look for: Impossible travel in cloud sign-in logs
  Look for: Auth success with no prior PTA/PHS activity
  Look for: ADFS cert access in security logs
```

---

## 🚪 Migrating Away from ADFS

Microsoft and the security community both recommend moving away from ADFS:

```
ADFS MIGRATION PATH:

  TODAY                    STEP 1               STEP 2
  ┌──────────┐            ┌─────────────┐       ┌──────────────┐
  │          │            │             │       │              │
  │  ADFS    │───────────►│  PTA with   │──────►│  PHS with    │
  │  Farm    │  Migrate   │  PHS backup │  Then │  Entra ID    │
  │          │            │             │  opt. │  native auth │
  └──────────┘            └─────────────┘       └──────────────┘

  Microsoft guide: "AD FS to Entra ID migration"
  Available in Entra portal under "AD FS migration"
```

---

## ✅ Summary

```
┌───────────────────────────────────────────────────────────┐
│  ADFS IN A NUTSHELL:                                      │
│                                                           │
│  🏛️  On-premise token issuer (SAML/WS-Fed)               │
│  🪙  Issues signed claims about users                     │
│  🤝  Microsoft trusts ADFS tokens                         │
│  🏗️  Requires significant infrastructure                  │
│  ⚠️  Large attack surface (Golden SAML!)                  │
│  🚪  Microsoft recommends migrating to PTA/PHS            │
│                                                           │
│  USE WHEN: B2B partner federation, legacy apps,           │
│  complex claims requirements                              │
└───────────────────────────────────────────────────────────┘
```

---

**← Previous:** [04 - Pass-Through Authentication](./04-Pass-Through-Authentication.md)
**Next →** [06 - Hybrid AAD Join](./06-Hybrid-AAD-Join.md)
