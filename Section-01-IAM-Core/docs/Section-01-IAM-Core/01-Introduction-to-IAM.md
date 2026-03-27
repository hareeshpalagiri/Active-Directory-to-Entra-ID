# 01 — Introduction to Identity and Access Management (IAM)

> **Section:** 01 — IAM Core Concepts  
> **Difficulty:** Beginner  
> **Read time:** ~20 minutes

---

## 📌 What is Identity?

In the real world, your identity is **who you are**.

Your name, your face, your fingerprint, your passport — all of these prove that you are *you* and not someone else.

In the digital world, **identity works the same way** — but instead of a passport, you have a username, an email address, an employee ID, or a certificate that says *"this is who this person or system is."*

> **Simple definition:**  
> A digital identity is a set of attributes that uniquely represents a person, device, or system in a computer network.

### Real-World Analogy

Think of a **corporate office building**:

- The reception desk has a visitor register
- Every employee has a **staff ID card** with their name, photo, department
- The card is unique — no two cards are the same
- The card tells the building **who you are**

That staff ID card = your **digital identity** in an IT system.

---

## 🧑‍💼 Types of Identities

Not all identities belong to humans. In any organisation, there are **four types of identities** that need to be managed.

---

### 1. Human Identities

These are the most common — people who use IT systems.

| Type | Who they are | Example |
|------|-------------|---------|
| **Employee** | Full-time or part-time staff | Hareesh — IT Administrator |
| **Administrator** | IT staff with elevated privileges | GP — Domain Admin |
| **Guest / External** | Contractors, partners, vendors | A consultant from an external firm |
| **Service Desk** | Helpdesk staff | Support team who reset passwords |

**Example:**
```
Hareesh joins the company as an IT Administrator.
His digital identity is created:
  Username     : hareesh@company.com
  Employee ID  : EMP-4521
  Department   : IT Operations
  Job Title    : System Administrator
  Manager      : GP
```

---

### 2. Privileged Identities

A special category of human identities — accounts that have **elevated or admin-level access**.

These are the most powerful and most targeted accounts in any organisation.

| Type | What they can do |
|------|----------------|
| **Domain Admin** | Full control over entire Active Directory |
| **Global Administrator** | Full control over Azure / Microsoft 365 |
| **Root** | Full control over Linux/Unix systems |
| **Database Admin** | Full access to all data in databases |
| **Cloud Subscription Owner** | Full control of cloud resources |

**Example:**
```
GP is the Senior IT Manager.
She has two accounts:

Daily use account  : gp@company.com
  → Used for email, meetings, normal work
  → Standard user permissions

Admin account      : gp-admin@company.com
  → Used ONLY for domain administration tasks
  → Member of Domain Admins group
  → Never used to browse the internet or read email
```

> ⚠️ **Why two accounts?**  
> If GP uses her admin account for daily work and clicks a phishing email — an attacker gets Domain Admin access instantly. Separating accounts limits the blast radius.

---

### 3. Machine Identities

These are identities assigned to **devices and systems** — not humans.

Every device in a network has an identity so that other systems know whether to trust it.

| Type | Example |
|------|---------|
| **Workstation** | Hareesh's laptop joined to the domain |
| **Server** | FileServer01, WebServer02 |
| **Network device** | Router, Switch, Firewall |
| **Certificate** | SSL/TLS certificate identifying a website |

**Example:**
```
Hareesh's laptop:
  Computer Name  : DESKTOP-HR-001
  Domain         : company.local
  Certificate    : Issued by company CA
  → Active Directory knows this is a trusted company device
  → Conditional Access allows it to connect to cloud apps

An unmanaged personal laptop:
  → Not joined to domain
  → No company certificate
  → Conditional Access blocks it from accessing company resources ❌
```

---

### 4. Workload Identities (Non-Human Identities)

These are identities assigned to **applications, services, scripts, and automated processes**.

When an application needs to access a database, read from an API, or connect to another service — it needs an identity to authenticate.

| Type | Example |
|------|---------|
| **Service Account** | `svc_backup` — runs the nightly backup job |
| **Application Identity** | Web app that reads from a database |
| **Managed Identity** | Azure VM that accesses Key Vault secrets |
| **API Key** | Script that calls an external weather API |

**Example:**
```
A web application needs to read customer data from a SQL database.

Without a workload identity (BAD):
  Developer hardcodes the DB password in the application code
  → Password stored in plain text in code repository
  → Anyone with repo access can see the password ← RISK

With a workload identity (GOOD):
  Application is given a Managed Identity in Azure
  → Azure automatically handles authentication to the database
  → No password stored anywhere
  → Access can be revoked at any time ✅
```

---

## 🔐 Why is Access Required?

Every organisation has **resources** — files, applications, databases, servers, emails, cloud services. Not everyone should have access to everything.

### Resources in a Typical Organisation

```
Finance Department:
  └── Payroll database
  └── Financial reports
  └── Accounting software (SAP, QuickBooks)

HR Department:
  └── Employee personal records
  └── Performance reviews
  └── Recruitment system

IT Department:
  └── Domain Controllers
  └── Server infrastructure
  └── Network devices
  └── Security tools

All Employees:
  └── Email (Outlook)
  └── Internal intranet
  └── Meeting rooms booking system
```

### The Problem Without Access Control

Imagine if every employee could access everything:

```
Scenario — No access control:

Hareesh (IT Admin) can read all employee salary records
→ Privacy violation

A new intern can delete production server configurations
→ Operational disaster

A contractor can read the CEO's emails
→ Confidentiality breach

A disgruntled employee downloads the entire customer database
→ Data breach, regulatory fines, reputational damage
```

### The Solution — Access Based on Need

```
Hareesh's access (IT Admin):
  ✅ Server infrastructure
  ✅ Active Directory management
  ✅ Network configuration
  ❌ Payroll database
  ❌ HR employee records

GP's access (IT Manager + Domain Admin):
  ✅ Everything Hareesh can access
  ✅ Domain Controllers
  ✅ Security policies
  ✅ Audit logs
  ❌ Finance system (unless specifically required)

Finance Team access:
  ✅ Finance applications
  ✅ Financial reports
  ❌ Server infrastructure
  ❌ Active Directory
```

This is the **principle of least privilege** — give people only the access they need to do their job, nothing more.

---

## 🔑 How Access is Provided — The IAM Lifecycle

Access is not just given once and forgotten. It follows a **lifecycle** — from the day someone joins to the day they leave.

```
┌─────────────────────────────────────────────────────────┐
│                    IAM Lifecycle                        │
│                                                         │
│  1. CREATE      2. PROVISION    3. USE      4. REVIEW   │
│  ─────────      ─────────────   ───────     ──────────  │
│  Identity       Assign          Daily        Quarterly  │
│  created        access          access       audit      │
│                                                         │
│                          5. MODIFY    6. REVOKE         │
│                          ─────────    ────────          │
│                          Role         Access            │
│                          change       removed           │
└─────────────────────────────────────────────────────────┘
```

### Step-by-Step Example — Hareesh Joins the Company

**Day 1 — CREATE:**
```
HR creates employee record for Hareesh
IT receives onboarding request
Active Directory account created:
  Username  : hareesh@company.com
  Password  : Temporary (must change on first login)
  Status    : Enabled
```

**Day 1 — PROVISION:**
```
Hareesh is added to security groups based on his role:
  SG-IT-Operations     → Access to server management tools
  SG-VPN-Users         → Access to company VPN
  SG-Office365         → Email and Teams licence assigned
  SG-FileShare-IT      → Access to IT shared drives
```

**Day 1 to ongoing — USE:**
```
Hareesh logs in daily:
  → Email, Teams, internal tools — all accessible
  → Every login is logged
  → Every file access is logged
```

**Every 90 days — REVIEW:**
```
GP (Hareesh's manager) receives an access review request:
  "Does Hareesh still need access to the following?
   ✅ SG-IT-Operations
   ✅ SG-VPN-Users
   ❌ SG-Project-X (project ended 3 months ago)"

GP removes SG-Project-X → Hareesh's access is trimmed
```

**Hareesh changes role — MODIFY:**
```
Hareesh is promoted to Senior IT Engineer
  New group added : SG-Server-Admins
  Old group removed: SG-Junior-IT
  Azure PIM role added: Eligible for "Contributor" on Dev subscription
```

**Hareesh leaves the company — REVOKE:**
```
HR triggers offboarding workflow
  AD account disabled immediately         ✅
  All active sessions terminated          ✅
  Azure licences revoked                  ✅
  MFA devices deregistered                ✅
  Group memberships removed               ✅
  Shared mailbox access removed           ✅
  Account kept for 90 days (audit trail)  ✅
  Account permanently deleted after 90 days ✅
```

> ⚠️ **Security note:** Accounts should be **disabled first, deleted later**. If you delete immediately, you lose the audit trail of what that account did. Forensics teams need that history.

---

## 🏛️ What is IAM? — Bringing It All Together

**Identity and Access Management (IAM)** is the framework of policies, processes, and technologies that ensures:

- The **right people** (and systems)
- Get access to the **right resources**
- At the **right time**
- For the **right reasons**
- And nothing more

### The Four Pillars of IAM

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   IDENTITY          AUTHENTICATION    AUTHORIZATION          │
│   ────────          ──────────────    ─────────────          │
│   Who are you?      Prove it.         What can you do?       │
│                                                              │
│   hareesh           Password + MFA    Read servers ✅        │
│   @company.com      ──────────────►   Delete AD objects ❌   │
│                                                              │
│                     ACCOUNTABILITY                           │
│                     ──────────────                           │
│                     What did you do?                         │
│                     Login at 09:02 from 192.168.1.10         │
│                     Accessed FileServer01 at 09:15           │
│                     Modified GPO at 10:30                    │
└──────────────────────────────────────────────────────────────┘
```

| Pillar | Question | Example |
|--------|----------|---------|
| **Identity** | Who are you? | `hareesh@company.com` |
| **Authentication** | Can you prove it? | Password + Microsoft Authenticator |
| **Authorization** | What are you allowed to do? | Read IT servers, not HR database |
| **Accountability** | What did you actually do? | Audit logs, SIEM events |

---

## 🌐 IAM Tools — On-Premise and Cloud

| Environment | Tool | What it does |
|-------------|------|-------------|
| **On-Premise** | Active Directory (AD) | Manages all identities in a Windows domain |
| **Cloud** | Microsoft Entra ID | Cloud-based identity management |
| **Hybrid** | Entra Connect | Syncs on-prem AD identities to the cloud |
| **PAM** | CyberArk / Azure PIM | Manages privileged accounts |
| **SSO** | ADFS / Okta | Single sign-on across applications |
| **MFA** | Microsoft Authenticator | Multi-factor authentication |

```
On-Premise                    Hybrid                    Cloud
──────────────               ────────────              ──────────────
Active Directory    ──────►  Entra Connect  ──────►   Entra ID
Manages:                     Syncs:                   Manages:
- Users                      - Passwords              - Cloud users
- Computers                  - Groups                 - App access
- Groups                     - Attributes             - MFA policies
- GPOs                                                - Conditional Access
```

---

## ⚠️ Why IAM Failures = Security Breaches

IAM is not just an IT administration task — it is a **core security control**. When IAM fails, attackers get in.

### Real-World Breach Examples Caused by IAM Failures

**1. Over-Privileged Accounts**
```
Scenario:
  A developer's account was accidentally added to Domain Admins
  during a project two years ago.
  Nobody noticed. No access review was done.

  Attacker phishes the developer → gets their password
  → Logs in with Domain Admin rights
  → Dumps all AD password hashes
  → Owns the entire domain in 20 minutes

IAM failure: No access reviews, no least privilege enforcement
```

**2. Account Not Disabled After Employee Leaves**
```
Scenario:
  A contractor worked on a project for 3 months.
  Their account was never disabled after the project ended.
  6 months later — account still active, still has VPN access.

  Former contractor (now disgruntled) logs in via VPN
  → Accesses internal file shares
  → Downloads confidential project data

IAM failure: No offboarding process, no account lifecycle management
```

**3. No MFA on Admin Accounts**
```
Scenario:
  GP's admin account only had a password for protection.
  Password was reused from a personal account.
  That personal account appeared in a data breach.

  Attacker uses credential stuffing
  → Tries GP's leaked password on company portal
  → Logs in as Domain Admin
  → Deploys ransomware across all servers

IAM failure: No MFA, password reuse, no breach password monitoring
```

**4. Orphaned Service Account**
```
Scenario:
  A service account was created 5 years ago to run a backup job.
  The backup software was replaced 2 years ago.
  The service account was never deleted.
  It still has Domain Admin rights "just in case."

  Attacker enumerates AD → finds the service account
  → Kerberoasts the account (requests its service ticket)
  → Cracks the weak password offline in 4 hours
  → Logs in with Domain Admin rights

IAM failure: No service account lifecycle, excessive privileges
```

---

## 👨‍💻 IAM from a Cybersecurity Perspective

### What a SOC Analyst Sees

Every IAM event generates a log. SOC analysts monitor these logs for suspicious patterns:

```
Normal pattern:
  hareesh@company.com
  Login at 09:05 from 192.168.1.45 (office workstation)
  Login location: Bengaluru, India ✅

Suspicious pattern:
  hareesh@company.com
  Login at 09:05 from 192.168.1.45 (Bengaluru) ✅
  Login at 09:47 from 185.220.101.x (Russia) ← ALERT 🚨

  Impossible travel detected:
  Same account cannot be in India and Russia 42 minutes apart
  → Account likely compromised
  → SOC analyst investigates immediately
```

### What an Attacker Targets

```
Attacker priority list (highest to lowest value):

1. Domain Admin accounts          ← Full AD control
2. Global Administrator (Entra)   ← Full cloud control
3. Service accounts               ← Often weak passwords, high privilege
4. Regular user accounts          ← Entry point for lateral movement
5. Machine accounts               ← Used for lateral movement
```

### Common IAM Attack Chain

```
Step 1: Phishing email → Hareesh clicks link → password captured
Step 2: Attacker logs in as Hareesh (regular user)
Step 3: Attacker enumerates AD → finds service accounts with SPNs
Step 4: Kerberoasting → cracks service account password
Step 5: Service account has local admin on servers → lateral movement
Step 6: Attacker finds GP logged into a server → dumps his hash
Step 7: Pass-the-Hash → attacker authenticates as GP (Domain Admin)
Step 8: Full domain compromise ← entire attack started with one phishing email
```

This is why **every layer of IAM matters** — identity, authentication, authorization, and monitoring all working together stops attacks at multiple points.

---

## 📚 What's Coming Next in This Section

| File | Topic | What you will learn |
|------|-------|-------------------|
| [02-Authentication.md](./02-Authentication.md) | Authentication | How identity is proved — passwords, MFA, biometrics, protocols |
| [03-Authorization.md](./03-Authorization.md) | Authorization | How access is controlled — RBAC, ABAC, DAC, MAC |
| [04-SSO-and-Federation.md](./04-SSO-and-Federation.md) | SSO & Federation | How one login works across many apps — SAML, OAuth, OIDC |
| [05-PAM.md](./05-PAM.md) | Privileged Access Management | Securing the most powerful accounts |
| [06-Zero-Trust.md](./06-Zero-Trust.md) | Zero Trust | Never trust, always verify — modern security model |
| [07-Audit-and-Logging.md](./07-Audit-and-Logging.md) | Audit & Logging | Tracking every identity action for security and compliance |

---

## ❓ Think About This

1. In your organisation, how many service accounts exist? Do you know what each one does and what access it has?
2. When an employee leaves, how quickly is their account disabled? Who is responsible for triggering that process?
3. If an attacker compromised a regular user account right now, how far could they get in your environment before being detected?
4. Which accounts in your environment have never been reviewed for excessive permissions?
5. What would happen if your Domain Admin password was leaked in a public data breach tonight?

---

## 🎯 Interview Questions

**Q1. What is IAM and why is it important in cybersecurity?**  
**A:** IAM (Identity and Access Management) is the framework that ensures the right people get access to the right resources at the right time. It is critical in cybersecurity because the majority of breaches involve identity — either stolen credentials, over-privileged accounts, or improper access controls. IAM is the foundation of every security architecture — without it, there is no way to control who can access what or detect when something goes wrong.

---

**Q2. What are the four pillars of IAM?**  
**A:** Identity (who are you), Authentication (prove it), Authorization (what are you allowed to do), and Accountability (what did you do — audit trails and logging). All four must work together — a strong identity system with no logging means you cannot detect abuse, and strong authentication with poor authorization still allows over-privileged users to cause damage.

---

**Q3. What is the difference between a human identity and a workload identity?**  
**A:** A human identity represents a person — an employee, admin, or guest — who interacts with systems. A workload identity represents a non-human entity — an application, service, script, or automated process — that needs to authenticate to other systems. Workload identities are often overlooked in security reviews but are frequently targeted because they may have high privileges and weak credentials like hardcoded passwords or long-lived API keys.

---

**Q4. What is the principle of least privilege?**  
**A:** Least privilege means giving a user, application, or system only the minimum permissions needed to perform their specific job function — nothing more. It limits the damage an attacker can do if they compromise an account. For example, a helpdesk user should be able to reset passwords but not modify Group Policy. A backup service account should be able to read data but not delete it.

---

**Q5. What is the IAM lifecycle and why does each stage matter?**  
**A:** The IAM lifecycle covers: Create (account provisioned when someone joins), Provision (correct access assigned based on role), Use (daily access with monitoring), Review (periodic audit of whether access is still needed), Modify (access adjusted when role changes), and Revoke (access removed when someone leaves or no longer needs it). Each stage matters because failures at any point create security gaps — for example, skipping the Revoke stage leaves orphaned accounts that attackers can exploit.

---

**Q6. Scenario — A SOC alert fires showing a login from two different countries within 30 minutes for the same account. What is this called and what do you do?**  
**A:** This is called an impossible travel alert — the same account cannot physically be in two distant locations within a short time window, indicating the account is likely compromised. Response: (1) Immediately revoke all active sessions for the account. (2) Disable the account temporarily. (3) Contact the user via an out-of-band method (phone call — not email, which may be compromised) to confirm whether the logins were legitimate. (4) If confirmed compromise — reset credentials, review what was accessed, check for persistence mechanisms, and investigate how credentials were stolen. (5) Enable MFA if not already enforced.

---

*"IAM is not a product you buy — it is a discipline you build. Every identity in your environment is either a door you control or a door an attacker can walk through."*
