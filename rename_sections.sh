#!/bin/bash
# Bulk rename script for Active-Directory-to-Entra-ID repo

# Section renames
mv section-01 Section-01-IAM-Core-Concepts 2>/dev/null
mv section-02 Section-02-Active-Directory-OnPremise 2>/dev/null
mv section-03 Section-03-Authentication-Protocols 2>/dev/null
mv section-04 Section-04-Security-Hardening 2>/dev/null
mv section-05 Section-05-Attack-Techniques 2>/dev/null
mv section-06 Section-06-Entra-ID-Cloud 2>/dev/null
mv section-07 Section-07-Entra-ID-Security 2>/dev/null

# Section-08 conflict resolution
rm -rf section-08/Section-08-README.md 2>/dev/null
rm -rf section-08/Section-08-Hybrid-Identity 2>/dev/null
mv section-08 Section-08-Hybrid-Identity 2>/dev/null

mv section-09 Section-09-Monitoring-Logging-IR 2>/dev/null
mv section-10 Section-10-Labs-Scenarios 2>/dev/null

# Stage changes
git add .
git commit -m "Renamed all section directories for consistency"
