<div align="center">

# 🏢 Active Directory to Microsoft Entra ID

**A complete security reference — from on-premise identity infrastructure to cloud IAM.**  
Covers architecture, authentication protocols, attack techniques, defense hardening,  
monitoring, and real-world labs. Written in simple English with real examples.

![Sections](https://img.shields.io/badge/Sections-10-7C3AED?style=flat-square)
![Sub--topics](https://img.shields.io/badge/Sub--topics-65+-2563EB?style=flat-square)
![Attack Techniques](https://img.shields.io/badge/Attack%20Techniques-30+-DC2626?style=flat-square)
![Interview QA](https://img.shields.io/badge/Interview%20Q%26A-400+-059669?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-F59E0B?style=flat-square)

</div>

---

## 🗺️ Repo Blueprint

<div align="center">

![Blueprint](./assets/blueprint.svg)

</div>

---

## 📂 Sections

---

### 🟣 Section 01 — IAM Core Concepts
> The foundation. Understand identity before anything else.

| # | File | Topic | What's Inside |
|---|------|-------|---------------|
| 01 | [01-Introduction-to-IAM.md](./Section-01-IAM-Core/01-Introduction-to-IAM.md) | Introduction to IAM | Identity types, lifecycle, why IAM failures = breaches |
| 02 | [02-Authentication.md](./Section-01-IAM-Core/02-Authentication.md) | Authentication | Passwords, hashing, MFA, TOTP, FIDO2, Kerberos, NTLM |
| 03 | [03-Authorization.md](./Section-01-IAM-Core/03-Authorization.md) | Authorization | RBAC, ABAC, DAC, MAC — access control models |
| 04 | [04-SSO-and-Federation.md](./Section-01-IAM-Core/04-SSO-and-Federation.md) | SSO & Federation | SAML, OAuth 2.0, OIDC, Golden SAML |
| 05 | [05-PAM.md](./Section-01-IAM-Core/05-PAM.md) | Privileged Access Management | JIT, vaulting, LAPS, gMSA, CyberArk, PIM |
| 06 | [06-Zero-Trust.md](./Section-01-IAM-Core/06-Zero-Trust.md) | Zero Trust Architecture | Never trust always verify — 5 pillars |
| 07 | [07-Audit-and-Logging.md](./Section-01-IAM-Core/07-Audit-and-Logging.md) | Audit & Logging | Event IDs, SIEM, KQL queries, detection |

---

### 🔵 Section 02 — Active Directory (On-Premise)
> How Windows domain environments are built and managed.

| # | File | Topic | What's Inside |
|---|------|-------|---------------|
| 01 | [01-What-is-AD.md](./Section-02-Active-Directory/01-What-is-AD.md) | What is Active Directory | Purpose, components, FSMO roles, NTDS.dit |
| 02 | [02-Forest-Domain-OU.md](./Section-02-Active-Directory/02-Forest-Domain-OU.md) | Forest, Domain & OU Structure | Hierarchy, Global Catalog, DN, design |
| 03 | [03-Users-Groups-Computers.md](./Section-02-Active-Directory/03-Users-Groups-Computers.md) | Users, Groups & Computers | Group types, AGDLP, UAC flags, AdminSDHolder |
| 04 | [04-Group-Policy-GPO.md](./Section-02-Active-Directory/04-Group-Policy-GPO.md) | Group Policy (GPO) | LSDOU, inheritance, scripts, GPO attacks |
| 05 | [05-DNS-and-DHCP.md](./Section-02-Active-Directory/05-DNS-and-DHCP.md) | DNS & DHCP in AD | SRV records, DORA, authorisation, attacks |
| 06 | [06-Sites-and-Replication.md](./Section-02-Active-Directory/06-Sites-and-Replication.md) | Sites, Subnets & Replication | KCC, intra vs intersite, repadmin |
| 07 | [07-AD-Trusts.md](./Section-02-Active-Directory/07-AD-Trusts.md) | AD Trusts | Trust types, SID filtering, delegation risk |
| 08 | [08-AD-Recycle-Bin.md](./Section-02-Active-Directory/08-AD-Recycle-Bin.md) | AD Recycle Bin & Recovery | Recycle Bin, DSRM, backup, authoritative restore |

---

### 🔵 Section 03 — AD Authentication Protocols
> How authentication actually works under the hood.

| # | File | Topic | What's Inside |
|---|------|-------|---------------|
| 01 | [01-Kerberos.md](./Section-03-AD-Auth-Protocols/01-Kerberos.md) | Kerberos | TGT flow, SPN config, IIS/SQL/Printer, Kerberoasting, Golden Ticket |
| 02 | [02-NTLM.md](./Section-03-AD-Auth-Protocols/02-NTLM.md) | NTLM | Challenge-response, printer config, Pass-the-Hash, NTLM Relay |
| 03 | [03-LDAP-and-LDAPS.md](./Section-03-AD-Auth-Protocols/03-LDAP-and-LDAPS.md) | LDAP & LDAPS | VPN/Printer/vCenter config, LDAP injection, relay attacks |
| 04 | [04-AD-CS.md](./Section-03-AD-Auth-Protocols/04-AD-CS.md) | AD Certificate Services | Two-tier PKI, SSL/LDAPS config, ESC1-ESC4, Golden Certificate |
| 05 | [05-RADIUS-and-8021X.md](./Section-03-AD-Auth-Protocols/05-RADIUS-and-8021X.md) | RADIUS & 802.1X | Wi-Fi/VPN/Switch config, Evil Twin, 802.1X bypass |
| 06 | [06-Smart-Card-Auth.md](./Section-03-AD-Auth-Protocols/06-Smart-Card-Auth.md) | Smart Card Auth | PKINIT flow, admin config, badge printing, WHfB |

---

### 🔵 Section 04 — AD Security & Hardening
> Coming soon

---

### 🔴 Section 05 — AD Attack Techniques
> Coming soon

---

### 🟢 Section 06 — Azure Entra ID (Cloud)
> Coming soon

---

### 🟢 Section 07 — Entra ID Security
> Coming soon

---

### 🟢 Section 08 — Hybrid Identity
> Coming soon

---

### 🟡 Section 09 — Monitoring & Incident Response
> Coming soon

---

### 🟠 Section 10 — Labs & Real-World Scenarios
> Coming soon

---

## 📖 How to Use This Repo

```
Beginner?          → Start at Section 01, then Section 02
Know AD already?   → Jump to Section 04 (hardening) or 05 (attacks)
Cloud focused?     → Start at Section 06 and 07
Hybrid env?        → Section 08 is your focus
SOC analyst?       → Section 09 is your primary reference
Interview prep?    → Section 10 → Interview Scenarios
```

---

## 🎯 Who This Is For

| Role | Most Relevant Sections |
|------|----------------------|
| **IT Administrator** | 02, 03, 04, 06, 08 |
| **SOC Analyst** | 01, 05, 07, 09 |
| **Penetration Tester** | 03, 05, 07, 08 |
| **Security Engineer** | 01, 04, 07, 09 |
| **Cloud Engineer** | 06, 07, 08 |
| **Interview Prep** | All sections + Section 10 |

---

## 📊 Coverage

| Metric | Count |
|--------|-------|
| 📂 Sections | 10 |
| 📄 Sub-topic files | 65+ |
| ⚠️ Attack techniques | 30+ |
| 🎯 Interview Q&As | 400+ |
| 🔧 Commands & configs | 200+ |
| 🏢 Real-world scenarios | 50+ |

---

<div align="center">

*⭐ Star this repo if you find it useful — it helps others find it too!*

</div>
