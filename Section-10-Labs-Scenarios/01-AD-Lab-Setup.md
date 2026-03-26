# 🧪 Lab 01 — Active Directory Home Lab Setup

> **Goal:** Build a fully functional Active Directory + Entra ID hybrid lab environment on your own PC — completely free using trial licenses and free tools. This is your personal cyber range for practicing everything in this repo.

---

## 🏗️ What You're Building

```
┌──────────────────────────────────────────────────────────────────────┐
│                    YOUR HOME LAB TOPOLOGY                            │
│                                                                      │
│  YOUR PHYSICAL PC (Host)                                             │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │   HYPERVISOR (Hyper-V or VMware Workstation / VirtualBox)      │  │
│  │                                                                │  │
│  │  ┌──────────────────┐    ┌──────────────────┐                  │  │
│  │  │   DC01           │    │   WIN10-CLIENT   │                  │  │
│  │  │   Windows Server │    │   Windows 10/11  │                  │  │
│  │  │   2022 Eval      │    │   Eval           │                  │  │
│  │  │                  │    │                  │                  │  │
│  │  │   - AD DS        │    │  - Domain joined │                  │  │
│  │  │   - DNS          │    │  - Test user     │                  │  │
│  │  │   - MDI sensor   │    │  - BloodHound    │                  │  │
│  │  │   192.168.10.10  │    │  192.168.10.20   │                  │  │
│  │  └──────────────────┘    └──────────────────┘                  │  │
│  │                                                                │  │
│  │  ┌──────────────────┐    ┌──────────────────┐                  │  │
│  │  │   ATTACKER-VM    │    │   SERVER01       │                  │  │
│  │  │   Kali Linux     │    │   Windows Server │                  │  │
│  │  │   (Free)         │    │   2022 Eval      │                  │  │
│  │  │                  │    │                  │                  │  │
│  │  │   - Impacket     │    │  - File Share    │                  │  │
│  │  │   - BloodHound   │    │  - IIS           │                  │  │
│  │  │   - Mimikatz     │    │  - SQL (optional)│                  │  │
│  │  │   192.168.10.99  │    │  192.168.10.30   │                  │  │
│  │  └──────────────────┘    └──────────────────┘                  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                    │                                 │
│                              Internet (NAT)                          │
│                                    │                                 │
│                             ┌──────────────┐                         │
│                             │  Microsoft   │                         │
│                             │  365 Trial   │                         │
│                             │  (Free 30d)  │                         │
│                             └──────────────┘                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 💻 Minimum PC Requirements

```
RECOMMENDED HOST MACHINE:
──────────────────────────────────────────────────────────────────
  CPU:    8 cores (Intel i7/i9 or AMD Ryzen 7/9)
  RAM:    16 GB minimum → 32 GB ideal
  Disk:   100 GB free (SSD strongly preferred)
  OS:     Windows 10/11 Pro or Enterprise (for Hyper-V)

BARE MINIMUM (will be slow but works):
──────────────────────────────────────────────────────────────────
  CPU:    4 cores
  RAM:    12 GB (run 2 VMs at a time instead of 4)
  Disk:   80 GB
```

---

## 📥 Step 1 — Download Everything (All Free)

```
DOWNLOADS:

  1. Windows Server 2022 Evaluation (180-day trial)
  ─────────────────────────────────────────────────────────────────
  URL: microsoft.com/en-us/evalcenter/evaluate-windows-server-2022
  Download: ISO file (~5 GB)
  License: Free 180 days, fully functional


  2. Windows 10/11 Enterprise Evaluation
  ─────────────────────────────────────────────────────────────────
  URL: microsoft.com/en-us/evalcenter/evaluate-windows-10-enterprise
  Download: ISO file (~5 GB)


  3. Kali Linux (attacker VM)
  ─────────────────────────────────────────────────────────────────
  URL: kali.org/get-kali/#kali-virtual-machines
  Download: Pre-built VMware/VirtualBox image (~3 GB)
  No setup needed — just import!


  4. Hypervisor (choose one)
  ─────────────────────────────────────────────────────────────────
  Hyper-V:         Built into Windows 10/11 Pro (free, enable in features)
  VMware Workstation Player: Free for personal use (vmware.com)
  VirtualBox:      Free, open source (virtualbox.org)


  5. Microsoft 365 E5 Trial
  ─────────────────────────────────────────────────────────────────
  URL: microsoft.com/en-us/microsoft-365/enterprise/compare-office-365-plans
  → Start free trial → E5 (30 days, includes MDI, MDE, Sentinel)
  TIP: Use a new email address / new Microsoft account for this
```

---

## 🖥️ Step 2 — Enable Hyper-V (Windows)

```
ENABLE HYPER-V:
──────────────────────────────────────────────────────────────────
  Option A: PowerShell (run as admin)
  ─────────────────────────────────────────────────────────────────
  Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All

  Option B: Windows Features
  ─────────────────────────────────────────────────────────────────
  Control Panel → Programs → Turn Windows features on or off
  ☑️  Hyper-V
  ☑️  Hyper-V Management Tools
  ☑️  Hyper-V Platform
  → OK → Restart PC


CREATE INTERNAL NETWORK SWITCH:
──────────────────────────────────────────────────────────────────
  Hyper-V Manager → Virtual Switch Manager
  → New virtual network switch
  → Type: Internal
  → Name: LabNetwork
  → Apply

  Then on your HOST:
  Control Panel → Network → LabNetwork adapter
  → Set IP: 192.168.10.1 / 255.255.255.0
  (This lets your host talk to VMs)
```

---

## ⚙️ Step 3 — Create DC01 (Domain Controller)

```
VM SETTINGS FOR DC01:
──────────────────────────────────────────────────────────────────
  Name:       DC01
  RAM:        2048 MB (2 GB)
  CPU:        2 virtual cores
  Disk:       60 GB (dynamic)
  Network:    LabNetwork (internal switch)
  ISO:        Windows Server 2022 Evaluation


WINDOWS SERVER SETUP:
──────────────────────────────────────────────────────────────────
  1. Boot from ISO
  2. Choose: Windows Server 2022 Standard (Desktop Experience)
  3. Custom install → fresh disk
  4. Set admin password: Lab@12345! (or your choice)
  5. After install → rename PC:
     Rename-Computer -NewName "DC01" -Restart


SET STATIC IP:
──────────────────────────────────────────────────────────────────
  # In PowerShell on DC01:
  New-NetIPAddress -InterfaceAlias "Ethernet" `
    -IPAddress 192.168.10.10 `
    -PrefixLength 24 `
    -DefaultGateway 192.168.10.1

  Set-DnsClientServerAddress -InterfaceAlias "Ethernet" `
    -ServerAddresses 127.0.0.1


INSTALL ACTIVE DIRECTORY:
──────────────────────────────────────────────────────────────────
  # Install AD DS role
  Install-WindowsFeature -Name AD-Domain-Services `
    -IncludeManagementTools

  # Promote to Domain Controller
  Install-ADDSForest `
    -DomainName "lab.local" `
    -DomainNetbiosName "LAB" `
    -SafeModeAdministratorPassword (ConvertTo-SecureString `
      "Lab@12345!" -AsPlainText -Force) `
    -InstallDns `
    -Force

  # Server will restart automatically
  # After restart: You have a working Domain Controller!
```

---

## 👥 Step 4 — Populate AD with Users and Groups

```
POPULATE YOUR LAB AD (run on DC01 as Administrator):
──────────────────────────────────────────────────────────────────

  # Create Organizational Units
  New-ADOrganizationalUnit -Name "Employees" -Path "DC=lab,DC=local"
  New-ADOrganizationalUnit -Name "IT" -Path "DC=lab,DC=local"
  New-ADOrganizationalUnit -Name "ServiceAccounts" -Path "DC=lab,DC=local"
  New-ADOrganizationalUnit -Name "Servers" -Path "DC=lab,DC=local"


  # Create regular users
  $users = @(
    @{Name="Alice Smith";     SamAccount="alice";   OU="Employees"},
    @{Name="Bob Jones";       SamAccount="bob";     OU="Employees"},
    @{Name="Charlie Brown";   SamAccount="charlie"; OU="Employees"},
    @{Name="Diana Prince";    SamAccount="diana";   OU="IT"},
    @{Name="Eve Admin";       SamAccount="eve";     OU="IT"}
  )

  foreach ($u in $users) {
    New-ADUser `
      -Name $u.Name `
      -SamAccountName $u.SamAccount `
      -UserPrincipalName "$($u.SamAccount)@lab.local" `
      -Path "OU=$($u.OU),DC=lab,DC=local" `
      -AccountPassword (ConvertTo-SecureString "Password123!" -AsPlainText -Force) `
      -Enabled $true `
      -PasswordNeverExpires $true
  }


  # Create service accounts (vulnerable - for attack labs)
  New-ADUser -Name "svc-sql" -SamAccountName "svc-sql" `
    -Path "OU=ServiceAccounts,DC=lab,DC=local" `
    -AccountPassword (ConvertTo-SecureString "Service@2024" -AsPlainText -Force) `
    -Enabled $true -PasswordNeverExpires $true

  # Set SPN on service account (enables Kerberoasting lab!)
  Set-ADUser -Identity "svc-sql" `
    -ServicePrincipalNames @{Add="MSSQLSvc/SERVER01.lab.local:1433"}


  # Create groups
  New-ADGroup -Name "IT-Admins" -GroupScope Global -Path "OU=IT,DC=lab,DC=local"
  New-ADGroup -Name "HR-Team" -GroupScope Global -Path "OU=Employees,DC=lab,DC=local"
  New-ADGroup -Name "Finance" -GroupScope Global -Path "OU=Employees,DC=lab,DC=local"

  # Add members
  Add-ADGroupMember -Identity "IT-Admins" -Members "diana","eve"
  Add-ADGroupMember -Identity "Domain Admins" -Members "diana"
  Add-ADGroupMember -Identity "HR-Team" -Members "alice","bob"
  Add-ADGroupMember -Identity "Finance" -Members "charlie"

  Write-Host "Lab AD populated!" -ForegroundColor Green
```

---

## 🖥️ Step 5 — Join Windows 10 Client to Domain

```
CREATE WIN10 VM:
──────────────────────────────────────────────────────────────────
  Name:    WIN10-CLIENT
  RAM:     2048 MB
  CPU:     2 cores
  Disk:    40 GB
  Network: LabNetwork
  ISO:     Windows 10/11 Enterprise Eval


SET IP AND JOIN DOMAIN:
──────────────────────────────────────────────────────────────────
  # Set static IP
  New-NetIPAddress -InterfaceAlias "Ethernet" `
    -IPAddress 192.168.10.20 `
    -PrefixLength 24 `
    -DefaultGateway 192.168.10.1

  # Point DNS to DC
  Set-DnsClientServerAddress -InterfaceAlias "Ethernet" `
    -ServerAddresses 192.168.10.10

  # Join domain
  Add-Computer -DomainName "lab.local" `
    -Credential (Get-Credential) `
    -Restart

  # Enter: LAB\Administrator / Lab@12345!
  # PC will restart and join the domain!
```

---

## ✅ Step 6 — Verify Your Lab

```
VERIFICATION CHECKLIST:
──────────────────────────────────────────────────────────────────
  ON DC01:
  □ Open Active Directory Users and Computers
  □ See your OUs: Employees, IT, ServiceAccounts
  □ See your users: alice, bob, charlie, diana, eve, svc-sql
  □ See WIN10-CLIENT in Computers container

  FROM WIN10-CLIENT:
  □ Login as: LAB\alice / Password123!
  □ Open cmd → whoami → should show lab\alice
  □ Open cmd → net view → should see DC01 and SERVER01
  □ Access \\DC01\SYSVOL → should work

  NETWORK TEST:
  □ From WIN10: ping 192.168.10.10 → DC01 responds
  □ From Kali: ping 192.168.10.10 → DC01 responds
  □ From DC01: ping 192.168.10.20 → CLIENT responds

  AD FUNCTIONALITY:
  □ Run on DC01: Get-ADUser -Filter * | Select Name → lists all users
  □ Run: Get-ADGroup -Filter * | Select Name → lists all groups
```

---

## 🆓 Optional: Add Microsoft 365 Trial

```
CONNECT YOUR LAB TO M365:
──────────────────────────────────────────────────────────────────
  1. Sign up for M365 E5 Trial (use personal email)
  2. Set up custom domain in M365 admin center (or use .onmicrosoft.com)
  3. Install Entra Connect on DC01:
     - Download from aka.ms/AADConnect
     - Configure: Password Hash Sync
     - Source: lab.local → Target: yourtenant.onmicrosoft.com
  4. After sync: See your AD users in Entra ID portal!

  THIS ENABLES:
  ✅ Section 08 hybrid identity labs
  ✅ Section 07 Conditional Access labs
  ✅ MDI sensor deployment
  ✅ Microsoft Sentinel connection
```

---

## ✅ Summary

```
┌───────────────────────────────────────────────────────────────────┐
│  LAB SETUP COMPLETE WHEN:                                         │
│                                                                   │
│  🖥️  DC01 running with lab.local domain                           │
│  👥  5+ users, 3+ groups, 1 service account with SPN              │
│  💻  WIN10-CLIENT joined to domain                                │
│  🐧  Kali Linux VM ready for attack labs                          │
│  🌐  Optional: M365 trial + Entra Connect syncing                 │
│                                                                   │
│  TIME TO SETUP: ~2-3 hours for first time                         │
│  COST: $0 (all eval/free software)                                │
└───────────────────────────────────────────────────────────────────┘
```

---

**Next →** [02 - GPO Lab](./02-GPO-Lab.md)
