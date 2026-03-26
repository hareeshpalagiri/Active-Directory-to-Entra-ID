# 🔭 Section 09 — Monitoring, Logging & Incident Response

> **"You can't defend what you can't see."**

---

```
╔══════════════════════════════════════════════════════════════════════╗
║            SECTION 09: MONITORING, LOGGING & IR                     ║
║                                                                      ║
║   COLLECT → DETECT → ALERT → RESPOND → LEARN                        ║
║                                                                      ║
║   Visibility is the foundation of every security program.            ║
║   This section gives you eyes across your entire environment.        ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 📚 What's in This Section

| File | Topic | What You'll Learn |
|------|-------|-------------------|
| [01](./01-Windows-Event-IDs.md) | Windows Event IDs | Critical Event IDs, attack patterns, PowerShell logging |
| [02](./02-AD-Audit-Configuration.md) | AD Audit Config | Advanced audit policy, SACLs, log sizing, GPO setup |
| [03](./03-Defender-for-Identity.md) | Defender for Identity | MDI sensors, attack detections, honeytokens, UEBA |
| [04](./04-Microsoft-Sentinel.md) | Microsoft Sentinel | SIEM setup, KQL queries, analytics rules, SOAR playbooks |
| [05](./05-IR-Playbooks.md) | IR Playbooks | 4 complete playbooks: AD compromise, spray, ransomware, privesc |

---

## 🗺️ The Monitoring Stack

```
┌──────────────────────────────────────────────────────────────────────┐
│                   COMPLETE MONITORING STACK                          │
│                                                                      │
│  LAYER 1: EVENTS (Raw Data)                                          │
│  ────────────────────────────────────────────────────────────────   │
│  Windows Event Logs  │  AD Audit Logs  │  DNS/DHCP  │  PowerShell   │
│  (Event IDs)         │  (5136, 4662)   │  Queries   │  Script Logs  │
│                                                                      │
│          │                   │                │              │       │
│          └───────────────────┴────────────────┴──────────────┘       │
│                                    │                                 │
│                                    ▼                                 │
│  LAYER 2: DETECTION (Intelligence)                                   │
│  ────────────────────────────────────────────────────────────────   │
│  ┌──────────────────────────┐    ┌───────────────────────────────┐  │
│  │  Defender for Identity   │    │      Microsoft Sentinel        │  │
│  │  (on-prem AD attacks)    │    │      (cloud SIEM/SOAR)        │  │
│  │  MDI Sensor on DCs       │    │      KQL analytics rules       │  │
│  │  Golden Ticket, DCSync   │───►│      Incident correlation      │  │
│  │  Pass-the-Hash etc.      │    │      Automated playbooks       │  │
│  └──────────────────────────┘    └───────────────────────────────┘  │
│                                                                      │
│          │                                    │                      │
│          └────────────────────────────────────┘                      │
│                               │                                      │
│                               ▼                                      │
│  LAYER 3: RESPONSE (Action)                                          │
│  ────────────────────────────────────────────────────────────────   │
│  IR Playbooks  │  SOAR Automation  │  Analyst Investigation          │
│  (Pre-written) │  (Logic Apps)     │  (Hunting, Forensics)           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Critical Event IDs Quick Reference

| Event ID | What It Means | Priority |
|----------|---------------|----------|
| 4624 | Successful logon | High |
| 4625 | Failed logon | High |
| 4648 | Logon with explicit creds | High |
| 4672 | Special privileges (admin logon) | High |
| 4698 | Scheduled task created | High |
| 4719 | Audit policy changed | **CRITICAL** |
| 4720 | New user account created | High |
| 4728 | Member added to global group | **CRITICAL** |
| 4740 | Account locked out | High |
| 4768 | Kerberos TGT requested | Medium |
| 4769 | Kerberos service ticket (SPN) | High |
| 4776 | NTLM auth attempted | Medium |
| 5136 | Directory object modified | **CRITICAL** |
| 5137 | Directory object created | High |
| 4662 | AD object operation | High |
| 4104 | PowerShell Script Block | High |
| 4688 | New process created | Medium |

---

## 🚨 Attack Detection Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│             ATTACK → EVENT PATTERN → TOOL → ACTION                  │
├──────────────────┬────────────────────┬──────────────┬──────────────┤
│ ATTACK           │ EVENT PATTERN      │ TOOL         │ ACTION       │
├──────────────────┼────────────────────┼──────────────┼──────────────┤
│ Password Spray   │ 4625 × many accts  │ Sentinel     │ Block IP     │
│                  │ same IP, same time │ Rule         │ Reset creds  │
├──────────────────┼────────────────────┼──────────────┼──────────────┤
│ Kerberoasting    │ 4769 + RC4 + many  │ MDI Alert    │ Disable acct │
│                  │ SPN requests       │              │ Check creds  │
├──────────────────┼────────────────────┼──────────────┼──────────────┤
│ DCSync           │ 4662 + replication │ MDI Alert    │ Full IR!     │
│                  │ from non-DC        │ Sentinel     │ Reset krbtgt │
├──────────────────┼────────────────────┼──────────────┼──────────────┤
│ Golden Ticket    │ Anomalous Kerberos │ MDI Alert    │ Reset krbtgt │
│                  │ ticket properties  │              │ Twice!       │
├──────────────────┼────────────────────┼──────────────┼──────────────┤
│ Pass-the-Hash    │ 4624 Type 3 NTLM  │ MDI Alert    │ Isolate host │
│                  │ from workstation   │              │ Reset creds  │
├──────────────────┼────────────────────┼──────────────┼──────────────┤
│ BloodHound       │ Many 4662/LDAP     │ MDI Alert    │ Investigate  │
│                  │ queries, odd hours │ Sentinel     │ Hunt recon   │
├──────────────────┼────────────────────┼──────────────┼──────────────┤
│ Audit Log Tamper │ 4719               │ Sentinel     │ CRITICAL IR! │
│                  │ Audit policy chg   │ Alert        │ Log offsite  │
└──────────────────┴────────────────────┴──────────────┴──────────────┘
```

---

## 🔧 Monitoring Maturity Levels

```
MONITORING MATURITY MODEL:

  LEVEL 1 — BASIC (Month 1)
  ────────────────────────────────────────────────────────────
  ✅ Enable Advanced Audit Policy on all DCs
  ✅ Increase Security Event Log size
  ✅ Deploy MDI sensors on all DCs
  ✅ Connect Entra ID to Sentinel
  ✅ Enable built-in Sentinel analytics rules

  LEVEL 2 — STANDARD (Month 2-3)
  ────────────────────────────────────────────────────────────
  ✅ Enable PowerShell Script Block Logging
  ✅ Enable command line in 4688 events
  ✅ Connect Windows Security Events via AMA agent
  ✅ Create Honeytoken accounts in AD
  ✅ Write 3 core IR playbooks
  ✅ Configure email alerts for HIGH severity

  LEVEL 3 — ADVANCED (Month 4-6)
  ────────────────────────────────────────────────────────────
  ✅ Custom KQL analytics rules for your environment
  ✅ SOAR automation (playbooks for common scenarios)
  ✅ SACL on critical AD objects
  ✅ Threat hunting program (weekly sessions)
  ✅ MDI alert tuning (reduce false positives)
  ✅ 90-day log retention, 1-year archive

  LEVEL 4 — EXPERT (Month 6+)
  ────────────────────────────────────────────────────────────
  ✅ Full MITRE ATT&CK coverage mapping
  ✅ Tabletop exercise every 6 months
  ✅ Red team exercises with IR team
  ✅ Custom UEBA baselines per user role
  ✅ Threat intel feeds integrated
  ✅ Automated evidence collection on alert
```

---

## 🎓 Key Concepts Quick Reference

| Concept | One-Line Summary |
|---------|-----------------|
| **Event Log** | Windows security diary — records every important action |
| **Audit Policy** | Settings that control what gets written to Event Log |
| **SACL** | Audit rule on specific AD objects (e.g., Domain Admins) |
| **MDI** | AI watchdog on DCs — detects AD attack patterns |
| **Sentinel** | Cloud SIEM — collects, analyzes, alerts, automates |
| **KQL** | Query language for searching Sentinel logs |
| **Analytics Rule** | Scheduled KQL query that auto-creates alerts |
| **SOAR Playbook** | Automated response to an alert (Logic App) |
| **Incident** | Group of related alerts = one investigation unit |
| **Honeytoken** | Fake account — any use = immediate high-confidence alert |
| **Threat Hunting** | Proactive search for threats before alerts fire |
| **MTTD/MTTR** | Mean Time to Detect / Respond — key IR metrics |

---

## 🧪 Hands-On Checklist

```
SECTION 09 LABS — TRY THESE:

  □ Enable Advanced Audit Policy via GPO
    auditpol /get /category:* (verify on DC)

  □ Trigger Event 4624/4625 — verify in Event Viewer
  □ Run: Invoke-Kerberoast in lab → see Event 4769 in logs
  □ Deploy MDI sensor on lab DC — see your own account in timeline
  □ Connect lab Windows Server → Sentinel via AMA agent
  □ Run KQL query: Find all 4625 events in last 1 hour
  □ Create a simple Sentinel analytics rule for 4719
  □ Create a Honeytoken account — try to use it → see MDI alert
  □ Run a tabletop scenario: "Domain Admin account compromised"
  □ Practice: Disable account + revoke sessions + check audit trail
```

---

## ➡️ What's Next

| Section | Topic |
|---------|-------|
| ← Section 08 | [Hybrid Identity](../Section-08-Hybrid-Identity/) |
| → Section 10 | [Labs & Real-World Scenarios](../Section-10-Labs/) |

---

```
╔══════════════════════════════════════════════════════════════════════╗
║  SECTION 09 COMPLETE ✅                                              ║
║                                                                      ║
║  You now understand:                                                 ║
║  ✅ Which Event IDs matter most and what attack patterns to spot     ║
║  ✅ How to configure Advanced Audit Policy for full AD visibility    ║
║  ✅ How MDI sensors detect attacks on DCs in real time               ║
║  ✅ How Sentinel collects logs, runs KQL, and automates response     ║
║  ✅ How to respond to AD compromise, spray, ransomware incidents     ║
║  ✅ How to build a monitoring maturity program step by step          ║
╚══════════════════════════════════════════════════════════════════════╝
```
