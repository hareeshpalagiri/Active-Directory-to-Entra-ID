# 02 — LAPS (Local Administrator Password Solution)

> **Section:** 04 — AD Security & Hardening  
> **Difficulty:** Intermediate  
> **Stops:** Pass-the-Hash lateral movement via local admin accounts

---

## 📌 What is LAPS?

Every Windows machine has a built-in local administrator account. In most organisations, all machines are built from the same image — so they all have the **same local admin password**.

This creates a massive security problem.

```
Without LAPS:
  All 300 workstations built from the same image
  Local admin password: "Company@2021!" (set during imaging, never changed)
  
  Attacker compromises Hareesh's workstation
  Extracts local admin NTLM hash with Mimikatz
  
  Uses that hash to authenticate to EVERY other workstation:
  crackmapexec smb 192.168.1.0/24 -u Administrator -H [hash] --local-auth
  
  Result: All 300 workstations compromised from one hash ❌
  This is called "Pass-the-Hash lateral movement"
```

**LAPS solves this by giving every machine a unique, randomly generated local admin password** — stored securely in Active Directory and rotated automatically.

> **Simple definition:**  
> LAPS automatically manages the local Administrator account password on every domain-joined machine — generating a unique random password per machine, storing it in AD, and rotating it on a schedule.

---

## ⚙️ How LAPS Works

```
LAPS Architecture:

  Domain Controller (AD)
    └── Stores local admin password for each machine
        as an attribute on the computer object:
        ms-Mcs-AdmPwd: "xK9#mP2@qR7t!nW4" ← encrypted, access-controlled

  Each machine (GPO client extension):
    └── Checks: Is my local admin password older than N days?
        → Yes → Generate new random password
               → Update ms-Mcs-AdmPwd in AD
               → Set new password on local admin account
        → No  → Do nothing

  Authorised IT staff (reading the password):
    → Query AD for the computer's ms-Mcs-AdmPwd attribute
    → Get the current password for that machine only
    → Use it → password rotated after expiry

Result:
  LAPTOP-HR-001 local admin password: "xK9#mP2@qR7t!nW4"
  LAPTOP-HR-002 local admin password: "bZ5&kL8@vQ3m!jS7"
  SERVER-APP01  local admin password: "nW4#tR9@pK6l!fX2"
  
  All different. All unknown to humans. All auto-rotated. ✅
```

---

## 🔧 Configuring LAPS — Step by Step

### Prerequisites

```
Requirements:
  → Windows Server 2003 SP1 or later (for the schema extension)
  → Windows Vista or later on managed machines
  → AD schema extension (one-time step)
  → LAPS MSI or Windows LAPS (built into Windows 11/Server 2022)

Two versions:
  Legacy LAPS: Separate download (LAPS.x64.msi)
  Windows LAPS: Built into Windows 11 22H2+ and Server 2022
                Stores password in AD or Entra ID
                More features — use this for new deployments
```

### Step 1 — Install LAPS Management Tools on Admin Machine

```powershell
# Legacy LAPS — download and install LAPS.x64.msi
# During install, select: Management Tools → LAPS UI, LAPS PowerShell Module

# Windows LAPS — built in, just install management module
# Already available on Windows 11 and Server 2022

# Verify LAPS PowerShell module is available
Get-Module -ListAvailable LAPS
Import-Module LAPS
```

### Step 2 — Extend AD Schema (One-Time, Requires Schema Admin)

```powershell
# Legacy LAPS — extend schema
Import-Module AdmPwd.PS
Update-AdmPwdADSchema

# This adds two attributes to computer objects:
# ms-Mcs-AdmPwd           → stores the current password
# ms-Mcs-AdmPwdExpirationTime → stores when password expires

# Windows LAPS — extend schema (Server 2022/Windows 11 built-in)
Update-LapsADSchema
# Adds: msLAPS-Password, msLAPS-PasswordExpirationTime
```

### Step 3 — Grant Computers Permission to Write Their Own Password

```powershell
# Legacy LAPS
Set-AdmPwdComputerSelfPermission -OrgUnit "OU=Workstations,DC=company,DC=local"
Set-AdmPwdComputerSelfPermission -OrgUnit "OU=Servers,DC=company,DC=local"

# Windows LAPS
Set-LapsADComputerSelfPermission -Identity "OU=Workstations,DC=company,DC=local"

# This allows each machine to update its own LAPS attribute in AD
# (Machines cannot read other machines' passwords — only write their own)
```

### Step 4 — Grant IT Staff Permission to Read Passwords

```powershell
# Legacy LAPS — grant read permission to IT group only
Set-AdmPwdReadPasswordPermission `
    -OrgUnit "OU=Workstations,DC=company,DC=local" `
    -AllowedPrincipals "COMPANY\SG-IT-Helpdesk"

# Check who has read access
Find-AdmPwdExtendedRights -OrgUnit "OU=Workstations,DC=company,DC=local"

# Windows LAPS
Set-LapsADReadPasswordPermission `
    -Identity "OU=Workstations,DC=company,DC=local" `
    -AllowedPrincipals "COMPANY\SG-IT-Helpdesk"

# IMPORTANT: Remove direct read access from Domain Users
# By default, ms-Mcs-AdmPwd may be readable by everyone — fix this:
Set-AdmPwdComputerSelfPermission -OrgUnit "OU=Workstations,DC=company,DC=local"
# Then verify no other groups have read rights to ms-Mcs-AdmPwd
```

### Step 5 — Deploy LAPS Client via GPO

```
GPO: "LAPS-Configuration"
Linked to: OU=Workstations, OU=Servers

Computer Config → Admin Templates → LAPS (after LAPS admx installed)

Settings:
  Enable local admin password management: Enabled ✅
  
  Password Settings:
    Complexity: Large letters + small letters + numbers + specials ✅
    Length: 20 characters
    
  Password age (days): 30
  
  Name of admin account to manage:
    → Leave blank = manages "Administrator" (default local admin)
    → Or specify a custom name if you renamed it

Install LAPS client on machines:
  Via SCCM/Intune: deploy LAPS.x64.msi silently
  Via GPO startup script:
    msiexec /i \\server\share\LAPS.x64.msi /quiet /norestart
  
  Windows LAPS: Already installed on Windows 11 22H2+
                Just enable via GPO — no MSI needed
```

### Step 6 — Reading a LAPS Password (Helpdesk Scenario)

```powershell
# Legacy LAPS — read password for a specific machine
Get-AdmPwdPassword -ComputerName "LAPTOP-HR-001"

# Output:
# ComputerName    : LAPTOP-HR-001
# DistinguishedName : CN=LAPTOP-HR-001,...
# Password        : xK9#mP2@qR7t!nW4  ← current local admin password
# ExpirationTimestamp : 15/04/2024 09:00:00

# Windows LAPS
Get-LapsADPassword -Identity "LAPTOP-HR-001" -AsPlainText

# Using LAPS UI (graphical tool):
# Start → LAPS UI → enter computer name → Show Password ✅

# Force immediate password rotation (e.g., after a breach)
Reset-AdmPwdPassword -ComputerName "LAPTOP-HR-001"
# Next time machine checks in → generates and sets a new password

# View password expiry for all machines
Get-ADComputer -Filter * -Properties ms-Mcs-AdmPwd, ms-Mcs-AdmPwdExpirationTime |
    Select-Object Name, "ms-Mcs-AdmPwdExpirationTime" |
    Sort-Object ms-Mcs-AdmPwdExpirationTime
```

---

## 🏢 Real-World Helpdesk Scenario

```
Scenario: Hareesh calls helpdesk — locked out of his workstation
          Needs local admin access to fix a driver issue

Without LAPS:
  Helpdesk tech types shared local admin password
  Password known by entire helpdesk team
  Written on a sticky note in the server room
  Never changed in 3 years ← security nightmare

With LAPS:
  Helpdesk opens LAPS UI
  Types: LAPTOP-HR-001
  Clicks: Show Password
  
  Gets: "xK9#mP2@qR7t!nW4"
  
  Logs into Hareesh's machine with this password
  Fixes the driver issue
  
  Password automatically rotates in 30 days ✅
  Even if the tech remembers the password → useless next month ✅
  Audit log shows: who read the LAPS password, when ✅

LAPS audit — who read passwords:
  Event ID 4662 on DC → object access to ms-Mcs-AdmPwd
  Monitor: who is reading LAPS passwords and for which machines
```

---

## ⚠️ LAPS Attack Techniques

### Attack 1 — Reading LAPS Passwords (Unauthorised Access)

```
What: If ACLs are misconfigured, regular users can read LAPS passwords

Check (attacker perspective — any domain user):
  Get-ADComputer -Filter * -Properties ms-Mcs-AdmPwd |
      Select-Object Name, ms-Mcs-AdmPwd
  
  If ms-Mcs-AdmPwd is visible → ACL misconfigured
  Attacker gets local admin password for every machine ← dangerous

Defense:
  Verify only authorised groups can read ms-Mcs-AdmPwd:
  Find-AdmPwdExtendedRights -OrgUnit "OU=Workstations,DC=company,DC=local"
  
  Remove any unexpected groups from read access
  Regular users should see: ms-Mcs-AdmPwd = (null)
```

### Attack 2 — LAPS Password in SYSVOL (Misconfiguration)

```
What: Some organisations incorrectly store LAPS passwords in GPO
      preferences (which are stored in SYSVOL — readable by all users)

Defense:
  LAPS passwords MUST be stored in AD attributes
  NEVER in GPO preferences or any SYSVOL location
  
  Check SYSVOL for passwords:
  findstr /s /i "cpassword" \\company.local\sysvol\*.xml
```

### Attack 3 — Disabling LAPS via GPO

```
What: Attacker with GPO write rights disables LAPS GPO
      Machines stop rotating passwords → old shared password persists

Defense:
  Restrict GPO modification rights
  Monitor Event ID 5136 — GPO modified
  Alert on LAPS GPO changes specifically
```

---

## 🛡️ LAPS Hardening Checklist

- [ ] Deploy LAPS to ALL domain-joined machines (workstations AND servers)
- [ ] Set password length to minimum 20 characters
- [ ] Set password complexity to all character types
- [ ] Set rotation period: 30 days for workstations, 15 days for servers
- [ ] Verify only authorised groups can read ms-Mcs-AdmPwd
- [ ] Remove Domain Users from ms-Mcs-AdmPwd read access
- [ ] Enable audit logging on ms-Mcs-AdmPwd access (Event ID 4662)
- [ ] Monitor who is reading LAPS passwords — alert on bulk reads
- [ ] Force password rotation after any security incident
- [ ] Test LAPS deployment: verify each machine has a unique password

---

## 🔧 Troubleshooting

```powershell
# Check if LAPS is deployed on a machine
Get-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft Services\AdmPwd" `
    -ErrorAction SilentlyContinue

# Check if machine has updated its password
Get-ADComputer -Identity "LAPTOP-HR-001" -Properties ms-Mcs-AdmPwdExpirationTime |
    Select-Object Name, ms-Mcs-AdmPwdExpirationTime

# If ms-Mcs-AdmPwdExpirationTime is blank → LAPS not working on that machine
# Causes: LAPS client not installed, GPO not applied, no write permission

# Check LAPS GPO is applied
gpresult /r /scope computer | Select-String "LAPS"

# Force LAPS password update immediately
gpupdate /force
# Then wait 30 mins for LAPS client to run, OR:
Invoke-Command -ComputerName "LAPTOP-HR-001" -ScriptBlock {
    Import-Module AdmPwd.PS
    Reset-AdmPwdPassword -ComputerName $env:COMPUTERNAME
}

# Verify all machines in an OU have LAPS deployed
Get-ADComputer -Filter * `
    -SearchBase "OU=Workstations,DC=company,DC=local" `
    -Properties ms-Mcs-AdmPwd |
    Where-Object {$_."ms-Mcs-AdmPwd" -eq $null} |
    Select-Object Name
# Result = machines WITHOUT LAPS password (need investigation)
```

---

## 🎯 Interview Questions

**Q1. What problem does LAPS solve?**  
**A:** LAPS solves the shared local administrator password problem. When all machines are built from the same image, they have the same local admin password. If an attacker extracts this hash from one machine (using Mimikatz), they can use it to authenticate to every other machine — Pass-the-Hash lateral movement. LAPS gives each machine a unique, randomly generated password stored in AD, rotated automatically. Even if one machine's local admin hash is stolen, it is useless on every other machine.

---

**Q2. Where does LAPS store the passwords and who can read them?**  
**A:** LAPS stores passwords as an attribute on the computer object in Active Directory — ms-Mcs-AdmPwd (legacy LAPS) or msLAPS-Password (Windows LAPS). By default, only members of groups explicitly granted read access can retrieve the password. Domain Users should never have read access. Admins read passwords using Get-AdmPwdPassword (PowerShell), the LAPS UI tool, or through Intune/SCCM. Every password read is auditable through Event ID 4662 on the DC.

---

**Q3. What happens if LAPS is misconfigured and regular users can read ms-Mcs-AdmPwd?**  
**A:** This is a critical misconfiguration. Any domain user could query AD and retrieve the local admin password for every machine in the organisation. An attacker with a compromised low-privilege account could run: Get-ADComputer -Filter * -Properties ms-Mcs-AdmPwd — and get local admin access to every domain-joined machine instantly. Check with Find-AdmPwdExtendedRights to see who has read access, and remove any unauthorised groups.

---

**Q4. Scenario — A server was compromised and the local admin account was used. The server has LAPS. What do you do after containment?**  
**A:** (1) After isolating the server — immediately rotate the LAPS password: Reset-AdmPwdPassword -ComputerName "SERVER-APP01". This invalidates the stolen password immediately. (2) Check audit logs to see if the LAPS password was read from AD before the compromise (Event ID 4662) — if so, the attacker may have read it themselves. (3) Check which other machines this local admin password was used on (cross-reference NTLM authentication logs). (4) Since LAPS gives unique passwords per machine, the damage should be contained to this one server. (5) Investigate how the server was initially compromised.

---

*"LAPS is one of the highest-value, lowest-effort security controls you can deploy. It takes an afternoon to set up and eliminates an entire class of lateral movement attacks. If your environment does not have LAPS — deploy it today."*
