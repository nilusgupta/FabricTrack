# Solution B — Local-disk image serving (Nginx direct)

This change lets Nginx serve uploaded images directly from disk, bypassing
FastAPI and Emergent Object Storage entirely. Expected speedup for new
uploads: **~50–100×** (from ~200ms via Object Storage to ~2ms via Nginx).

**Backward compatibility:** existing images already in Object Storage
continue to work without migration — only newly uploaded images use the
fast local path.

---

## Deploy steps on EC2 (5 minutes)

### 1. Pull the code

```bash
cd /opt/fabrictrack && git pull
cd frontend && yarn build
```

### 2. Create the uploads directory

```bash
sudo mkdir -p /opt/fabrictrack/uploads
sudo chown ubuntu:ubuntu /opt/fabrictrack/uploads
chmod 755 /opt/fabrictrack/uploads
```

### 3. Configure the backend to use local storage

```bash
sudo nano /opt/fabrictrack/backend/.env
```

Add this line at the bottom (don't touch anything else):

```
LOCAL_UPLOADS_DIR=/opt/fabrictrack/uploads
```

Save (Ctrl+O, Enter, Ctrl+X).

### 4. Configure Nginx to serve /uploads directly

```bash
sudo nano /etc/nginx/sites-available/fabrictrack
```

Inside the `server { ... }` block (the one with `server_name crm.ramanujgroup.com`),
add this **above** the `location /api/` block:

```nginx
    # Serve uploaded images directly from disk — no Python in the loop.
    # Files here are uuid-named so contents never change for a given URL,
    # safe to cache aggressively.
    location /uploads/ {
        alias /opt/fabrictrack/uploads/;
        access_log off;
        add_header Cache-Control "private, max-age=31536000, immutable";
        try_files $uri =404;
    }
```

Test the config and reload:

```bash
sudo nginx -t      # should say: syntax is ok / test is successful
sudo systemctl reload nginx
```

### 5. Restart the backend

```bash
sudo supervisorctl restart fabrictrack-backend
sudo supervisorctl status
```

Should show `RUNNING`.

### 6. Verify

Upload **one new image** through the app (edit any enquiry, attach an image, save).

Then check it landed on disk:

```bash
ls -la /opt/fabrictrack/uploads/
```

You should see a file like `abc123-...-def.jpg`.

In the browser, hard-refresh (Ctrl+Shift+R) and open DevTools → Network.
The new image's request URL should be `/uploads/<uuid>.<ext>` (NOT
`/api/files/...`). Its load time should be `<10 ms`.

---

## Rollback (if anything goes wrong)

Just remove the `LOCAL_UPLOADS_DIR=...` line from `backend/.env` and
restart the backend. New uploads will go back to Object Storage. The
images already saved to disk will still work because the backend has a
fallback path for `local/` prefixes.

```bash
sudo nano /opt/fabrictrack/backend/.env    # remove LOCAL_UPLOADS_DIR line
sudo supervisorctl restart fabrictrack-backend
```

---

## Security note — by your choice

Files served via `/uploads/<x>` are **not auth-protected**. Anyone with
the URL can fetch the image. URLs are uuid-named (32 random chars)
so guessing is computationally infeasible — but if someone shares an
image URL outside the app, the recipient can view it without logging in.

For your internal CRM use case this is acceptable. If you ever need to
re-enable auth on images, just remove `LOCAL_UPLOADS_DIR` from `.env`
and they'll go through `/api/files/<path>` with full JWT auth again.

---

## Backup recommendation

Since images now live on EC2 disk (not Object Storage), they're tied to
your EBS volume. Recommend setting up daily EBS snapshots:

AWS Console → EC2 → Elastic Block Store → Snapshots → "Create snapshot
lifecycle policy" → daily snapshots, retain 7 days.

Or just rsync `/opt/fabrictrack/uploads/` to S3 nightly. Cheap and
durable.
