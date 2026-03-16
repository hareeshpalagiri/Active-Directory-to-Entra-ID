# 03 — LDAP & LDAPS

> **Section:** 03 — AD Authentication Protocols  
> **Difficulty:** Intermediate  
> **Ports:** 389 (LDAP), 636 (LDAPS), 3268 (Global Catalog), 3269 (GC over TLS)

---

## 📌 What is LDAP?

Imagine Active Directory as a massive phone book containing every user, computer, group, and resource in your organisation.

**LDAP (Lightweight Directory Access Protocol)** is the language used to search, read, and write entries in that phone book.

> **Simple definition:**  
> LDAP is the protocol that applications use to query Active Directory — to look up user information, verify credentials, check group memberships, and search for any AD object.

### Real-World Analogy

Think of LDAP as **a query language for a filing cabinet**:

- The filing cabinet = Active Directory database
- The drawer labels = OUs and containers
- Each folder = an AD object (user, computer, group)
- LDAP = the set of instructions for opening drawers, reading folders, and finding what you need

---

## 🔍 What LDAP is Used For

```
Application: "Find user hareesh and return his email address"
LDAP Query:  (&(objectClass=user)(sAMAccountName=hareesh))
AD Response: cn=Hareesh, mail=hareesh@company.com, department=IT

Application: "Is user hareesh's password correct?"
LDAP Bind:   Bind as hareesh with password "Str0ng@Pass"
AD Response: Success (bind successful) or Failure (invalid credentials)

Application: "Find all members of the IT-Admins group"
LDAP Query:  (&(objectClass=group)(cn=IT-Admins))
AD Response: [list of all member DNs]
```

### Who Uses LDAP in an Enterprise

| Application | How it uses LDAP |
|-------------|----------------|
| **Cisco VPN** | Queries AD to verify user credentials |
| **Network printers** | Looks up user info for authentication |
| **VMware vCenter** | Authenticates admins against AD |
| **Web applications** | Verify login credentials against AD |
| **Email servers** | Look up addresses from AD |
| **HR systems** | Sync employee data from AD |
| **Monitoring tools** | Authenticate against AD |
| **SIEM (Splunk, Sentinel)** | Query AD for user/group info |

---

## ⚙️ How LDAP Works — Step by Step

### LDAP Operations

```
1. CONNECT: Application connects to DC on port 389 (LDAP) or 636 (LDAPS)

2. BIND (authenticate):
   Simple bind: Send username + password in cleartext ← DANGEROUS on port 389
   SASL bind: Use Kerberos/NTLM for authentication ← Secure

3. SEARCH (query):
   Application sends search request:
   Base DN: DC=company,DC=local (where to search)
   Scope: subtree (search all sub-containers)
   Filter: (&(objectClass=user)(sAMAccountName=hareesh))
   Attributes: mail, department, memberOf (what to return)

4. RESPONSE:
   AD returns matching objects and requested attributes

5. UNBIND (disconnect):
   Application closes the connection
```

### LDAP Filter Syntax

```
Basic operators:
  (attribute=value)       → exact match
  (attribute=*)           → attribute exists (any value)
  (!(filter))             → NOT
  (&(filter1)(filter2))   → AND
  (|(filter1)(filter2))   → OR

Common LDAP filters:

Find a specific user:
  (&(objectClass=user)(sAMAccountName=hareesh))

Find all enabled users:
  (&(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))

Find all members of Domain Admins:
  (&(objectClass=user)(memberOf=CN=Domain Admins,CN=Users,DC=company,DC=local))

Find all computers running Windows Server:
  (&(objectClass=computer)(operatingSystem=Windows Server*))

Find all accounts with SPN (Kerberoasting discovery):
  (&(objectClass=user)(servicePrincipalName=*))

Find accounts with password never expires:
  (&(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=65536))
```

---

## 🔧 Real-World LDAP Configuration

### Configuration 1 — Cisco AnyConnect VPN + LDAP

```
Scenario: GP needs to configure Cisco ASA VPN to authenticate
          users against Active Directory using LDAP

Step 1: Create a service account for LDAP queries
  New-ADUser -Name "svc_ldap" `
             -SamAccountName "svc_ldap" `
             -Path "OU=Service-Accounts,DC=company,DC=local" `
             -AccountPassword (ConvertTo-SecureString "LongR@nd0m!" -AsPlainText -Force) `
             -Enabled $true `
             -PasswordNeverExpires $true

  Grant Read-only access to AD (minimum permissions needed):
  → Add svc_ldap to "Read-only Domain Controllers" group
  → OR grant specific read permissions via ADSI Edit

Step 2: Configure LDAP on Cisco ASA (CLI)
  aaa-server LDAP-AD protocol ldap
  aaa-server LDAP-AD (inside) host 192.168.1.10
    ldap-base-dn DC=company,DC=local
    ldap-scope subtree
    ldap-naming-attribute sAMAccountName
    ldap-login-password [svc_ldap password]
    ldap-login-dn CN=svc_ldap,OU=Service-Accounts,DC=company,DC=local
    server-type microsoft

Step 3: Configure group-based VPN access
  ldap attribute-map VPN-MAP
    map-name memberOf Group-Policy
    map-value memberOf CN=SG-VPN-Users,OU=Groups,DC=company,DC=local VPN-Policy

Step 4: Test LDAP authentication
  test aaa-server authentication LDAP-AD host 192.168.1.10
       username hareesh password [password]

  Expected: INFO: Authentication Successful ✅

Step 5: Switch from LDAP to LDAPS (secure)
  Change port 389 → 636
  Import DC01's certificate into ASA:
  crypto ca authenticate LDAP-CERT
  [paste DC01's certificate]
  
  aaa-server LDAP-AD (inside) host 192.168.1.10
    ldap-over-ssl enable  ← enables port 636
```

---

### Configuration 2 — HP Network Printer + LDAPS

```
Scenario: HP LaserJet enterprise printer needs to authenticate
          users via LDAP before releasing print jobs

Step 1: Access HP EWS (Embedded Web Server)
  Browser: https://192.168.1.200 (printer IP)
  Login: admin / [admin password]

Step 2: Configure LDAP
  Security → Access Control → LDAP
  
  Server Address: 192.168.1.10 (DC01)
  Port: 636 (LDAPS — encrypted) ← NOT 389
  Use SSL: Yes
  
  Bind and Search Settings:
    Bind Method: Simple (username + password)
    Bind DN: CN=svc_ldap,OU=Service-Accounts,DC=company,DC=local
    Bind Password: [svc_ldap password]
    
  Search Settings:
    Base DN: DC=company,DC=local
    Search Filter: (&(objectClass=user)(sAMAccountName={username}))
    ← {username} is replaced with what user types on printer panel
    
  Attribute Matching:
    Username attribute: sAMAccountName
    Email attribute: mail
    Display name: displayName

Step 3: Install DC certificate on printer
  HP EWS → Security → Certificate Management
  → Import DC01's certificate (downloaded from DC01 IIS/MMC)

Step 4: Test
  Hareesh walks to printer
  Enters his domain username: hareesh
  Enters his domain password
  Printer sends LDAP query to DC01 on port 636 (LDAPS)
  DC01 verifies → Hareesh authenticated ✅
  Print jobs released ✅

Why LDAPS and not LDAP?
  LDAP (port 389): credentials sent in CLEARTEXT
  Someone sniffing the network can capture hareesh's password ❌
  
  LDAPS (port 636): entire connection encrypted with TLS
  Password cannot be captured even with network sniffing ✅
```

---

### Configuration 3 — VMware vCenter + LDAPS

```
Scenario: GP configures vCenter to use AD for administrator authentication

Step 1: vCenter → Administration → Single Sign On
  → Configuration → Identity Sources → Add

Step 2: Configure Identity Source
  Type: Active Directory over LDAP
  
  Server URL: ldaps://DC01.company.local:636 ← LDAPS
  Base DN for users: DC=company,DC=local
  Base DN for groups: DC=company,DC=local
  
  Username: CN=svc_ldap,OU=Service-Accounts,DC=company,DC=local
  Password: [svc_ldap password]

Step 3: Trust DC01 certificate
  Import DC01's SSL certificate into vCenter certificate store

Step 4: Assign permissions to AD groups
  vCenter → Hosts and Clusters → Permissions
  Add: COMPANY\SG-vCenter-Admins → Administrator role
  Add: COMPANY\SG-vCenter-ReadOnly → Read-Only role

Step 5: Test
  GP logs into vCenter with: gp@company.local / [password]
  vCenter queries AD via LDAPS
  GP authenticated → vCenter loaded ✅
  Standard users without SG-vCenter-Admins → access denied ❌
```

---

### Configuration 4 — Enforcing LDAP Signing on Domain Controllers

```
Microsoft released an advisory: all DCs should require LDAP signing
Unsigned LDAP connections should be rejected

Step 1: Audit first (find who is using unsigned LDAP)
  GPO: Computer Config → Windows Settings → Security Settings
  → Local Policies → Security Options
  → "Domain controller: LDAP server signing requirements"
  → Set to: "None" temporarily, enable Event ID 2889 logging

  Event ID 2889 in "Directory Service" log:
  = unsigned LDAP bind from this client → MUST fix before enforcing

Step 2: Fix all applications to use LDAPS
  Replace ldap://DC01:389 with ldaps://DC01:636 in all applications
  OR use SASL/Kerberos binding (also satisfies signing requirement)

Step 3: Enforce LDAP Signing
  GPO → "Domain controller: LDAP server signing requirements"
  → Set to: "Require signing"
  
  Registry on DC:
  HKLM\SYSTEM\CurrentControlSet\Services\NTDS\Parameters
  LDAPServerIntegrity = 2 (require signing)

Step 4: Enable LDAP Channel Binding
  HKLM\SYSTEM\CurrentControlSet\Services\NTDS\Parameters
  LdapEnforceChannelBinding = 2
  
  This prevents LDAP relay attacks (NTLM relay to LDAPS)
```

---

## ⚠️ LDAP Attack Techniques

### Attack 1 — LDAP Enumeration (Reconnaissance)

```
What: Any authenticated domain user can query LDAP
      and enumerate the entire AD structure.
      Attackers use this to find attack targets.

Tools: ldapdomaindump, BloodHound, PowerView, ADExplorer

Step-by-step:
  Attacker compromises Hareesh's account (regular user)
  
  Using ldapdomaindump:
  python3 ldapdomaindump.py -u 'company\hareesh' -p 'password' DC01.company.local
  
  Output files:
  → domain_users.json (ALL users and their attributes)
  → domain_groups.json (ALL groups and members)
  → domain_computers.json (ALL computers and OS versions)
  → domain_policy.json (password policy, lockout settings)
  
  Attacker now knows:
  → All Domain Admin accounts ← attack targets
  → All service accounts with SPNs ← Kerberoasting targets
  → Password policy (lockout threshold for spray attacks)
  → All computers and their OS (find unpatched systems)
  → All users who haven't logged in (potential dormant accounts)
```

**Defense:**
```
1. Implement LDAP query restrictions:
   → Limit what anonymous/authenticated users can query
   → Enable AD Audit Policy for LDAP queries (Event ID 1644)

2. Enable LDAP query logging:
   HKLM\SYSTEM\CurrentControlSet\Services\NTDS\Diagnostics
   "15 Field Engineering" = 5
   
   Logs expensive/complex LDAP queries to Event ID 1644
   Detect: bulk enumeration queries from single source

3. Use tiered access:
   Regular users cannot query sensitive attributes
   (manager, salary info, admin account details)
```

---

### Attack 2 — LDAP Injection

```
What: Attacker manipulates LDAP queries by injecting filter syntax
      into input fields — similar to SQL injection.

Example vulnerable web application:
  Code (Python):
  username = request.form['username']
  ldap_filter = f"(&(objectClass=user)(sAMAccountName={username}))"
  
  Normal input: hareesh
  Normal filter: (&(objectClass=user)(sAMAccountName=hareesh)) ← fine

  Malicious input: hareesh)(|(password=*)
  Resulting filter: (&(objectClass=user)(sAMAccountName=hareesh)(|(password=*))
  → Returns all users matching either condition
  → May bypass authentication checks

Authentication bypass example:
  Login form username: *)(uid=*))(|(uid=*
  → If LDAP filter not sanitised → authentication bypassed

Step-by-step impact:
  Attacker enters crafted input in username field
  Application builds malicious LDAP query
  → Bypasses authentication ← logs in without valid credentials
  → OR retrieves unauthorised user data

Tools: Manual testing, LDAP injection payloads, Burp Suite
```

**Defense:**
```
1. Input sanitisation — escape LDAP special characters:
   Characters to escape: ( ) * \ NUL / \0
   
   Python example (safe):
   from ldap3.utils.conv import escape_filter_chars
   safe_input = escape_filter_chars(username)
   ldap_filter = f"(&(objectClass=user)(sAMAccountName={safe_input}))"

2. Use parameterised LDAP queries (if library supports it)
3. Principle of least privilege for service account
4. Validate and whitelist all user inputs
5. Use a WAF (Web Application Firewall) to detect injection attempts
```

---

### Attack 3 — LDAP Cleartext Credential Capture

```
What: LDAP on port 389 sends credentials in cleartext.
      Attacker sniffs network → captures username + password.

Step-by-step:
  Printer configured to use LDAP port 389 (not LDAPS)
  
  Hareesh walks to printer → types his password
  Printer sends LDAP bind to DC01:389:
  
  Bind request (unencrypted, visible in Wireshark):
  bindDN: CN=Hareesh,OU=IT,DC=company,DC=local
  password: Str0ng@Pass2024   ← CLEARTEXT
  
  Attacker running Wireshark on same network segment:
  Filters: ldap && tcp.port==389
  → Sees the bind request → captures Hareesh's password in cleartext ❌

Fix: ALWAYS use LDAPS (port 636) for all LDAP connections
     Never use port 389 for authentication
```

---

### Attack 4 — LDAP Relay (via NTLM)

```
What: If LDAP signing and channel binding are not enforced on DCs,
      an NTLM relay attack can relay authentication to LDAP/LDAPS
      and make changes to AD — creating accounts, modifying permissions.

Step-by-step:
  Attacker runs ntlmrelayx targeting LDAP:
  python3 ntlmrelayx.py -t ldap://DC01.company.local --escalate-user hareesh

  Triggers NTLM auth from GP (via LLMNR poisoning)
  Relays GP's auth to DC01 LDAP
  GP has write permissions → attacker adds hareesh to Domain Admins
  
  Even without cracking GP's password → Hareesh is now Domain Admin ❌

Defense:
  Enable LDAP Signing: LDAPServerIntegrity = 2
  Enable LDAP Channel Binding: LdapEnforceChannelBinding = 2
  Disable LLMNR and NetBIOS-NS (removes NTLM capture vector)
```

---

## 🛡️ LDAP Hardening Checklist

- [ ] **Never use LDAP port 389 for authentication** — always use LDAPS (636)
- [ ] Enable LDAP Signing on all Domain Controllers
- [ ] Enable LDAP Channel Binding on all Domain Controllers
- [ ] Audit all applications using LDAP — migrate to LDAPS
- [ ] Create a dedicated read-only service account for LDAP queries
- [ ] Grant minimum permissions to LDAP service accounts
- [ ] Enable Event ID 2889 logging to find unsigned LDAP binds
- [ ] Enable Event ID 1644 logging to detect LDAP enumeration
- [ ] Sanitise all LDAP inputs in custom applications
- [ ] Disable anonymous LDAP binds
- [ ] Use SASL/Kerberos binding instead of simple binding where possible

---

## 🔧 Troubleshooting LDAP

```powershell
# Test LDAP connectivity
Test-NetConnection -ComputerName "DC01.company.local" -Port 389
Test-NetConnection -ComputerName "DC01.company.local" -Port 636

# Test LDAP query manually (Windows)
# Using ldp.exe (built into Windows)
ldp.exe
→ Connection → Connect: DC01.company.local, Port 636, SSL checked
→ Connection → Bind: hareesh / password
→ View → Tree: DC=company,DC=local
→ Browse the directory

# Test LDAP from Linux
ldapsearch -H ldap://DC01.company.local \
    -D "CN=svc_ldap,OU=Service-Accounts,DC=company,DC=local" \
    -w "password" \
    -b "DC=company,DC=local" \
    "(sAMAccountName=hareesh)"

# Test LDAPS from Linux
ldapsearch -H ldaps://DC01.company.local:636 \
    -D "CN=svc_ldap,..." -w "password" \
    -b "DC=company,DC=local" \
    "(sAMAccountName=hareesh)"

# Check for unsigned LDAP binds on DC (Event ID 2889)
Get-WinEvent -LogName "Directory Service" |
    Where-Object {$_.Id -eq 2889} |
    Select-Object TimeCreated, Message -First 20

# Check LDAP service is responding on DC
nltest /dsgetdc:company.local /ldaponly
```

---

## 🎯 Interview Questions

**Q1. What is LDAP and how is it used in Active Directory?**  
**A:** LDAP (Lightweight Directory Access Protocol) is the protocol applications use to query and interact with Active Directory. It is used to look up user information (email, department, manager), authenticate users (by binding with credentials), check group memberships, and search for any AD object. Applications like VPN clients, printers, VMware, and web apps all use LDAP to validate users against AD without needing their own user database.

---

**Q2. What is the difference between LDAP and LDAPS and why does it matter?**  
**A:** LDAP on port 389 transmits data in cleartext — including usernames and passwords during simple bind authentication. Anyone on the same network can capture these credentials with Wireshark. LDAPS on port 636 wraps the entire LDAP session in TLS encryption — credentials and all query data are protected. In any production environment, LDAP (389) should never be used for authentication — always LDAPS (636). Microsoft now enforces this and will eventually block unsigned LDAP binds by default.

---

**Q3. What is LDAP injection and how do you prevent it?**  
**A:** LDAP injection occurs when an application builds LDAP queries using unsanitised user input — an attacker can inject LDAP filter syntax to manipulate the query. For example, injecting `*)(uid=*))(|(uid=*` into a username field may bypass authentication. Prevention: escape all special LDAP characters in user input (parentheses, asterisks, backslashes), use parameterised queries where possible, validate and whitelist user input, and apply principle of least privilege to the LDAP service account so even a successful injection has limited impact.

---

**Q4. What is LDAP signing and why should it be enforced?**  
**A:** LDAP signing ensures that LDAP messages are cryptographically signed — verifying they have not been tampered with and came from a legitimate source. Without signing, an attacker can perform NTLM relay attacks — capturing a user's NTLM authentication and replaying it to LDAP to make unauthorised AD changes (like adding accounts to privileged groups). Enforcing LDAP signing on DCs (LDAPServerIntegrity = 2) blocks unsigned connections, preventing relay attacks. Combined with LDAP channel binding, it eliminates the LDAP relay attack vector.

---

**Q5. Scenario — You discover a web application is connecting to AD on port 389 with a service account and sending user credentials. What are the risks and how do you fix it?**  
**A:** Risks: (1) Credentials are transmitted in cleartext — anyone on the network between the web server and DC can capture them with a packet sniffer. (2) The service account credentials are also exposed if sent in a simple bind. (3) If LDAP signing is not enforced, this connection is vulnerable to relay attacks. Fix: (1) Change the application connection string from ldap://DC01:389 to ldaps://DC01:636. (2) Install the DC's SSL certificate on the web server so it trusts the LDAPS connection. (3) If LDAPS is not possible, use SASL/Kerberos binding instead of simple binding. (4) Enforce LDAP signing on DCs so unsigned connections are rejected. (5) Audit all other applications for the same issue.

---

*"LDAP is the window into Active Directory — every application that authenticates against AD uses it. Leave it unencrypted and unsigned, and you have given attackers a cleartext view of every credential that crosses the wire."*
