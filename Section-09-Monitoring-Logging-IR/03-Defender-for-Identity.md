# 🛡️ Microsoft Defender for Identity (MDI)

> **Simple Definition:** Defender for Identity (formerly Azure ATP) is Microsoft's **AI-powered security watchdog** that sits on your Domain Controllers, reads AD activity in real time, and automatically alerts you when it sees attack patterns — like Kerberoasting, Pass-the-Hash, or Golden Tickets.

---

## 🐕 The Guard Dog Analogy

```
WITHOUT MDI:                           WITH MDI:
────────────────────────────────       ─────────────────────────────────
You have security cameras (Event       You have a TRAINED GUARD DOG that
  Logs) but nobody watching them.      watches 24/7 and knows the
                                       difference between:
You only find out after the fact.
                                       → A guest arriving normally
                                       → A burglar sneaking in

                                       And BARKS (alerts) immediately!
```

---

## 🏗️ MDI Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    MDI DEPLOYMENT ARCHITECTURE                       │
│                                                                      │
│  ON-PREMISE                                  CLOUD                   │
│  ─────────────────────────────               ─────────────────────── │
│                                                                      │
│  ┌─────────────────────────┐                ┌──────────────────────┐ │
│  │  Domain Controller 1    │                │                      │ │
│  │  ┌─────────────────┐    │                │  MDI Cloud Service   │ │
│  │  │  MDI SENSOR     │────┼───────────────►│  (portal.azure.com)  │ │
│  │  │  (lightweight)  │    │   HTTPS only   │                      │ │
│  │  └─────────────────┘    │                │  Analyzes data       │ │
│  └─────────────────────────┘                │  Machine learning    │ │
│                                             │  Alert generation    │ │
│  ┌─────────────────────────┐                │                      │ │
│  │  Domain Controller 2    │                └──────────────────────┘ │
│  │  ┌─────────────────┐    │                          │              │
│  │  │  MDI SENSOR     │────┼──────────────────────────┘              │
│  │  └─────────────────┘    │                ┌──────────────────────┐ │
│  └─────────────────────────┘                │  Microsoft Defender  │ │
│                                             │  XDR Portal          │ │
│  ┌─────────────────────────┐                │  (security.microsoft │ │
│  │  ADFS / AD CS Server    │                │     .com)            │ │
│  │  ┌─────────────────┐    │                └──────────────────────┘ │
│  │  │  MDI SENSOR     │────┘                                         │
│  └─────────────────────────┘                                         │
└──────────────────────────────────────────────────────────────────────┘

  The sensor reads:
  → Network traffic on the DC (port-mirroring or direct capture)
  → Windows Event Log (reads locally via WMI/ETW)
  → Combines both for full picture
```

---

## 🔍 What MDI Detects

### Reconnaissance Attacks
```
┌────────────────────────────────────────────────────────────────┐
│  RECONNAISSANCE DETECTIONS                                     │
├─────────────────────────────────────────────────────────────   │
│                                                                │
│  🔍 Account Enumeration Reconnaissance                         │
│     Attacker queries AD for all users/groups                   │
│     MDI sees: Many LDAP queries for user objects               │
│     Alert: "Suspicious account enumeration"                    │
│                                                                │
│  🔍 Network Mapping Reconnaissance (DNS)                       │
│     Attacker resolves many hostnames to map network            │
│     MDI sees: Bulk DNS queries from single host                │
│     Alert: "Suspicious DNS reconnaissance"                     │
│                                                                │
│  🔍 User and IP Address Reconnaissance (SMB)                   │
│     Attacker uses net view / SMB session enumeration           │
│     MDI sees: SMB session queries across many targets          │
│     Alert: "SMB session enumeration reconnaissance"            │
│                                                                │
│  🔍 BloodHound / SharpHound                                    │
│     Active Directory path enumeration tool used by attackers   │
│     MDI sees: Characteristic LDAP query patterns              │
│     Alert: "Suspected AD reconnaissance using LDAP"           │
└────────────────────────────────────────────────────────────────┘
```

### Credential Attacks
```
┌────────────────────────────────────────────────────────────────┐
│  CREDENTIAL THEFT DETECTIONS                                   │
├─────────────────────────────────────────────────────────────   │
│                                                                │
│  🔑 Kerberoasting                                              │
│     Attacker requests service tickets (RC4 encrypted)          │
│     MDI sees: Event 4769 + RC4 + many SPN requests             │
│     Alert: "Suspected Kerberos SPN exposure"                   │
│                                                                │
│  🔑 AS-REP Roasting                                            │
│     Attacker gets hashes without pre-auth for users            │
│     MDI sees: TGT requests without pre-authentication          │
│     Alert: "Suspected AS-REP roasting attack"                  │
│                                                                │
│  🔑 Brute Force / Password Spray                               │
│     Many failed logins across accounts                         │
│     MDI sees: Pattern of 4625 events                           │
│     Alert: "Suspected brute force attack (LDAP/Kerberos)"      │
│                                                                │
│  🔑 Credential Dumping (LSASS)                                 │
│     Mimikatz-style memory dump of LSASS process                │
│     MDI sees: Suspicious LSASS access patterns                 │
│     Alert: "Suspected credential theft"                        │
└────────────────────────────────────────────────────────────────┘
```

### Lateral Movement
```
┌────────────────────────────────────────────────────────────────┐
│  LATERAL MOVEMENT DETECTIONS                                   │
├─────────────────────────────────────────────────────────────   │
│                                                                │
│  ↔️  Pass-the-Hash                                             │
│     Attacker uses NTLM hash (not password) to authenticate     │
│     MDI sees: NTLM auth from unexpected source                 │
│     Alert: "Suspected identity theft (pass-the-hash)"          │
│                                                                │
│  ↔️  Pass-the-Ticket                                           │
│     Stolen Kerberos ticket used from different machine         │
│     MDI sees: Kerberos ticket used from abnormal IP            │
│     Alert: "Suspected identity theft (pass-the-ticket)"        │
│                                                                │
│  ↔️  Remote Execution                                          │
│     Lateral movement via PsExec, WMI, PowerShell remoting      │
│     MDI sees: Remote service creation + cmd.exe patterns       │
│     Alert: "Remote execution attempt"                          │
└────────────────────────────────────────────────────────────────┘
```

### Domain Dominance
```
┌────────────────────────────────────────────────────────────────┐
│  DOMAIN DOMINANCE DETECTIONS                                   │
├─────────────────────────────────────────────────────────────   │
│                                                                │
│  👑 DCSync Attack                                              │
│     Attacker replicates all AD password hashes                 │
│     MDI sees: Replication request from non-DC                  │
│     Alert: "Suspected DCSync attack (replication of dirs)"     │
│                                                                │
│  👑 Golden Ticket                                              │
│     Forged Kerberos ticket using krbtgt hash                   │
│     MDI sees: Anomalous Kerberos ticket properties             │
│     Alert: "Suspected Golden Ticket usage (encryption down.)"  │
│                                                                │
│  👑 Skeleton Key                                               │
│     Malware patched into DC memory, bypasses all auth          │
│     MDI sees: DC process memory anomaly                        │
│     Alert: "Suspected Skeleton Key attack"                     │
│                                                                │
│  👑 DCShadow                                                   │
│     Rogue DC registered to push malicious changes              │
│     MDI sees: Unauthorized replication partner registration    │
│     Alert: "Suspected DCShadow attack"                         │
└────────────────────────────────────────────────────────────────┘
```

---

## 📊 MDI Alert Severity Levels

```
SEVERITY LEVELS:
──────────────────────────────────────────────────────────────────

  🔴 HIGH — Immediate action required
     Golden Ticket, DCSync, Skeleton Key, DCShadow
     → These = active domain compromise in progress

  🟠 MEDIUM — Investigate within hours
     Kerberoasting, Pass-the-Hash, credential dumping
     → Attacker may have credentials

  🟡 LOW — Investigate within days
     Reconnaissance, enumeration, password spray
     → Attacker in early stages


  REAL-WORLD TRIAGE:
  ─────────────────────────────────────────────────────────────────
  HIGH alerts    → Wake up the security team NOW
  MEDIUM alerts  → Assign to on-call analyst within 2 hours
  LOW alerts     → Daily review, tune false positives
```

---

## 🗂️ MDI Identity Timeline

MDI builds a **behavioral profile** of every user and device:

```
MDI IDENTITY TIMELINE FOR: alice@contoso.com

  ┌────────────────────────────────────────────────────────────────┐
  │  📅 Monday 9:00 AM - Logged into CONTOSO-PC01                  │
  │  📅 Monday 9:05 AM - Accessed \\fileserver\finance             │
  │  📅 Monday 10:30 AM - Ran PowerShell script                    │
  │  📅 Monday 2:00 PM - Logged out                                │
  │  ─────────────────────────────────────────────────────────     │
  │  📅 Tuesday 9:00 AM - Logged in normally                       │
  │  ─────────────────────────────────────────────────────────     │
  │  📅 Wednesday 2:00 AM - ⚠️ UNUSUAL LOGIN from NEW DEVICE      │
  │  📅 Wednesday 2:01 AM - ⚠️ LDAP query for Domain Admin list   │
  │  📅 Wednesday 2:02 AM - ⚠️ Kerberoasting attempt              │
  │  → ALERT FIRED: "Suspected reconnaissance + Kerberoasting"    │
  └────────────────────────────────────────────────────────────────┘

  MDI learns "normal" → anything unusual triggers investigation
  This is called: User and Entity Behavior Analytics (UEBA)
```

---

## 🔗 MDI Integration with Microsoft Defender XDR

```
MDI FITS INTO THE BIGGER PICTURE:

  ┌──────────────────────────────────────────────────────────────┐
  │              MICROSOFT DEFENDER XDR                          │
  │                                                              │
  │  MDI          MDE           MDO          MDCA               │
  │  (Identity)   (Endpoint)    (Office 365) (Cloud Apps)        │
  │                                                              │
  │  AD attacks   Malware on    Phishing     Risky cloud         │
  │  Lateral mvmt PCs           BEC attacks  app access          │
  │       │           │              │            │              │
  │       └───────────┴──────────────┴────────────┘              │
  │                          │                                   │
  │                   CORRELATED INCIDENT                        │
  │                                                              │
  │  "Phishing email → credential stolen → lateral movement      │
  │   via Pass-the-Hash → Domain Admin access in AD"             │
  │                                                              │
  │  ALL IN ONE STORY = Much faster investigation!               │
  └──────────────────────────────────────────────────────────────┘
```

---

## ⚙️ MDI Deployment Steps

```
DEPLOYMENT CHECKLIST:
──────────────────────────────────────────────────────────────────

  PRE-DEPLOYMENT:
  □ Microsoft 365 E5 or MDI standalone license
  □ Service account with permission to read AD
  □ Network access from DCs to *.atp.azure.com (HTTPS)
  □ Windows Server 2012 R2+ on DCs

  DEPLOYMENT:
  □ Create MDI workspace in security.microsoft.com
  □ Download MDI sensor installer from portal
  □ Install sensor on EVERY Domain Controller
  □ Install sensor on ADFS servers
  □ Install sensor on AD CS servers
  □ Configure Directory Services account credentials
  □ Verify sensor shows "Running" in portal

  POST-DEPLOYMENT:
  □ Configure email notifications for HIGH alerts
  □ Integrate with SIEM (Sentinel) for ticket creation
  □ Review and tune noisy alerts (false positives)
  □ Set up Honeytoken accounts (decoy accounts)
  □ Enable Entity Tags for sensitive accounts
```

---

## 🍯 Honeytoken Accounts — A Smart Trap

```
HONEYTOKEN STRATEGY:

  ┌─────────────────────────────────────────────────────────────┐
  │  Create fake user accounts in AD:                           │
  │                                                             │
  │  👤 Name: svc-backup-admin                                  │
  │     Description: "Backup service account"                   │
  │     Password: Complex, never expires                        │
  │     Last Login: Never (it's fake!)                          │
  │     MDI Tag: Honeytoken                                     │
  │                                                             │
  │  WHY:                                                       │
  │  Attackers running BloodHound/ADRecon will find this        │
  │  They'll try to crack it or use it                          │
  │  ANY attempt to use it = IMMEDIATE HIGH ALERT               │
  │                                                             │
  │  "Nobody should ever log in as svc-backup-admin"            │
  │  "If someone tries → attacker detected!"                    │
  │                                                             │
  │  FALSE POSITIVE RATE: Nearly zero                           │
  │  DETECTION RATE: Extremely high                             │
  └─────────────────────────────────────────────────────────────┘
```

---

## 👮 Security Engineer's POV

> ⚠️ **MDI is powerful but sensors must be on EVERY DC. One uncovered DC = blind spot.**

```
COMMON MDI FAILURES:
──────────────────────────────────────────────────────────────────
  ❌ Sensor not installed on all DCs
     → Attacker uses the unmonitored DC
     → No alerts generated!

  ❌ Service account lacks permissions
     → Sensor can't read AD events
     → False sense of security (portal shows "healthy" 
       but missing data)

  ❌ No alert notifications configured
     → Alerts fire in portal, nobody sees them

  ❌ Alerts never tuned
     → Alert fatigue from false positives
     → Team starts ignoring them → real attack missed


WHAT MDI CAN'T DETECT:
──────────────────────────────────────────────────────────────────
  ❌ Attacks that never touch a DC (local only)
  ❌ Living-off-the-land attacks using only legitimate tools
  ❌ Insider threats doing slow, legitimate-looking changes
  ❌ Cloud-only attacks (use Microsoft Defender for Cloud Apps)

  → MDI + Sentinel + MDE = comprehensive coverage
```

---

## ✅ Summary

```
┌───────────────────────────────────────────────────────────────┐
│  DEFENDER FOR IDENTITY IN A NUTSHELL:                         │
│                                                               │
│  🛡️  Lightweight sensor on Domain Controllers                 │
│  👁️  Reads AD traffic + Event Logs in real time               │
│  🧠  ML-based behavioral analysis (UEBA)                      │
│  🚨 Detects: Recon, Credential theft, Lateral movement,       │
│             Domain dominance attacks                          │
│  🍯 Honeytoken accounts = nearly zero false positive traps    │
│  🔗 Integrates with Microsoft Defender XDR                    │
│                                                               │
│  ⚠️  Install on ALL DCs — one uncovered DC = blind spot       │
└───────────────────────────────────────────────────────────────┘
```

---

**← Previous:** [02 - AD Audit Configuration](./02-AD-Audit-Configuration.md)
**Next →** [04 - Microsoft Sentinel](./04-Microsoft-Sentinel.md)
