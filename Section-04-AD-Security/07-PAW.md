# 07 — Privileged Access Workstations (PAW)

> **Section:** 04 — AD Security & Hardening  
> **Difficulty:** Advanced  
> **Stops:** Credential theft from admin workstations, malware-based compromise of admin sessions

---

## 📌 What is a PAW?

A **Privileged Access Workstation (PAW)** is a dedicated, hardened computer used **exclusively** for administrative tasks — nothing else.

GP has two machines:
- Her **regular laptop** for email, Teams, web browsing
- Her **PAW** for domain admin tasks — nothing else runs on it

The PAW is locked down so tightly that even if the rest of the network is compromised, the PAW (and the credentials used on it) remain safe.

> **Simple definition:**  
> A PAW is a dedicated, ultra-hardened workstation used only for privileged administration — no email, no browsing, no Office documents — reducing the attack surface to near zero for admin credential theft.

---

## 🔐 Why PAWs Are Necessary

```
Without PAW:
  GP uses her regular laptop for everything:
  → Email (phishing target)
  → Web browsing (drive-by downloads)
  → Office documents (macro malware)
  → Also: domain admin tasks

  Malware from phishing email runs on her laptop
  Mimikatz extracts her Domain Admin credentials from LSASS
  Entire domain compromised ❌

With PAW:
  GP's regular laptop: email, browsing, Teams
  GP's PAW: ONLY domain admin tasks
  
  Phishing email hits GP's regular laptop
  Malware runs on regular laptop
  Mimikatz extracts only her STANDARD USER credentials ← no admin rights ✅
  
  GP's Tier 0 admin account is ONLY ever used on the PAW
  PAW has no email, no browser, no attack surface ← nothing to phish
  Domain stays safe ✅
```

---

## 🔧 Building a PAW — Step by Step

### Hardware & OS

```
Option 1: Dedicated physical machine
  → Separate laptop/desktop used ONLY for admin tasks
  → Best isolation
  → More expensive

Option 2: Secure admin workstation on the same machine
  → Admin VM in Hyper-V isolated from main OS
  → Host OS = standard user only
  → Admin VM = admin work only (no internet from VM)
  → More practical for most organisations

OS: Windows 11 Enterprise (latest version)
    Kept fully patched at all times
    Monthly patching (highest priority)
```

### GPO Configuration for PAW OU

```
GPO: "PAW-Security-Baseline"
Applied to: OU=Tier0-PAWs, OU=Tier1-PAWs

─────────────────────────────────────────
Internet & Network Restrictions:
─────────────────────────────────────────
Computer Config → Windows Settings → Security Settings → Windows Firewall
  → Block all outbound except:
    - Active Directory (ports 88, 389, 636, 3268, 49152-65535)
    - DNS (53)
    - NTP (123)
    - Windows Update (443 to Microsoft IPs)
    - CRL/OCSP (80/443 for certificate validation)
  → Block all inbound except:
    - RDP from specific management IPs only

User Config → Admin Templates → Windows Components → Internet Explorer
  → Disable Internet Explorer: Enabled
  → (Also disable Edge for internet browsing)

─────────────────────────────────────────
Application Restrictions (AppLocker/WDAC):
─────────────────────────────────────────
Only approved admin tools allowed to run:
  ✅ mmc.exe (AD management)
  ✅ powershell.exe (admin scripts — signed only)
  ✅ rsat tools (Remote Server Admin Tools)
  ✅ Approved browsers (internal sites only)
  ❌ outlook.exe → BLOCKED
  ❌ chrome.exe → BLOCKED (internet)
  ❌ teams.exe → BLOCKED
  ❌ office apps → BLOCKED
  ❌ Anything unsigned → BLOCKED

─────────────────────────────────────────
Credential Protection:
─────────────────────────────────────────
  Credential Guard: Enabled with UEFI lock
  Protected Users: All accounts on PAW in Protected Users group
  Smart card: Required for all logons
  
─────────────────────────────────────────
Local Security:
─────────────────────────────────────────
  BitLocker: Enabled (TPM + PIN)
  Screen lock: 5 minutes inactivity
  USB: Disabled (no USB storage — only smart card readers)
  Bluetooth: Disabled
  Wi-Fi: Disabled for Tier 0 PAWs (wired only)
  
─────────────────────────────────────────
Logon Restrictions:
─────────────────────────────────────────
  Allow logon: Only Tier 0 admin accounts (for Tier 0 PAW)
  Deny logon: All standard user accounts, Tier 1/2 admin accounts
  Deny network logon from PAW: All except management traffic
```

### Configuring the PAW OU and Logon GPO

```powershell
# Create PAW OUs
New-ADOrganizationalUnit -Name "Tier0-PAWs" `
    -Path "OU=PAWs,DC=company,DC=local" `
    -ProtectedFromAccidentalDeletion $true

New-ADOrganizationalUnit -Name "Tier1-PAWs" `
    -Path "OU=PAWs,DC=company,DC=local" `
    -ProtectedFromAccidentalDeletion $true

# Move PAW computer accounts to correct OU
Move-ADObject -Identity "CN=GP-PAW-01,CN=Computers,DC=company,DC=local" `
    -TargetPath "OU=Tier0-PAWs,OU=PAWs,DC=company,DC=local"

# Create GPO for PAW
New-GPO -Name "PAW-Tier0-Security-Baseline"
New-GPLink -Name "PAW-Tier0-Security-Baseline" `
    -Target "OU=Tier0-PAWs,OU=PAWs,DC=company,DC=local"

# Restrict who can log into Tier 0 PAWs
# In GPO → User Rights Assignment:
# Allow log on locally: Tier0-Admins group ONLY
# Deny log on locally: Domain Users, Tier1-Admins, Tier2-Users
```

---

## 🏢 Real-World PAW Usage

### GP's Daily Workflow

```
Morning — Standard laptop:
  → Logs in with gp@company.com (standard user)
  → Email, Teams, web browsing, meetings
  → Standard laptop connected to internet ← normal attack surface

When GP needs to do AD admin work:
  → Walks to her PAW (or switches to admin VM)
  → Inserts smart card → enters PIN
  → Logs in with gp-t0@company.com (Tier 0 admin account)
  → Performs admin task: create accounts, modify GPO, check replication
  → Logs out of PAW (or locks it)
  → Returns to standard laptop

What CANNOT happen on the PAW:
  ❌ GP cannot receive email on the PAW
  ❌ GP cannot browse the internet on the PAW
  ❌ Phishing links cannot be clicked (no browser/email)
  ❌ Malicious attachments cannot run (AppLocker blocks them)
  ❌ USB drives cannot be inserted (USB disabled)

Result:
  The PAW has essentially zero attack surface ✅
  GP's Tier 0 credentials stay safe ✅
```

---

## ⚠️ PAW Bypass Attempts

### Bypass 1 — Phishing the PAW User

```
Attack: Send GP a phishing email to her STANDARD laptop
        Trick her into thinking she needs to enter admin credentials
        
Defense: Admin credentials should NEVER be typed outside the PAW
         Tier 0 account protected by smart card (cannot type the password anyway)
         User training: admin tasks ONLY on PAW
```

### Bypass 2 — Compromising the PAW Itself

```
Attack: Exploit vulnerability in approved PAW software
        or supply chain attack on approved tools
        
Defense:
  Monthly patching (highest priority — patch PAWs before other systems)
  Signed software only (WDAC/AppLocker)
  EDR (Defender for Endpoint) running on PAW
  Network isolation — PAW cannot reach internet
```

### Bypass 3 — Social Engineering Admin to Use Wrong Machine

```
Attack: "GP, the server is down — can you quickly log into AD from your regular laptop?"
        
Defense: Policy and training — NEVER use admin account from non-PAW
         Technical: Deny logon GPO prevents admin account on regular machines anyway
```

---

## 🛡️ PAW Hardening Checklist

- [ ] Dedicated hardware or isolated VM for PAWs
- [ ] Windows 11 Enterprise, fully patched monthly
- [ ] BitLocker with TPM + PIN enabled
- [ ] Smart card required for logon
- [ ] Credential Guard enabled with UEFI lock
- [ ] AppLocker/WDAC — approved tools only
- [ ] No email client on PAW
- [ ] No internet browser on PAW (or blocked via firewall)
- [ ] USB storage disabled (smart card readers only)
- [ ] Wi-Fi disabled for Tier 0 PAWs (wired only)
- [ ] Firewall: block all outbound except required admin protocols
- [ ] GPO: deny logon for non-admin accounts
- [ ] Separate PAW OU with dedicated GPO
- [ ] EDR (Defender for Endpoint) running on PAW
- [ ] Monitor PAW for any unusual process executions

---

## 🎯 Interview Questions

**Q1. What is a PAW and why is it needed even if you have MFA?**  
**A:** A Privileged Access Workstation is a dedicated, hardened machine used exclusively for administrative tasks — no email, browsing, or general use. MFA verifies identity at login but does not protect against malware running on the same machine after login. If GP's laptop has malware and she uses it for admin tasks, the malware can intercept her session, inject keystrokes, or extract credentials from memory — even after MFA authentication. A PAW eliminates this risk by having no attack surface: no email to phish, no browser for drive-by downloads, no USB for malware delivery.

---

**Q2. What is the minimum set of restrictions a PAW must have?**  
**A:** No email client, no internet browser (or strictly blocked to internal sites only), AppLocker/WDAC allowing only approved admin tools, BitLocker encryption, Credential Guard, smart card logon required, USB storage disabled, network firewall blocking all non-administrative traffic, and GPO preventing non-admin accounts from logging in. Patching must be the highest priority — PAWs must always be on the latest OS and security updates.

---

*"A PAW is not a luxury — it is the minimum acceptable security for anyone with Domain Admin rights. If your admin's credentials are sitting on a machine that also reads email and browses the web, you do not have a Tier 0 admin account — you have a Domain Admin waiting to be phished."*
