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

## 📂 Sections at a Glance

### 🟣 Section 01 — IAM Core Concepts
> The foundation. Understand identity before anything else.

| # | File | Topic | What's Inside |
|---|------|-------|---------------|
| 01 | [01-Authentication.md](./Section-01-IAM-Core/01-Authentication.md) | Authentication | Passwords, hashing, MFA, TOTP, FIDO2, biometrics |
| 02 | [02-Authorization.md](./Section-01-IAM-Core/02-Authorization.md) | Authorization | RBAC, ABAC, DAC, MAC — access control models |
| 03 | [03-SSO-and-Federation.md](./Section-01-IAM-Core/03-SSO-and-Federation.md) | SSO & Federation | SAML, OAuth 2.0, OIDC, Kerberos, LDAP |
| 04 | [04-PAM.md](./Section-01-IAM-Core/04-PAM.md) | Privileged Access Management | JIT, vaulting, LAPS, gMSA, CyberArk, PIM |
| 05 | [05-Zero-Trust.md](./Section-01-IAM-Core/05-Zero-Trust.md) | Zero Trust Architecture | Never trust, always verify — principles and implementation |
| 06 | [06-Audit-and-Logging.md](./Section-01-IAM-Core/06-Audit-and-Logging.md) | Audit & Logging | What to log, event IDs, SIEM integration |

---

### 🔵 Section 02 — Active Directory (On-Premise)
> How Windows domain environments are built and managed.

| # | File | Topic | What's Inside |
|---|------|-------|---------------|
| 01 | [01-What-is-AD.md](./Section-02-Active-Directory/01-What-is-AD.md) | What is Active Directory | Purpose, components, why every enterprise uses it |
| 02 | [02-Forest-Domain-OU.md](./Section-02-Active-Directory/02-Forest-Domain-OU.md) | Forest, Domain & OU Structure | Hierarchy explained, design decisions |
| 03 | [03-Users-Groups-Computers.md](./Section-02-Active-Directory/03-Users-Groups-Computers.md) | Users, Groups & Computers | Object types, attributes, group scopes |
| 04 | [04-Group-Policy-GPO.md](./Section-02-Active-Directory/04-Group-Policy-GPO.md) | Group Policy (GPO) | How GPOs work, inheritance, enforcement, security GPOs |
| 05 | [05-DNS-and-DHCP.md](./Section-02-Active-Directory/05-DNS-and-DHCP.md) | DNS & DHCP in AD | Why AD depends on DNS, zones, records, scopes |
| 06 | [06-Sites-and-Replication.md](./Section-02-Active-Directory/06-Sites-and-Replication.md) | Sites, Subnets & Replication | AD replication topology, troubleshooting |
| 07 | [07-AD-Trusts.md](./Section-02-Active-Directory/07-AD-Trusts.md) | AD Trusts | Trust types, direction, transitivity, security risks |
| 08 | [08-AD-Recycle-Bin.md](./Section-02-Active-Directory/08-AD-Recycle-Bin.md) | AD Recycle Bin & Recovery | Object recovery, snapshots, backup strategy |

---

### 🔵 Section 03 — AD Authentication Protocols
> How authentication actually works under the hood.

| # | File | Topic | What's Inside |
|---|------|-------|---------------|
| 01 | [01-Kerberos.md](./Section-03-AD-Auth-Protocols/01-Kerberos.md) | Kerberos | TGT, TGS, KDC, ticket flow, KRBTGT — step by step |
| 02 | [02-NTLM.md](./Section-03-AD-Auth-Protocols/02-NTLM.md) | NTLM | Challenge-response flow, why it's dangerous |
| 03 | [03-LDAP-and-LDAPS.md](./Section-03-AD-Auth-Protocols/03-LDAP-and-LDAPS.md) | LDAP & LDAPS | Directory queries, bind operations, securing with TLS |
| 04 | [04-AD-CS.md](./Section-03-AD-Auth-Protocols/04-AD-CS.md) | AD Certificate Services | PKI in AD, certificate templates, ESC attack vectors |
| 05 | [05-RADIUS-and-8021X.md](./Section-03-AD-Auth-Protocols/05-RADIUS-and-8021X.md) | RADIUS & 802.1X | Network access authentication, NPS, Wi-Fi/VPN |
| 06 | [06-Smart-Card-Auth.md](./Section-03-AD-Auth-Protocols/06-Smart-Card-Auth.md) | Smart Card Auth | Certificate-based login, PIV, Windows Hello for Business |

---

### 🔵 Section 04 — AD Security & Hardening
> Locking down AD so attackers can't move or escalate.

| # | File | Topic | What's Inside |
|---|------|-------|---------------|
| 01 | [01-Tiered-Admin-Model.md](./Section-04-AD-Security/01-Tiered-Admin-Model.md) | Tiered Admin Model | Tier 0/1/2, PAWs, why it stops lateral movement |
| 02 | [02-LAPS.md](./Section-04-AD-Security/02-LAPS.md) | LAPS | Local admin password randomisation, setup, querying |
| 03 | [03-Protected-Users.md](./Section-04-AD-Security/03-Protected-Users.md) | Protected Users Group | What protections it applies, who to add |
| 04 | [04-Credential-Guard.md](./Section-04-AD-Security/04-Credential-Guard.md) | Credential Guard | VBS, LSASS isolation, how it blocks PtH |
| 05 | [05-Fine-Grained-Passwords.md](./Section-04-AD-Security/05-Fine-Grained-Passwords.md) | Fine-Grained Password Policies | PSOs, applying per group, use cases |
| 06 | [06-AD-Delegation-ACLs.md](./Section-04-AD-Security/06-AD-Delegation-ACLs.md) | AD Delegation & ACLs | Dangerous permissions, ACL hardening, audit |
| 07 | [07-PAW.md](./Section-04-AD-Security/07-PAW.md) | Privileged Access Workstations | Setup, restrictions, why they matter |
| 08 | [08-AD-Backup-Recovery.md](./Section-04-AD-Security/08-AD-Backup-Recovery.md) | AD Backup & Recovery | Authoritative restore, DSRM, forest recovery |

---

### 🔴 Section 05 — AD Attack Techniques
> Every major AD attack — how it works, detection, and fix.

| # | File | Topic | What's Inside |
|---|------|-------|---------------|
| 01 | [01-Enumeration.md](./Section-05-AD-Attacks/01-Enumeration.md) | Reconnaissance & Enumeration | PowerView, BloodHound, LDAP queries, what attackers look for |
| 02 | [02-Password-Attacks.md](./Section-05-AD-Attacks/02-Password-Attacks.md) | Password Attacks | Spray, stuffing, brute force, dictionary — tools and detection |
| 03 | [03-Pass-the-Hash.md](./Section-05-AD-Attacks/03-Pass-the-Hash.md) | Pass-the-Hash | NTLM hash capture, Mimikatz, lateral movement |
| 04 | [04-Pass-the-Ticket.md](./Section-05-AD-Attacks/04-Pass-the-Ticket.md) | Pass-the-Ticket | Kerberos ticket extraction, Rubeus, reuse |
| 05 | [05-Kerberoasting.md](./Section-05-AD-Attacks/05-Kerberoasting.md) | Kerberoasting | SPN targeting, offline cracking, gMSA defence |
| 06 | [06-AS-REP-Roasting.md](./Section-05-AD-Attacks/06-AS-REP-Roasting.md) | AS-REP Roasting | Pre-auth disabled accounts, detection, fix |
| 07 | [07-Golden-Ticket.md](./Section-05-AD-Attacks/07-Golden-Ticket.md) | Golden Ticket | KRBTGT abuse, forged TGT, KRBTGT rotation |
| 08 | [08-Silver-Ticket.md](./Section-05-AD-Attacks/08-Silver-Ticket.md) | Silver Ticket | Service account hash abuse, scope vs Golden Ticket |
| 09 | [09-DCSync.md](./Section-05-AD-Attacks/09-DCSync.md) | DCSync | Replication rights abuse, Mimikatz, detection |
| 10 | [10-BloodHound.md](./Section-05-AD-Attacks/10-BloodHound.md) | BloodHound Attack Paths | Graph-based AD attack path analysis |
| 11 | [11-GPO-Abuse.md](./Section-05-AD-Attacks/11-GPO-Abuse.md) | GPO Abuse | Malicious GPO deployment, write permission abuse |
| 12 | [12-ACL-Abuse.md](./Section-05-AD-Attacks/12-ACL-Abuse.md) | ACL Abuse | GenericAll, WriteDACL, ForceChangePassword chains |

---

### 🟢 Section 06 — Azure Entra ID (Cloud)
> Microsoft's cloud identity platform — structure and management.

| # | File | Topic | What's Inside |
|---|------|-------|---------------|
| 01 | [01-Entra-ID-Architecture.md](./Section-06-Entra-ID/01-Entra-ID-Architecture.md) | Entra ID Architecture | How it differs from AD, cloud-native concepts |
| 02 | [02-Tenants-Subscriptions.md](./Section-06-Entra-ID/02-Tenants-Subscriptions.md) | Tenants & Subscriptions | Structure, relationship, management groups |
| 03 | [03-Users-Groups-Contacts.md](./Section-06-Entra-ID/03-Users-Groups-Contacts.md) | Users, Groups & Contacts | Cloud-only vs synced, dynamic groups, guests |
| 04 | [04-Roles-RBAC.md](./Section-06-Entra-ID/04-Roles-RBAC.md) | Built-in & Custom Roles | Azure RBAC vs Entra ID roles, custom role creation |
| 05 | [05-App-Registrations.md](./Section-06-Entra-ID/05-App-Registrations.md) | App Registrations & Service Principals | OAuth apps, permissions, consent, secrets |
| 06 | [06-Managed-Identities.md](./Section-06-Entra-ID/06-Managed-Identities.md) | Managed Identities | System vs user assigned, use cases, security |
| 07 | [07-Admin-Units.md](./Section-06-Entra-ID/07-Admin-Units.md) | Admin Units | Scoped admin delegation in Entra ID |
| 08 | [08-Licenses-SKUs.md](./Section-06-Entra-ID/08-Licenses-SKUs.md) | Licenses & SKUs | P1 vs P2, what features each unlocks |

---

### 🟢 Section 07 — Entra ID Security
> Securing cloud identities — policies, risk and JIT access.

| # | File | Topic | What's Inside |
|---|------|-------|---------------|
| 01 | [01-Conditional-Access.md](./Section-07-Entra-Security/01-Conditional-Access.md) | Conditional Access | Policy design, named locations, device compliance |
| 02 | [02-MFA-and-Passwordless.md](./Section-07-Entra-Security/02-MFA-and-Passwordless.md) | MFA & Passwordless | TOTP, FIDO2, Windows Hello, Authenticator app |
| 03 | [03-Identity-Protection.md](./Section-07-Entra-Security/03-Identity-Protection.md) | Identity Protection | Risk levels, risky users, risky sign-ins, policies |
| 04 | [04-PIM.md](./Section-07-Entra-Security/04-PIM.md) | Privileged Identity Management | Eligible vs active roles, activation, approvals |
| 05 | [05-Access-Reviews.md](./Section-07-Entra-Security/05-Access-Reviews.md) | Access Reviews | Recertification, auto-remediation, scheduling |
| 06 | [06-SSPR.md](./Section-07-Entra-Security/06-SSPR.md) | Self-Service Password Reset | Configuration, security risks, combined registration |
| 07 | [07-Entra-ID-Attacks.md](./Section-07-Entra-Security/07-Entra-ID-Attacks.md) | Entra ID Attack Techniques | Token theft, consent grant, AiTM, device code phishing |
| 08 | [08-Entra-Hardening.md](./Section-07-Entra-Security/08-Entra-Hardening.md) | Entra ID Hardening Checklist | Complete step-by-step hardening guide |

---

### 🟢 Section 08 — Hybrid Identity
> Where on-premise AD meets cloud Entra ID.

| # | File | Topic | What's Inside |
|---|------|-------|---------------|
| 01 | [01-What-is-Hybrid-Identity.md](./Section-08-Hybrid-Identity/01-What-is-Hybrid-Identity.md) | What is Hybrid Identity | Why it exists, common architectures |
| 02 | [02-Entra-Connect.md](./Section-08-Hybrid-Identity/02-Entra-Connect.md) | Entra Connect (AD Connect) | Sync engine, filtering, attribute flow |
| 03 | [03-Password-Hash-Sync.md](./Section-08-Hybrid-Identity/03-Password-Hash-Sync.md) | Password Hash Sync (PHS) | How hashes sync, security implications |
| 04 | [04-Pass-Through-Auth.md](./Section-08-Hybrid-Identity/04-Pass-Through-Auth.md) | Pass-Through Authentication | Agent-based auth, pros/cons vs PHS |
| 05 | [05-ADFS-Federation.md](./Section-08-Hybrid-Identity/05-ADFS-Federation.md) | Federation with ADFS | Claims-based auth, when to use ADFS |
| 06 | [06-Hybrid-AAD-Join.md](./Section-08-Hybrid-Identity/06-Hybrid-AAD-Join.md) | Hybrid AAD Join vs AAD Join | Device identity, registration, Conditional Access |
| 07 | [07-Seamless-SSO.md](./Section-08-Hybrid-Identity/07-Seamless-SSO.md) | Seamless SSO | Kerberos-based cloud SSO for domain machines |
| 08 | [08-Hybrid-Attacks.md](./Section-08-Hybrid-Identity/08-Hybrid-Attacks.md) | Hybrid Identity Attacks | AADInternals, PHS abuse, Entra Connect attacks |

---

### 🟡 Section 09 — Monitoring, Logging & Incident Response
> Detect, investigate and respond to identity attacks.

| # | File | Topic | What's Inside |
|---|------|-------|---------------|
| 01 | [01-Windows-Event-IDs.md](./Section-09-Monitoring-IR/01-Windows-Event-IDs.md) | Windows Security Event IDs | Complete reference — every critical ID with meaning |
| 02 | [02-AD-Audit-Configuration.md](./Section-09-Monitoring-IR/02-AD-Audit-Configuration.md) | AD Audit Log Configuration | What to enable, GPO settings, storage |
| 03 | [03-Defender-for-Identity.md](./Section-09-Monitoring-IR/03-Defender-for-Identity.md) | Microsoft Defender for Identity | Sensor setup, detections, alerts explained |
| 04 | [04-Sentinel-for-IAM.md](./Section-09-Monitoring-IR/04-Sentinel-for-IAM.md) | Microsoft Sentinel for IAM | KQL queries, analytics rules, workbooks |
| 05 | [05-IR-Account-Compromise.md](./Section-09-Monitoring-IR/05-IR-Account-Compromise.md) | IR Playbook — Account Compromise | Step-by-step response for compromised accounts |
| 06 | [06-IR-AD-Attack.md](./Section-09-Monitoring-IR/06-IR-AD-Attack.md) | IR Playbook — AD Attack | Response for Golden Ticket, DCSync, PtH |
| 07 | [07-IR-Cloud-Identity.md](./Section-09-Monitoring-IR/07-IR-Cloud-Identity.md) | IR Playbook — Cloud Identity | Response for Entra ID token theft, consent grant |

---

### 🟠 Section 10 — Labs & Real-World Scenarios
> Build it. Break it. Defend it.

| # | File | Topic | What's Inside |
|---|------|-------|---------------|
| 01 | [01-AD-Lab-Setup.md](./Section-10-Labs/01-AD-Lab-Setup.md) | Build an AD Lab | VirtualBox/Hyper-V setup, DC promotion, domain join |
| 02 | [02-GPO-Lab.md](./Section-10-Labs/02-GPO-Lab.md) | Configure GPO | Step-by-step security GPO implementation |
| 03 | [03-Kerberoasting-Lab.md](./Section-10-Labs/03-Kerberoasting-Lab.md) | Simulate Kerberoasting | Safe lab attack walkthrough + detection |
| 04 | [04-BloodHound-Lab.md](./Section-10-Labs/04-BloodHound-Lab.md) | Run BloodHound | Setup, data collection, reading attack paths |
| 05 | [05-PIM-Lab.md](./Section-10-Labs/05-PIM-Lab.md) | Configure Azure PIM | JIT setup, approval workflow, activation |
| 06 | [06-Conditional-Access-Lab.md](./Section-10-Labs/06-Conditional-Access-Lab.md) | Set up Conditional Access | Policy design, testing, named locations |
| 07 | [07-Interview-Scenarios.md](./Section-10-Labs/07-Interview-Scenarios.md) | Interview Scenario Bank | 50+ scenario-based questions with full answers |

---

## 📖 How to Use This Repo

```
If you are a beginner        → Start at Section 01, then Section 02
If you know AD already       → Jump to Section 04 (hardening) or 05 (attacks)
If you work in cloud         → Start at Section 06 and 07
If you are in a hybrid env   → Section 08 is your focus
If you are a SOC analyst     → Section 09 is your primary reference
If you are preparing for interviews → Section 10 → Interview Scenarios
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
