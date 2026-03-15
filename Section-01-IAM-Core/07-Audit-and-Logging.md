# 07 — Audit & Logging

> **Section:** 01 — IAM Core Concepts  
> **Difficulty:** Beginner → Intermediate  
> **Depends on:** Authentication, Authorization

---

## 📌 What is Audit & Logging?

Authentication verifies identity. Authorization controls access. But how do you know **what actually happened?**

Audit and logging is the practice of **recording every identity-related action** in a system — who logged in, what they accessed, what they changed, when, and from where.

> **Simple definition:**  
> An audit log is a time-stamped, tamper-evident record of events that answers:  
> **Who did what, to what, when, and from where?**

### Real-World Analogy

Think of a **bank's CCTV and transaction log**:

- Every customer entering the bank is recorded on camera
- Every transaction (withdrawal, deposit, transfer) is logged
- If money goes missing — investigators review the logs
- The logs tell them exactly what happened, when, and who did it

Audit logs in IT work exactly the same way.

---

## 🧠 Why Logging Matters in Security

Without logs:
```
Scenario:
  Hareesh reports: "Someone deleted critical files from the server"

  IT team investigation without logs:
  → We don't know who deleted the files
  → We don't know when it happened
  → We don't know if it was deliberate or accidental
  → We can't prove anything
  → We can't prevent it happening again
  Result: Dead end ❌
```

With logs:
```
Same scenario with logging enabled:
  IT team checks Windows Security Event Log:

  Event ID 4663 — Object Access
  Time: 2024-01-15 23:47:32
  Subject: GP\gp-admin (Domain Admin account)
  Object: \\FileServer01\Finance\Q4-Report.xlsx
  Action: DELETE
  Source IP: 192.168.1.55

  Cross-reference Event ID 4624 (logon):
  Same account logged in at 23:45 from 192.168.1.55
  That IP belongs to... an unrecognised device.
  GP's normal workstation is 192.168.1.22.

  Result: GP's admin account was compromised.
          Attacker deleted files to destroy evidence.
          → Account disabled immediately
          → Forensics investigation started ✅
```

---

## ⚙️ What to Log — IAM Event Categories

### 1. Authentication Events

| Event | What to capture |
|-------|----------------|
| Successful login | Who, when, from where, what device |
| Failed login | Who, when, from where, how many attempts |
| Account lockout | Who got locked, from which machine |
| MFA events | MFA approved, denied, method used |
| Password change | Who changed it, when |
| Password reset | Who reset it, who requested it |

### 2. Authorization Events

| Event | What to capture |
|-------|----------------|
| File/folder access | Who accessed, which file, what action (read/write/delete) |
| Privilege use | Admin rights used, which rights, on which system |
| Permission change | Who changed permissions, on which object, old vs new |
| Group membership change | Who added/removed, which group, who made the change |

### 3. Account Management Events

| Event | What to capture |
|-------|----------------|
| Account created | Who created it, when, attributes set |
| Account disabled/enabled | Who changed it, when, why |
| Account deleted | Who deleted it, when |
| Group created/deleted | Details of change and who made it |
| Role assignment | Who was assigned what role |

### 4. Privileged Account Events

| Event | What to capture |
|-------|----------------|
| Admin login | When privileged account is used |
| GPO changes | Who modified Group Policy, what changed |
| AD object changes | Who modified AD users/groups/computers |
| PIM activation | Who activated what role, justification, time |

---

## 🔢 Critical Windows Security Event IDs

These are the most important Event IDs for IAM monitoring. Every SOC analyst must know these.

### Authentication Event IDs

| Event ID | Description | Why it matters |
|----------|-------------|----------------|
| **4624** | Successful logon | Baseline — know your normal logins |
| **4625** | Failed logon | Multiple failures = brute force or spray |
| **4634** | Account logged off | Session ended |
| **4648** | Logon with explicit credentials | Used in Pass-the-Hash attacks |
| **4672** | Special privileges assigned at logon | Admin rights used |
| **4740** | Account locked out | Possible attack in progress |
| **4771** | Kerberos pre-auth failed | Brute force on Kerberos |
| **4776** | NTLM credential validation | NTLM auth attempt |

### Account Management Event IDs

| Event ID | Description | Why it matters |
|----------|-------------|----------------|
| **4720** | User account created | Was this authorised? |
| **4722** | User account enabled | Was this authorised? |
| **4723** | Password change attempt | User changed their own password |
| **4724** | Password reset | Admin reset a user's password |
| **4725** | User account disabled | Offboarding or security response |
| **4726** | User account deleted | Permanent — was this authorised? |
| **4728** | User added to global security group | Privilege escalation risk |
| **4732** | User added to local security group | Privilege escalation risk |
| **4756** | User added to universal security group | Privilege escalation risk |

### AD and Privileged Activity

| Event ID | Description | Why it matters |
|----------|-------------|----------------|
| **4662** | Operation on AD object | DCSync attack uses replication operations |
| **4768** | Kerberos TGT requested | First step of Kerberos auth |
| **4769** | Kerberos Service Ticket requested | Kerberoasting generates many of these |
| **4771** | Kerberos pre-auth failed | Failed password attempt via Kerberos |

### 4625 Sub-Status Codes — Know These

When a login fails (Event ID 4625), the sub-status code tells you exactly WHY.

| Sub-Status | Meaning |
|------------|---------|
| 0xC000006A | Wrong password |
| 0xC0000064 | Username does not exist |
| 0xC000006F | Account restricted (time/workstation) |
| 0xC0000070 | Invalid workstation |
| 0xC0000071 | Password expired |
| 0xC0000072 | Account disabled |
| 0xC000006D | Bad username or auth info |
| 0xC0000234 | Account locked out |

---

## 🏢 Real-World Logging Scenarios

### Scenario 1 — Detecting Password Spray

```
SOC analyst morning review:

Splunk query:
  index=security EventCode=4625
  | stats count by TargetUserName, src_ip
  | where count > 3

Results:
  hareesh@company.com  → 3 failures from 185.220.x.x (Tor exit node)
  gp@company.com       → 3 failures from 185.220.x.x
  finance@company.com  → 3 failures from 185.220.x.x
  hr@company.com       → 3 failures from 185.220.x.x
  ... (47 more accounts)

Pattern: Same source IP, 3 attempts per account, many accounts
         → Classic password spray attack

Action:
  Block source IP at firewall
  Check if any accounts had a SUCCESS after the failures
  Those accounts are compromised → disable + investigate
```

### Scenario 2 — Detecting Privilege Escalation

```
Alert fires at 02:15am:
  Event ID 4728 — User added to Domain Admins
  Member: hareesh@company.com
  Added by: hareesh@company.com  ← Added HIMSELF

Investigation:
  Check how Hareesh got rights to modify Domain Admins
  → Hareesh's account has WriteDACL permission on Domain Admins group
  → He exploited this to add himself
  OR
  → Attacker compromised Hareesh's account
  → Used a BloodHound-discovered ACL abuse path

Action:
  Remove Hareesh from Domain Admins
  Review who has WriteDACL on privileged groups
  If attacker → incident response initiated
```

### Scenario 3 — Detecting Data Exfiltration

```
DLP alert:
  GP's account downloaded 4.7GB from SharePoint in 15 minutes
  → Far above normal baseline

Cross-reference with Azure AD Sign-in Logs:
  GP's account signed in from:
  → 09:05 — London, UK (GP's normal location) ✅
  → 09:47 — Unknown VPS in Netherlands ← ALERT

Impossible travel detected.
GP's account compromised.
Attacker was downloading data before anyone noticed.

Action:
  Revoke all active sessions immediately
  Block the Netherlands IP
  Reset GP's credentials
  Restore downloaded files if sensitive
  Full forensic investigation
```

---

## 📊 Log Sources — Where to Collect From

| Source | What it contains |
|--------|----------------|
| **Windows Security Event Log** | Logon events, account changes, privilege use |
| **Active Directory Audit Log** | AD object modifications, group changes |
| **Azure AD Sign-in Logs** | All authentication to cloud apps |
| **Azure AD Audit Logs** | User/group/role changes in Entra ID |
| **Azure AD Risky Sign-ins** | Identity Protection detections |
| **Microsoft Defender for Identity** | On-prem AD attack detection |
| **Microsoft Defender for Endpoint** | Device-level activity |
| **Office 365 Audit Log** | Email, Teams, SharePoint activity |
| **Azure Activity Log** | Changes to Azure resources |
| **Firewall Logs** | Network connections in/out |
| **VPN Logs** | Remote access events |

---

## 🔧 Configuring AD Audit Logging

By default, Active Directory does not log everything. Audit policies must be configured.

### Enable Advanced Audit Policy via GPO

```
Group Policy Management → Create GPO → Edit

Computer Configuration
  → Windows Settings
    → Security Settings
      → Advanced Audit Policy Configuration
        → Audit Policies

Enable these:
  Account Logon:
    ✅ Audit Credential Validation (Success, Failure)
    ✅ Audit Kerberos Service Ticket Operations (Success, Failure)

  Account Management:
    ✅ Audit User Account Management (Success, Failure)
    ✅ Audit Security Group Management (Success, Failure)

  Logon/Logoff:
    ✅ Audit Logon (Success, Failure)
    ✅ Audit Special Logon (Success)

  DS Access:
    ✅ Audit Directory Service Changes (Success)
    ✅ Audit Directory Service Access (Success)

  Privilege Use:
    ✅ Audit Sensitive Privilege Use (Success, Failure)

  Object Access:
    ✅ Audit File System (Success, Failure) — for file access logging
```

### PowerShell — Check Current Audit Policy
```powershell
# Check current audit policy settings
auditpol /get /category:*

# Check specific category
auditpol /get /category:"Account Logon"

# Check AD object auditing is enabled
Get-ADObject -Filter * -SearchBase "DC=company,DC=local" |
  Get-ACL | Select-Object -ExpandProperty Audit
```

---

## 🛠️ SIEM — Centralising Logs

Collecting logs on individual machines is not enough. Logs must be centralised in a **SIEM (Security Information and Event Management)** system.

```
Without SIEM:
  Logs on Server01 → only visible on Server01
  Logs on Server02 → only visible on Server02
  ...
  Correlating an attack across 50 servers → impossible manually

With SIEM (e.g., Microsoft Sentinel):
  All logs shipped to Sentinel in real time
  Analytics rules correlate events across ALL sources
  
  Example:
    4625 (failed login) on DC01 at 09:00
    4625 (failed login) on Server01 at 09:01
    4625 (failed login) on Server02 at 09:02
    4624 (successful login) on Server03 at 09:04
    4672 (admin rights used) on Server03 at 09:05
    
    Sentinel rule fires: "Brute force followed by successful login and privilege use"
    → Alert sent to SOC immediately ← attack detected in minutes, not hours
```

---

## 👨‍💻 Audit & Logging — Cybersecurity Professional View

### SOC Analyst Daily Tasks
```
Morning routine:
  1. Review overnight alerts in Microsoft Sentinel / Splunk
  2. Check Azure AD Risky Sign-ins dashboard
  3. Review Identity Protection risk detections
  4. Check for any new accounts added to privileged groups overnight
  5. Review impossible travel alerts
  6. Review Defender for Identity alerts (lateral movement, Golden Ticket etc.)
```

### Key KQL Queries for Microsoft Sentinel

```kusto
// Find all failed logins in last 24 hours
SecurityEvent
| where EventID == 4625
| where TimeGenerated > ago(24h)
| summarize FailedAttempts=count() by TargetAccount, IpAddress
| where FailedAttempts > 10
| order by FailedAttempts desc

// Detect additions to Domain Admins
SecurityEvent
| where EventID == 4728
| where TargetUserName == "Domain Admins"
| project TimeGenerated, SubjectUserName, MemberName, Computer

// Detect logins outside business hours
SigninLogs
| where TimeGenerated between (datetime(00:00) .. datetime(06:00))
| where ResultType == 0  // Successful logins only
| project TimeGenerated, UserPrincipalName, IPAddress, Location

// Impossible travel detection
SigninLogs
| where ResultType == 0
| summarize Locations=make_set(Location), LoginCount=count() by UserPrincipalName, bin(TimeGenerated, 1h)
| where array_length(Locations) > 1
```

---

## 🛡️ Logging Best Practices

- [ ] Enable advanced audit policy on all Domain Controllers
- [ ] Enable object access auditing on sensitive file shares
- [ ] Centralise all logs in a SIEM (Microsoft Sentinel, Splunk)
- [ ] Set log retention: minimum 90 days online, 1 year archived
- [ ] Protect logs — write-once storage, integrity monitoring
- [ ] Alert on additions to Domain Admins, Enterprise Admins
- [ ] Alert on accounts created outside business hours
- [ ] Alert on logins from new countries or impossible travel
- [ ] Alert on high volume 4625 events (spray/brute force)
- [ ] Alert on Event ID 4662 with replication permissions (DCSync)
- [ ] Review logs daily — logs are useless if nobody reads them

---

## ❓ Think About This

1. If audit logging is not enabled on a Domain Controller, what types of attacks could go completely undetected?
2. How long should logs be retained, and what factors determine the right retention period for your organisation?
3. If an attacker deletes Windows Event Logs after a breach, how else could you reconstruct what happened?
4. What is the difference between logging an event and alerting on an event? Why do both matter?
5. How would you prioritise which events to alert on if you were setting up a SIEM for the first time?

---

## 🎯 Interview Questions

**Q1. What is the difference between an audit log and a regular application log?**  
**A:** An application log records operational events — errors, warnings, performance data. An audit log specifically records security-relevant actions — who authenticated, who accessed what, who changed what. Audit logs are held to a higher standard: they should be tamper-evident, centrally stored, retained for compliance periods, and monitored for anomalies. They are evidence — in a legal sense.

---

**Q2. What Windows Event ID would you monitor to detect a password spray attack? What pattern would you look for?**  
**A:** Event ID 4625 (failed logon). The pattern for a spray attack is: the same source IP triggering 4625 across many different accounts, each account failing only 2-3 times — staying under the lockout threshold. Contrast with brute force: one account failing hundreds of times. In Sentinel or Splunk you would query for source IPs that generated 4625 against more than a threshold number of distinct accounts within a short time window.

---

**Q3. What is Event ID 4662 and why is it important?**  
**A:** Event ID 4662 records operations on Active Directory objects — specifically when someone accesses or modifies AD objects with specific permissions. It is critical for detecting DCSync attacks — when an attacker with "Replicating Directory Changes" permission uses Mimikatz to pull all password hashes from AD. The DCSync operation generates 4662 events on the Domain Controller from a non-DC source IP — a major red flag.

---

**Q4. What is a SIEM and why is it necessary for IAM monitoring?**  
**A:** A SIEM (Security Information and Event Management) is a centralised platform that collects, normalises, and correlates logs from all sources across the environment. It is necessary because individual logs on individual machines cannot detect multi-stage attacks that span multiple systems. A SIEM correlates events across sources — a failed login on one server, a successful login on another, followed by privilege use — and fires a single alert for the analyst to investigate, dramatically reducing detection time.

---

**Q5. Scenario — You notice Event ID 4728 fired at 3am showing a new account added to Domain Admins. What do you do?**  
**A:** (1) Immediately check who added the account — the SubjectUserName field in the event. (2) Check if that action was authorised — was there a change ticket, was it expected? (3) Disable the newly added account temporarily pending investigation. (4) Check what the newly added account did during its membership using Event ID 4672 and 4624. (5) Check how the account that made the change got Write permissions on Domain Admins — legitimate admin or compromised account? (6) If this was unauthorised — it is an active incident — escalate to incident response immediately. (7) Preserve all logs as evidence.

---

*"Logs are the CCTV of your IT environment. But CCTV only helps if it was recording before the incident, if someone actually watches it, and if it's stored somewhere an attacker cannot delete it."*
