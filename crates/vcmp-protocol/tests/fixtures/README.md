# Captured VC:MP packet fixtures

Real UDP replies captured from live masterlist servers on 2026-09-22.
Binary, byte-for-byte as received. Do not edit.

| File | Bytes | Source | Notes |
|---|---|---|---|
| `info_v0471.bin` | 141 | `193.39.15.204:8192` | 0.4 info, version '0.4.7.1' (7 ch) - the regression case |
| `info_v04rel006.bin` | 85 | `37.221.209.130:2003` | 0.4 info, version '04rel006' (8 ch) - the accidental-pass case |
| `info_v04rel003.bin` | 67 | `49.232.62.24:8192` | 0.4 info, version '04rel003' (8 ch), 0/10 players |
| `info_vantiddos.bin` | 107 | `141.94.180.145:8199` | 0.4 info, version 'anti-ddos' (9 ch) - the truncation case |
| `players_41.bin` | 435 | `141.227.151.121:8192` | 0.4 players, 41 names |
| `players_empty.bin` | 13 | `49.232.62.24:8192` | 0.4 players, 0 names |
| `info_latin1.bin` | 117 | `89.168.77.133:8192` | 0.4 info carrying Latin-1 (not UTF-8) text |
