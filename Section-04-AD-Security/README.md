# Section 04 — Active Directory Security & Hardening

> **Repository:** Active Directory to Microsoft Entra ID  
> **Focus:** Locking down Active Directory so attackers cannot move or escalate  
> **Difficulty:** Intermediate → Advanced

---

## 📌 What This Section Covers

Knowing how AD works (Section 02) and how its protocols work (Section 03) is only half the picture. The other half is knowing how to **lock it down**.

This section covers every major AD hardening control — from the architecture of privilege separation to the specific registry settings that stop credential theft. Every topic includes:
- Why the control exists (what attack it stops)
- Step-by-step configuration
- How attackers try to bypass it
- How to verify it is working

---

## 📂 Sub-Topics

| # | File | Topic | Difficulty |
|---|------|-------|------------|
| 01 | [01-Tiered-Admin-Model.md](./01-Tiered-Admin-Model.md) | Tiered Admin Model | ⭐⭐⭐ Advanced |
| 02 | [02-LAPS.md](./02-LAPS.md) | LAPS | ⭐⭐ Intermediate |
| 03 | [03-Protected-Users.md](./03-Protected-Users.md) | Protected Users Group | ⭐⭐ Intermediate |
| 04 | [04-Credential-Guard.md](./04-Credential-Guard.md) | Credential Guard | ⭐⭐⭐ Advanced |
| 05 | [05-Fine-Grained-Passwords.md](./05-Fine-Grained-Passwords.md) | Fine-Grained Password Policies | ⭐⭐ Intermediate |
| 06 | [06-AD-Delegation-ACLs.md](./06-AD-Delegation-ACLs.md) | AD Delegation & ACL Hardening | ⭐⭐⭐ Advanced |
| 07 | [07-PAW.md](./07-PAW.md) | Privileged Access Workstations | ⭐⭐⭐ Advanced |
| 08 | [08-AD-Backup-Recovery.md](./08-AD-Backup-Recovery.md) | AD Backup & Recovery | ⭐⭐ Intermediate |

---

## 🗺️ How Controls Layer Together

```
Attack: Attacker phishes GP (Domain Admin) and gets her password
─────────────────────────────────────────────────────────────────

Without hardening:
  → Attacker logs in as GP → full Domain Admin → game over

With layered hardening:

Layer 1 — Tiered Admin Model:
  GP's admin account cannot be used from a workstation
  → Login attempt blocked ✅

Layer 2 — PAW:
  Admin account only works from Privileged Access Workstation
  → Attacker does not have the PAW ✅

Layer 3 — Protected Users:
  GP's admin account cannot use NTLM (only Kerberos)
  Credential not cached on other machines
  → Pass-the-Hash impossible ✅

Layer 4 — Credential Guard:
  Even if attacker reaches a server where GP logged in
  LSASS is isolated → hash cannot be extracted ✅

Layer 5 — Fine-Grained Password Policy:
  Admin accounts require 20+ char passwords
  → Password spray fails ✅

Layer 6 — LAPS:
  Each machine has unique local admin password
  → Lateral movement via local admin blocked ✅

Defence in depth — attacker must defeat ALL layers
```

---

## ⚡ Quick Reference — What Each Control Stops

| Control | Stops This Attack |
|---------|-----------------|
| **Tiered Admin Model** | Lateral movement, credential exposure |
| **LAPS** | Pass-the-Hash via local admin accounts |
| **Protected Users** | Pass-the-Hash, ticket theft, NTLM auth |
| **Credential Guard** | Credential dumping from LSASS |
| **Fine-Grained Passwords** | Password spray on admin accounts |
| **ACL Hardening** | BloodHound attack path abuse |
| **PAW** | Malware on admin workstations |
| **AD Backup** | Ransomware, accidental deletion, corruption |

---

*"Hardening AD is not about one control — it is about layering defences so an attacker who breaks through one layer immediately hits another."*
