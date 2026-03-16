# 05 — RADIUS & 802.1X

> **Section:** 03 — AD Authentication Protocols  
> **Difficulty:** Intermediate  
> **Ports:** 1812 (Authentication), 1813 (Accounting), 1645/1646 (legacy)

---

## 📌 What is RADIUS?

When Hareesh connects to the company Wi-Fi or VPN, something needs to verify that he is a legitimate domain user before letting him onto the network.

**RADIUS (Remote Authentication Dial-In User Service)** is the protocol that handles this — it is the bridge between network devices (Wi-Fi access points, VPN concentrators, switches) and Active Directory.

> **Simple definition:**  
> RADIUS is an authentication protocol that allows network devices (switches, Wi-Fi, VPN) to verify user credentials against a central server (like Active Directory) before granting network access.

### Real-World Analogy

Think of a **nightclub with a guest list**:

- The **bouncer** (Wi-Fi access point / VPN) checks if you are allowed in
- The bouncer does not have the guest list — he phones **head office** (RADIUS server)
- Head office checks the **master list** (Active Directory)
- Head office tells the bouncer: "Let them in" or "Turn them away"
- The bouncer acts on that instruction

The bouncer never holds your personal information — head office does all the verification.

---

## 🏗️ RADIUS Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│  RADIUS Client  │         │  RADIUS Server   │         │    Active    │
│                 │         │  (NPS on Windows)│         │  Directory   │
│  Wi-Fi AP       │────────►│                  │────────►│              │
│  VPN Gateway    │◄────────│  Validates creds │◄────────│  User store  │
│  Network Switch │         │  Checks groups   │         │              │
│  Printer        │         │  Returns policy  │         │              │
└─────────────────┘         └──────────────────┘         └──────────────┘
   RADIUS Client                RADIUS Server                  Backend
   (supplicant sends              (NPS/FreeRADIUS)
    auth request)
```

**Key components:**
- **RADIUS Client** — the network device (AP, VPN, switch) — NOT the end user
- **RADIUS Server** — Windows NPS (Network Policy Server) or FreeRADIUS
- **Supplicant** — the end user's device trying to authenticate
- **Shared Secret** — a password shared between RADIUS Client and RADIUS Server

---

## 📡 What is 802.1X?

802.1X is the **IEEE standard for port-based network access control** — it uses RADIUS as its authentication backend.

```
Without 802.1X:
  Anyone who plugs a cable into a network port → gets network access
  Anyone who knows the Wi-Fi password → gets network access
  Attacker plugs laptop into empty office port → inside the network

With 802.1X:
  Device plugs into port → port is BLOCKED (unauthorised VLAN)
  Device must authenticate → sends credentials to RADIUS
  RADIUS verifies against AD → success → port opened
  Device gets correct VLAN based on group membership
  Wrong credentials → port stays blocked ✅
```

### 802.1X Components

```
Supplicant   = Hareesh's laptop (the device authenticating)
Authenticator = Network switch or Wi-Fi AP (enforces access)
Auth Server  = NPS/RADIUS (verifies credentials)

Flow:
Hareesh's laptop → Switch: "I want network access"
Switch → Hareesh's laptop: "Authenticate yourself first"
Hareesh's laptop → NPS (via switch): RADIUS auth request
NPS → Active Directory: verify hareesh credentials
AD → NPS: success
NPS → Switch: "Access granted — put in VLAN 20 (Staff)"
Switch → Hareesh's laptop: "You're in" ✅ port opened, VLAN 20 assigned
```

---

## ⚙️ Authentication Methods in 802.1X

| Method | What it uses | Security |
|--------|-------------|---------|
| **PEAP-MSCHAPv2** | Username + password, wrapped in TLS | ✅ Good — most common |
| **EAP-TLS** | Client certificate — no password | ✅✅ Best — phishing resistant |
| **EAP-TTLS** | Username + password in TLS tunnel | ✅ Good |
| **LEAP** | Cisco proprietary — legacy | ❌ Broken |

---

## 🔧 Real-World RADIUS Configuration

### Configuration 1 — Windows NPS for Wi-Fi Authentication

```
Scenario: Company has Cisco Meraki Wi-Fi.
          GP needs to configure 802.1X so employees authenticate
          with their domain credentials — no shared Wi-Fi password.

─────────────────────────────────────────
STEP 1: Install NPS role on Windows Server
─────────────────────────────────────────
  Server Manager → Add Roles and Features
  → Role: Network Policy and Access Services
  → Role Service: Network Policy Server ✅

─────────────────────────────────────────
STEP 2: Register NPS with Active Directory
─────────────────────────────────────────
  NPS Console → right-click "NPS (Local)"
  → "Register server in Active Directory"
  This allows NPS to read AD user accounts and group memberships

─────────────────────────────────────────
STEP 3: Add the Wi-Fi AP as a RADIUS Client
─────────────────────────────────────────
  NPS → RADIUS Clients and Servers → RADIUS Clients → New
  
  Friendly name: Meraki-AP-Office1
  Address: 192.168.1.254 (Meraki AP IP)
  Shared secret: [strong random secret — min 22 chars]
  ← Same secret must be entered on the Meraki AP side
  
  Add all APs as RADIUS clients (one entry per AP or use IP range)

─────────────────────────────────────────
STEP 4: Create a Network Policy
─────────────────────────────────────────
  NPS → Policies → Network Policies → New
  
  Policy name: Wi-Fi-Staff-Access
  
  Conditions:
  → Windows Groups: Add → SG-WiFi-Staff (only this group gets Wi-Fi)
  → NAS Port Type: Wireless - IEEE 802.11
  
  Constraints:
  → Authentication Methods: PEAP (EAP-MSCHAPv2)
  → Check: Microsoft Encrypted Authentication version 2 (MS-CHAP-V2)
  
  Settings:
  → Standard RADIUS Attributes:
    Tunnel-Type = VLAN (value: 13)
    Tunnel-Medium-Type = 802 (value: 6)
    Tunnel-Pvt-Group-ID = 20 ← VLAN 20 for staff

─────────────────────────────────────────
STEP 5: Configure Meraki AP (RADIUS Client side)
─────────────────────────────────────────
  Meraki Dashboard → Wireless → SSIDs
  → Company-Secure SSID
  → Association requirements: WPA2-Enterprise
  → RADIUS servers:
    Host: 192.168.1.20 (NPS server IP)
    Port: 1812
    Secret: [same shared secret from Step 3]
  
  Walled garden: disable (employees get full access after auth)

─────────────────────────────────────────
STEP 6: Configure Windows Supplicant (client)
─────────────────────────────────────────
  Option A — GPO (automatic, recommended):
  GPO: Computer Config → Windows Settings → Security Settings
  → Wired Network (IEEE 802.3) Policies → New Policy
  → SSID: Company-Secure
  → Security type: WPA2-Enterprise
  → Authentication: PEAP
  → Authentication method: EAP-MSCHAPV2
  → Auto-connect: Yes
  
  When Hareesh's laptop boots → automatically connects to Company-Secure
  Uses his domain credentials → authenticated ✅
  No password to type ✅ (uses cached domain credentials)

  Option B — Manual (for testing):
  Windows Settings → Wi-Fi → Company-Secure → Connect
  → Username: hareesh@company.com
  → Password: [domain password]

─────────────────────────────────────────
STEP 7: Test and Verify
─────────────────────────────────────────
  NPS logs: Event Viewer → Custom Views → Network Policy and Access Services
  
  Success: Event ID 6272 — Network Policy Server granted access
  Failure: Event ID 6273 — Network Policy Server denied access
           (check reason code for troubleshooting)
```

---

### Configuration 2 — RADIUS for Cisco VPN (ASA)

```
Scenario: Hareesh needs to connect from home via Cisco AnyConnect VPN.
          Only members of SG-VPN-Users should get VPN access.

Step 1: NPS already installed (from Config 1)

Step 2: Add Cisco ASA as RADIUS Client
  NPS → RADIUS Clients → New
  Friendly name: Cisco-ASA-VPN
  Address: 203.x.x.x (ASA external IP)
  Shared secret: [different strong secret from Wi-Fi]

Step 3: Create VPN Network Policy
  NPS → Network Policies → New
  
  Policy name: VPN-Access-Policy
  
  Conditions:
  → Windows Groups: SG-VPN-Users
  → NAS Port Type: Virtual (VPN)
  
  Authentication:
  → MS-CHAP-V2 (for PEAP)
  → OR PAP (for simple password auth to RADIUS)
  
  Settings:
  → Standard: Framed-Protocol = PPP
  → Vendor-Specific: Cisco AV-Pair
    → svc-group-policy=VPN-Split-Tunnel ← assigns VPN group policy

Step 4: Configure Cisco ASA
  aaa-server NPS-RADIUS protocol radius
  aaa-server NPS-RADIUS (inside) host 192.168.1.20
    key [shared secret]
    authentication-port 1812
    accounting-port 1813

  tunnel-group AnyConnect-VPN general-attributes
    authentication-server-group NPS-RADIUS
    default-group-policy VPN-Policy

Step 5: Test
  Hareesh opens AnyConnect → company VPN address
  Enters: hareesh@company.com / [password]
  ASA → NPS → AD: verify credentials + group membership
  NPS: Hareesh is in SG-VPN-Users → Access granted ✅
  AnyConnect tunnel established ✅
  
  A user NOT in SG-VPN-Users:
  ASA → NPS → AD: user not in SG-VPN-Users → Access denied ❌
  AnyConnect: "Authentication failed" ✅
```

---

### Configuration 3 — 802.1X for Wired Network Switches

```
Scenario: Company has Cisco switches. GP wants 802.1X
          so only authorised devices can access the wired network.
          Devices get different VLANs based on their group.

Step 1: Configure Cisco switch (802.1X)
  ! Enable 802.1X globally
  aaa new-model
  aaa authentication dot1x default group radius
  dot1x system-auth-control
  
  ! Configure RADIUS server
  radius server NPS
    address ipv4 192.168.1.20 auth-port 1812 acct-port 1813
    key [shared secret]
  
  ! Configure interface (per port)
  interface FastEthernet0/1
    switchport mode access
    dot1x port-control auto      ← require auth before access
    dot1x timeout tx-period 10
    spanning-tree portfast
  
  ! VLANs based on auth result
  vlan 10 name Staff
  vlan 20 name IT-Admin
  vlan 99 name Guest-Quarantine

Step 2: NPS policy with VLAN assignment
  Policy: Wired-Staff
  Conditions: SG-Staff-Members
  VLAN: Tunnel-Pvt-Group-ID = 10

  Policy: Wired-IT-Admin
  Conditions: SG-IT-Operations
  VLAN: Tunnel-Pvt-Group-ID = 20

  Default (auth fail): VLAN 99 (quarantine)
  
  Result:
  Hareesh plugs in → 802.1X → VLAN 10 (Staff) ✅
  IT Admin plugs in → 802.1X → VLAN 20 (IT) ✅
  Contractor's laptop plugs in → 802.1X fails → VLAN 99 (quarantine) 
  Unknown device → no auth → port blocked ✅
```

---

### Configuration 4 — EAP-TLS (Certificate-Based — Most Secure)

```
Scenario: GP wants maximum security — users authenticate with
          certificates (not passwords) for Wi-Fi.
          Even if password is stolen → Wi-Fi access not possible.

Why EAP-TLS is best:
  PEAP-MSCHAPv2: user types username + password → phishable
  EAP-TLS: device presents certificate → cannot be phished
           No password → nothing to steal or crack

Step 1: Deploy AD CS (Certificate Authority)
  Install ADCS role → Enterprise CA
  Create certificate template: "Wi-Fi User Auth"
  → Based on User template
  → Enhanced Key Usage: Client Authentication
  → Auto-enroll: Yes (via GPO)

Step 2: Auto-enroll certificates to all users
  GPO: Computer Config → Windows Settings → Security Settings
  → Public Key Policies → Certificate Services Client - Auto-Enrollment
  → Enabled, renew expired, update, remove revoked

  All domain users automatically get a certificate ✅

Step 3: Configure NPS for EAP-TLS
  NPS → Network Policies → Wi-Fi-Staff-Access
  → Authentication: Smart Card or other certificate (EAP-TLS)
  → Select NPS server certificate

Step 4: Configure Meraki for EAP-TLS
  → Authentication: WPA2-Enterprise
  → EAP method: EAP-TLS

Result:
  Hareesh's laptop has a certificate (auto-enrolled)
  Connects to Wi-Fi → presents certificate automatically
  NPS validates certificate against CA → access granted ✅
  No password typed ✅
  Even if Hareesh's password is phished → Wi-Fi unaffected ✅
```

---

## ⚠️ RADIUS & 802.1X Attack Techniques

### Attack 1 — Evil Twin Wi-Fi Attack

```
What: Attacker creates a fake Wi-Fi access point with the same SSID
      When users connect → attacker captures PEAP-MSCHAPv2 credentials

Step-by-step:
  Company SSID: "Company-Secure"
  
  Attacker sets up fake AP: "Company-Secure" (same name)
  Broadcasts stronger signal → devices prefer attacker's AP
  
  Hareesh's laptop connects to evil twin
  Laptop sends PEAP-MSCHAPv2 credentials to attacker
  Attacker captures the MSCHAPv2 challenge-response hash
  
  Using hashcat to crack:
  hashcat -m 5500 mschapv2_hash.txt rockyou.txt
  
  Result: Hareesh's domain password cracked ❌

Defense:
  1. Use EAP-TLS (certificate-based) — no password to capture
  2. Configure clients to ONLY trust specific RADIUS server certificate:
     GPO: Wi-Fi profile → Authentication → Validate server certificate
     → Trusted root: [Company CA certificate]
     → Server names: nps01.company.local
     This ensures clients reject any fake RADIUS server
  3. Enable server certificate validation on all clients
```

---

### Attack 2 — RADIUS Shared Secret Brute Force

```
What: RADIUS uses a shared secret between the AP and NPS.
      If weak → attacker who captures RADIUS packets can brute force it.

Step-by-step:
  Attacker captures RADIUS traffic (UDP 1812)
  Uses freeradius-wpe or radius-crack to brute force the shared secret
  
  If cracked → attacker can:
  → Decode all RADIUS authentication traffic
  → Create forged RADIUS responses (grant themselves access)

Defense:
  1. Use strong, random shared secrets (min 22 characters)
  2. Use different shared secrets for each RADIUS client
  3. Use RADSEC (RADIUS over TLS) for encrypted RADIUS traffic
  4. Monitor for repeated RADIUS authentication failures (Event ID 6273)
```

---

### Attack 3 — 802.1X Authentication Bypass

```
What: Some older implementations can be bypassed using MAC spoofing
      or by connecting via a hub (allows auth then swap device)

MAC Auth Bypass (MAB) weakness:
  Some environments allow devices without 802.1X (printers, cameras)
  to authenticate using their MAC address (MAC Auth Bypass)
  
  Attacker sees MAC address of a trusted device (e.g., printer: AA:BB:CC:DD:EE:FF)
  Spoofs that MAC on their laptop
  switch sees "known printer" → grants VLAN access without 802.1X

Defense:
  1. Never rely on MAC-only authentication for sensitive VLANs
  2. Use 802.1X + MAC whitelist (require BOTH)
  3. Segment printer VLAN so even if spoofed → limited access
  4. Use dynamic ARP inspection and DHCP snooping on switches
```

---

## 🛡️ RADIUS & 802.1X Hardening Checklist

- [ ] Use strong RADIUS shared secrets (22+ random characters)
- [ ] Use unique shared secret per RADIUS client (AP, VPN, switch)
- [ ] Enable NPS logging — Event IDs 6272, 6273 monitored
- [ ] Configure clients to validate RADIUS server certificate
- [ ] Use EAP-TLS (certificates) instead of PEAP-MSCHAPv2 where possible
- [ ] Use RADSEC for encrypted RADIUS traffic between NPS and clients
- [ ] Separate VLANs for staff, IT, guests, IoT
- [ ] Monitor for repeated auth failures (possible spray attack)
- [ ] Review RADIUS client list — remove decommissioned devices
- [ ] Test 802.1X bypass resistance quarterly

---

## 🔧 Troubleshooting RADIUS

```powershell
# Check NPS service is running
Get-Service -Name IAS

# View NPS authentication logs
Get-WinEvent -LogName "Security" |
    Where-Object {$_.Id -eq 6272 -or $_.Id -eq 6273} |
    Select-Object TimeCreated, Id, Message -First 20

# Event 6272 = Access Granted
# Event 6273 = Access Denied (check reason code)

# Common reason codes in Event 6273:
# Reason 16 = Authentication failed (wrong password)
# Reason 65 = Computer groups do not match policy conditions
# Reason 66 = User groups do not match policy conditions

# Enable NPS debug logging (temporary — for troubleshooting only)
netsh ras set tracing * enabled
# Logs written to: C:\Windows\tracing\

# Test NPS policy manually
# NPS Console → right-click "NPS (Local)" → Start NPS Network Monitor
# Then trigger authentication from a client

# Check RADIUS ports are open on NPS server
Test-NetConnection -ComputerName "NPS01.company.local" -Port 1812
Test-NetConnection -ComputerName "NPS01.company.local" -Port 1813

# Verify NPS is registered in AD
netsh nps show registered
```

---

## 🎯 Interview Questions

**Q1. What is RADIUS and how does it relate to Active Directory?**  
**A:** RADIUS (Remote Authentication Dial-In User Service) is a protocol that allows network devices like Wi-Fi access points, VPN gateways, and switches to offload user authentication to a central server. In an AD environment, Windows NPS (Network Policy Server) acts as the RADIUS server and validates credentials against Active Directory. The network device (RADIUS client) never touches AD directly — it sends authentication requests to NPS, which handles the AD lookup and returns an access granted or denied response.

**Q2. What is 802.1X and why is it important for network security?**  
**A:** 802.1X is an IEEE standard for port-based network access control. Before a device can access the network (wired or Wi-Fi), it must authenticate — using RADIUS as the backend. Without 802.1X, anyone who plugs into a network port or knows the Wi-Fi password gets network access. With 802.1X, only devices with valid credentials (or certificates) get access, and they can be placed into specific VLANs based on their identity. It prevents rogue device access and enables granular network segmentation.

**Q3. What is the difference between PEAP-MSCHAPv2 and EAP-TLS?**  
**A:** PEAP-MSCHAPv2 uses username and password wrapped in a TLS tunnel — it is the most common method and easier to deploy, but the password can be phished or captured in an evil twin attack. EAP-TLS uses client certificates instead of passwords — the device presents a certificate for authentication. It is significantly more secure because there is no password to phish, steal, or crack. EAP-TLS requires a PKI (certificate authority) to issue client certificates, making it more complex to deploy but the gold standard for wireless security.

**Q4. What is an Evil Twin attack and how do you defend against it?**  
**A:** An Evil Twin attack creates a rogue Wi-Fi access point with the same SSID as the legitimate network. Devices connect to the stronger signal (attacker's AP) and send authentication credentials to the attacker instead of the real RADIUS server. With PEAP-MSCHAPv2, the attacker captures the MSCHAPv2 hash and can crack it offline. Defence: (1) Configure clients to validate the RADIUS server's certificate and only trust your company CA — the evil twin cannot present a valid certificate. (2) Use EAP-TLS — no password is ever transmitted, so nothing can be captured.

**Q5. Scenario — Hareesh reports he can connect to the company Wi-Fi from the office but not from the conference room. Other users in the conference room also have issues. What do you check?**  
**A:** This is likely a RADIUS connectivity issue from the conference room AP, not an AD problem. Check: (1) Is the conference room AP registered as a RADIUS client in NPS? It may have a different IP. (2) Is the shared secret on the conference room AP matching NPS? (3) Can the AP reach the NPS server on ports 1812/1813 — check firewall rules between the conference room network and NPS server. (4) Check NPS Event ID 6273 for the conference room AP's IP — what reason code is returned? (5) Check the AP's RADIUS configuration — server IP, port, shared secret.

---

*"RADIUS is the gatekeeper of your network. Without it, your Wi-Fi password is the only thing between an attacker and your internal network. With 802.1X, every device must prove who it is before getting in — and gets only the access its identity warrants."*
