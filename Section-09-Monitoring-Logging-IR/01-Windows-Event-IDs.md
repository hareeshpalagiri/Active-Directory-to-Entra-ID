# 🪟 Windows Event IDs — The Security Logbook

> **Simple Definition:** Every important action on a Windows system — login, logout, password change, privilege use — gets written into an **Event Log** with a unique number called an **Event ID**. These are your eyes inside Active Directory.

---

## 📖 The Logbook Analogy

```
IMAGINE A BANK VAULT:

  Every time someone:           Windows records:
  ─────────────────────         ─────────────────────────
  Opens the vault          →    Event ID 4624 (Logon)
  Gets denied entry        →    Event ID 4625 (Failed Logon)
  Gets a master key        →    Event ID 4672 (Special Privileges)
  Changes the combo        →    Event ID 4723 (Password Changed)
  Tries to break in        →    Event ID 4740 (Account Locked Out)
  Opens a locked file      →    Event ID 4663 (Object Access)

  THESE LOGS = YOUR SECURITY CAMERA FOOTAGE
  Without them, you're flying blind!
```

---

## 📂 Where Are Event Logs Stored?

```
WINDOWS EVENT LOG LOCATIONS:

  ┌─────────────────────────────────────────────────────────────┐
  │  Event Viewer → Windows Logs                                │
  │                                                             │
  │  📋 Security     ← MOST IMPORTANT for security             │
  │     Path: C:\Windows\System32\winevt\Logs\Security.evtx    │
  │     Contains: Logins, privilege use, object access          │
  │                                                             │
  │  📋 System       ← OS-level events, service starts/stops   │
  │     Path: ...Logs\System.evtx                              │
  │                                                             │
  │  📋 Application  ← App-level events                        │
  │     Path: ...Logs\Application.evtx                         │
  │                                                             │
  │  📋 Directory Service  ← AD-specific events (on DCs)       │
  │     Path: ...Logs\Directory Service.evtx                   │
  │                                                             │
  │  📋 DNS Server   ← DNS queries/responses (on DNS servers)  │
  └─────────────────────────────────────────────────────────────┘

  ⚠️ Default log size is often TOO SMALL! Increase it:
  Max log size recommendation: Security log → 1-4 GB minimum
```

---

## 🔐 Authentication Events (The Most Critical)

```
┌──────────────────────────────────────────────────────────────────┐
│                    LOGON / LOGOFF EVENTS                         │
├──────────┬───────────────────────────┬───────────────────────────┤
│ Event ID │ What Happened             │ Why It Matters            │
├──────────┼───────────────────────────┼───────────────────────────┤
│  4624    │ Successful logon          │ Who logged in, when, how  │
│  4625    │ Failed logon attempt      │ Brute force detection     │
│  4634    │ Logoff                    │ Session duration tracking │
│  4647    │ User-initiated logoff     │ Clean session end         │
│  4648    │ Logon with explicit creds │ RunAs / lateral movement  │
│  4672    │ Special privileges        │ Admin/SYSTEM logon        │
│  4768    │ Kerberos TGT requested    │ Who requested AD ticket   │
│  4769    │ Kerberos service ticket   │ What service accessed     │
│  4771    │ Kerberos pre-auth failed  │ Wrong password (Kerberos) │
│  4776    │ NTLM auth attempted       │ Legacy auth / NTLM relay  │
│  4778    │ Session reconnected (RDP) │ Remote access tracking    │
│  4779    │ Session disconnected      │ RDP session tracking      │
└──────────┴───────────────────────────┴───────────────────────────┘
```

### 🔍 Event 4624 Deep Dive — Logon Types

```
EVENT 4624 CONTAINS A "LOGON TYPE" FIELD:

  Logon Type 2   → Interactive (sat at keyboard)
  Logon Type 3   → Network (mapped drive, file share)
  Logon Type 4   → Batch (scheduled task)
  Logon Type 5   → Service (service account login)
  Logon Type 7   → Unlock (screen unlock)
  Logon Type 8   → NetworkCleartext (cleartext password sent!)
  Logon Type 9   → NewCredentials (RunAs with different user)
  Logon Type 10  → RemoteInteractive (RDP login) ← Watch this!
  Logon Type 11  → CachedInteractive (cached creds, offline)

  🚨 RED FLAGS:
  ─────────────────────────────────────────────────────────────
  Type 3 from unusual IPs        → Lateral movement
  Type 10 (RDP) unexpectedly     → Remote attacker?
  Type 8 (cleartext)             → Old app or misconfiguration
  Type 9 from service accounts   → Credential abuse
```

---

## 👤 Account Management Events

```
┌──────────────────────────────────────────────────────────────────┐
│                  ACCOUNT MANAGEMENT EVENTS                       │
├──────────┬────────────────────────────┬──────────────────────────┤
│ Event ID │ What Happened              │ Why It Matters           │
├──────────┼────────────────────────────┼──────────────────────────┤
│  4720    │ User account created       │ New user (authorized?)   │
│  4722    │ User account enabled       │ Dormant account woken up │
│  4723    │ Password change attempt    │ User changed own pwd     │
│  4724    │ Password reset attempt     │ Admin reset someone's pwd│
│  4725    │ Account disabled           │ Account deactivated      │
│  4726    │ Account deleted            │ User removed from AD     │
│  4728    │ Member added to global grp │ Group membership change  │
│  4732    │ Member added to local grp  │ Local admin added?       │
│  4735    │ Security group modified    │ Group settings changed   │
│  4740    │ Account locked out         │ Too many failed logins   │
│  4756    │ Member added to universal  │ Enterprise-wide group chg│
│  4767    │ Account unlocked           │ Who unlocked it?         │
└──────────┴────────────────────────────┴──────────────────────────┘

  🚨 CRITICAL ALERTS TO SET:
  ─────────────────────────────────────────────────────────────────
  4724 for Domain Admins group members  → Admin pwd reset
  4728 where group = "Domain Admins"    → Privilege escalation!
  4720 outside business hours           → Rogue account creation
  4740 spike on many accounts           → Password spray attack!
```

---

## 🔑 Privilege & Policy Events

```
┌──────────────────────────────────────────────────────────────────┐
│               PRIVILEGE USE & POLICY EVENTS                      │
├──────────┬────────────────────────────┬──────────────────────────┤
│ Event ID │ What Happened              │ Why It Matters           │
├──────────┼────────────────────────────┼──────────────────────────┤
│  4672    │ Special privileges assigned│ Admin-level logon        │
│  4673    │ Sensitive privilege used   │ SeDebugPrivilege etc.    │
│  4674    │ Privilege use attempted    │ Failed privilege attempt  │
│  4688    │ New process created        │ Track cmd.exe, PS.exe    │
│  4697    │ Service installed          │ Malware installs service  │
│  4698    │ Scheduled task created     │ Persistence mechanism    │
│  4700    │ Scheduled task enabled     │ Old task reactivated     │
│  4702    │ Scheduled task updated     │ Task modified            │
│  4719    │ Audit policy changed       │ Attacker hiding tracks!  │
│  4946    │ Firewall rule added        │ Opening ports?           │
└──────────┴────────────────────────────┴──────────────────────────┘

  🚨 HIGHEST PRIORITY:
  ─────────────────────────────────────────────────────────────────
  4719 = Attacker likely trying to turn off logging!
  4698 = Common persistence technique (task runs at startup)
  4697 = Malware installing itself as a service
  4688 where process = "mimikatz.exe" or "procdump.exe"
```

---

## 🗃️ Object Access Events (AD Specific)

```
┌──────────────────────────────────────────────────────────────────┐
│               AD OBJECT & DIRECTORY EVENTS                       │
├──────────┬────────────────────────────┬──────────────────────────┤
│ Event ID │ What Happened              │ Why It Matters           │
├──────────┼────────────────────────────┼──────────────────────────┤
│  4662    │ Object operation in AD     │ Read/write AD objects    │
│  4663    │ Object access attempted    │ File/dir/registry access │
│  4670    │ Permissions changed        │ ACL modified             │
│  4742    │ Computer account changed   │ Device modification      │
│  4743    │ Computer account deleted   │ Device removed           │
│  5136    │ Directory object modified  │ AD attribute changed     │
│  5137    │ Directory object created   │ New AD object created    │
│  5139    │ Directory object moved     │ OU structure changed     │
│  5141    │ Directory object deleted   │ AD object removed        │
└──────────┴────────────────────────────┴──────────────────────────┘

  5136 on AdminSDHolder object → Possible ACL backdoor!
  5136 on Domain object → Possible DCSync privilege added!
```

---

## ⚡ Attack-Specific Event Patterns

```
ATTACK: PASSWORD SPRAY
──────────────────────────────────────────────────────────
  Pattern: Many 4625 events across MANY accounts
           All from the same source IP
           All at the same time
           Only 1-2 failures per account (avoids lockout)

  Query: WHERE EventID=4625
         GROUP BY TargetAccount
         HAVING count > 20 accounts in 5 minutes


ATTACK: KERBEROASTING
──────────────────────────────────────────────────────────
  Pattern: Event 4769 with:
           Ticket Encryption Type = 0x17 (RC4)
           Requesting: service accounts (SPNs)
           Many requests from ONE user account rapidly

  Alert: 4769 + EncryptionType=RC4 + not from service account


ATTACK: DCSync (mimikatz)
──────────────────────────────────────────────────────────
  Pattern: Event 4662 with:
           Properties = {1131f6aa...} (Replicating Directory)
           Performed by: non-DC computer/user account

  Alert: 4662 + Replication rights + source is NOT a DC!


ATTACK: GOLDEN TICKET
──────────────────────────────────────────────────────────
  Pattern: Event 4769 with:
           Ticket options = 0x40810010
           Account name ≠ machine account
           IP doesn't match user's normal location

  This is hard to detect — use MDI (Defender for Identity)!


ATTACK: LATERAL MOVEMENT (Pass-the-Hash)
──────────────────────────────────────────────────────────
  Pattern: Event 4624 Logon Type 3 + NTLM auth (not Kerberos)
           Source IP = internal workstation (not DC)
           Target = multiple servers in short time
           Account = privileged service account
```

---

## 👮 Security Engineer's POV

> ⚠️ **Logs are useless if nobody reads them. Collect centrally, alert on patterns, not just individual events.**

```
COMMON MISTAKES:
──────────────────────────────────────────────────────────────────
  ❌ Default audit policy (almost nothing logged)
  ❌ Tiny log file size (gets overwritten quickly)
  ❌ Logs only on DCs (miss workstation events)
  ❌ No SIEM — logs sit on machines, never analyzed
  ❌ No retention — logs deleted after 7 days


SECURITY ENGINEER SETUP:
──────────────────────────────────────────────────────────────────
  ✅ Enable ALL audit policies via GPO (see next file)
  ✅ Forward logs to SIEM (Sentinel, Splunk, QRadar)
  ✅ Keep 90 days hot, 1 year cold storage
  ✅ Alert on specific Event IDs (4719, 4728, 4662)
  ✅ Baseline normal behavior → alert on anomalies
  ✅ Monitor DCs AND workstations AND servers
  ✅ Log PowerShell: Module logging + Script block logging
```

---

## 📋 PowerShell Event IDs (Often Missed!)

```
POWERSHELL LOGGING EVENTS:
──────────────────────────────────────────────────────────────────
  Event ID 4103  → PowerShell Module Logging (commands run)
  Event ID 4104  → Script Block Logging (full scripts logged!)
  Event ID 400   → PowerShell engine started
  Event ID 600   → PowerShell provider loaded (e.g. WSMan)

  🚨 WHY THIS MATTERS:
  Most modern attacks use PowerShell!
  Mimikatz, BloodHound, PowerView, Empire — all PowerShell
  Without these logs, you're BLIND to PowerShell attacks.

  ENABLE VIA GPO:
  ───────────────────────────────────────────────────────────
  Computer Configuration → Administrative Templates
  → Windows Components → Windows PowerShell
  ☑️  Turn on Module Logging
  ☑️  Turn on PowerShell Script Block Logging
  ☑️  Turn on Script Execution (log all scripts)
```

---

## ✅ Summary

```
┌───────────────────────────────────────────────────────────────┐
│  WINDOWS EVENT IDs IN A NUTSHELL:                             │
│                                                               │
│  🔐 4624/4625 → Who logged in (or failed to)                 │
│  👤 4720/4728 → Account/group changes (privilege escalation) │
│  🔑 4672/4673 → Privilege use (admin activity)               │
│  🗃️  5136     → AD object changes (DCSync setup)            │
│  🚨 4719      → Audit policy changed (attacker hiding!)      │
│  📋 4104      → PowerShell scripts (attack detection)        │
│                                                               │
│  ⚠️  Without proper audit policy, most events won't appear!  │
│  → Next: Configure AD Audit Policy                           │
└───────────────────────────────────────────────────────────────┘
```

---

**Next →** [02 - AD Audit Configuration](./02-AD-Audit-Configuration.md)
