# 🚒 Incident Response Playbooks

> **Simple Definition:** An IR Playbook is a **step-by-step emergency procedure** for when something bad happens — like a fire drill, but for cyber attacks. Instead of panicking, your team follows a pre-written, tested plan.

---

## 🚒 The Fire Drill Analogy

```
WITHOUT IR PLAYBOOKS:                  WITH IR PLAYBOOKS:
─────────────────────────────────────  ─────────────────────────────────
🔥 Fire starts                         🔥 Fire starts
   ↓                                      ↓
😱 Panic                               📋 "Follow Playbook 3: Ransomware"
   ↓                                      ↓
👥 Everyone shouts different orders    👤 Person A: Isolate affected PCs
   ↓                                   👤 Person B: Call legal team
💸 4 hours to respond                  👤 Person C: Notify management
   ↓                                      ↓
📰 Data breach on the news!            ✅ Contained in 45 minutes
                                       📰 No headlines. Crisis averted.
```

---

## 📋 IR Framework: The 6 Phases

```
┌──────────────────────────────────────────────────────────────────────┐
│                 NIST INCIDENT RESPONSE LIFECYCLE                     │
│                                                                      │
│   PHASE 1         PHASE 2        PHASE 3         PHASE 4            │
│  ┌──────────┐    ┌──────────┐   ┌──────────┐    ┌──────────┐        │
│  │PREPARATION│   │DETECTION │   │CONTAINMENT│   │ERADICATION│       │
│  │          │   │& ANALYSIS│   │          │    │          │        │
│  │Build team │   │Something │   │Stop the  │    │Remove the │       │
│  │Write plays│   │happened! │   │bleeding  │    │attacker  │        │
│  │Run drills │   │How bad?  │   │Isolate   │    │Clean up  │        │
│  └──────────┘   └──────────┘   └──────────┘    └──────────┘        │
│                                                                      │
│   PHASE 5         PHASE 6                                            │
│  ┌──────────┐    ┌──────────┐                                        │
│  │RECOVERY  │    │ POST     │                                        │
│  │          │    │INCIDENT  │                                        │
│  │Restore   │    │REVIEW    │                                        │
│  │systems   │    │Lessons   │                                        │
│  │Monitor   │    │learned   │                                        │
│  └──────────┘    └──────────┘                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 Playbook 1: Active Directory Compromise

**Scenario:** Attacker has Domain Admin access, possibly using Golden Ticket or DCSync.

```
┌──────────────────────────────────────────────────────────────────────┐
│  PLAYBOOK: AD DOMAIN COMPROMISE                                      │
│  Severity: CRITICAL | Response Time: IMMEDIATE                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DETECTION SIGNALS:                                                  │
│  → MDI Alert: "DCSync Attack" or "Golden Ticket" detected            │
│  → Sentinel Alert: Replication rights assigned to non-DC             │
│  → Unusual login from Domain Admin account at odd hours              │
│                                                                      │
│  ── PHASE 1: DETECT & TRIAGE (0-15 minutes) ────────────────────    │
│  □ Confirm the alert is NOT a false positive                         │
│    - Check MDI incident timeline                                     │
│    - Verify the source account + IP                                  │
│    - Is this a legitimate admin doing their job? (check with them)   │
│  □ Declare incident severity level                                   │
│  □ Notify: Incident Commander, CISO, Legal                           │
│  □ Open incident bridge call                                         │
│                                                                      │
│  ── PHASE 2: CONTAINMENT (15-60 minutes) ────────────────────────   │
│  □ DO NOT change krbtgt password yet (causes mass outage!)           │
│    (Save that for after full scope assessment)                       │
│  □ Identify the compromised account(s):                              │
│    - Disable the account in AD immediately                           │
│    - Force sign-out from all cloud sessions:                         │
│      Revoke-AzureADUserAllRefreshToken -ObjectId <user-id>           │
│  □ Block attacker's IP at firewall and proxy                         │
│  □ Isolate affected endpoints from network (MDI → Isolate Device)   │
│  □ Preserve evidence BEFORE cleanup:                                 │
│    - Export Event Logs from all DCs                                  │
│    - Take memory snapshot of suspicious processes                    │
│    - Note all IOCs (IPs, accounts, file hashes)                      │
│                                                                      │
│  ── PHASE 3: ERADICATION ────────────────────────────────────────   │
│  □ Reset ALL Tier 0 account passwords:                               │
│    - Domain Admin accounts                                           │
│    - Schema Admin accounts                                           │
│    - Enterprise Admin accounts                                       │
│    - KRBTGT password (TWICE, 10 hours apart!*)                       │
│      Reset-KrbtgtKeys -Domain corp.local                             │
│  □ Review all recent AD changes (Event 5136, 4728, 4720)            │
│    - Remove any backdoor accounts created                            │
│    - Remove DCSync rights from non-DC accounts                       │
│    - Check for new GPOs created (Event 5136 on GPO container)       │
│  □ Review AdminSDHolder for unauthorized ACEs                        │
│  □ Scan all DCs for Skeleton Key malware:                            │
│    - Look for suspicious LSASS patches in memory                     │
│    - Run Defender/CrowdStrike full scan on all DCs                   │
│                                                                      │
│  ── PHASE 4: RECOVERY ───────────────────────────────────────────   │
│  □ Re-enable accounts after password reset and verification          │
│  □ Monitor for re-compromise attempts (Sentinel alerts up)           │
│  □ Enable step-up MFA for all Domain Admin actions                   │
│  □ Brief stakeholders on status                                      │
│                                                                      │
│  ── PHASE 5: LESSONS LEARNED ────────────────────────────────────   │
│  □ How did attacker gain initial access?                             │
│  □ How long were they undetected? (dwell time)                       │
│  □ What detection gaps need fixing?                                  │
│  □ Update playbooks with what you learned                            │
│                                                                      │
│  * Why twice for krbtgt? Kerberos tickets last 10 hours.             │
│    First reset invalidates new tickets. Second reset                 │
│    invalidates ALL old ones. 10-hour gap required.                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 Playbook 2: Password Spray / Brute Force Attack

```
┌──────────────────────────────────────────────────────────────────────┐
│  PLAYBOOK: PASSWORD SPRAY ATTACK                                     │
│  Severity: HIGH | Response Time: 30 minutes                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DETECTION SIGNALS:                                                  │
│  → Sentinel Alert: >20 accounts failed from single IP               │
│  → MDI Alert: "Suspected brute force attack (LDAP)"                 │
│  → Event 4625 spike across many accounts simultaneously              │
│                                                                      │
│  ── IMMEDIATE RESPONSE (0-15 minutes) ──────────────────────────    │
│  □ Block attacking IP(s) at firewall/Entra ID named locations        │
│    - In Entra: Named Locations → Mark as untrusted                  │
│    - Check if IP belongs to known Tor/VPN exit node                 │
│  □ Identify any accounts with SUCCESSFUL login from that IP!        │
│    KQL: SecurityEvent | where EventID==4624                          │
│         | where IpAddress in ("attacker-ip")                         │
│  □ For each successful login from attack IP:                         │
│    - Disable account immediately                                     │
│    - Notify user via alternate channel                               │
│    - Force password reset                                            │
│    - Revoke all active sessions/tokens                               │
│                                                                      │
│  ── SCOPE ASSESSMENT (15-30 minutes) ────────────────────────────   │
│  □ How many accounts were tried?                                     │
│  □ How many locked out? (Event 4740)                                 │
│  □ How many succeeded? (Most important!)                             │
│  □ Are there multiple attack IPs? (Distributed spray)                │
│  □ Is this targeting specific accounts (execs, admins)?              │
│                                                                      │
│  ── RECOVERY ─────────────────────────────────────────────────────  │
│  □ Unlock legitimate user accounts (Event 4740 → unlock 4767)       │
│  □ Force MFA enrollment for all accounts that don't have it          │
│  □ Review if any compromised accounts had MFA → bypass attempted?   │
│  □ Tune Smart Lockout thresholds in Entra ID                         │
│  □ Enable leaked credential protection (HIBP integration in Entra)  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 Playbook 3: Ransomware Outbreak

```
┌──────────────────────────────────────────────────────────────────────┐
│  PLAYBOOK: RANSOMWARE DETECTED                                       │
│  Severity: CRITICAL | Response Time: IMMEDIATE                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DETECTION SIGNALS:                                                  │
│  → MDE alert: Ransomware behavior detected                           │
│  → Users reporting: "Files encrypted" or ransom note                 │
│  → File server: Thousands of files renamed in seconds                │
│  → Event 4663: Massive file access + modification                   │
│                                                                      │
│  ── FIRST 15 MINUTES: STOP THE SPREAD ─────────────────────────    │
│  □ ISOLATE affected machines IMMEDIATELY:                            │
│    - MDE: Device page → Isolate device                               │
│    - Network: Pull network cable / disable switch port               │
│    - Do NOT shut down (preserves memory evidence)                    │
│  □ Identify patient zero (first infected machine)                    │
│  □ Identify how far ransomware has spread:                           │
│    - Check MDE alert scope                                           │
│    - Check file servers for mass encryption activity                 │
│  □ DO NOT pay the ransom — call legal and cyber insurance FIRST      │
│  □ Notify: CISO, CEO, Legal, Cyber Insurance, potentially FBI        │
│                                                                      │
│  ── IDENTITY COMPONENT ──────────────────────────────────────────   │
│  □ Identify what account was used to spread ransomware:              │
│    - Check lateral movement in MDI                                   │
│    - Check 4624 Type 3 events across servers from the account        │
│  □ Reset the compromised service account password                    │
│  □ Check if AD/DCs were touched:                                     │
│    - Was krbtgt hash stolen? (check for DCSync events)               │
│    - Were GPOs modified to spread ransomware? (Event 5136)          │
│  □ Check if backup accounts/systems were targeted                    │
│    (Ransomware often hits backups FIRST)                             │
│                                                                      │
│  ── RECOVERY ─────────────────────────────────────────────────────  │
│  □ Restore from clean backups (verify backups not encrypted!)        │
│  □ Rebuild from scratch if AD is compromised                         │
│  □ Do NOT restore AD from backup if domain compromise occurred       │
│    → Backup may contain attacker's backdoor objects                  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 Playbook 4: Suspicious Account Created / Privilege Escalation

```
┌──────────────────────────────────────────────────────────────────────┐
│  PLAYBOOK: UNAUTHORIZED PRIVILEGE ESCALATION                         │
│  Severity: HIGH | Response Time: 1 hour                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DETECTION SIGNALS:                                                  │
│  → Event 4728: Account added to Domain Admins group                  │
│  → Event 4720: New user account created outside HR process           │
│  → Sentinel: New Global Admin added to Entra ID                      │
│                                                                      │
│  ── IMMEDIATE TRIAGE ─────────────────────────────────────────────  │
│  □ Is this change authorized?                                        │
│    - Check change management system (ServiceNow ticket?)             │
│    - Call the admin who made the change                              │
│    - Verify with HR if it's a new hire account                       │
│  □ If NOT authorized → Security incident!                            │
│                                                                      │
│  ── RESPONSE ─────────────────────────────────────────────────────  │
│  □ Remove unauthorized account from privileged group                 │
│    Remove-ADGroupMember -Identity "Domain Admins" -Members "user"    │
│  □ Disable unauthorized account                                      │
│  □ Find WHO made the change:                                         │
│    - Event 4728: SubjectUserName = who added the member              │
│    - Investigate that account for compromise                         │
│  □ Check for other unauthorized changes in same window:             │
│    - Other group changes (Event 4728)                                │
│    - GPO modifications (Event 5136)                                  │
│    - New scheduled tasks (Event 4698)                                │
│  □ Review: Was AdminSDHolder modified to create persistence?         │
│  □ Audit ALL Tier 0 group memberships                                │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ SOC Toolkit — Key Commands

```
QUICK REFERENCE COMMANDS FOR INCIDENT RESPONSE:

  IDENTIFY ACTIVE SESSIONS:
  ─────────────────────────────────────────────────────────────────
  # Find who's logged into a specific machine
  query user /server:TARGET-PC

  # Find all sessions for a user across domain
  Get-ADUser -Identity alice | Get-LoggedOnUser

  # Active AD sessions via PowerShell
  Get-ADDomainController -Filter * | ForEach {
    qwinsta /server:$_.HostName }


  DISABLE + RESET COMPROMISED ACCOUNT:
  ─────────────────────────────────────────────────────────────────
  # Disable in AD
  Disable-ADAccount -Identity "alice"

  # Force logoff
  Invoke-Command -ComputerName TARGET -ScriptBlock { logoff 1 }

  # Reset password
  Set-ADAccountPassword -Identity "alice" -Reset `
    -NewPassword (ConvertTo-SecureString "NewP@ss!" -AsPlainText -Force)

  # Revoke Entra ID / M365 sessions
  Revoke-MgUserSignInSession -UserId alice@contoso.com


  FIND RECENT AD CHANGES (last 24 hours):
  ─────────────────────────────────────────────────────────────────
  # New users created
  Get-ADUser -Filter {Created -gt (Get-Date).AddHours(-24)} `
    -Properties Created | Select Name, Created

  # Recent group membership changes (from Sentinel KQL)
  SecurityEvent
  | where EventID in (4728, 4732, 4756)
  | where TimeGenerated > ago(24h)
  | project TimeGenerated, Account, GroupName, SubjectUserName


  EXPORT EVENT LOGS FOR FORENSICS:
  ─────────────────────────────────────────────────────────────────
  # Export Security log from DC
  wevtutil epl Security C:\Evidence\Security_%DATE%.evtx

  # Export from remote DC
  wevtutil epl Security \\DC01\C$\Evidence\Security.evtx


  CHECK DOMAIN CONTROLLER REPLICATION:
  ─────────────────────────────────────────────────────────────────
  # Check replication health
  repadmin /showrepl

  # Check for unauthorized replication partners (DCShadow!)
  repadmin /showrepl * /errorsonly
```

---

## 📞 Communication Templates

```
INCIDENT NOTIFICATION EMAIL TEMPLATE:

  TO: CISO, Legal, IT Director
  SUBJECT: [SECURITY INCIDENT - SEVERITY HIGH] - Password Spray Detected

  Summary:
  ─────────────────────────────────────────────────────────────────
  At [TIME] on [DATE], our security monitoring system detected
  a password spray attack originating from [IP/Location].

  Current Status:  [Contained / In Progress / Resolved]
  Affected Users:  [Number] accounts targeted, [Number] compromised
  Business Impact: [Describe impact]

  Actions Taken:
  1. Attacking IP blocked at perimeter firewall
  2. Compromised accounts disabled and reset
  3. Users notified via alternative channel

  Next Steps:
  1. Full forensic review of affected accounts
  2. MFA enforcement for all remaining accounts
  3. Post-incident review scheduled for [DATE]

  Point of Contact: [SOC Lead Name] | [Phone] | [Email]
```

---

## 📅 IR Preparation Checklist

```
BEFORE AN INCIDENT HAPPENS — PREPARE NOW:
──────────────────────────────────────────────────────────────────

  PEOPLE:
  □ IR Team identified with roles & responsibilities
  □ On-call rotation established
  □ Emergency contact list (CISO, Legal, Cyber Insurance, FBI)
  □ Playbooks written and reviewed by team

  TECHNOLOGY:
  □ Sentinel / MDI deployed and tuned
  □ Isolation capability tested (MDE → Isolate Device)
  □ Backup verified and tested (can you restore from it?)
  □ Out-of-band communication channel (incident: do NOT use email!)
  □ Evidence storage ready (legal hold capable)

  PROCESS:
  □ Playbooks written for top 5 scenarios
  □ Tabletop exercise run every 6 months
  □ "Break glass" admin accounts documented and secured
  □ Cyber insurance policy reviewed and current
  □ Legal and law enforcement contact pre-established
```

---

## 👮 Security Engineer's POV

> ⚠️ **The worst time to write a playbook is during an active incident. Write them NOW.**

```
LESSONS FROM REAL INCIDENTS:
──────────────────────────────────────────────────────────────────
  1. Attackers delete logs → Forward to SIEM BEFORE incident
  2. Attackers target backups → Offline/immutable backup required
  3. Communication chaos → Establish bridge line BEFORE incident
  4. Evidence destroyed by accident → Isolate, don't wipe
  5. KRBTGT reset causes outage → Practice it in lab first!
  6. Scope always larger than initial assessment → Assume breach
  7. Recovery took weeks because AD wasn't documented → Document AD!


IR METRICS TO TRACK:
──────────────────────────────────────────────────────────────────
  MTTD: Mean Time to Detect          → Goal: < 1 hour
  MTTR: Mean Time to Respond         → Goal: < 4 hours
  Dwell Time: How long before detect → Goal: < 24 hours
  False Positive Rate                → Goal: < 20%
```

---

## ✅ Summary

```
┌───────────────────────────────────────────────────────────────────┐
│  IR PLAYBOOKS IN A NUTSHELL:                                      │
│                                                                   │
│  📋 Pre-written, tested procedures for each attack scenario       │
│  🔴 Follow NIST lifecycle: Prepare→Detect→Contain→Eradicate       │
│  🚒 4 Key Playbooks: AD Compromise, Spray, Ransomware, PrivEsc    │
│  🛠️  Know your tools: PowerShell, Sentinel KQL, MDE isolation     │
│  📞 Prepare communications BEFORE the incident                    │
│  📅 Run tabletop exercises — practice makes perfect               │
│                                                                   │
│  ⚠️  THE GOLDEN RULE: Preserve evidence → then contain → then fix │
└───────────────────────────────────────────────────────────────────┘
```

---

**← Previous:** [04 - Microsoft Sentinel](./04-Microsoft-Sentinel.md)
**Next →** [Section README & Summary](./Section-09-README.md)
