# Section 01 — IAM Core Concepts

> **Repository:** Active Directory to Microsoft Entra ID  
> **Focus:** Foundation of identity and access management  
> **Difficulty:** Beginner → Intermediate

---

## 📌 What This Section Covers

Before you can understand Active Directory, Entra ID, or any security tool —
you need to understand **identity itself**.

This section starts from absolute zero:
- What is an identity?
- Why does access need to be controlled?
- How is access provided and managed?
- What happens when IAM fails?

Then it builds up through every core IAM concept
that everything else in this repo depends on.

---

## 📂 Sub-Topics

| # | File | Topic | Difficulty |
|---|------|-------|------------|
| 01 | [01-Introduction-to-IAM.md](./01-Introduction-to-IAM.md) | Introduction to IAM | ⭐ Beginner |
| 02 | [02-Authentication.md](./02-Authentication.md) | Authentication | ⭐⭐ Beginner-Intermediate |
| 03 | [03-Authorization.md](./03-Authorization.md) | Authorization | ⭐⭐ Beginner-Intermediate |
| 04 | [04-SSO-and-Federation.md](./04-SSO-and-Federation.md) | SSO & Federation | ⭐⭐⭐ Intermediate |
| 05 | [05-PAM.md](./05-PAM.md) | Privileged Access Management | ⭐⭐⭐ Intermediate |
| 06 | [06-Zero-Trust.md](./06-Zero-Trust.md) | Zero Trust Architecture | ⭐⭐⭐ Intermediate |
| 07 | [07-Audit-and-Logging.md](./07-Audit-and-Logging.md) | Audit & Logging | ⭐⭐ Beginner-Intermediate |

---

## 🗺️ Learning Flow

```
Start here
    │
    ▼
01-Introduction-to-IAM
    What is identity? Types of identity.
    Why access matters. The IAM lifecycle.
    │
    ▼
02-Authentication
    Proving who you are.
    Passwords, MFA, biometrics, protocols.
    │
    ▼
03-Authorization
    Controlling what you can do.
    RBAC, ABAC, DAC, MAC.
    │
    ▼
04-SSO-and-Federation
    One login, many apps.
    SAML, OAuth 2.0, OIDC.
    │
    ▼
05-PAM
    Protecting the most powerful accounts.
    JIT, vaulting, session recording.
    │
    ▼
06-Zero-Trust
    Never trust, always verify.
    Modern security model.
    │
    ▼
07-Audit-and-Logging
    Every identity action leaves a trace.
    Event IDs, SIEM, compliance.
```

---

## ⚡ Key Concepts at a Glance

| Concept | One Line |
|---------|----------|
| **Identity** | A unique representation of a person, device, or system |
| **Authentication** | Verifying that identity is genuine |
| **Authorization** | Deciding what that identity can access |
| **MFA** | Two or more factors to prove identity |
| **RBAC** | Access based on job role |
| **ABAC** | Access based on attributes and conditions |
| **SSO** | Login once, access many applications |
| **PAM** | Special controls for admin/privileged accounts |
| **Zero Trust** | Never trust anything by default — always verify |
| **Least Privilege** | Give only the minimum access needed |
| **Audit Log** | A record of every identity action |

---

## 🔗 How This Section Connects to the Rest

```
Section 01 (IAM Core)
    │
    ├──► Section 02 (Active Directory)
    │    AD is the on-premise IAM engine
    │
    ├──► Section 06 (Entra ID)
    │    Entra ID is the cloud IAM engine
    │
    ├──► Section 05 (AD Attacks)
    │    Most AD attacks target IAM weaknesses
    │
    └──► Section 09 (Monitoring & IR)
         IAM events are the #1 source of SOC alerts
```

---

*"Get IAM right and you have a foundation. Get it wrong and everything else is built on sand."*
