# 🏆 Section 10 — Labs & Real-World Scenarios

> **"You don't truly understand something until you can break it — and fix it."**

---

```
╔══════════════════════════════════════════════════════════════════════╗
║              SECTION 10: LABS & REAL-WORLD SCENARIOS                ║
║                                                                      ║
║   This is your CYBER RANGE — a safe place to practice every         ║
║   concept from Sections 01-09. Theory without practice is           ║
║   forgotten. Practice without theory is dangerous.                  ║
║   This section combines both.                                        ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 📚 What's in This Section

| File | Topic | What You'll Do |
|------|-------|----------------|
| [01](./01-AD-Lab-Setup.md) | AD Lab Setup | Build a full AD + Entra ID lab for free |
| [02](./02-GPO-Lab.md) | GPO Lab | Fine-grained passwords, audit policy, AppLocker |
| [03](./03-Kerberoasting-Lab.md) | Kerberoasting Sim | Attack + detect + defend Kerberoasting end-to-end |
| [04](./04-BloodHound-Lab.md) | BloodHound Lab | Map AD attack paths, remediate, verify |
| [05](./05-PIM-Conditional-Access-Lab.md) | PIM + CA Lab | Just-in-time admin access + smart sign-in policies |
| [06](./06-Interview-QA.md) | Interview Q&A | 400+ Q&As across all 10 sections |

---

## 🗺️ Lab Learning Path

```
┌──────────────────────────────────────────────────────────────────────┐
│                        LAB LEARNING PATH                             │
│                                                                      │
│   START HERE                                                         │
│       │                                                              │
│       ▼                                                              │
│   ┌────────────────────────────────────────────┐                    │
│   │  LAB 01: Build Your Lab (1-2 hrs)           │                    │
│   │  ✅ DC01 + WIN10-CLIENT + Kali + M365 Trial  │                    │
│   └─────────────────────┬──────────────────────┘                    │
│                         │                                            │
│              ┌──────────┴──────────┐                                 │
│              │                     │                                 │
│              ▼                     ▼                                 │
│   ┌──────────────────┐  ┌───────────────────────┐                   │
│   │  LAB 02: GPO     │  │  LAB 05: PIM + CA      │                   │
│   │  (On-prem focus) │  │  (Cloud focus)          │                   │
│   │  1-2 hrs         │  │  2-3 hrs                │                   │
│   └────────┬─────────┘  └──────────┬─────────────┘                  │
│            │                       │                                 │
│            └──────────┬────────────┘                                 │
│                       │                                              │
│                       ▼                                              │
│   ┌──────────────────────────────────────────────┐                  │
│   │  LAB 03: Kerberoasting (2-3 hrs)             │                  │
│   │  Attack → Detect → Defend → Verify            │                  │
│   └─────────────────────┬────────────────────────┘                  │
│                         │                                            │
│                         ▼                                            │
│   ┌──────────────────────────────────────────────┐                  │
│   │  LAB 04: BloodHound (2-3 hrs)               │                  │
│   │  Map all paths → Remediate → Re-verify        │                  │
│   └─────────────────────┬────────────────────────┘                  │
│                         │                                            │
│                         ▼                                            │
│   ┌──────────────────────────────────────────────┐                  │
│   │  LAB 06: Interview Q&A (Study + Practice)    │                  │
│   │  Mock interviews, flashcards, scenario drills │                  │
│   └──────────────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🧰 Full Toolkit Reference

```
TOOLS YOU'LL USE IN THESE LABS:

  AD MANAGEMENT:
  ──────────────────────────────────────────────────────────────────
  Active Directory Users & Computers (ADUC)  → GUI management
  Active Directory Administrative Center     → Modern GUI
  Group Policy Management Console (GPMC)     → GPO management
  ADSI Edit (adsiedit.msc)                   → Low-level AD editing
  PowerShell AD Module                       → Scripted management

  MONITORING:
  ──────────────────────────────────────────────────────────────────
  Event Viewer                               → Windows event logs
  auditpol.exe                               → Audit policy status
  gpresult.exe                               → GPO application status
  Microsoft Defender for Identity Portal     → AD attack detection
  Microsoft Sentinel                         → SIEM / log analysis

  ATTACK TOOLS (lab only):
  ──────────────────────────────────────────────────────────────────
  Impacket / GetUserSPNs.py                  → Kerberoasting
  Rubeus.exe                                 → Kerberos attacks
  BloodHound + SharpHound                    → AD path analysis
  Mimikatz                                   → Credential dumping
  PowerView / PowerSploit                    → AD enumeration
  hashcat                                    → Password cracking
  Responder                                  → NTLM poisoning
  AADInternals                               → Entra ID attacks

  CLOUD LABS:
  ──────────────────────────────────────────────────────────────────
  Microsoft Entra Portal (entra.microsoft.com)
  Microsoft Defender Portal (security.microsoft.com)
  Azure Portal (portal.azure.com)
  Microsoft Sentinel Workspace
  Entra Connect Configuration Wizard
```

---

## 📊 Skills You'll Have After This Section

```
ON-PREMISE SKILLS:
──────────────────────────────────────────────────────────────────
  ✅ Build and configure an AD domain from scratch
  ✅ Design and deploy Group Policy at enterprise scale
  ✅ Implement fine-grained password policies
  ✅ Configure comprehensive AD audit logging
  ✅ Perform and defend against Kerberoasting
  ✅ Use BloodHound to find and fix AD attack paths
  ✅ Configure LAPS for local admin password management
  ✅ Implement the Tiered Admin Model

CLOUD / HYBRID SKILLS:
──────────────────────────────────────────────────────────────────
  ✅ Configure PIM for just-in-time admin access
  ✅ Build Conditional Access policies for all scenarios
  ✅ Deploy and configure break-glass accounts
  ✅ Set up access reviews in Entra ID
  ✅ Understand and configure Entra Connect sync
  ✅ Configure risk-based authentication policies

SECURITY OPERATIONS:
──────────────────────────────────────────────────────────────────
  ✅ Write KQL queries for threat detection
  ✅ Create Sentinel analytics rules
  ✅ Execute an IR playbook for AD compromise
  ✅ Use MDI to investigate identity threats
  ✅ Identify and remediate privilege escalation paths
```

---

## 🎓 Certifications This Content Prepares You For

| Certification | Relevance |
|--------------|-----------|
| **SC-900** Microsoft Security Fundamentals | Sections 06, 07 |
| **AZ-900** Azure Fundamentals | Sections 06, 08 |
| **SC-300** Microsoft Identity & Access Admin | All sections |
| **SC-200** Microsoft Security Operations | Sections 04, 05, 09 |
| **MD-102** Microsoft 365 Endpoint Admin | Sections 08, 10 |
| **GIAC GCIH** Incident Handler | Section 09, 10 |
| **GIAC GPEN** Pen Tester | Sections 05, 10 |
| **CEH** Certified Ethical Hacker | Sections 03, 04, 05 |
| **CISSP** | Sections 01-10 (all domains) |
| **CompTIA Security+** | Sections 01-05 |

---

## 📅 Suggested Study Schedule

```
COMPLETE THE ENTIRE REPOSITORY IN 10 WEEKS:

  WEEK 1:  Section 01 (IAM Core) + Section 02 (AD On-Prem)
  WEEK 2:  Section 03 (Auth Protocols) + Lab 01 (Build Lab)
  WEEK 3:  Section 04 (AD Security) + Lab 02 (GPO Lab)
  WEEK 4:  Section 05 (AD Attacks) + Lab 03 (Kerberoasting)
  WEEK 5:  Section 06 (Entra ID Cloud) + Lab 04 (BloodHound)
  WEEK 6:  Section 07 (Entra ID Security) + Lab 05 (PIM + CA)
  WEEK 7:  Section 08 (Hybrid Identity) + Entra Connect Lab
  WEEK 8:  Section 09 (Monitoring + IR) + Sentinel Lab
  WEEK 9:  Review all sections + practice labs
  WEEK 10: Interview Q&A + mock interviews + certification prep

  DAILY HABITS:
  ───────────────────────────────────────────────
  30 min: Read one .md file from current section
  30 min: Practice in lab environment
  15 min: Review Q&A from that section
  
  Total: ~75 minutes/day → mastery in 10 weeks
```

---

```
╔══════════════════════════════════════════════════════════════════════╗
║                  🏆 REPOSITORY COMPLETE! 🏆                         ║
║                                                                      ║
║  Congratulations! You've covered:                                    ║
║                                                                      ║
║  📚  10 Sections  |  65+ Sub-topics  |  30+ Attack Techniques       ║
║  🧪  6 Hands-on Labs  |  400+ Interview Q&As                        ║
║  🔒  On-Premise · Hybrid · Cloud                                     ║
║                                                                      ║
║  You now think like both an attacker AND a defender.                 ║
║  That dual perspective is what separates great security              ║
║  engineers from good ones.                                           ║
║                                                                      ║
║  Go build. Go break. Go defend.                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

**← Previous Section:** [Section 09 — Monitoring, Logging & IR](../Section-09-Monitoring/)
