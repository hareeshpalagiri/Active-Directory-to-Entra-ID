# 02 — NTLM

> **Section:** 03 — AD Authentication Protocols  
> **Difficulty:** Intermediate  
> **Ports:** No dedicated port — embedded in SMB (445), HTTP, RPC

---

## 📌 What is NTLM?

NTLM (NT LAN Manager) is Microsoft's **legacy authentication protocol** — older than Kerberos, simpler, but significantly less secure.

While Kerberos is the preferred protocol in modern AD environments, NTLM is still widely present because:
- Some applications do not support Kerberos
- Authentication to IP addresses (not hostnames) falls back to NTLM
- Non-domain-joined machines use NTLM
- Some legacy printers and network devices only support NTLM
- Cross-forest authentication sometimes falls back to NTLM

> **Simple definition:**  
> NTLM is a challenge-response authentication protocol where the server sends a random challenge, the client responds using a hash of their password, and the server verifies the response — without the password ever crossing the network.

---

## 🧠 NTLM vs Kerberos — Key Differences

| | Kerberos | NTLM |
|---|---|---|
| **Type** | Ticket-based | Challenge-response |
| **DC involvement** | Only at ticket request | Every authentication |
| **Mutual auth** | Yes (client AND server verified) | No (only client verified) |
| **Security** | Strong | Weak |
| **Speed** | Fast (ticket cached) | Slower (DC contacted each time) |
| **Works with IP** | ❌ No (needs hostname/SPN) | ✅ Yes |
| **Works offline** | Partially | ✅ Yes (local accounts) |
| **Preferred** | ✅ Always prefer Kerberos | ⚠️ Only when necessary |

---

## ⚙️ How NTLM Works — Step by Step

### NTLM Authentication Flow

```
Characters:
  Hareesh = user trying to authenticate
  Server  = the resource being accessed (file server, web app)
  DC01    = Domain Controller (for domain accounts)

Step 1 — NEGOTIATE:
  Hareesh → Server: "I want to authenticate, I support NTLM"
  (NTLMSSP_NEGOTIATE message — lists capabilities)

Step 2 — CHALLENGE:
  Server → Hareesh: "Here is a random 8-byte challenge: 0xA1B2C3D4E5F60102"
  (NTLMSSP_CHALLENGE message)

Step 3 — AUTHENTICATE:
  Hareesh's PC takes the challenge and computes a response:
  
  NTLMv2 Response = HMAC-MD5(
      NT_hash(password),          ← hash of Hareesh's password
      challenge + client_nonce + timestamp + domain + username
  )
  
  Hareesh → Server: {
      username: hareesh,
      domain: COMPANY,
      NTLMv2 response: [computed above]
  }

Step 4 — VERIFICATION:
  For domain accounts:
  Server → DC01: "Verify this response for user hareesh"
  (NetLogon secure channel — passes username + challenge + response)
  
  DC01 looks up Hareesh's NT hash from AD
  Computes the expected response
  Compares → Match? → Sends back: "Access allowed" or "Access denied"
  
  Server → Hareesh: Access granted ✅ or denied ❌

Key difference from Kerberos:
  The DC is contacted on EVERY authentication (no cached tickets)
  The server never verifies its own identity to the client (no mutual auth)
```

### NTLMv1 vs NTLMv2

```
NTLMv1 (very old — should not exist anywhere):
  Response = DES(NT_hash, challenge)
  → Very weak — crackable in seconds with rainbow tables
  → NEVER use

NTLMv2 (current — still used but weak):
  Response = HMAC-MD5(NT_hash, challenge + client_nonce + timestamp)
  → Stronger than v1 but still vulnerable to relay attacks
  → The NT hash itself is the problem — capture and reuse

LM Hash (ancient — should be disabled everywhere):
  Response based on LAN Manager hash
  → Extremely weak — 14-char password split into two 7-char chunks
  → Crackable almost instantly
  → Should be disabled on all modern systems
```

---

## 🔧 Real-World NTLM Configuration

### When NTLM is Used (Even in Modern Environments)

```
Scenario 1: Authentication by IP address
  Hareesh accesses \\192.168.1.50\Share (IP instead of hostname)
  → Kerberos fails (no SPN for IP addresses)
  → Falls back to NTLM automatically

Scenario 2: Workgroup (non-domain) machines
  A contractor's laptop (not joined to company.local)
  → Cannot get Kerberos ticket
  → Uses NTLM with local or domain credentials

Scenario 3: Legacy applications
  Old application hardcoded to use NTLM
  → Cannot be updated easily

Scenario 4: Cross-forest authentication (sometimes)
  If forest trust is not configured for Kerberos
  → Falls back to NTLM across trust

Scenario 5: Network printers (older models)
  Older HP/Ricoh printers only support NTLM
  → Cannot use Kerberos
```

### Configuring NTLMv2 Only via GPO

```
Enforce NTLMv2 minimum — never allow v1 or LM:

GPO Path:
Computer Config → Windows Settings → Security Settings
→ Local Policies → Security Options
→ "Network security: LAN Manager authentication level"

Set to: "Send NTLMv2 response only. Refuse LM & NTLM"

GPO Registry equivalent:
  HKLM\SYSTEM\CurrentControlSet\Control\Lsa
  LmCompatibilityLevel = 5

Levels:
  0 = Send LM and NTLM responses ← NEVER use
  1 = Send LM and NTLM — use NTLMv2 session if negotiated
  2 = Send NTLM response only
  3 = Send NTLMv2 response only
  4 = Send NTLMv2, refuse LM
  5 = Send NTLMv2 only, refuse LM and NTLM ← USE THIS
```

### Configuring NTLM for a Network Printer (Ricoh/HP)

```
Scenario: Older Ricoh printer only supports NTLM
          GP needs to configure it to authenticate against AD

Step 1: Access printer admin page
  https://192.168.1.200 (printer IP)
  Login: admin / [printer admin password]

Step 2: Configure NTLM authentication
  Settings → Security → Authentication
  → Authentication method: NTLM v2
  → Domain: COMPANY
  → DC IP: 192.168.1.10 (DC01)

Step 3: Configure user code on printer
  Each user has a PIN/code on the printer
  When they walk up → enter code → printer authenticates against AD via NTLM
  → If AD credentials valid → print job released ✅

Step 4: Test
  Hareesh walks to printer → enters his PIN
  Printer sends NTLM auth request to DC01
  DC01 verifies → printer unlocks ✅
  
Note: Modern printers support Kerberos — always prefer Kerberos
      Only use NTLM if the device does not support Kerberos
```

### Restricting NTLM in Your Environment

```powershell
# Audit NTLM usage first (before restricting)
# GPO: Computer Config → Windows Settings → Security Settings
# → Local Policies → Security Options
# → "Network security: Restrict NTLM: Audit NTLM authentication"
# Set to: "Enable auditing for all accounts"

# After auditing — find what is using NTLM:
# Event ID 8004 in "Microsoft-Windows-NTLM/Operational" log

Get-WinEvent -LogName "Microsoft-Windows-NTLM/Operational" |
    Where-Object {$_.Id -eq 8004} |
    Select-Object TimeCreated, Message -First 20

# Restrict NTLM to specific servers only:
# GPO → "Network security: Restrict NTLM: Add server exceptions"
# List servers that MUST use NTLM (legacy apps)

# Block NTLM completely (only after thorough testing):
# GPO → "Network security: Restrict NTLM: Incoming NTLM traffic"
# Set to: "Deny all accounts"
```

---

## ⚠️ NTLM Attack Techniques

### Attack 1 — Pass-the-Hash (PtH)

**The most critical NTLM vulnerability.**

```
What: NTLM authenticates using the password HASH — not the password itself.
      If you capture the hash → you can authenticate without knowing the password.
      The hash IS the credential in NTLM.

Why it works:
  In Step 3 of NTLM flow, the response is:
  NTLMv2 = HMAC-MD5(NT_hash, challenge + ...)
  
  If attacker has NT_hash → they can compute the same response
  → Authenticate as that user without their password

Step-by-step attack:
  Step 1: Attacker compromises DESKTOP-HR-001 (Hareesh's workstation)
  
  Step 2: Dump credentials from LSASS memory:
    mimikatz.exe
    privilege::debug
    sekurlsa::logonpasswords
    
    Output:
    Username: GP
    Domain: COMPANY
    NT Hash: 8f4b2c9d3e1a7f6b...  ← GP's NTLM hash
    
    (GP logged into this machine earlier to fix something)

  Step 3: Use GP's hash to authenticate to other machines:
    mimikatz: sekurlsa::pth /user:gp /domain:company.local
              /ntlm:8f4b2c9d3e1a7f6b... /run:cmd.exe

    OR with Impacket:
    python3 wmiexec.py company.local/gp@DC01 -hashes :8f4b2c9d3e1a7f6b...

  Step 4: Full access as GP (Domain Admin):
    dir \\DC01\C$  ✅
    
  GP's actual password was NEVER needed.
  Even if GP changes her password → the OLD hash might still be cached.

Tools: Mimikatz, Impacket, CrackMapExec, Metasploit
```

**Detection:**
```
Event ID 4624 — Logon
  Watch for:
  → LogonType 3 (network logon) from unexpected sources
  → NtLmSsp in authentication package (shows NTLM was used)
  → Admin accounts logging in from workstations (not admin machines)

Event ID 4776 — Credential validation
  → Failed validations from many machines = spray
  → Successful validation from unexpected source = PtH

Defender for Identity:
  → "Pass-the-Hash attack" alert fires automatically
```

**Defense:**
```
1. Enable Credential Guard:
   GPO: Computer Config → Admin Templates → System → Device Guard
   → Turn on Virtualization Based Security: Enabled
   → Credential Guard: Enabled with UEFI lock
   
   Credential Guard isolates LSASS in a separate VM
   → Even if LSASS is compromised → hashes cannot be extracted

2. Add privileged accounts to Protected Users group:
   Add-ADGroupMember -Identity "Protected Users" -Members "gp-admin"
   Protected Users: no NTLM auth, no credential caching

3. Never log into workstations with admin accounts:
   GP should NEVER log into Hareesh's workstation with her admin account
   Tiered admin model prevents this

4. Deploy LAPS:
   Local admin hashes are unique per machine
   Compromise of one machine's local admin → cannot lateral move

5. Disable NTLM where possible:
   Force Kerberos for all internal resources (use hostnames not IPs)
```

---

### Attack 2 — NTLM Relay Attack

**One of the most dangerous network-level attacks.**

```
What: Attacker sits between victim and server.
      Captures NTLM authentication attempt.
      Relays it to another server in real time.
      Authenticates to the second server AS the victim.

Why it works:
  NTLM has no mutual authentication — server never proves its identity
  Client blindly sends NTLM response to whoever challenges it
  Attacker relays that response to a REAL server → gains access

Step-by-step attack:
  Setup:
    Attacker runs Responder on the network:
    Responder.py -I eth0 -rdwv
    (Poisons LLMNR/NBT-NS/mDNS responses — lures victims to attacker)

  Step 1: Hareesh's laptop tries to access \\FileServer01\Share
          DNS fails (or typo: \\FileServe1\Share)
          Windows falls back to LLMNR broadcast:
          "Who is FileServe1?"

  Step 2: Attacker (Responder) responds: "I am FileServe1!"
          Hareesh's laptop initiates NTLM auth with attacker

  Step 3: Attacker receives NTLM challenge-response
          Simultaneously relays it to REAL FileServer01:
          Attacker → FileServer01: "Authenticate Hareesh"
          
          (Uses ntlmrelayx.py):
          python3 ntlmrelayx.py -t smb://FileServer01 -smb2support

  Step 4: FileServer01 processes relay:
          → Sees valid NTLM response from "Hareesh"
          → Grants access
          → Attacker has SMB access as Hareesh ✅

  More dangerous variant — relay to LDAP:
          python3 ntlmrelayx.py -t ldaps://DC01 --delegate-access
          → Creates a new computer account with delegation rights
          → Can now impersonate ANY user on the domain

Tools: Responder, ntlmrelayx.py (Impacket), Inveigh
```

**Detection:**
```
Signs of NTLM Relay:
  → Event ID 4776 on DC — credential validation from unexpected source
  → Unusual LLMNR/NBT-NS traffic (Wireshark: udp.port==5355 or udp.port==137)
  → New computer accounts created unexpectedly (Event ID 4741)
  → Defender for Identity: "NTLM relay attack" alert
```

**Defense:**
```
1. Disable LLMNR and NBT-NS (removes the lure):
   GPO: Computer Config → Admin Templates → Network → DNS Client
   → Turn off multicast name resolution: Enabled
   
   Registry: HKLM\SYSTEM\CurrentControlSet\Services\NetBT\Parameters
   NodeType = 2 (disable NetBIOS)

2. Enable SMB Signing on ALL machines:
   GPO: Computer Config → Windows Settings → Security Settings
   → Local Policies → Security Options
   → "Microsoft network server: Digitally sign communications (always)"
   → "Microsoft network client: Digitally sign communications (always)"
   
   SMB Signing: server signs all packets → relay attack fails
   (Relayed auth cannot be used without valid signature)

3. Enable LDAP Signing and Channel Binding:
   GPO: Computer Config → Windows Settings → Security Settings
   → Local Policies → Security Options
   → "Domain controller: LDAP server signing requirements"
   → Set to: Require signing
   
   Registry on DC:
   HKLM\SYSTEM\CurrentControlSet\Services\NTDS\Parameters
   LDAPServerIntegrity = 2

4. Require EPA (Extended Protection for Authentication):
   Binds NTLM to TLS channel → relay to different server fails

5. Use Kerberos everywhere (force hostname access):
   Never access resources by IP — always by hostname
   Map drives by hostname: \\FileServer01\Share (Kerberos)
   Not by IP: \\192.168.1.50\Share (NTLM)
```

---

### Attack 3 — NTLM Hash Capture and Cracking

```
What: Capture NTLM challenge-response from network traffic
      Crack offline to recover the actual password

Methods to capture:
  1. Responder (LLMNR/NBT-NS poisoning — as above)
  2. Wireshark on same network segment
  3. Evil twin Wi-Fi access point

Crack the captured NTLMv2 hash:
  hashcat -m 5600 ntlmv2.txt rockyou.txt
  hashcat -m 5600 ntlmv2.txt rockyou.txt -r rules/best64.rule

  NTLMv2 mode: 5600
  NTLMv1 mode: 5500 (very fast to crack)

Defense:
  → Long, complex passwords (25+ chars)
  → Disable NTLMv1 completely (LmCompatibilityLevel = 5)
  → MFA (cracked password alone is not enough)
  → LLMNR/NBT-NS disabled (no capture opportunity)
```

---

## 🛡️ NTLM Hardening Checklist

- [ ] Set LAN Manager auth level to 5 (NTLMv2 only) via GPO
- [ ] Disable LLMNR and NetBIOS-NS via GPO
- [ ] Enable SMB Signing on all machines (clients and servers)
- [ ] Enable LDAP Signing and Channel Binding on DCs
- [ ] Deploy Credential Guard on all Windows 10/11 machines
- [ ] Add all admin accounts to Protected Users group
- [ ] Deploy LAPS for unique local admin passwords
- [ ] Audit NTLM usage before restricting — Event ID 8004
- [ ] Restrict NTLM incrementally — start with audit, then restrict
- [ ] Never access internal resources by IP (forces NTLM fallback)
- [ ] Deploy Microsoft Defender for Identity (detects PtH, relay)

---

## 🔧 Troubleshooting NTLM

### Check What Authentication Protocol is Being Used

```powershell
# On a file server — check active sessions and auth type
Get-SmbSession | Select-Object ClientUserName, ClientComputerName, Dialect

# Check authentication events
Get-WinEvent -LogName Security |
    Where-Object {$_.Id -eq 4624} |
    ForEach-Object {
        $xml = [xml]$_.ToXml()
        [PSCustomObject]@{
            Time = $_.TimeCreated
            User = $xml.Event.EventData.Data[5].'#text'
            AuthPackage = $xml.Event.EventData.Data[10].'#text'
            LogonType = $xml.Event.EventData.Data[8].'#text'
        }
    } | Where-Object {$_.AuthPackage -like "*NTLM*"}

# Force Kerberos by using hostname (not IP)
# Bad (NTLM):  net use \\192.168.1.50\share
# Good (Kerberos): net use \\FileServer01.company.local\share
```

---

## 🎯 Interview Questions

**Q1. What is NTLM and when is it still used in modern environments?**  
**A:** NTLM is Microsoft's legacy challenge-response authentication protocol. Despite Kerberos being preferred, NTLM is still used when: accessing resources by IP address instead of hostname (Kerberos requires hostnames), authenticating from non-domain-joined machines, legacy applications that do not support Kerberos, and some older network devices (printers, switches) that only support NTLM. It should be audited and restricted wherever possible.

---

**Q2. What is Pass-the-Hash and why can you not defend against it just by changing the password?**  
**A:** Pass-the-Hash exploits the fact that NTLM authenticates using the password hash directly — the hash IS the credential. If an attacker captures GP's NTLM hash from memory (using Mimikatz), they can use that hash to authenticate as GP without ever knowing the actual password. Changing the password changes the hash — but if the attacker already has the old hash cached, some legacy applications may still accept it until the cache expires. Real defence requires: Credential Guard (prevents hash extraction from LSASS), Protected Users group (prevents NTLM auth for privileged accounts), and LAPS (unique local admin passwords).

---

**Q3. What is an NTLM Relay attack and what is the most effective defence?**  
**A:** An NTLM relay attack intercepts an NTLM authentication attempt (often triggered via LLMNR/NBT-NS poisoning) and relays it to another server in real time — authenticating as the victim on that server without knowing their password. The most effective defences are: disabling LLMNR and NetBIOS-NS (removes the poisoning vector), enabling SMB Signing (relay fails because the attacker cannot sign packets), and enabling LDAP channel binding (relay to LDAP/LDAPS fails). Together, these three controls eliminate most NTLM relay attack scenarios.

---

**Q4. What is the difference between NTLMv1 and NTLMv2?**  
**A:** NTLMv1 uses DES encryption of the NT hash with the challenge — it is extremely weak, crackable in seconds, and should never exist in any environment. NTLMv2 adds the client nonce, timestamp, and target information to the response, making it significantly harder to crack. However, NTLMv2 is still vulnerable to relay attacks and hash capture. The LAN Manager authentication level GPO setting should be set to 5 — send NTLMv2 only, refuse LM and NTLM.

---

**Q5. Scenario — Hareesh reports he can access \\FileServer01\Finance by name but not by IP (\\192.168.1.50\Finance). What is happening?**  
**A:** When accessing by hostname, Kerberos is used — Hareesh has a valid Kerberos service ticket for FileServer01 and has the necessary permissions. When accessing by IP, Kerberos falls back to NTLM because there is no SPN registered for an IP address. The NTLM authentication is likely failing. Possible causes: NTLM is restricted (good — enforce hostname access), the NTLM authentication is being blocked by firewall rules, or the account has restrictions on NTLM auth. The correct fix is to always use hostname access and enforce this via GPO — do not try to make IP-based access work, as it forces NTLM.

---

*"NTLM is a protocol that should be retired — but it never fully dies. Every environment has a legacy application, a stubborn printer, or a hardcoded IP address keeping it alive. Audit it, restrict it, and defend it — because attackers will find every NTLM authentication you have."*
