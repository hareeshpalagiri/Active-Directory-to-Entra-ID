# ⚙️ Lab 02 — Group Policy (GPO) Hands-On Lab

> **Goal:** Create, link, test, and troubleshoot real Group Policy Objects in your lab. By the end, you'll have configured password policies, software restrictions, security baselines, and audit policies — the bread and butter of every AD admin's job.

---

## 🎯 What You'll Practice

```
GPO LAB OUTCOMES:
──────────────────────────────────────────────────────────────────
  ✅ Create and link GPOs to OUs
  ✅ Configure Fine-Grained Password Policies
  ✅ Deploy a security baseline via GPO
  ✅ Enable audit policy via GPO
  ✅ Deploy software settings to all users
  ✅ Restrict desktop/applications with GPO
  ✅ Troubleshoot GPO with gpresult and RSoP
```

---

## 🏗️ GPO Architecture Refresher

```
GPO PROCESSING ORDER (LSDOU):

  1. LOCAL       → Policies on the local machine itself
        ↓
  2. SITE        → AD Site-linked GPOs (rarely used)
        ↓
  3. DOMAIN      → Domain-level GPOs (apply to all)
        ↓
  4. OU          → OU-linked GPOs (most specific)
        ↓
  5. Child OU    → Child OU GPOs (most specific wins)

  RULE: LAST ONE APPLIED WINS (unless "Enforced")

  Example:
  Domain Policy: Password min length = 8
  IT OU Policy:  Password min length = 14
  
  Result for IT OU users: 14 (OU policy wins)
```

---

## 🔬 Lab Exercise 1 — Fine-Grained Password Policy

Regular domain password policy applies to everyone. Fine-grained lets you set different policies per group.

```
SCENARIO:
  IT Admins need: 14-char password, 30-day expiry, 10 failed attempts
  Regular users need: 8-char password, 90-day expiry, 5 failed attempts


STEP 1: Create PSO for IT Admins
──────────────────────────────────────────────────────────────────
  # Open PowerShell on DC01 as Administrator

  New-ADFineGrainedPasswordPolicy `
    -Name "IT-Admin-PSO" `
    -Precedence 10 `
    -MinPasswordLength 14 `
    -PasswordHistoryCount 24 `
    -MaxPasswordAge "30.00:00:00" `
    -MinPasswordAge "1.00:00:00" `
    -LockoutThreshold 10 `
    -LockoutObservationWindow "00:30:00" `
    -LockoutDuration "01:00:00" `
    -ComplexityEnabled $true `
    -ReversibleEncryptionEnabled $false


STEP 2: Create PSO for Regular Users
──────────────────────────────────────────────────────────────────
  New-ADFineGrainedPasswordPolicy `
    -Name "Standard-User-PSO" `
    -Precedence 20 `
    -MinPasswordLength 8 `
    -PasswordHistoryCount 12 `
    -MaxPasswordAge "90.00:00:00" `
    -LockoutThreshold 5 `
    -LockoutObservationWindow "00:15:00" `
    -LockoutDuration "00:30:00" `
    -ComplexityEnabled $true


STEP 3: Apply PSOs to Groups
──────────────────────────────────────────────────────────────────
  Add-ADFineGrainedPasswordPolicySubject -Identity "IT-Admin-PSO" `
    -Subjects "IT-Admins"

  Add-ADFineGrainedPasswordPolicySubject -Identity "Standard-User-PSO" `
    -Subjects "Domain Users"


STEP 4: Verify
──────────────────────────────────────────────────────────────────
  # Check what PSO applies to diana (IT Admin)
  Get-ADUserResultantPasswordPolicy -Identity diana

  # Should show: IT-Admin-PSO with 14-char min length

  # Check for regular user alice
  Get-ADUserResultantPasswordPolicy -Identity alice

  # Should show: Standard-User-PSO with 8-char min length
```

---

## 🔬 Lab Exercise 2 — Security Audit Policy via GPO

```
SCENARIO: Enable full security audit logging on all machines

STEP 1: Create new GPO
──────────────────────────────────────────────────────────────────
  Open: Group Policy Management (gpmc.msc)
  Right-click "lab.local" domain → Create a GPO in this domain
  Name: "Security-Audit-Policy"
  → Click OK


STEP 2: Edit the GPO
──────────────────────────────────────────────────────────────────
  Right-click "Security-Audit-Policy" → Edit

  Navigate to:
  Computer Configuration
  └── Policies
      └── Windows Settings
          └── Security Settings
              └── Advanced Audit Policy Configuration
                  └── Audit Policies

  Enable these (Success + Failure where noted):
  ┌──────────────────────────────────────────────────────────┐
  │  Account Logon → Credential Validation: S+F             │
  │  Account Logon → Kerberos Auth Service: S+F             │
  │  Account Logon → Kerberos Service Ticket: S+F           │
  │  Account Mgmt → Security Group Mgmt: S                  │
  │  Account Mgmt → User Account Mgmt: S+F                  │
  │  DS Access → Directory Service Changes: S               │
  │  DS Access → Directory Service Access: S+F              │
  │  Logon/Logoff → Logon: S+F                              │
  │  Logon/Logoff → Account Lockout: S                      │
  │  Logon/Logoff → Special Logon: S                        │
  │  Policy Change → Audit Policy Change: S+F               │
  │  Privilege Use → Sensitive Privilege Use: S+F           │
  │  Detailed Tracking → Process Creation: S                │
  └──────────────────────────────────────────────────────────┘


STEP 3: Increase Log Size in same GPO
──────────────────────────────────────────────────────────────────
  Computer Configuration → Policies → Windows Settings
  → Security Settings → Event Log

  "Maximum security log size" → 1048576 KB (= 1 GB)
  "Retention method for security log" → Overwrite as needed


STEP 4: Link GPO to domain
──────────────────────────────────────────────────────────────────
  Group Policy Management
  Right-click "lab.local" → Link an Existing GPO
  → Select "Security-Audit-Policy"
  → OK


STEP 5: Force and verify
──────────────────────────────────────────────────────────────────
  # On DC01
  gpupdate /force

  # Verify audit policy applied
  auditpol /get /subcategory:"Logon"
  # Should show: Success and Failure

  auditpol /get /subcategory:"Directory Service Changes"
  # Should show: Success
```

---

## 🔬 Lab Exercise 3 — Desktop Restriction GPO

```
SCENARIO: Prevent regular users from accessing Control Panel
          and running unauthorized programs

STEP 1: Create GPO
──────────────────────────────────────────────────────────────────
  Name: "User-Restrictions-Policy"


STEP 2: Restrict Control Panel access
──────────────────────────────────────────────────────────────────
  User Configuration
  └── Policies
      └── Administrative Templates
          └── Control Panel
              → "Prohibit access to Control Panel and PC settings"
              → Enabled ✅


STEP 3: Disable Command Prompt for users
──────────────────────────────────────────────────────────────────
  User Configuration → Administrative Templates
  → System
  → "Prevent access to the command prompt" → Enabled


STEP 4: Set desktop wallpaper (corporate branding)
──────────────────────────────────────────────────────────────────
  User Configuration → Administrative Templates
  → Desktop → Desktop
  → "Desktop Wallpaper"
  → Enabled
  → Wallpaper Name: \\DC01\SYSVOL\lab.local\wallpaper.jpg
  → Wallpaper Style: Fill


STEP 5: Link only to Employees OU (not IT)
──────────────────────────────────────────────────────────────────
  IMPORTANT: Link to OU=Employees,DC=lab,DC=local
  NOT to the whole domain!
  IT Admins should still have full access.


STEP 6: Test
──────────────────────────────────────────────────────────────────
  Login as alice (Employees OU) on WIN10-CLIENT
  → Try to open Control Panel → Should be blocked!
  → Try to open cmd.exe → Should be blocked!

  Login as diana (IT OU) on WIN10-CLIENT
  → Open Control Panel → Should work!
  → Open cmd.exe → Should work!

  This proves: GPO scoping by OU works correctly
```

---

## 🔬 Lab Exercise 4 — AppLocker (Software Restriction)

```
SCENARIO: Only allow approved applications to run
          Block PowerShell for regular users (anti-malware defense)

STEP 1: Create AppLocker GPO
──────────────────────────────────────────────────────────────────
  GPO Name: "AppLocker-Policy"


STEP 2: Configure AppLocker rules
──────────────────────────────────────────────────────────────────
  Computer Configuration → Policies → Windows Settings
  → Security Settings → Application Control Policies
  → AppLocker

  Right-click "Executable Rules" → Create Default Rules
  (This allows Windows and Program Files to run)

  Then ADD DENIAL RULE:
  Right-click "Executable Rules" → Create New Rule
  → Action: DENY
  → User or Group: Everyone
  → Conditions: Path
  → Path: %SYSTEM32%\WindowsPowerShell\*
  → Name: "Block PowerShell for Users"
  → Create


STEP 3: Enable Application Identity Service
──────────────────────────────────────────────────────────────────
  # AppLocker requires this service!
  Set-Service -Name AppIDSvc -StartupType Automatic
  Start-Service AppIDSvc

  # Or via GPO:
  Computer Config → Preferences → Control Panel Settings
  → Services → Application Identity → Automatic


STEP 4: Test
──────────────────────────────────────────────────────────────────
  Login as alice (regular user)
  Try: Open PowerShell → Should be BLOCKED
  Try: Run notepad.exe → Should work
  Try: Run cmd.exe → Works (cmd is in System32, allowed)

  ⚠️ NOTE: This is a lab exercise.
  AppLocker alone is NOT enough security — attackers bypass
  it via LOLBins (Living-Off-the-Land Binaries).
  Use with Windows Defender Application Control (WDAC) for
  stronger enforcement.
```

---

## 🔬 Lab Exercise 5 — GPO Troubleshooting

```
TROUBLESHOOTING TOOLS:

  TOOL 1: gpresult (what GPOs actually applied?)
  ──────────────────────────────────────────────────────────────────
  # Run on WIN10-CLIENT as the user
  gpresult /r

  # Detailed HTML report
  gpresult /h C:\gpo-report.html

  # For a specific user (run as admin)
  gpresult /user LAB\alice /r

  LOOK FOR:
  ✅ "Applied Group Policy Objects" = GPOs that worked
  ❌ "Denied Group Policy Objects" = GPOs filtered/blocked
  ⚠️  Check: "The following GPOs were not applied because
              they were filtered out" — common issue!


  TOOL 2: RSoP (Resultant Set of Policy)
  ──────────────────────────────────────────────────────────────────
  Run: rsop.msc
  → Shows a mini GPO editor with EFFECTIVE settings
  → Browse to any setting to see its current value
  → Tells you which GPO set each value


  TOOL 3: Event Log (GPO errors)
  ──────────────────────────────────────────────────────────────────
  Event Viewer → Applications and Services Logs
  → Microsoft → Windows → Group Policy → Operational

  Event 4016 = GPO processing started
  Event 7016 = Error processing specific extension
  Event 8004 = GPO application failed (check this!)


  COMMON GPO ISSUES AND FIXES:
  ──────────────────────────────────────────────────────────────────
  ❌ GPO not applying? 
     → Check it's linked to the right OU
     → Check Security Filtering includes target user/computer
     → Run: gpupdate /force on target machine

  ❌ GPO applying to wrong users?
     → Check OU scope — GPO may be domain-linked
     → Use Security Filtering to limit to specific group

  ❌ Conflicting GPOs?
     → Higher precedence number = lower priority
     → "Enforced" flag overrides child OU settings

  ❌ Changes not taking effect immediately?
     → User Config: Takes effect at next logon
     → Computer Config: Takes effect at next restart
     → Or force: gpupdate /force /boot  (restarts too)
```

---

## 📋 GPO Security Baseline (Quick Deploy)

```
MICROSOFT SECURITY BASELINES (FREE):
──────────────────────────────────────────────────────────────────
  Download: Microsoft Security Compliance Toolkit
  URL: microsoft.com/en-us/download/details.aspx?id=55319

  WHAT YOU GET:
  - Pre-built GPO backups for:
    Windows Server 2022 Security Baseline
    Windows 11 Security Baseline
    Microsoft 365 Apps for Enterprise
    Microsoft Edge

  IMPORT INTO YOUR LAB:
  ─────────────────────────────────────────────────────────────────
  1. Download and extract the toolkit
  2. Open Group Policy Management
  3. Right-click "Group Policy Objects"
  4. → Import Settings → Browse to extracted baseline folder
  5. Select the baseline GPO backup
  6. Import → Link to appropriate OU
  7. Test! (Some settings may be too strict for lab)

  ⚠️ Don't apply server baseline to DCs without testing first!
  Start with: Windows 11 baseline on WIN10-CLIENT
```

---

## ✅ Lab Checklist

```
GPO LAB COMPLETE WHEN:
──────────────────────────────────────────────────────────────────
  □ Fine-grained password policies created and verified
    (diana gets 14-char policy, alice gets 8-char)

  □ Security audit policy GPO deployed
    (auditpol /get shows correct settings on all machines)

  □ Control Panel blocked for Employees OU
    (alice can't open it, diana can)

  □ AppLocker deployed (PowerShell blocked for users)

  □ GPO troubleshooting practice:
    Run gpresult /r and understand the output
    Run rsop.msc and browse effective settings

  □ BONUS: Import Microsoft Security Baseline
```

---

**← Previous:** [01 - AD Lab Setup](./01-AD-Lab-Setup.md)
**Next →** [03 - Kerberoasting Simulation](./03-Kerberoasting-Lab.md)
