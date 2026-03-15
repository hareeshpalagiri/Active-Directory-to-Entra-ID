# 08 — AD Recycle Bin & Recovery

> **Section:** 02 — Active Directory (On-Premise)  
> **Difficulty:** Beginner → Intermediate  
> **Depends on:** [01-What-is-AD.md](./01-What-is-AD.md)

---

## 📌 Overview

Mistakes happen. A junior admin deletes the wrong OU. A script accidentally removes 200 user accounts. A disgruntled employee deletes critical AD objects before leaving.

Without proper recovery mechanisms, these mistakes can take hours or days to recover from — with potential data loss.

Active Directory provides several mechanisms to protect against and recover from these situations.

---

## 🗑️ The AD Recycle Bin

### What is the AD Recycle Bin?

Before the AD Recycle Bin existed (introduced in Windows Server 2008 R2), deleting an AD object was nearly permanent. Most attributes were stripped away immediately, and recovery required restoring from backup and performing an authoritative restore — taking the DC offline.

> **Simple definition:**  
> The AD Recycle Bin keeps deleted AD objects in a "deleted" state for a configurable period, preserving all their attributes so they can be fully restored without taking any DC offline.

```
Without Recycle Bin:
  GP accidentally deletes Hareesh's account
  
  Recovery options:
  1. Restore from backup (hours of work, DC goes offline)
  2. Recreate the account manually (loses SID, group memberships, etc.)
  3. Use ldp.exe to tombstone restore (complex, partial attributes only)

With Recycle Bin:
  GP accidentally deletes Hareesh's account
  
  Recovery:
  1. Run one PowerShell command
  2. Hareesh's account restored in seconds
  3. ALL attributes preserved — SID, group memberships, password hash ✅
  4. No DC downtime ✅
  5. Hareesh can log in immediately ✅
```

### How the AD Recycle Bin Works

```
Object lifecycle with Recycle Bin enabled:

State 1 — LIVE:
  Hareesh's account exists, visible in AD
  isDeleted: False

State 2 — DELETED (Recycle Bin):
  GP deletes Hareesh's account
  isDeleted: True
  isRecycled: False
  All attributes PRESERVED
  Visible to: Admins only (not in normal AD searches)
  Retention: 180 days (configurable — "deleted object lifetime")

State 3 — RECYCLED (tombstone):
  After 180 days → object moves to recycled state
  Most attributes STRIPPED
  isRecycled: True
  Retention: another 180 days (configurable)

State 4 — PERMANENTLY DELETED:
  After recycled retention period → object is gone forever
  Cannot be recovered without backup
```

---

## ⚙️ Enabling the AD Recycle Bin

> ⚠️ **Critical:** Once enabled, the AD Recycle Bin **cannot be disabled**. This is one-way. Also requires forest functional level Windows Server 2008 R2 or higher.

```powershell
# Check current forest functional level
(Get-ADForest).ForestMode

# Enable AD Recycle Bin (requires Enterprise Admin)
Enable-ADOptionalFeature -Identity "Recycle Bin Feature" `
    -Scope ForestOrConfigurationSet `
    -Target "company.local"

# Verify it is enabled
Get-ADOptionalFeature -Filter {Name -like "Recycle Bin*"} |
    Select-Object Name, FeatureScope, IsDisableable

# Output should show:
# Name           : Recycle Bin Feature
# FeatureScope   : ForestOrConfigurationSet
# IsDisableable  : False  ← cannot be disabled
```

---

## 🔄 Restoring Deleted Objects

### Restore a Single User Account

```powershell
# Find the deleted account
Get-ADObject -Filter {SAMAccountName -eq "hareesh"} `
             -IncludeDeletedObjects |
    Select-Object Name, Deleted, DistinguishedName

# Restore the account to its original OU
Restore-ADObject -Identity "<DistinguishedName of deleted object>"

# Example with piping:
Get-ADObject -Filter {SAMAccountName -eq "hareesh"} `
             -IncludeDeletedObjects |
    Restore-ADObject

# Verify restoration
Get-ADUser -Identity "hareesh" -Properties Enabled, MemberOf
```

### Restore a Deleted OU with All Contents

```powershell
# Scenario: GP accidentally deleted OU=Finance with all users inside

# Step 1: Find all deleted objects in that OU
$deletedObjects = Get-ADObject -Filter {isDeleted -eq $true} `
    -IncludeDeletedObjects `
    -SearchBase "CN=Deleted Objects,DC=company,DC=local" |
    Where-Object {$_.Name -like "*Finance*"}

# Step 2: Restore the OU first (must exist before restoring contents)
$deletedObjects | Where-Object {$_.ObjectClass -eq "organizationalUnit"} |
    Restore-ADObject

# Step 3: Restore all users from that OU
$deletedObjects | Where-Object {$_.ObjectClass -eq "user"} |
    Restore-ADObject

# Step 4: Verify
Get-ADUser -Filter * -SearchBase "OU=Finance,DC=company,DC=local" |
    Select-Object Name, Enabled
```

### Restore a Deleted Security Group

```powershell
# Find deleted group
Get-ADObject -Filter {Name -eq "SG-Finance-ReadWrite" -and isDeleted -eq $true} `
    -IncludeDeletedObjects | Restore-ADObject

# Note: Group memberships are also restored ✅
# The restored group will have all its original members
```

---

## 💾 AD Backup — Windows Server Backup

The AD Recycle Bin handles accidental deletions. But for catastrophic failures (DC crash, ransomware, database corruption), you need a proper backup.

### What to Back Up

```
Critical AD components to back up:
  1. System State backup (on each DC):
     → Includes: NTDS.dit (AD database)
     → Includes: SYSVOL (Group Policy files)
     → Includes: Registry
     → Includes: Boot files
     → Includes: COM+ database

  2. Full server backup (recommended in addition):
     → Complete OS + data + System State
     → Faster recovery if DC needs full rebuild
```

### Creating a System State Backup

```powershell
# Backup System State to a local drive
wbadmin start systemstatebackup -backuptarget:E:

# Backup to a network share
wbadmin start systemstatebackup -backuptarget:\\BackupServer\AD-Backups

# Schedule daily backup via Windows Server Backup GUI:
# Server Manager → Tools → Windows Server Backup → Backup Schedule
# Select: System State
# Schedule: Daily at 2am
# Target: Network share or dedicated backup drive

# Check backup status
wbadmin get status
wbadmin get versions
```

---

## 🔧 AD Recovery Scenarios

### Scenario 1 — Restore Using Recycle Bin (Easiest)

```
Incident: 50 users in Finance OU were accidentally deleted by a script

Recovery (Recycle Bin enabled):
  # Find all deleted Finance users
  Get-ADObject -Filter {isDeleted -eq $true} `
      -IncludeDeletedObjects `
      -SearchBase "CN=Deleted Objects,DC=company,DC=local" |
      Where-Object {$_.DistinguishedName -like "*Finance*"} |
      Restore-ADObject

Time: 2 minutes ✅
DC downtime: None ✅
Attribute preservation: Complete ✅
```

### Scenario 2 — Non-Authoritative Restore (DC Failed)

```
Incident: DC01 hardware failure — needs to be rebuilt from backup

Non-authoritative restore = restore the DC, then let replication
bring it back up to date from other DCs

Steps:
  1. Rebuild/reinstall Windows Server on new hardware
  2. Boot to Windows Recovery Environment
  3. Restore System State from backup:
     wbadmin start systemstaterecovery -version:<backup version>
  4. DC comes back online with slightly old data
  5. AD replication kicks in → DC01 receives all changes from DC02, DC-IN01
  6. DC01 fully up to date within minutes ✅

Use when: A DC needs to be rebuilt but other DCs are still running
```

### Scenario 3 — Authoritative Restore (Object Recovery Without Recycle Bin)

```
Incident: Recycle Bin was NOT enabled.
          Critical OU deleted. Need to restore specific objects.

Authoritative restore = mark restored objects as "authoritative"
so they replicate OUT to other DCs (instead of being overwritten)

Steps:
  1. Boot DC into DSRM (Directory Services Restore Mode):
     Restart → F8 → DSRM → Enter DSRM password

  2. Restore System State from backup:
     wbadmin start systemstaterecovery -version:<version> -authsysvol

  3. Mark the objects as authoritative using ntdsutil:
     ntdsutil
     activate instance ntds
     authoritative restore
     restore subtree "OU=Finance,DC=company,DC=local"
     quit
     quit

  4. Reboot DC normally

  5. Authoritative objects replicate to all other DCs ✅

Warning: Everything on this DC newer than the backup is LOST
         Only the specifically marked objects are restored as authoritative
```

### Scenario 4 — DSRM (Directory Services Restore Mode)

```
DSRM is a special boot mode for DCs that allows:
  → Restoring AD from backup
  → Repairing the AD database
  → Running offline defragmentation

DSRM password is set during DC promotion.
NEVER forget this password — if you do, you cannot do emergency recovery.

Check/reset DSRM password:
  ntdsutil
  set dsrm password
  reset password on server DC01
  <enter new password>
  quit

Enable DSRM login via network (for remote DCs):
  reg add "HKLM\System\CurrentControlSet\Control\LSA" `
      /v DsrmAdminLogonBehavior /t REG_DWORD /d 2
```

---

## 🛡️ AD Recovery Best Practices

### Protection Checklist

- [ ] Enable AD Recycle Bin — do this today if not already done
- [ ] Enable "Protected From Accidental Deletion" on all OUs
- [ ] Take System State backups daily (minimum)
- [ ] Store backups off-site or in immutable storage
- [ ] Test recovery procedure quarterly — a backup you haven't tested is not a backup
- [ ] Document and securely store DSRM passwords for all DCs
- [ ] Maintain minimum 3 months of backup history
- [ ] Use role separation — junior admins should not have delete rights on top-level OUs
- [ ] Enable AD audit logging — know what was deleted and by whom

### Enable Accidental Deletion Protection on All OUs

```powershell
# Enable protection on ALL OUs
Get-ADOrganizationalUnit -Filter * | ForEach-Object {
    Set-ADOrganizationalUnit -Identity $_ `
        -ProtectedFromAccidentalDeletion $true
}

# Verify
Get-ADOrganizationalUnit -Filter * |
    Select-Object Name, ProtectedFromAccidentalDeletion

# When you actually NEED to delete an OU:
# First remove protection, then delete
Set-ADOrganizationalUnit -Identity "OU=OldProject,DC=company,DC=local" `
    -ProtectedFromAccidentalDeletion $false
Remove-ADOrganizationalUnit -Identity "OU=OldProject,DC=company,DC=local" -Recursive
```

---

## 🎯 Interview Questions

**Q1. What is the AD Recycle Bin and why should it be enabled?**  
**A:** The AD Recycle Bin is a feature that retains deleted AD objects in a recoverable state for a configurable period (default 180 days), preserving all attributes including SID, group memberships, and password hash. It should be enabled because it makes recovery from accidental deletions instant and complete — a single PowerShell command restores an object with all its attributes intact, with no DC downtime required. Without it, recovering a deleted user requires restoring from backup, which is time-consuming and may result in data loss.

---

**Q2. What is the difference between a non-authoritative and authoritative restore?**  
**A:** A non-authoritative restore rebuilds a DC from backup and then lets AD replication bring it up to date — the restored DC accepts changes from other DCs. Used when a DC fails but other DCs are still running and have current data. An authoritative restore marks specific restored objects as more current than what other DCs have, forcing them to replicate out to all DCs. Used when objects were deleted and the Recycle Bin is not available — you restore from backup and mark the deleted objects as authoritative so they are not overwritten by the deletion that other DCs still show.

---

**Q3. What is DSRM and when is it used?**  
**A:** DSRM (Directory Services Restore Mode) is a special safe boot mode for Domain Controllers, similar to Safe Mode for regular Windows. It boots the DC with AD services stopped, allowing direct access to the AD database. Used for: restoring AD from backup, repairing a corrupted AD database, running offline defragmentation of NTDS.dit, and performing authoritative restores. The DSRM password is set during DC promotion and should be documented and stored securely — if it is lost and the DC has a critical failure, emergency recovery becomes impossible.

---

**Q4. What is "Protected from Accidental Deletion" and how does it work?**  
**A:** It is a flag on AD objects (typically OUs) that prevents deletion unless the flag is explicitly removed first. When enabled, attempting to delete the object produces an error. To delete, you must first go to the object's properties, uncheck the protection flag, then delete. This prevents accidental deletion via scripts or UI misclicks. It should be enabled on all OUs. Enable with: Set-ADOrganizationalUnit -ProtectedFromAccidentalDeletion $true.

---

**Q5. Scenario — An admin ran a script that accidentally deleted all 300 users in the Sales OU at 3pm. The AD Recycle Bin is enabled. Walk through your recovery.**  
**A:** (1) Stay calm — with Recycle Bin enabled, all objects and their attributes are preserved for 180 days. (2) Verify the deletion: Get-ADObject -Filter {isDeleted -eq $true} -IncludeDeletedObjects | Where-Object {$_.DistinguishedName -like "*Sales*"} — confirm all 300 accounts are there. (3) Restore the OU first if it was also deleted. (4) Restore all deleted users: Get-ADObject with the same filter | Restore-ADObject. (5) Verify: Get-ADUser -Filter * -SearchBase "OU=Sales,DC=company,DC=local" — should show all 300 users, enabled, with original group memberships. (6) Notify affected users — they may need to re-authenticate to applications. (7) Total recovery time: under 5 minutes. (8) Post-incident: review the script that caused the deletion, implement change management controls for bulk operations.

---

*"The AD Recycle Bin is one of the simplest, most impactful things you can enable in your environment. It costs nothing and has saved countless organisations from hours of painful recovery work. If it is not enabled in your environment — enable it today."*
