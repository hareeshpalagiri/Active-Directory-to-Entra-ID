# 03 — Protected Users Group

> **Section:** 04 — AD Security & Hardening  
> **Difficulty:** Intermediate  
> **Stops:** Pass-the-Hash, Pass-the-Ticket, credential caching, NTLM auth for privileged accounts

---

## 📌 What is the Protected Users Group?

The **Protected Users** security group is a special built-in group in Active Directory (introduced in Windows Server 2012 R2) that automatically applies a set of **non-configurable, non-overridable security restrictions** to its members.

When GP's admin account is added to Protected Users:
- She **cannot** authenticate using NTLM (only Kerberos)
- Her credentials **cannot** be cached on any remote machine
- Her Kerberos tickets have **shorter lifetimes**
- She **cannot** use weak encryption types (DES, RC4)
- She **cannot** be delegated

> **Simple definition:**  
> Protected Users is a security group that applies hardened authentication restrictions to its members automatically — making privileged accounts significantly harder to steal, relay, or reuse even if a machine is compromised.

---

## 🔒 What Protections Does It Apply?

### For Members Authenticating (Client-Side)

| Protection | What it means |
|-----------|--------------|
| **No NTLM** | Account can ONLY use Kerberos — NTLM authentication is blocked |
| **No DES or RC4** | Only AES128 and AES256 Kerberos encryption — no weak crypto |
| **No credential delegation** | Account cannot be delegated (even with unconstrained delegation) |
| **Short TGT lifetime** | TGT limited to 4 hours (not the normal 10 hours) |
| **No TGT renewal** | TGT cannot be renewed — user must re-authenticate after 4 hours |

### For Domain Controllers (Server-Side)

| Protection | What it means |
|-----------|--------------|
| **No credential caching** | Credentials NOT stored in LSA secrets on remote machines |
| **No WDigest** | WDigest credentials not stored (prevents cleartext password extraction) |
| **No long-term key** | Kerberos long-term key not cached — must authenticate to DC each time |

---

## 🛡️ Why This Stops Major Attacks

### Stops Pass-the-Hash

```
Normal account (not in Protected Users):
  GP logs into Server01
  Her NTLM hash is cached in LSASS on Server01
  Attacker compromises Server01 → extracts GP's hash → lateral movement

Protected Users:
  GP logs into Server01
  NO NTLM credentials cached (Protected Users blocks this)
  Attacker compromises Server01 → nothing to extract ✅
  
  Also: GP's account cannot be authenticated via NTLM at all
  Even if attacker has the hash → NTLM authentication blocked at DC ✅
```

### Stops Pass-the-Ticket

```
Normal account:
  GP's Kerberos TGT (valid 10 hours) stored in LSASS
  Attacker extracts TGT → uses it elsewhere for 10 hours
  
Protected Users:
  GP's TGT valid only 4 hours (reduced lifetime)
  TGT cannot be renewed → expires faster
  Less window for attacker to use a stolen ticket ✅
  Also: no long-term credentials cached → harder to get a ticket in the first place
```

### Stops WDigest Cleartext Extraction

```
Legacy WDigest protocol stores password in memory in cleartext
(to support HTTP Digest authentication)

Mimikatz command:
  sekurlsa::wdigest → extracts cleartext password from memory

Protected Users:
  WDigest explicitly disabled for Protected Users members
  No cleartext password stored in memory ✅
  Mimikatz gets nothing ✅
```

### Stops Kerberos Delegation Abuse

```
Unconstrained Delegation attack:
  Service with unconstrained delegation receives tickets
  Attacker steals tickets from that service → impersonates users

Protected Users:
  Members CANNOT be delegated — even to services with unconstrained delegation
  Their tickets are never forwarded → attack fails ✅
```

---

## ⚙️ How to Configure Protected Users

### Adding Accounts to Protected Users

```powershell
# Add GP's admin account to Protected Users
Add-ADGroupMember -Identity "Protected Users" -Members "gp-t0"

# Add multiple admin accounts at once
$adminAccounts = @("gp-t0", "hareesh-t1", "svc-dc-backup")
Add-ADGroupMember -Identity "Protected Users" -Members $adminAccounts

# Verify membership
Get-ADGroupMember -Identity "Protected Users" | Select-Object Name, SamAccountName

# Check if a specific user is in Protected Users
(Get-ADUser -Identity "gp-t0" -Properties MemberOf).MemberOf |
    Where-Object {$_ -like "*Protected Users*"}
```

### ⚠️ Before Adding — Check These Requirements

```
Requirements for Protected Users to work:
  Domain functional level: Windows Server 2012 R2 or higher
  Client OS: Windows 8.1 / Windows Server 2012 R2 or higher
  (Older clients do not enforce Protected Users protections)

Check domain functional level:
  (Get-ADDomain).DomainMode
  # Must be: Windows2012R2Domain or higher

Accounts to ADD to Protected Users:
  ✅ All Tier 0 admin accounts (Domain Admins, Enterprise Admins)
  ✅ All Tier 1 admin accounts
  ✅ Service accounts that support Kerberos-only (not NTLM-dependent)
  ✅ Any account accessing sensitive systems

Accounts NOT to add — these will BREAK if added:
  ❌ Service accounts that require NTLM authentication
     (NTLM is blocked — service will fail to authenticate)
  ❌ Service accounts using DES or RC4 Kerberos
     (These encryption types are blocked)
  ❌ Accounts that need delegation
     (Delegation is blocked — service cannot impersonate users)
  ❌ Accounts on legacy systems (Windows 7, Server 2008)
     (Protections not enforced — but login may still fail)
```

### Testing Before Applying

```powershell
# ALWAYS test in a non-production environment first
# Create a test account and add to Protected Users
New-ADUser -Name "Test-Protected" -SamAccountName "test-protected" ...
Add-ADGroupMember -Identity "Protected Users" -Members "test-protected"

# Test 1: NTLM authentication fails (expected)
# Try: net use \\server\share /user:test-protected [password]
# Expected result: "Access Denied" or "Logon failure"
# (NTLM rejected by DC since test-protected is in Protected Users)

# Test 2: Kerberos authentication works (expected)
# Try: net use \\server.company.local\share /user:test-protected [password]
# Using FQDN → Kerberos → should succeed ✅

# Test 3: No credentials cached (expected)
# After logging in, run Mimikatz on that machine
# sekurlsa::logonpasswords → test-protected entry should show NO hash/password
```

---

## 🏢 Real-World Implementation

### Scenario — Hardening GP's Admin Account

```
GP is an IT Manager with Domain Admin rights.
Security team decides to add her Tier 0 account to Protected Users.

Before adding — verify no dependencies:
  # Check if gp-t0 is used as a service account somewhere
  Get-ADUser -Identity "gp-t0" -Properties ServicePrincipalNames |
      Select-Object ServicePrincipalNames
  # Must be empty — service accounts should not be in Protected Users

  # Check if gp-t0 has delegation configured
  Get-ADUser -Identity "gp-t0" -Properties TrustedForDelegation, TrustedToAuthForDelegation |
      Select-Object TrustedForDelegation, TrustedToAuthForDelegation
  # Both should be False

After verification:
  Add-ADGroupMember -Identity "Protected Users" -Members "gp-t0"

Immediate effect:
  GP's next login: no NTLM credentials cached
  GP's TGT: valid only 4 hours
  GP's account: cannot be relayed via NTLM
  
Impact on GP's workflow:
  → She must re-authenticate every 4 hours (not 10) ← minor inconvenience
  → She cannot use applications that require NTLM from her admin account
  → She must use FQDN for server access (not IP) ← Kerberos requires hostname
  
For Tier 0 admins — this is correct. The inconvenience is the security.
```

---

## ⚠️ What Can Break

```
Scenario 1: Service breaks after adding service account to Protected Users

  svc_webapp was added to Protected Users
  Application stops authenticating to SQL Server
  
  Cause: Application uses NTLM to authenticate to SQL → NTLM now blocked
  
  Fix: Remove svc_webapp from Protected Users
       Fix the application to use Kerberos (register SPN, use hostname)
       Then re-add to Protected Users

Scenario 2: User cannot log in after 4 hours

  GP has long admin sessions that last more than 4 hours
  After 4 hours → Kerberos TGT expires → access denied to resources
  
  Fix: GP must re-authenticate (lock screen and unlock, or log off and on)
  This is by design — for Tier 0 accounts this is acceptable security

Scenario 3: Application breaks that uses RC4 Kerberos

  Legacy application configured to use RC4 encryption
  After adding service account to Protected Users → RC4 blocked → app fails
  
  Fix: Update application to use AES encryption
       Set-ADUser -KerberosEncryptionType AES256 on the service account
       Reconfigure application to use AES
```

---

## 🛡️ Protected Users Hardening Checklist

- [ ] Verify domain functional level is Windows Server 2012 R2 or higher
- [ ] Add ALL Tier 0 admin accounts to Protected Users
- [ ] Add ALL Tier 1 admin accounts to Protected Users
- [ ] Test each account in a lab before adding in production
- [ ] Verify no service accounts using NTLM or delegation are affected
- [ ] Monitor for authentication failures after implementation (Event ID 4625)
- [ ] Document all exceptions (accounts that cannot be added and why)
- [ ] Review membership quarterly — new admin accounts should be added promptly

---

## 🔧 Troubleshooting

```powershell
# Check if user is in Protected Users
Get-ADGroupMember "Protected Users" | Where-Object {$_.SamAccountName -eq "gp-t0"}

# Check authentication failures after adding to Protected Users
Get-WinEvent -ComputerName "DC01" -FilterHashtable @{
    LogName='Security'; Id=4625
} | Where-Object {
    $_.Message -match "gp-t0"
} | Select-Object TimeCreated, Message -First 10

# Common error codes for Protected Users issues:
# 0xC000006D — wrong credentials (NTLM attempt blocked)
# 0xC0000073 — account restriction (Protected Users blocking auth type)

# Verify Kerberos is being used (not NTLM)
# On a machine where gp-t0 is logged in:
klist
# Should show: Kerberos credentials only (no NTLM entries)

# If breaking a service — temporarily remove and investigate:
Remove-ADGroupMember -Identity "Protected Users" -Members "svc_problematic" -Confirm:$false
# Fix the underlying issue, then re-add
```

---

## 🎯 Interview Questions

**Q1. What is the Protected Users group and what does it do?**  
**A:** Protected Users is a built-in Active Directory security group that applies non-configurable, non-overridable authentication restrictions to its members. Key protections: no NTLM authentication (Kerberos only), no credential caching on remote machines, no WDigest cleartext storage, no Kerberos delegation, reduced TGT lifetime (4 hours), and no weak encryption (DES/RC4 blocked). It is designed for privileged accounts — Domain Admins, Tier 0 and Tier 1 admins.

---

**Q2. How does Protected Users stop Pass-the-Hash?**  
**A:** In two ways. First, Protected Users members cannot authenticate via NTLM — so even if an attacker has the NTLM hash, the DC will reject NTLM authentication attempts for that account. Second, Protected Users prevents credentials from being cached in LSASS on remote machines — so when GP logs into a server, her credentials are not stored there. An attacker who compromises that server finds nothing to extract.

---

**Q3. What types of accounts should NOT be added to Protected Users?**  
**A:** Service accounts that require NTLM authentication (adding them breaks the service). Service accounts configured for Kerberos delegation (delegation is blocked). Accounts using DES or RC4 Kerberos encryption (these are blocked, causing authentication failures). Accounts on legacy systems (Windows 7, Server 2008) that do not enforce Protected Users properly. Always test before adding — the protections are non-configurable once a member, and removal is the only rollback.

---

**Q4. What happens to a user's Kerberos TGT when they are in Protected Users?**  
**A:** The TGT lifetime is reduced to 4 hours (down from the default 10 hours) and it cannot be renewed. This means the user must re-authenticate every 4 hours — they cannot have a continuous session lasting more than 4 hours without logging off and back on. This reduces the window an attacker has to abuse a stolen TGT. For Tier 0 admins doing brief, specific tasks, this is acceptable. For service accounts with long-running processes, it would break operations.

---

*"Protected Users is an elegantly simple control — add an account to a group and instantly apply years of hardening knowledge automatically. No complex configuration, no GPO engineering — just add and protect."*
