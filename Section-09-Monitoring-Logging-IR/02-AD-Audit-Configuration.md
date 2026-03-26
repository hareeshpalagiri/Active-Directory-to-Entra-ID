# ⚙️ AD Audit Configuration

> **Simple Definition:** By default, Windows logs almost nothing useful. **Audit Configuration** is the process of telling Windows exactly WHAT security events to record — like turning on the security cameras in a building that were previously installed but switched off.

---

## 📷 The Security Camera Analogy

```
DEFAULT WINDOWS AUDIT POLICY:

  🏢 Your bank has 50 security cameras installed
  But only 3 are turned ON:
    Camera 1: Front door (basic logins)
    Camera 2: Back door (basic logoffs)
    Camera 3: Lobby (system events)

  47 cameras OFF:
    ❌ Vault room camera (privilege use)
    ❌ Server room camera (object access)
    ❌ Manager's office (admin actions)
    ❌ Side entrance (lateral movement)

  RESULT: Robbery happens → you have NO footage!

  AFTER PROPER AUDIT CONFIG:
  ALL cameras ON → Full visibility of everything
```

---

## 📂 Types of Audit Policies

Windows has two levels of audit policies:

```
AUDIT POLICY LEVELS:

  ┌─────────────────────────────────────────────────────────────┐
  │  LEVEL 1: Basic Audit Policy (Legacy)                       │
  │  ─────────────────────────────────────                      │
  │  9 categories, On/Off only                                  │
  │  Coarse-grained control                                     │
  │  Location: GPO → Local Policies → Audit Policy             │
  │                                                             │
  │  LEVEL 2: Advanced Audit Policy ← USE THIS ONE            │
  │  ─────────────────────────────────────                      │
  │  53 subcategories, fine-grained control                     │
  │  Can enable Success/Failure independently                   │
  │  Location: GPO → Advanced Audit Policy Configuration       │
  └─────────────────────────────────────────────────────────────┘

  ⚠️ NEVER MIX both levels — Advanced overrides Basic
  Best practice: Use Advanced Audit Policy exclusively
```

---

## 🗂️ Advanced Audit Policy — All Categories

```
┌──────────────────────────────────────────────────────────────────┐
│  ADVANCED AUDIT POLICY CONFIGURATION                             │
│  (GPO → Computer Config → Windows Settings → Security Settings   │
│         → Advanced Audit Policy Configuration)                   │
├────────────────────────────────────────────────────────────────  │
│                                                                  │
│  ACCOUNT LOGON                                                   │
│  ─────────────────────────────────────────────────────          │
│  Credential Validation           → Success, Failure             │
│  Kerberos Authentication         → Success, Failure             │
│  Kerberos Service Ticket Ops     → Success, Failure  ★          │
│  Other Account Logon Events      → Success, Failure             │
│                                                                  │
│  ACCOUNT MANAGEMENT                                              │
│  ─────────────────────────────────────────────────────          │
│  Computer Account Management     → Success                      │
│  Distribution Group Management   → Success                      │
│  Other Account Mgmt Events       → Success                      │
│  Security Group Management       → Success            ★         │
│  User Account Management         → Success, Failure   ★         │
│                                                                  │
│  DETAILED TRACKING                                               │
│  ─────────────────────────────────────────────────────          │
│  DPAPI Activity                  → Success, Failure             │
│  PNP Activity                    → Success                      │
│  Process Creation                → Success              ★       │
│  Process Termination             → Success                      │
│  RPC Events                      → Success                      │
│                                                                  │
│  DS ACCESS (Domain Controller only)                              │
│  ─────────────────────────────────────────────────────          │
│  Directory Service Access        → Success, Failure   ★         │
│  Directory Service Changes       → Success              ★       │
│  Directory Service Replication   → Failure                      │
│                                                                  │
│  LOGON/LOGOFF                                                    │
│  ─────────────────────────────────────────────────────          │
│  Account Lockout                 → Success              ★       │
│  Logoff                          → Success                      │
│  Logon                           → Success, Failure    ★        │
│  Network Policy Server           → Success, Failure             │
│  Other Logon/Logoff Events       → Success, Failure             │
│  Special Logon                   → Success              ★       │
│                                                                  │
│  OBJECT ACCESS                                                   │
│  ─────────────────────────────────────────────────────          │
│  Application Generated           → Success, Failure             │
│  Certification Services          → Success, Failure             │
│  File Share                      → Success, Failure    ★        │
│  File System                     → Success, Failure             │
│  Filtering Platform Connection   → Failure                      │
│  Registry                        → Success, Failure             │
│  SAM                             → Failure                      │
│                                                                  │
│  POLICY CHANGE                                                   │
│  ─────────────────────────────────────────────────────          │
│  Audit Policy Change             → Success, Failure    ★        │
│  Authentication Policy Change    → Success                      │
│  Authorization Policy Change     → Success                      │
│  Filtering Platform Policy Change → Success                     │
│  MPSSVC Rule-Level Policy Change → Success                      │
│                                                                  │
│  PRIVILEGE USE                                                   │
│  ─────────────────────────────────────────────────────          │
│  Non-Sensitive Privilege Use     → (optional)                   │
│  Sensitive Privilege Use         → Success, Failure    ★        │
│                                                                  │
│  SYSTEM                                                          │
│  ─────────────────────────────────────────────────────          │
│  IPsec Driver                    → Success, Failure             │
│  Other System Events             → Success, Failure             │
│  Security State Change           → Success              ★       │
│  Security System Extension       → Success              ★       │
│  System Integrity                → Success, Failure    ★        │
│                                                                  │
│  ★ = High Priority — Enable these FIRST                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Setting Up Audit Policy via GPO

```
STEP-BY-STEP GPO SETUP FOR DOMAIN CONTROLLERS:

  Step 1: Open Group Policy Management
  ─────────────────────────────────────────────────────────
  Server Manager → Tools → Group Policy Management
  Or: gpmc.msc

  Step 2: Edit Default Domain Controllers Policy
  ─────────────────────────────────────────────────────────
  Forest → Domains → YourDomain
  → Domain Controllers
  → Right-click "Default Domain Controllers Policy"
  → Edit

  Step 3: Navigate to Advanced Audit Policy
  ─────────────────────────────────────────────────────────
  Computer Configuration
  └── Windows Settings
      └── Security Settings
          └── Advanced Audit Policy Configuration
              └── Audit Policies
                  └── (Choose each subcategory)

  Step 4: Enable each subcategory
  ─────────────────────────────────────────────────────────
  Double-click each subcategory
  ☑️  Configure the following audit events:
  ☑️  Success
  ☑️  Failure (where applicable)
  → OK

  Step 5: Force GPO update
  ─────────────────────────────────────────────────────────
  gpupdate /force
  # On all DCs
```

---

## 📏 Increase Log File Size

```
DEFAULT LOG SIZES (WAY TOO SMALL!):

  Security.evtx  →  20 MB default  ←  TERRIBLE
  System.evtx    →  20 MB default
  Application    →  20 MB default

  RECOMMENDED SIZES:
  ─────────────────────────────────────────────────────────────
  Security log on DCs:        → 4 GB (busy DCs can fill fast)
  Security log on servers:    → 1 GB
  Security log on workstations→ 512 MB
  PowerShell logs:            → 512 MB

  HOW TO CONFIGURE VIA GPO:
  ─────────────────────────────────────────────────────────────
  Computer Configuration → Policies → Windows Settings
  → Security Settings → Event Log
  
  "Maximum Security Log Size"     → 4194304 KB (= 4 GB)
  "Retention method for Security" → Overwrite as needed

  OR POWERSHELL:
  ─────────────────────────────────────────────────────────────
  wevtutil sl Security /ms:4294967296   # 4 GB
  wevtutil sl Security /rt:false        # Overwrite old events
```

---

## 🧩 SACL — Object-Level Audit (AD Objects)

To audit specific AD objects (like Domain Admins group), you need a SACL:

```
WHAT IS A SACL?
──────────────────────────────────────────────────────────────────
  SACL = System Access Control List
  It's an audit rule attached to a specific AD object

  EXAMPLE: Audit all changes to Domain Admins group

  STEPS:
  ─────────────────────────────────────────────────────────────
  1. Open ADSI Edit (adsiedit.msc) or AD Users & Computers
  2. Find: CN=Domain Admins,CN=Users,DC=corp,DC=local
  3. Right-click → Properties → Security tab
  4. Advanced → Auditing tab
  5. Add → Principal: Everyone
  6. Type: All (Success + Failure)
  7. Permissions: Write all properties, Modify permissions
  8. Apply

  RESULT: Any modification to Domain Admins generates Event 5136!

  ⚠️ DO THIS FOR THESE OBJECTS:
  ─────────────────────────────────────────────────────────────
  ✅ Domain Admins group
  ✅ Enterprise Admins group
  ✅ Schema Admins group
  ✅ AdminSDHolder container
  ✅ Domain object (to detect DCSync privilege adds)
  ✅ Group Policy Objects (GPO tampering)
```

---

## 🔬 PowerShell Logging Configuration

```
POWERSHELL AUDIT GPO SETTINGS:
──────────────────────────────────────────────────────────────────
  Computer Configuration → Administrative Templates
  → Windows Components → Windows PowerShell

  ┌─────────────────────────────────────────────────────────┐
  │  SETTING                              RECOMMENDED        │
  ├─────────────────────────────────────────────────────────┤
  │  Turn on Module Logging               Enabled ✅         │
  │    Module Names to log: *             (all modules)      │
  │                                                         │
  │  Turn on Script Block Logging         Enabled ✅         │
  │    Log script block invocation        Enabled ✅         │
  │                                                         │
  │  Turn on Script Execution             Enabled ✅         │
  │    (log all scripts attempted)                          │
  │                                                         │
  │  Turn on PowerShell Transcription     Enabled ✅         │
  │    Transcript output directory:                         │
  │    \\SIEM-share\PSTranscripts\        (central store)   │
  └─────────────────────────────────────────────────────────┘

  ⚠️ Script Block Logging captures:
     Even if script is obfuscated!
     PowerShell decodes first, then logs → attacker can't hide
```

---

## 📊 Command Line Auditing (4688 Enhancement)

```
ENABLE COMMAND LINE IN PROCESS CREATION EVENTS:
──────────────────────────────────────────────────────────────────
  By default, Event 4688 (Process Created) doesn't show
  what command was run — just the executable name!

  ENABLE FULL COMMAND LINE:
  ─────────────────────────────────────────────────────────────
  Computer Configuration → Administrative Templates
  → System → Audit Process Creation
  "Include command line in process creation events" → Enabled

  BEFORE:
  ─────────────────────────────────────────────────────────────
  Event 4688: New Process Created
  Process Name: C:\Windows\System32\cmd.exe
  Command Line: (empty)    ← Useless!

  AFTER:
  ─────────────────────────────────────────────────────────────
  Event 4688: New Process Created
  Process Name: C:\Windows\System32\cmd.exe
  Command Line: cmd.exe /c "net user hacker P@ssw0rd /add"
                          ↑ NOW you can see the attack!
```

---

## 🌐 Audit Policy Quick Wins (Do These Today)

```
MINIMUM VIABLE AUDIT POLICY:
──────────────────────────────────────────────────────────────────

  PRIORITY 1 - ENABLE IMMEDIATELY:
  ✅ Account Logon: Credential Validation   Success+Failure
  ✅ Logon/Logoff: Logon                    Success+Failure
  ✅ Logon/Logoff: Account Lockout          Success
  ✅ Account Mgmt: User Account Mgmt        Success+Failure
  ✅ Account Mgmt: Security Group Mgmt      Success
  ✅ Policy Change: Audit Policy Change     Success+Failure

  PRIORITY 2 - ADD WITHIN A WEEK:
  ✅ DS Access: Directory Service Changes   Success
  ✅ DS Access: Directory Service Access    Success+Failure
  ✅ Privilege Use: Sensitive Privilege Use Success+Failure
  ✅ Detailed Tracking: Process Creation    Success
  ✅ PowerShell: Module + Script Block      Enabled

  PRIORITY 3 - COMPLETE YOUR SETUP:
  ✅ All remaining subcategories
  ✅ SACL on critical AD objects
  ✅ Command line in 4688
  ✅ Forwarding to SIEM
  ✅ Log size increased
```

---

## 👮 Security Engineer's POV

> ⚠️ **Audit config is not a one-time task. Test it. Red team it. Verify logs are actually arriving.**

```
HOW ATTACKERS ABUSE BAD AUDIT CONFIG:
──────────────────────────────────────────────────────────────────
  1. Attacker performs DCSync (replication attack)
     → No DS Access audit? → NO LOG! Attack invisible.

  2. Attacker adds account to Domain Admins
     → No Security Group audit? → NO LOG!

  3. Attacker disables Security Log (Event 1102)
     → You'd only know if you were already forwarding logs!
     → This is why log forwarding to SIEM is CRITICAL

  4. Attacker runs PowerShell Empire payload
     → No Script Block logging? → NO LOG of the attack!


VERIFY YOUR AUDIT POLICY:
──────────────────────────────────────────────────────────────────
  # Check current effective audit policy on a DC
  auditpol /get /category:*

  # Check specific category
  auditpol /get /subcategory:"Logon"

  # Verify from command line
  auditpol /get /subcategory:"Directory Service Changes"
  # Should show: Success and Failure
```

---

## ✅ Summary

```
┌────────────────────────────────────────────────────────────────┐
│  AD AUDIT CONFIGURATION IN A NUTSHELL:                         │
│                                                                │
│  ⚙️  Default audit policy = almost useless                     │
│  🔧 Use Advanced Audit Policy (53 subcategories)               │
│  📏 Increase log file size (Security → 4 GB on DCs)            │
│  🧩 Add SACLs to critical AD objects (Domain Admins etc.)      │
│  📋 Enable PowerShell Script Block Logging                     │
│  💻 Enable command line in process creation (4688)             │
│  📡 Forward ALL logs to SIEM (Sentinel/Splunk)                 │
│                                                                │
│  ⚠️  Audit config is your foundation — everything else         │
│     in monitoring depends on getting this right first!         │
└────────────────────────────────────────────────────────────────┘
```

---

**← Previous:** [01 - Windows Event IDs](./01-Windows-Event-IDs.md)
**Next →** [03 - Defender for Identity](./03-Defender-for-Identity.md)
