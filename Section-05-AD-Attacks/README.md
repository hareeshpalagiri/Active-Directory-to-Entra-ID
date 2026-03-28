# Section 05 — Active Directory Attack Techniques

> **Repository:** Active Directory to Microsoft Entra ID\
> **Focus:** Every major AD attack — how it works, tools, detection, and defence\
> **Difficulty:** Intermediate → Advanced\
> &#xNAN;**⚠️ Purpose:** Defensive knowledge — understand attacks to defend against them

***

## 📌 What This Section Covers

This section covers every major Active Directory attack technique used by real attackers and penetration testers. Understanding how attacks work is the foundation of defending against them.

For every attack you will learn:

* What it is and why it works
* Exact step-by-step execution
* Tools used by attackers
* How to detect it (Event IDs, SIEM queries)
* How to defend and prevent it
* Interview questions on the topic

***

## 📂 Sub-Topics

| #  | File                                             | Attack                       | Difficulty      |
| -- | ------------------------------------------------ | ---------------------------- | --------------- |
| 01 | [01-Enumeration.md](01-Enumeration.md)           | Reconnaissance & Enumeration | ⭐⭐ Intermediate |
| 02 | [02-Password-Attacks.md](02-Password-Attacks.md) | Password Attacks             | ⭐⭐ Intermediate |
| 03 | [03-Pass-the-Hash.md](03-Pass-the-Hash.md)       | Pass-the-Hash                | ⭐⭐ Intermediate |
| 04 | [04-Pass-the-Ticket.md](04-Pass-the-Ticket.md)   | Pass-the-Ticket              | ⭐⭐⭐ Advanced    |
| 05 | [05-Kerberoasting.md](05-Kerberoasting.md)       | Kerberoasting                | ⭐⭐ Intermediate |
| 06 | [06-AS-REP-Roasting.md](06-AS-REP-Roasting.md)   | AS-REP Roasting              | ⭐⭐ Intermediate |
| 07 | [07-Golden-Ticket.md](07-Golden-Ticket.md)       | Golden Ticket                | ⭐⭐⭐ Advanced    |
| 08 | [08-Silver-Ticket.md](08-Silver-Ticket.md)       | Silver Ticket                | ⭐⭐⭐ Advanced    |
| 09 | [09-DCSync.md](09-DCSync.md)                     | DCSync                       | ⭐⭐⭐ Advanced    |
| 10 | [10-BloodHound.md](10-BloodHound.md)             | BloodHound Attack Paths      | ⭐⭐⭐ Advanced    |
| 11 | [11-GPO-Abuse.md](11-GPO-Abuse.md)               | GPO Abuse                    | ⭐⭐⭐ Advanced    |
| 12 | [12-ACL-Abuse.md](12-ACL-Abuse.md)               | ACL Abuse                    | ⭐⭐⭐ Advanced    |

***

## 🗺️ Typical Attack Chain

```
PHASE 1 — Initial Access
  Phishing email → Hareesh clicks → malware on workstation
  OR: Password spray → weak account found
  OR: Exploit public-facing app

PHASE 2 — Enumeration (01)
  Who am I? What domain am I in?
  Find: Domain Admins, service accounts, SPNs, ACL paths

PHASE 3 — Credential Attacks
  Password Attacks (02) → spray/brute force
  Kerberoasting (05)    → crack service account passwords
  AS-REP Roasting (06)  → crack accounts with no pre-auth

PHASE 4 — Lateral Movement
  Pass-the-Hash (03)    → use NTLM hash to move to other machines
  Pass-the-Ticket (04)  → steal and reuse Kerberos tickets

PHASE 5 — Privilege Escalation
  ACL Abuse (12)        → exploit misconfigured permissions
  BloodHound paths (10) → chain permissions to Domain Admin
  GPO Abuse (11)        → modify GPO for code execution

PHASE 6 — Domain Dominance
  DCSync (09)           → dump all password hashes
  Golden Ticket (07)    → forge TGTs for persistent access
  Silver Ticket (08)    → forge service tickets (stealthy)
```

***

## ⚡ Attack vs Defence Quick Reference

| Attack          | Primary Defence                     | Detection Event ID     |
| --------------- | ----------------------------------- | ---------------------- |
| Enumeration     | Restrict LDAP queries               | 1644 (LDAP queries)    |
| Password Spray  | MFA, smart lockout                  | 4625 (many accounts)   |
| Pass-the-Hash   | Credential Guard, Protected Users   | 4624 (NTLM logon)      |
| Pass-the-Ticket | Protected Users, short TGT lifetime | 4768/4769 anomalies    |
| Kerberoasting   | gMSA, AES encryption only           | 4769 (RC4 requests)    |
| AS-REP Roasting | Enable pre-auth on all accounts     | 4768 (pre-auth type 0) |
| Golden Ticket   | Protect DCs, rotate KRBTGT          | Ticket lifetime > 10h  |
| Silver Ticket   | Rotate service account passwords    | No KDC contact         |
| DCSync          | Restrict replication rights         | 4662 (replication)     |
| BloodHound      | ACL cleanup, quarterly audit        | Object access logs     |
| GPO Abuse       | Restrict GPO permissions            | 5136 (GPO modified)    |
| ACL Abuse       | ACL hardening, BloodHound           | 5136 (object modified) |

***

_"To defend against an attack, you must first understand how it works. Every security professional who has never seen Mimikatz run is defending against something they have never witnessed. Know the attack — know the defence."_
