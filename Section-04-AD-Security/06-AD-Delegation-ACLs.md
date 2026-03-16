# 06 — AD Delegation & ACL Hardening

> **Section:** 04 — AD Security & Hardening  
> **Difficulty:** Advanced  
> **Stops:** BloodHound attack path abuse, ACL-based privilege escalation

---

## 📌 What is AD Delegation?

Active Directory allows administrators to **delegate** specific tasks to specific users — without giving them full admin rights.

For example:
- Helpdesk can reset passwords in the HR OU — but nothing else
- A junior admin can create computer accounts — but not modify users

This is powerful but dangerous when misconfigured. Many AD compromises happen because of **excessive or forgotten delegation** that creates attack paths attackers can abuse.

---

## 🔐 Types of AD Permissions (ACEs)

Every AD object has an **Access Control List (ACL)** — a list of who can do what to that object.

| Permission | What it allows |
|-----------|---------------|
| **GenericAll** | Full control — read, write, delete, modify permissions |
| **GenericWrite** | Write any attribute on the object |
| **WriteDACL** | Modify the object's ACL — can grant yourself any right |
| **WriteOwner** | Change the owner — owner has implicit full control |
| **ForceChangePassword** | Reset the user's password without knowing current |
| **AddMember** | Add members to a group |
| **AllExtendedRights** | All extended rights — includes ForceChangePassword, etc. |
| **ReadLAPSPassword** | Read the LAPS password attribute (ms-Mcs-AdmPwd) |
| **Self** | Modify own attributes |

---

## ⚠️ Dangerous ACL Attack Chains (BloodHound Paths)

### Attack Chain 1 — GenericAll on a User

```
Situation:
  BloodHound shows: Hareesh → GenericAll → GP's admin account (gp-t0)
  (Hareesh has full control over GP's admin account)

Attack:
  # Option 1: Reset GP's password
  Set-ADAccountPassword -Identity "gp-t0" `
      -NewPassword (ConvertTo-SecureString "Attacker@Pass1" -AsPlainText -Force) `
      -Reset
  
  # Option 2: Add Hareesh to Domain Admins via GP's account
  # (Since Hareesh controls GP's account, he can use it to do anything)

  Result: Hareesh → Domain Admin without any exploit ❌

Defense:
  Remove the GenericAll ACE from Hareesh's account on gp-t0
  Check: where did this come from? Was it intentional delegation?
```

### Attack Chain 2 — WriteDACL on Domain Admins Group

```
Situation:
  Hareesh has WriteDACL on the Domain Admins group
  (Can modify the group's ACL)

Attack:
  # Grant himself AddMember rights on Domain Admins
  $DomainAdminsACL = Get-ACL "AD:\CN=Domain Admins,CN=Users,DC=company,DC=local"
  $AddMemberACE = New-Object System.DirectoryServices.ActiveDirectoryAccessRule(
      [System.Security.Principal.SecurityIdentifier]"S-1-5-21-...-Hareesh-SID",
      [System.DirectoryServices.ActiveDirectoryRights]"WriteProperty",
      [System.Security.AccessControl.AccessControlType]"Allow",
      [System.Guid]"bf9679c0-0de6-11d0-a285-00aa003049e2"  ← member attribute GUID
  )
  $DomainAdminsACL.AddAccessRule($AddMemberACE)
  Set-ACL "AD:\CN=Domain Admins,CN=Users,DC=company,DC=local" $DomainAdminsACL
  
  # Now add himself
  Add-ADGroupMember -Identity "Domain Admins" -Members "hareesh"
  
  Result: Hareesh → Domain Admin ❌
```

### Attack Chain 3 — WriteOwner

```
Situation:
  Hareesh has WriteOwner on the IT-Admins group

Attack:
  # Change ownership of IT-Admins to Hareesh
  $object = Get-ADGroup "IT-Admins"
  $acl = Get-ACL "AD:\$($object.DistinguishedName)"
  $acl.SetOwner([System.Security.Principal.NTAccount]"COMPANY\hareesh")
  Set-ACL "AD:\$($object.DistinguishedName)" $acl
  
  # As owner, grant himself GenericAll
  # Then add himself to IT-Admins → escalate to admin
```

---

## 🔧 How to Audit Dangerous ACLs

### Using BloodHound (Most Comprehensive)

```
Step 1: Collect AD data with SharpHound
  SharpHound.exe --CollectionMethod All --OutputDirectory C:\BloodHound

Step 2: Import JSON files into BloodHound

Step 3: Run dangerous queries:
  "Find Principals with DCSync Rights"
  "Find All Paths from Domain Users to Domain Admins"
  "Find Shortest Paths to Domain Admins"
  "Shortest Paths to High Value Targets"

Step 4: Review each path:
  Each node in the path = one ACL misconfiguration to fix
  Fix the weakest link in the chain to break the path
```

### Using PowerShell — Find Dangerous ACEs

```powershell
# Find all non-default ACEs on Domain Admins group
$DA = Get-ADGroup "Domain Admins"
$ACL = Get-ACL "AD:\$($DA.DistinguishedName)"

$ACL.Access |
    Where-Object {
        $_.IdentityReference -notlike "*Domain Admins*" -and
        $_.IdentityReference -notlike "*Enterprise Admins*" -and
        $_.IdentityReference -notlike "*SYSTEM*" -and
        $_.IdentityReference -notlike "*Administrators*"
    } |
    Select-Object IdentityReference, ActiveDirectoryRights, AccessControlType

# Find accounts with DCSync rights (Replicating Directory Changes)
$DomainDN = (Get-ADDomain).DistinguishedName
$ACL = Get-ACL "AD:\$DomainDN"
$ACL.Access |
    Where-Object {
        $_.ObjectType -eq "1131f6aa-9c07-11d1-f79f-00c04fc2dcd2" -or  ← Replicating Directory Changes
        $_.ObjectType -eq "1131f6ab-9c07-11d1-f79f-00c04fc2dcd2"       ← Replicating Directory Changes All
    } |
    Select-Object IdentityReference, ActiveDirectoryRights

# Find all users with GenericAll on other users
Get-ADUser -Filter * | ForEach-Object {
    $user = $_
    $acl = Get-ACL "AD:\$($user.DistinguishedName)"
    $acl.Access |
        Where-Object {
            $_.ActiveDirectoryRights -like "*GenericAll*" -and
            $_.IdentityReference -notlike "*Domain Admins*" -and
            $_.IdentityReference -notlike "*SYSTEM*"
        } |
        Select-Object @{N="TargetUser";E={$user.Name}}, IdentityReference, ActiveDirectoryRights
}
```

---

## 🔧 Configuring Correct Delegation

### Delegate Password Reset to Helpdesk (Correct Way)

```
Scenario: Helpdesk team needs to reset user passwords
          but should have NO other permissions

Step 1: Open Active Directory Users and Computers (ADUC)
Step 2: Right-click OU where helpdesk should manage users: OU=Staff-Users
Step 3: "Delegate Control" → Next
Step 4: Add: SG-Helpdesk group
Step 5: Select: "Create a custom task to delegate"
Step 6: Apply to: "Only the following objects in the folder" → User objects
Step 7: Permissions: "Reset password" ✅ only
                     "Read and write pwdLastSet" ✅
Step 8: Finish

Result:
  SG-Helpdesk can ONLY reset passwords for users in OU=Staff-Users ✅
  Cannot create/delete accounts ✅
  Cannot modify group memberships ✅
  Cannot access other OUs ✅
```

### Remove Dangerous Delegation (PowerShell)

```powershell
# Remove a specific ACE from an AD object
# Example: Remove Hareesh's GenericAll on GP's account

$GpAccount = Get-ADUser -Identity "gp-t0"
$ACL = Get-ACL "AD:\$($GpAccount.DistinguishedName)"

# Find and remove the specific ACE
$ACEtoRemove = $ACL.Access |
    Where-Object {
        $_.IdentityReference -like "*hareesh*" -and
        $_.ActiveDirectoryRights -like "*GenericAll*"
    }

foreach ($ACE in $ACEtoRemove) {
    $ACL.RemoveAccessRule($ACE)
}

Set-ACL "AD:\$($GpAccount.DistinguishedName)" $ACL
Write-Host "Dangerous ACE removed from $($GpAccount.Name)"

# Verify removal
$ACL = Get-ACL "AD:\$($GpAccount.DistinguishedName)"
$ACL.Access | Where-Object {$_.IdentityReference -like "*hareesh*"}
# Should return nothing ✅
```

---

## 🛡️ ACL Hardening Checklist

- [ ] Run BloodHound quarterly — find and fix all attack paths to Domain Admins
- [ ] Audit ACLs on all Tier 0 objects (Domain Admins, Enterprise Admins, DCs)
- [ ] Find and remove dangerous ACEs: GenericAll, WriteDACL, WriteOwner on privileged objects
- [ ] Audit who has DCSync rights (Replicating Directory Changes)
- [ ] Audit AdminSDHolder ACLs — any unexpected entries
- [ ] Enable SDProp monitoring — alert on AdminSDHolder changes (Event ID 5136)
- [ ] Use Delegation Control Wizard — never manually grant broad rights
- [ ] Review all custom delegation quarterly
- [ ] Enable AD Audit Policy — object access auditing
- [ ] Monitor Event ID 5136 — AD object modified

---

## 🎯 Interview Questions

**Q1. What is an AD ACL and why is ACL hardening important?**  
**A:** Every Active Directory object has an Access Control List (ACL) — a list of permissions defining who can do what to that object. ACL hardening is critical because misconfigured permissions create attack paths that attackers can chain together to escalate privileges without exploiting any vulnerability. A regular user with WriteDACL on Domain Admins can grant themselves membership silently. BloodHound maps these paths and is used by both attackers and defenders.

---

**Q2. What is a DCSync attack and which ACL permission enables it?**  
**A:** DCSync is a Mimikatz technique that impersonates a Domain Controller and requests AD replication, pulling all password hashes. The permission that enables it is "Replicating Directory Changes" (and "Replicating Directory Changes All") on the domain root object — normally only Domain Controllers have this. If an attacker compromises an account with these rights (or can grant them via WriteDACL), they can run DCSync without touching the DC at all. Detection: Event ID 4662 on the DC from a non-DC source.

---

**Q3. Scenario — BloodHound shows a path: Domain Users → GenericWrite → svc_webapp → AddMember → IT-Admins → WriteDACL → Domain Admins. Explain the attack and how you fix it.**  
**A:** This is a three-hop attack path. Any domain user can use GenericWrite on svc_webapp to set an SPN → Kerberoast it → crack the password. With svc_webapp's credentials, they use AddMember to join IT-Admins. IT-Admins has WriteDACL on Domain Admins, so they modify the DA ACL to grant themselves membership. Fix each link: (1) Remove GenericWrite from Domain Users on svc_webapp. (2) Set a strong password on svc_webapp (25+ chars) or convert to gMSA. (3) Remove IT-Admins' WriteDACL on Domain Admins — this right should belong only to Domain Admins/Enterprise Admins.

---

*"ACL misconfigurations are the silent killers of AD security. No exploit, no patch, no malware needed — just a misconfigured permission that has existed for years. Run BloodHound. Fix the paths. Repeat."*
