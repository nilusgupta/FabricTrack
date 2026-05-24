# Performance Diagnostic Checklist

Run these on your EC2 box and tell me the results. We'll know exactly
where the slowness is in 10 minutes.

---

## 1. EC2 region (where your app server lives)

```bash
curl -s http://169.254.169.254/latest/meta-data/placement/region
```

Expected output: `ap-south-1` (Mumbai), `ap-south-2` (Hyderabad),
or whichever AWS region you chose when launching.

---

## 2. EC2 instance type (CPU/RAM class)

```bash
curl -s http://169.254.169.254/latest/meta-data/instance-type
```

Expected: `t3.small`, `t3.medium`, etc.
**Watch out for:** `t2.micro`, `t3.micro`, `t2.nano` — these throttle CPU
when load spikes. `t3.small` (~₹600/mo) is the realistic minimum.

```bash
# CPU + RAM right now
free -h
top -bn1 | head -5
```

---

## 3. Atlas cluster region (where your DB lives)

Log in to https://cloud.mongodb.com → click your project → click the cluster
name → the region is shown under "Configuration" (e.g. "AWS / Mumbai
(ap-south-1)" or "AWS / N. Virginia (us-east-1)").

**This is the single most important number.** If it doesn't match #1
above, that's your bottleneck.

---

## 4. Actual network latency from EC2 → Atlas

Get the hostname from `MONGO_URL` (the part after `@`, before `/`),
then:

```bash
# Replace cluster0-xxxx.mongodb.net with your actual host
HOST="cluster0-xxxx.mongodb.net"
ping -c 5 $HOST
```

**Interpretation:**
| Avg RTT | Meaning |
|---|---|
| `< 5 ms` | Same region — fast. |
| `30–60 ms` | Cross-region within Asia — OK-ish, but ~5× slower than same-region. |
| `100–250 ms` | Different continent — **THIS IS YOUR PROBLEM**. Every page that does 4–5 DB calls eats half a second just in network. |

---

## 5. Run the index script (one-time, idempotent)

I've placed `create_indexes.py` at the repo root. After pulling:

```bash
cd /opt/fabrictrack
git pull
source venv/bin/activate     # or however you activate Python
python create_indexes.py
```

Expected output: a mix of `[OK]` (newly created) and `[SKIP]` (already
exists). Both are good — `[SKIP]` means the basic single-field index
already exists. The new compound indexes (status+created, dept+created,
storage_path+deleted, etc.) are what will speed up your common queries.

Indexes added by this script:
- `enquiries.status_created_idx` → speeds up Enquiries page load
- `enquiries.dept_created_idx` → speeds up department-filtered lists
- `enquiry_history.enq_changed_idx` → speeds up enquiry detail load
- `users.id_active_idx` → speeds up login + assignment lookups
- `files.storage_deleted_idx` → speeds up every image GET (this one
  is big — your image-heavy reports will benefit immediately)
- A few more on customers / fabric_types / webauthn_credentials

To roll back (very unlikely you'd need to):
```bash
python create_indexes.py --drop
```

---

## 6. After running, share with me

Paste me the output of #1–4 and the last few lines of #5. From those
4 numbers I can tell you exactly:

1. Whether moving Atlas to a closer region will help (and by how much).
2. Whether to bump the EC2 instance type.
3. Whether there's a hidden bottleneck somewhere else.

---

## Likely outcome based on your symptoms

- "New enquiries get added but app doesn't respond" → **network latency**,
  fixed by either Atlas same-region OR (less likely) a CPU-throttled t2.micro.
- "Images take time to load" → **same network latency** since each image
  also does a Mongo lookup before serving the file. The new
  `files.storage_deleted_idx` will cut that lookup's cost by 100×, but the
  network hop is still the main issue.

The fix path I'd recommend, in order:

1. Apply the indexes (5 min, free, can do today).
2. If #4 shows >50ms RTT — **migrate Atlas to your EC2's region**. Free
   tier supports any region. The migration is: create new cluster, run
   `mongodump | mongorestore` between them, switch your `MONGO_URL`.
   I can write the exact commands when you confirm the regions.
3. If still slow afterwards, check EC2 instance type.
