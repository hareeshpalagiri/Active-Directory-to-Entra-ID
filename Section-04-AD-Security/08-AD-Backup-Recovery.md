# 08 — AD Backup & Recovery

> **Section:** 04 — AD Security & Hardening  
> **Difficulty:** Intermediate  
> **Protects against:** Ransomware, accidental deletion, DC failure, forest corruption

---

## 📌 Why AD Backup is a Security Control

Most people think of backup as an IT operations task. In cybersecurity, **AD backup is a critical security control** — especially in the era of ransomware.

```
Ransomware scenario without AD backup:
  Attacker compromises Domain Admin (GP's account)
  Deploys ransomware via GPO to all 200 machines simultaneously
  Encrypts: all file servers, all application servers, all DCs
  Demands: $2 million ransom
  
  Recovery options without backup:
  → Pay the ransom (attacker may not decrypt anyway)
  → Rebuild entire AD from scratch (weeks of work)
  → Company operations: completely down

With tested AD backup:
  Recovery options:
  → Restore DCs from backup (hours, not weeks)
  → Rebuild file servers from backup
  → Operations restored in 24-48 hours
  → Ransom: NOT paid ✅
```

---

## 🔧 AD Backup Strategy

### What Needs to Be Backed Up

```
AD-specific backups:
  1. System State backup (on each DC):
     → NTDS.dit (AD database — all objects, hashes, policies)
     → SYSVOL (Group Policy files, scripts)
     → Registry
     → Boot files
     → Certificate Services database (if AD CS installed)
  
  2. Full server backup (recommended in addition):
     → Complete OS + System State
     → Enables full DC rebuild from scratch if hardware fails
  
  Minimum: System State backup on ALL Domain Controllers
  Recommended: Full server backup on at least 2 DCs (primary + secondary)
```

### Backup Schedule

```
Recommended schedule:
  Daily: System State backup (automated)
  Weekly: Full server backup
  Monthly: Test restore in lab environment

Retention:
  Online (fast restore): 30 days minimum
  Offline/archived: 1 year minimum
  
  Why long retention?
  Ransomware may have been present for weeks before triggering
  If backup is only 3 days old → may contain infected data
  30+ days gives options to restore to a clean state
```

### Configuring Windows Server Backup

```powershell
# Install Windows Server Backup feature
Install-WindowsFeature Windows-Server-Backup -IncludeManagementTools

# Create automated daily System State backup
$BackupPolicy = New-WBPolicy
$BackupTarget = New-WBBackupTarget -NetworkPath "\\BackupServer\AD-Backups" `
    -Credential (Get-Credential)

Add-WBSystemState -Policy $BackupPolicy
Add-WBBackupTarget -Policy $BackupPolicy -Target $BackupTarget
Set-WBSchedule -Policy $BackupPolicy -Schedule 02:00  ← 2am daily

Set-WBPolicy -Policy $BackupPolicy

# Manual System State backup (on-demand)
wbadmin start systemstatebackup -backuptarget:\\BackupServer\AD-Backups -quiet

# Check backup status
wbadmin get status

# List available backup versions
wbadmin get versions -backuptarget:\\BackupServer\AD-Backups
```

---

## 🔄 Recovery Procedures

### Scenario 1 — Restore Using AD Recycle Bin (Fastest)

```
Incident: 50 user accounts accidentally deleted
Recycle Bin: Enabled

Recovery (2-5 minutes):
  # Find deleted objects
  Get-ADObject -Filter {isDeleted -eq $true} `
      -IncludeDeletedObjects `
      -SearchBase "CN=Deleted Objects,DC=company,DC=local" |
      Where-Object {$_.Name -like "*Finance*"} |
      Restore-ADObject

  All attributes preserved ✅
  No DC downtime ✅
  Group memberships restored ✅
```

### Scenario 2 — Non-Authoritative Restore (DC Hardware Failure)

```
Incident: DC01 hardware failed — needs rebuild
Other DCs: DC02, DC-IN01 (still running, have current data)

Non-authoritative restore:
  Restore DC01 from backup → reboot normally
  DC01 comes online with slightly old data
  AD replication: DC02 and DC-IN01 push current data to DC01
  DC01 fully synced within minutes ✅
  
  Steps:
  1. Rebuild Windows Server on new hardware
  2. Boot to Windows Recovery (WinRE)
  3. wbadmin start systemstaterecovery -version:<version>
  4. Boot normally → AD replication syncs DC01 ✅
```

### Scenario 3 — Authoritative Restore (Recovering Deleted Objects Without Recycle Bin)

```
Incident: Finance OU with 100 users deleted
Recycle Bin: NOT enabled
Need: Recover those specific objects

Steps:
  1. Boot DC to DSRM (F8 at boot → Directory Services Restore Mode)
     Password: [DSRM password set during DC promotion]

  2. Restore System State backup:
     wbadmin start systemstaterecovery -version:<backup-version> -quiet

  3. Mark objects as authoritative (before rebooting):
     ntdsutil
     > activate instance ntds
     > authoritative restore
     > restore subtree "OU=Finance,DC=company,DC=local"
     > quit
     > quit
  
  4. Reboot DC normally
  
  5. Authoritative objects replicate to all other DCs
     (They override the deletion that other DCs have)

WARNING: Everything on this DC after the backup time is LOST
         Only use authoritative restore for specific objects
         Plan carefully — this affects replication across all DCs
```

### Scenario 4 — Complete Forest Recovery (Worst Case — Ransomware)

```
Incident: All DCs encrypted by ransomware
No offline backup of DCs

This is the worst case scenario.
Microsoft has a detailed guide: "AD Forest Recovery Guide"

High-level steps:
  1. Identify the last clean backup (before infection)
  2. Restore one DC per domain from backup (offline — network isolated)
  3. Reset KRBTGT password TWICE on each domain
  4. Reset all admin account passwords
  5. Investigate how the breach occurred
  6. Rebuild other DCs from the restored primary DC
  7. Restore member servers from backup
  
Recovery time: 24-72 hours depending on environment size
This highlights why TESTED offline backups are critical
```

---

## 🛡️ Backup Security Hardening

```
Backup storage must be protected too:
  Ransomware often targets backup systems FIRST

Protections:
  ✅ Immutable backup storage (cannot be modified/deleted for N days)
    → Azure Immutable Blob Storage
    → Veeam with immutability
    → Tape backups (air-gapped)

  ✅ Offline/air-gapped backup copy
    → One copy that is completely disconnected from the network
    → Ransomware cannot reach it

  ✅ Separate credentials for backup system
    → Backup server admin account ≠ domain admin account
    → If domain is compromised → backup credentials not known

  ✅ 3-2-1 backup rule:
    3 copies of data
    2 different media types
    1 offsite/offline copy

  ✅ Backup encryption at rest
    → Even if backup files stolen → unreadable without key

  ✅ Regular restore testing (CRITICAL)
    → A backup you have not tested is not a backup
    → Monthly: restore a single object and verify
    → Quarterly: full DC restore test in isolated lab
```

---

## 🔧 Troubleshooting

```powershell
# Check AD replication health (first step after any restore)
repadmin /replsummary
repadmin /showrepl

# Verify SYSVOL is replicating correctly
dfsrdiag SyncStatus /member:DC01.company.local

# Check backup job status
wbadmin get jobs
wbadmin get status

# Test DSRM password (before you need it!)
# Cannot test directly but verify it's set:
# ntdsutil → set dsrm password → q → q
# If you forgot DSRM password:
# Must reset via another DC — complex process
# DOCUMENT YOUR DSRM PASSWORD AND STORE SECURELY

# Verify authoritative restore worked
repadmin /showrepl
# Check that Finance OU objects are showing on all DCs
Get-ADUser -Filter * -SearchBase "OU=Finance,DC=company,DC=local" `
    -Server DC02 | Select-Object Name
# Should show all restored users on DC02 ✅
```

---

## 🎯 Interview Questions

**Q1. What is a System State backup and what does it contain?**  
**A:** A System State backup captures the critical components needed to restore a server's role. On a Domain Controller, it contains: NTDS.dit (the AD database with all objects, password hashes, and policies), SYSVOL (Group Policy files and logon scripts), the registry, boot files, and COM+ class registration. It is the minimum required backup to restore AD functionality on a DC.

**Q2. What is the difference between authoritative and non-authoritative restore?**  
**A:** Non-authoritative restore: DC restored from backup, then receives updates from other DCs via replication — used when other DCs are still running with current data. Authoritative restore: specific objects are marked as authoritative after restore, forcing them to replicate outward and override what other DCs have — used when objects were deleted and the Recycle Bin is not available. Authoritative restore requires booting to DSRM and using ntdsutil.

**Q3. Why is backup storage itself a security concern?**  
**A:** Ransomware operators specifically target backup systems to prevent recovery — if backups are encrypted too, victims have no choice but to pay the ransom. Backup storage must use immutable storage (cannot be modified or deleted for a set period), have separate credentials from domain admin accounts, and have an offline/air-gapped copy that ransomware cannot reach. The 3-2-1 rule: 3 copies, 2 media types, 1 offsite/offline.

---

*"A backup strategy that has never been tested is not a backup strategy — it is a hope strategy. Test your AD restore quarterly. The first time you restore AD should never be during an actual ransomware incident."*
